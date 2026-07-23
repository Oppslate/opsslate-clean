
"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-400 border-red-500/40",
  Major: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  Minor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  Cosmetic: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  Good: { bg: "bg-green-500/10 border-green-500/40", text: "text-green-400" },
  Fair: { bg: "bg-yellow-500/10 border-yellow-500/40", text: "text-yellow-400" },
  Poor: { bg: "bg-orange-500/10 border-orange-500/40", text: "text-orange-400" },
  Critical: { bg: "bg-red-500/10 border-red-500/40", text: "text-red-400" },
};

interface AnalysisResult {
  defectsFound: boolean;
  defectCount: number;
  overallCondition: string;
  items: Array<{
    title: string;
    description: string;
    trade: string;
    severity: string;
    priority: string;
    estimatedFix: string;
  }>;
  summary: string;
  createdCount: number;
}

function PhotoPunchContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const { toast } = useToast();

  const [selectedProject, setSelectedProject] = useState("");
  const [location, setLocation] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [totalDefects, setTotalDefects] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.siteMedia.generateUploadUrl);
  const analyzePhoto = useAction(api.photoPunch.analyzePhoto as any);

  const handlePhoto = useCallback(async (file: File) => {
    if (!user || !selectedProject) return;
    if (!location.trim()) {
      toast("Enter a location first (e.g., 'Unit 204', 'Hallway 3rd Floor')", "error");
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAnalyzing(true);

    try {
      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();

      // AI analyze
      const result = await analyzePhoto({
        companyId: user.companyId,
        projectId: selectedProject as Id<"projects">,
        storageId,
        location: location.trim(),
        userName: user.name,
      });

      setResults(prev => [{ ...result, _previewUrl: url } as any, ...prev]);
      setTotalDefects(prev => prev + (result.createdCount || 0));

      if (result.defectsFound) {
        toast(`📸 Found ${result.defectCount} defects — ${result.createdCount} punch items created!`, "success");
      } else {
        toast("✅ No defects found — looking good!", "success");
      }
    } catch (e: any) {
      toast("Analysis failed: " + e.message, "error");
    }

    setAnalyzing(false);
    setPreviewUrl(null);
  }, [user, selectedProject, location, generateUploadUrl, analyzePhoto, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhoto(file);
    e.target.value = "";
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">📸 Photo → Auto Punch List</h1>
          <p className="text-muted-foreground text-sm">Snap photos, AI finds defects, punch items created automatically</p>
        </div>
        {totalDefects > 0 && (
          <Badge className="bg-red-600 text-lg px-3 py-1">{totalDefects} defects found</Badge>
        )}
      </div>

      {/* Project & Location */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Project</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                <option value="">Select Project...</option>
                {(projects ?? []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Location / Area</label>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g., Unit 204, Hallway 3rd Floor, Kitchen..."
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProject && location.trim() ? (
        <>
          {/* Camera / Upload area */}
          <Card className={`border-2 border-dashed transition-all ${analyzing ? "border-purple-500 bg-purple-500/5" : "border-border hover:border-primary"}`}>
            <CardContent className="p-8">
              {analyzing ? (
                <div className="text-center">
                  {previewUrl && (
                    <div className="mb-4 flex justify-center">
                      <img src={previewUrl} alt="Analyzing..." className="max-h-48 rounded-lg border border-border opacity-70" />
                    </div>
                  )}
                  <div className="text-4xl mb-3 animate-pulse">🔍</div>
                  <h3 className="text-lg font-bold mb-2">AI Inspecting Photo...</h3>
                  <p className="text-sm text-muted-foreground">Scanning for cracks, paint issues, missing fixtures, incomplete work...</p>
                  <div className="flex justify-center gap-2 mt-4">
                    {["🔨","🎨","💡","🚿","🪟","🚪","⚡","🔩"].map((icon, i) => (
                      <span key={i} className="text-xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{icon}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-4">📸</div>
                  <h3 className="text-lg font-bold mb-2">Take a Photo or Upload</h3>
                  <p className="text-sm text-muted-foreground mb-6">Point at a wall, room, or area — AI will find every defect</p>
                  <div className="flex justify-center gap-4">
                    {/* Camera button (mobile) */}
                    <button
                      onClick={() => cameraRef.current?.click()}
                      className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 flex flex-col items-center justify-center text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      <span className="text-3xl">📷</span>
                      <span className="text-[10px] mt-1">Camera</span>
                    </button>
                    <input ref={cameraRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                    {/* Upload button */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-24 h-24 rounded-2xl bg-secondary hover:bg-secondary/80 flex flex-col items-center justify-center border border-border shadow-lg hover:shadow-xl transition-all"
                    >
                      <span className="text-3xl">📁</span>
                      <span className="text-[10px] mt-1">Upload</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple={false} className="hidden" onChange={handleFileChange} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">💡 Tip: Take photos in good lighting. Capture one wall/area per photo for best results.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results.map((result, ri) => {
            const cond = CONDITION_COLORS[result.overallCondition] || CONDITION_COLORS.Fair;
            return (
              <Card key={ri} className={`border ${cond.bg}`}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{result.defectsFound ? "⚠️" : "✅"}</span>
                      <div>
                        <h3 className={`font-bold ${cond.text}`}>
                          {result.defectsFound ? `${result.defectCount} Defects Found` : "No Defects — All Clear!"}
                        </h3>
                        <p className="text-xs text-muted-foreground">{result.summary}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`${cond.text} text-xs`}>
                        {result.overallCondition}
                      </Badge>
                      {result.createdCount > 0 && (
                        <div className="text-[10px] text-green-400 mt-1">✅ {result.createdCount} punch items created</div>
                      )}
                    </div>
                  </div>

                  {/* Defect items */}
                  {result.items.length > 0 && (
                    <div className="space-y-2">
                      {result.items.map((item, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.Minor}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{item.title}</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-[10px]">{item.trade}</Badge>
                              <Badge variant="outline" className="text-[10px]">{item.severity}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Fix:</span> {item.estimatedFix}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Workflow tips */}
          {results.length === 0 && !analyzing && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">🏗️ Jobsite Walkthrough Workflow</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {[
                    { step: "1", icon: "📍", title: "Set Location", desc: "Type the room/area name above" },
                    { step: "2", icon: "📸", title: "Snap Photos", desc: "Take photos of walls, ceilings, fixtures" },
                    { step: "3", icon: "🔍", title: "AI Inspects", desc: "Every defect identified automatically" },
                    { step: "4", icon: "✅", title: "Punch List Done", desc: "Items created with photos attached" },
                  ].map(s => (
                    <div key={s.step} className="text-center p-3 bg-secondary/30 rounded-lg">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-xs font-bold mb-1">Step {s.step}: {s.title}</div>
                      <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-xs text-purple-400">
                    <strong>Pro tip:</strong> Update the location field as you move through the jobsite. Take one photo per wall/area for best detection. The AI catches things human eyes miss — nail pops, hairline cracks, uneven paint, crooked outlets.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        !selectedProject ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-xl font-bold mb-2">Select a Project</h3>
              <p className="text-muted-foreground text-sm">Choose a project to start your photo punch list walkthrough.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-yellow-500/5 border-yellow-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">📍</div>
              <h3 className="font-bold mb-1">Enter a Location</h3>
              <p className="text-sm text-muted-foreground">Type the room, area, or unit you're inspecting (e.g., "Unit 204", "Hallway 3rd Floor")</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

export default function PhotoPunchPage() {
  return <AppShell><PhotoPunchContent /></AppShell>;
}
