
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const RISK_STYLES: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  low: { bg: "bg-green-500/10 border-green-500/40", text: "text-green-400", label: "LOW RISK", icon: "🟢" },
  medium: { bg: "bg-yellow-500/10 border-yellow-500/40", text: "text-yellow-400", label: "MEDIUM RISK", icon: "🟡" },
  high: { bg: "bg-orange-500/10 border-orange-500/40", text: "text-orange-400", label: "HIGH RISK", icon: "🟠" },
  critical: { bg: "bg-red-500/10 border-red-500/40", text: "text-red-400", label: "CRITICAL RISK", icon: "🔴" },
};

const CAT_ICONS: Record<string, string> = {
  schedule: "📅", rfi: "❓", submittal: "📋", crew: "👷", material: "🚚",
  budget: "💰", weather: "⛅", safety: "🦺", change_order: "🔄",
};

function DelayEngineContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const { toast } = useToast();

  const [selectedProject, setSelectedProject] = useState("");
  const [running, setRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<any>(null);

  const prediction = useQuery(
    api.delayEngine.getLatestPrediction,
    selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip"
  );
  const history = useQuery(
    api.delayEngine.getPredictionHistory,
    selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip"
  );

  const runPrediction = useAction(api.delayEngineAI.runPrediction as any);

  const handleRun = async () => {
    if (!selectedProject) return;
    setRunning(true);
    setLiveResult(null);
    try {
      const result = await runPrediction({ projectId: selectedProject as Id<"projects"> });
      setLiveResult(result);
      toast("🧠 Prediction complete!", "success");
    } catch (e: any) {
      toast("Prediction failed: " + e.message, "error");
    }
    setRunning(false);
  };

  const pred = liveResult || (prediction ? JSON.parse(prediction.rawAnalysis) : null);
  const risk = RISK_STYLES[pred?.overallRisk] || RISK_STYLES.medium;

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">🛸 Predictive Delay Engine</h1>
          <p className="text-muted-foreground text-sm">AI analyzes ALL project data to predict delays before they happen</p>
        </div>
        <div className="flex gap-2 items-center">
          <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            <option value="">Select Project...</option>
            {(projects ?? []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <Button onClick={handleRun} disabled={running || !selectedProject} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            {running ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🛸</span> Analyzing...
              </span>
            ) : "🧠 Run Prediction"}
          </Button>
        </div>
      </div>

      {/* Running animation */}
      {running && (
        <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3 animate-bounce">🛸</div>
            <h3 className="text-lg font-bold mb-2">Predictive Engine Running</h3>
            <p className="text-sm text-muted-foreground">Analyzing tasks, crew, RFIs, submittals, deliveries, budget, weather, safety data...</p>
            <div className="flex justify-center gap-2 mt-4">
              {["📅","👷","❓","📋","🚚","💰","⛅","🦺"].map((icon, i) => (
                <span key={i} className="text-xl animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>{icon}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No project selected */}
      {!selectedProject && !running && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">🛸</div>
            <h3 className="text-xl font-bold mb-2">Predictive Delay Engine</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Select a project and run the engine. It analyzes your tasks, crew, RFIs, submittals, deliveries, budget, weather, and safety data to predict delays before they happen.
            </p>
            <p className="text-xs text-purple-400 mt-3">No other construction software does this.</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {pred && !running && (
        <div className="space-y-4">
          {/* Risk banner */}
          <Card className={`${risk.bg} border`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{risk.icon}</span>
                  <div>
                    <div className={`text-lg font-bold ${risk.text}`}>{risk.label}</div>
                    <div className="text-sm text-muted-foreground">{pred.summary}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {pred.predictedDelayDays > 0 ? (
                      <span className="text-red-400">+{pred.predictedDelayDays} days</span>
                    ) : (
                      <span className="text-green-400">On Track</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Confidence: {pred.confidence}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          {pred.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { label: "Schedule Health", value: pred.metrics.scheduleHealth, suffix: "/100" },
                { label: "Budget Health", value: pred.metrics.budgetHealth, suffix: "/100" },
                { label: "Crew Coverage", value: pred.metrics.crewCoverage, suffix: "%" },
                { label: "RFI Velocity", value: pred.metrics.rfiVelocity, suffix: "" },
                { label: "Submittal Velocity", value: pred.metrics.submittalVelocity, suffix: "" },
                { label: "Productivity", value: pred.metrics.productivityTrend, suffix: "" },
              ].map((m, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">{m.label}</div>
                    <div className={`text-lg font-bold ${
                      typeof m.value === "number" ? (m.value >= 80 ? "text-green-400" : m.value >= 50 ? "text-yellow-400" : "text-red-400") :
                      m.value === "up" ? "text-green-400" : m.value === "down" ? "text-red-400" : "text-yellow-400"
                    }`}>
                      {m.value ?? "—"}{typeof m.value === "number" ? m.suffix : ""}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Risk Factors */}
          {pred.riskFactors?.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">⚡ Risk Factors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pred.riskFactors.map((rf: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      rf.severity === "critical" ? "border-red-500/40 bg-red-500/5" :
                      rf.severity === "high" ? "border-orange-500/40 bg-orange-500/5" :
                      rf.severity === "medium" ? "border-yellow-500/40 bg-yellow-500/5" :
                      "border-green-500/40 bg-green-500/5"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{rf.factor}</span>
                        <div className="flex gap-1">
                          <Badge variant={rf.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">
                            {rf.severity}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${
                            rf.trend === "worsening" ? "text-red-400" : rf.trend === "improving" ? "text-green-400" : "text-yellow-400"
                          }`}>
                            {rf.trend === "worsening" ? "📈 Worsening" : rf.trend === "improving" ? "📉 Improving" : "➡️ Stable"}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{rf.detail}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Predictions */}
          {pred.predictions?.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">🔮 Delay Predictions</h3>
                <div className="space-y-3">
                  {pred.predictions.map((p: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      p.impact === "critical" ? "border-red-500/40 bg-red-500/5" :
                      p.impact === "high" ? "border-orange-500/40 bg-orange-500/5" :
                      "border-border bg-secondary/30"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{CAT_ICONS[p.category] || "📊"}</span>
                          <span className="font-medium text-sm">{p.item}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={p.impact === "critical" ? "destructive" : "outline"} className="text-[10px]">
                            {p.impact}
                          </Badge>
                          {p.delayDays > 0 && (
                            <span className="text-red-400 font-bold text-sm">+{p.delayDays}d</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                        <div>📅 Scheduled: <span className="text-foreground">{p.currentDate || "TBD"}</span></div>
                        <div>🔮 Predicted: <span className="text-red-400 font-medium">{p.predictedDate || "TBD"}</span></div>
                      </div>
                      <p className="text-xs text-muted-foreground"><strong>Cause:</strong> {p.cause}</p>
                      {p.cascadeEffect && (
                        <p className="text-xs text-yellow-400 mt-1">⚡ Cascade: {p.cascadeEffect}</p>
                      )}
                      <div className="mt-1">
                        <span className="text-[10px] text-muted-foreground">Probability: {p.probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {pred.recommendations?.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">🎯 Recommendations — How to Prevent Delays</h3>
                <div className="space-y-3">
                  {pred.recommendations.map((r: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {r.priority || i + 1}
                          </span>
                          <span className="font-medium text-sm">{r.action}</span>
                        </div>
                        {r.savesDelayDays > 0 && (
                          <Badge className="bg-green-600 text-[10px]">Saves {r.savesDelayDays} days</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>🎯 Impact: <span className="text-foreground">{r.impact}</span></div>
                        <div>⏰ Deadline: <span className="text-yellow-400">{r.deadline || "ASAP"}</span></div>
                        {r.owner && <div>👤 Owner: <span className="text-foreground">{r.owner}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prediction History */}
          {(history ?? []).length > 1 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">📈 Prediction History</h3>
                <div className="space-y-1">
                  {(history ?? []).map((h: any, i: number) => {
                    const r = RISK_STYLES[h.overallRisk] || RISK_STYLES.medium;
                    return (
                      <div key={h._id} className="flex items-center justify-between py-2 border-b border-border/50 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{r.icon}</span>
                          <span className="text-muted-foreground">{new Date(h.generatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-[10px] ${r.text}`}>{r.label}</Badge>
                          <span className={h.predictedDelayDays > 0 ? "text-red-400" : "text-green-400"}>
                            {h.predictedDelayDays > 0 ? `+${h.predictedDelayDays}d` : "On Track"}
                          </span>
                          <span className="text-xs text-muted-foreground">{h.confidence}% conf</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function DelayEnginePage() {
  return <AppShell><DelayEngineContent /></AppShell>;
}
