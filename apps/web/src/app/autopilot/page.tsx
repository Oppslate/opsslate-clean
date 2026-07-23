
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const CAPABILITIES = [
  { key: "managesCrew", label: "Crew Scheduling", icon: "👷", desc: "AI schedules crew, sends notifications, identifies gaps" },
  { key: "managesSupplies", label: "Supply Management", icon: "📦", desc: "AI recommends material orders based on upcoming phases" },
  { key: "managesSchedule", label: "Schedule Optimization", icon: "📅", desc: "AI optimizes task sequencing and identifies bottlenecks" },
  { key: "monitorsWeather", label: "Weather Monitoring", icon: "⛅", desc: "AI checks weather and adjusts crew/schedule automatically" },
  { key: "monitorsSafety", label: "Safety Monitoring", icon: "🦺", desc: "AI tracks open incidents and ensures corrective actions complete" },
  { key: "autoSendEmails", label: "Auto-Send Emails", icon: "📧", desc: "AI sends crew notifications and call-off emails automatically" },
  { key: "generatesDailyLogs", label: "Daily Log Generation", icon: "📝", desc: "AI generates daily log summaries from project activity" },
];

function categoryIcon(cat: string) {
  const map: Record<string, string> = {
    crew: "👷", schedule: "📅", supplies: "📦", weather: "⛅",
    safety: "🦺", budget: "💰", punch_list: "✅", change_orders: "🔄", general: "🤖",
  };
  return map[cat] ?? "🤖";
}

function typeStyle(type: string) {
  if (type === "auto") return { bg: "bg-green-500/10 border-green-500/30", badge: "default" as const, label: "⚡ Auto-Executed" };
  if (type === "alert") return { bg: "bg-red-500/10 border-red-500/30", badge: "destructive" as const, label: "🚨 Alert" };
  return { bg: "bg-blue-500/10 border-blue-500/30", badge: "secondary" as const, label: "💡 Recommendation" };
}

function statusBadge(status: string) {
  if (status === "executed") return { variant: "default" as const, label: "Executed" };
  if (status === "pending_approval") return { variant: "destructive" as const, label: "Needs Approval" };
  if (status === "approved") return { variant: "default" as const, label: "Approved" };
  if (status === "rejected") return { variant: "secondary" as const, label: "Rejected" };
  return { variant: "outline" as const, label: "Pending Review" };
}

function confidenceBar(conf: number) {
  const pct = Math.round(conf * 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-secondary rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ── Setup Modal ──
function SetupModal({ onClose, existing, projectId }: {
  onClose: () => void; existing?: Record<string, unknown>; projectId: string;
}) {
  const { user } = useAuth();
  const enableAP = useMutation(api.autopilotData.enableAutopilot);
  const { toast } = useToast();

  const [caps, setCaps] = useState<Record<string, boolean>>(() => {
    const d: Record<string, boolean> = {};
    CAPABILITIES.forEach((c) => { d[c.key] = (existing?.[c.key] as boolean) ?? true; });
    return d;
  });
  const [goals, setGoals] = useState((existing?.projectGoals as string) ?? "");
  const [constraints, setConstraints] = useState((existing?.constraints as string) ?? "");
  const [budget, setBudget] = useState<string>(existing?.budget !== undefined ? String(existing.budget) : "");
  const [deadline, setDeadline] = useState((existing?.deadline as string) ?? "");
  const [scopeOfWork, setScopeOfWork] = useState((existing?.scopeOfWork as string) ?? "");
  const [phases, setPhases] = useState((existing?.phases as string) ?? "");
  const [currentPhase, setCurrentPhase] = useState((existing?.currentPhase as string) ?? "");
  const [milestones, setMilestones] = useState((existing?.milestones as string) ?? "");
  const [saving, setSaving] = useState(false);

  const handleEnable = async () => {
    setSaving(true);
    try {
      await enableAP({
        companyId: user!.companyId,
        projectId: projectId as Id<"projects">,
        ...caps,
        projectGoals: goals || undefined,
        constraints: constraints || undefined,
        budget: budget ? Number(budget) : undefined,
        deadline: deadline || undefined,
        scopeOfWork: scopeOfWork || undefined,
        phases: phases || undefined,
        currentPhase: currentPhase || undefined,
        milestones: milestones || undefined,
        enabledBy: user!.name,
      } as any);
      toast("🤖 Autopilot ENGAGED", "success");
      onClose();
    } catch (e) {
      toast("Error: " + (e as Error).message, "error");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-bold text-lg">🤖 Configure AI Autopilot</h3>
          <p className="text-sm text-muted-foreground">Choose what AI controls for this project</p>
        </div>
        <div className="p-4 space-y-5">
          {/* Capabilities */}
          <div>
            <h4 className="text-sm font-bold mb-3">AI Capabilities</h4>
            <div className="space-y-2">
              {CAPABILITIES.map((cap) => (
                <button
                  key={cap.key}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${caps[cap.key] ? "bg-primary/10 border-primary" : "bg-secondary/30 border-border"}`}
                  onClick={() => setCaps({ ...caps, [cap.key]: !caps[cap.key] })}
                >
                  <span className="text-2xl">{cap.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{cap.label}</div>
                    <div className="text-xs text-muted-foreground">{cap.desc}</div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${caps[cap.key] ? "bg-primary justify-end" : "bg-secondary justify-start"}`}>
                    <div className="w-4 h-4 rounded-full bg-white mx-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Project context */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h4 className="text-sm font-bold mb-3">📋 Scope of Work & Schedule (CRITICAL for AI accuracy)</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Scope of Work</label>
                <Textarea rows={4} value={scopeOfWork} onChange={(e) => setScopeOfWork(e.target.value)} placeholder={"Describe the full scope of work for this project. Be specific.\n\ne.g. New 3-story commercial office building, 45,000 SF. Steel frame, concrete foundation, curtain wall exterior. Full MEP including 400A electrical service, HVAC with 4 rooftop units, plumbing with 12 fixtures per floor. Interior buildout: drywall, ACT ceilings, VCT/carpet flooring, painting. Site work includes parking lot (120 spaces), sidewalks, landscaping, stormwater management."} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Project Phases (in sequence)</label>
                <Textarea rows={3} value={phases} onChange={(e) => setPhases(e.target.value)} placeholder={"List phases in order. AI will track progress against these.\n\ne.g.\n1. Site Prep & Excavation\n2. Foundation & Concrete\n3. Steel Erection\n4. Exterior Envelope\n5. MEP Rough-In\n6. Interior Framing & Drywall\n7. Finishes\n8. Commissioning & Closeout"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Current Phase</label>
                  <Input value={currentPhase} onChange={(e) => setCurrentPhase(e.target.value)} placeholder="e.g. Foundation & Concrete" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Key Milestones</label>
                  <Input value={milestones} onChange={(e) => setMilestones(e.target.value)} placeholder="e.g. Foundation complete Mar 15, Steel up Apr 30, Dry-in Jun 15" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-3">
            <h4 className="text-sm font-bold mb-3">🎯 Goals & Constraints</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Project Goals</label>
                <Textarea rows={2} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. Complete foundation by March 15, pass structural inspection, stay under budget..." />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Constraints</label>
                <Textarea rows={2} value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="e.g. No work on weekends, noise restrictions after 6PM, limited crane access..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Budget ($)</label>
                  <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Total project budget" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Deadline</label>
                  <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-between sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} className="bg-green-600 hover:bg-green-700" onClick={handleEnable}>
            {saving ? "Engaging..." : "🤖 ENGAGE AUTOPILOT"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
function AutopilotContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const configs = useQuery(api.autopilotData.listConfigs, user ? { companyId: user.companyId } : "skip");
  const disableAP = useMutation(api.autopilotData.disableAutopilot);
  const approveAction = useMutation(api.autopilotData.approveAction);
  const rejectAction = useMutation(api.autopilotData.rejectAction);
  const runAutopilot = useAction(api.autopilotEngine.runAutopilot as any);
  const { toast } = useToast();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showSetup, setShowSetup] = useState(false);
  const [running, setRunning] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");

  const config = (configs ?? []).find((c) => c.projectId === selectedProject);
  const logs = useQuery(api.autopilotData.listLogs,
    selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip"
  ) as Array<Record<string, unknown>> | undefined;
  const pendingCount = useQuery(api.autopilotData.pendingCount,
    selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip"
  );

  const filteredLogs = filterCategory ? (logs ?? []).filter((l) => l.category === filterCategory) : (logs ?? []);

  const handleRun = async () => {
    if (!selectedProject) return;
    setRunning(true);
    try {
      const result = await runAutopilot({ projectId: selectedProject as Id<"projects"> }) as any;
      if (result.status === "success") {
        toast(`🤖 Autopilot generated ${result.actionsGenerated} actions`, "success");
      } else {
        toast("Autopilot: " + result.status, "error");
      }
    } catch (e) {
      toast("Error: " + (e as Error).message, "error");
    }
    setRunning(false);
  };

  if (!user) return null;

  // Count active autopilots
  const activeCount = (configs ?? []).filter((c) => c.enabled).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">🤖 AI Autopilot</h1>
          <p className="text-muted-foreground text-sm">AI-powered project management — scheduling, monitoring, and decision-making</p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-400 font-semibold">{activeCount} project(s) on autopilot</span>
          </div>
        )}
      </div>

      {/* Project selector */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold block mb-1">Select Project</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Choose a project...</option>
                {(projects ?? []).map((p) => {
                  const hasAP = (configs ?? []).find((c) => c.projectId === p._id && c.enabled);
                  return <option key={p._id} value={p._id}>{hasAP ? "🤖 " : ""}{p.name}</option>;
                })}
              </select>
            </div>
            {selectedProject && !config?.enabled && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowSetup(true)}>🤖 Enable Autopilot</Button>
            )}
            {config?.enabled && (
              <>
                <Button onClick={handleRun} disabled={running} className="bg-primary">
                  {running ? "🧠 AI Thinking..." : "▶ Run Now"}
                </Button>
                <Button variant="outline" onClick={() => setShowSetup(true)}>⚙️ Settings</Button>
                <Button variant="destructive" onClick={async () => {
                  await disableAP({ projectId: selectedProject as Id<"projects"> });
                  toast("Autopilot disengaged", "success");
                }}>⏹ Disengage</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Autopilot status */}
      {config?.enabled && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-bold text-green-400">ACTIVE</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Since {(config.enabledAt as string)?.slice(0, 10)}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{String(config.totalActions ?? 0)}</div>
              <div className="text-xs text-muted-foreground">Total Actions</div>
            </CardContent>
          </Card>
          <Card className={`border-border ${(pendingCount ?? 0) > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-card"}`}>
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${(pendingCount ?? 0) > 0 ? "text-yellow-400" : ""}`}>{String(pendingCount ?? 0)}</div>
              <div className="text-xs text-muted-foreground">Needs Approval</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Last Run</div>
              <div className="text-sm font-medium">{config.lastRunAt ? new Date(config.lastRunAt as string).toLocaleString() : "Never"}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active capabilities */}
      {config?.enabled && (
        <div className="flex flex-wrap gap-2 mb-4">
          {CAPABILITIES.map((cap) => (
            <Badge key={cap.key} variant={(config as any)[cap.key] ? "default" : "outline"} className={`${(config as any)[cap.key] ? "" : "opacity-40"}`}>
              {cap.icon} {cap.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Last run summary */}
      {config?.lastRunSummary && (
        <div className="bg-secondary/30 rounded-lg p-3 mb-4 text-sm">
          <span className="text-muted-foreground">Last run: </span>{config.lastRunSummary as string}
        </div>
      )}

      {/* Category filter */}
      {selectedProject && config?.enabled && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button size="sm" variant={filterCategory === "" ? "default" : "outline"} onClick={() => setFilterCategory("")}>All</Button>
          {["crew", "schedule", "supplies", "weather", "safety", "budget", "punch_list", "change_orders"].map((cat) => (
            <Button key={cat} size="sm" variant={filterCategory === cat ? "default" : "outline"} onClick={() => setFilterCategory(cat)}>
              {categoryIcon(cat)} {cat.replace("_", " ")}
            </Button>
          ))}
        </div>
      )}

      {/* Action log */}
      {selectedProject && config?.enabled && (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const ts = typeStyle(log.type as string);
            const sb = statusBadge(log.status as string);
            const meta = log.metadata ? JSON.parse(log.metadata as string) : {};
            return (
              <Card key={log._id as string} className={`border ${ts.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{categoryIcon(log.category as string)}</span>
                        <Badge variant={ts.badge}>{ts.label}</Badge>
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                        {meta.priority && (
                          <Badge variant={meta.priority === "critical" ? "destructive" : meta.priority === "high" ? "default" : "outline"} className="text-xs">
                            {meta.priority}
                          </Badge>
                        )}
                        {log.confidence !== undefined && confidenceBar(log.confidence as number)}
                      </div>
                      <h3 className="font-bold text-sm">{log.title as string}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{log.description as string}</p>
                      {Boolean(log.actionTaken) && (
                        <div className="bg-black/20 rounded-lg p-2 mt-2">
                          <span className="text-xs font-bold text-primary">ACTION: </span>
                          <span className="text-sm">{log.actionTaken as string}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(log.createdAt as string).toLocaleString()}
                        {Boolean(log.approvedBy) && <span className="ml-2">✅ Approved by {log.approvedBy as string}</span>}
                        {Boolean(log.rejectedBy) && <span className="ml-2">❌ Rejected by {log.rejectedBy as string}{log.rejectedReason ? `: ${log.rejectedReason}` : ""}</span>}
                      </div>
                    </div>
                    {(log.status as string) === "pending_approval" && (
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveAction({ id: log._id as Id<"autopilotLog">, approvedBy: user!.name }).then(() => toast("Approved", "success"))}>
                          ✅ Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectAction({ id: log._id as Id<"autopilotLog">, rejectedBy: user!.name }).then(() => toast("Rejected", "success"))}>
                          ❌ Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredLogs.length === 0 && config?.lastRunAt && (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="font-bold">No actions in this category</h3>
                <p className="text-sm text-muted-foreground">The AI hasn&apos;t generated any {filterCategory || ""} actions yet. Click &quot;Run Now&quot; to analyze.</p>
              </CardContent>
            </Card>
          )}

          {filteredLogs.length === 0 && !config?.lastRunAt && (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-lg font-bold mb-2">Autopilot Ready</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Click &quot;Run Now&quot; to let AI analyze your project and generate recommendations.
                  The AI will review crew scheduling, weather, safety, punch lists, change orders, and more.
                </p>
                <Button onClick={handleRun} disabled={running} className="bg-primary">
                  {running ? "🧠 AI Analyzing..." : "▶ Run First Analysis"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No project selected */}
      {!selectedProject && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-lg font-bold mb-2">AI Autopilot</h3>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Put any project on autopilot. AI will manage crew scheduling, monitor weather,
              track safety incidents, optimize schedules, recommend supply orders, and keep you informed —
              all while you focus on what matters.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              {CAPABILITIES.map((cap) => (
                <div key={cap.key} className="bg-secondary/30 rounded-lg p-3 w-32 text-center">
                  <div className="text-2xl mb-1">{cap.icon}</div>
                  <div className="text-xs font-medium">{cap.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showSetup && selectedProject && (
        <SetupModal
          onClose={() => setShowSetup(false)}
          existing={config as any}
          projectId={selectedProject}
        />
      )}
    </div>
  );
}

export default function AutopilotPage() {
  return <AppShell><AutopilotContent /></AppShell>;
}
