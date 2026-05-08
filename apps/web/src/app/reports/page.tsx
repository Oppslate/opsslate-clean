
"use client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function healthColor(score: number) {
  if (score >= 80) return { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "Healthy" };
  if (score >= 60) return { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", label: "At Risk" };
  return { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "Critical" };
}

function HealthBar({ score }: { score: number }) {
  const h = healthColor(score);
  return (
    <div className="flex items-center gap-3">
      <div className="w-full bg-secondary rounded-full h-3">
        <div className={`h-3 rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-bold text-lg ${h.text}`}>{score}</span>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color ?? ""}`}>{String(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ReportsContent() {
  const { user } = useAuth();
  const reports = useQuery(api.reporting.projectHealth, user ? { companyId: user.companyId } : "skip") as any[] | undefined;

  if (!user) return null;

  // Company-wide stats
  const totalProjects = reports?.length ?? 0;
  const avgHealth = totalProjects > 0 ? Math.round((reports ?? []).reduce((s, r) => s + r.healthScore, 0) / totalProjects) : 0;
  const totalOpenPunch = (reports ?? []).reduce((s, r) => s + r.punch.open, 0);
  const totalOpenIncidents = (reports ?? []).reduce((s, r) => s + r.safety.open, 0);
  const totalPendingCOs = (reports ?? []).reduce((s, r) => s + r.changeOrders.pending, 0);
  const totalOpenRFIs = (reports ?? []).reduce((s, r) => s + r.rfis.open, 0);
  const totalHours = (reports ?? []).reduce((s, r) => s + r.time.totalHours, 0);

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">📊 Reports & Analytics</h1>
      <p className="text-muted-foreground text-sm mb-4">Company-wide project health dashboard</p>

      {/* Company overview */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
        <Card className={`border-border ${healthColor(avgHealth).bg}`}><CardContent className="p-3 text-center">
          <div className={`text-3xl font-bold ${healthColor(avgHealth).text}`}>{avgHealth}</div><div className="text-xs text-muted-foreground">Avg Health Score</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3"><Stat label="Projects" value={totalProjects} /></CardContent></Card>
        <Card className={`border-border ${totalOpenPunch > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-card"}`}><CardContent className="p-3"><Stat label="Open Punch" value={totalOpenPunch} color={totalOpenPunch > 0 ? "text-yellow-400" : ""} /></CardContent></Card>
        <Card className={`border-border ${totalOpenIncidents > 0 ? "bg-red-500/10 border-red-500/30" : "bg-card"}`}><CardContent className="p-3"><Stat label="Open Incidents" value={totalOpenIncidents} color={totalOpenIncidents > 0 ? "text-red-400" : ""} /></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3"><Stat label="Pending COs" value={totalPendingCOs} color="text-blue-400" /></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3"><Stat label="Open RFIs" value={totalOpenRFIs} color="text-purple-400" /></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3"><Stat label="Total Hours" value={totalHours.toFixed(0)} /></CardContent></Card>
      </div>

      {/* Per-project cards */}
      <div className="space-y-4">
        {(reports ?? []).map((r: any) => {
          const h = healthColor(r.healthScore);
          return (
            <Card key={r.projectId} className={`border ${h.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg">{r.projectName}</h3>
                    <Badge variant={r.healthScore >= 80 ? "default" : r.healthScore >= 60 ? "secondary" : "destructive"}>{h.label}</Badge>
                  </div>
                  <div className="w-48"><HealthBar score={r.healthScore} /></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {/* Punch List */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-primary mb-2">✅ Punch List</div>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <Stat label="Open" value={r.punch.open} color={r.punch.open > 0 ? "text-yellow-400" : ""} />
                      <Stat label="Done" value={r.punch.complete} color="text-green-400" />
                    </div>
                    {r.punch.overdue > 0 && <div className="text-xs text-red-400 mt-1 text-center font-bold">{r.punch.overdue} overdue</div>}
                  </div>

                  {/* Change Orders */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-primary mb-2">🔄 Change Orders</div>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <Stat label="Pending" value={r.changeOrders.pending} color={r.changeOrders.pending > 0 ? "text-yellow-400" : ""} />
                      <Stat label="Approved" value={r.changeOrders.approved} color="text-green-400" />
                    </div>
                    {r.changeOrders.approvedCost > 0 && <div className="text-xs text-green-400 mt-1 text-center">+${(r.changeOrders.approvedCost / 1000).toFixed(0)}K</div>}
                  </div>

                  {/* Safety */}
                  <div className={`rounded-lg p-3 ${r.safety.open > 0 ? "bg-red-500/20" : "bg-black/20"}`}>
                    <div className="text-xs font-bold text-primary mb-2">🦺 Safety</div>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <Stat label="Open" value={r.safety.open} color={r.safety.open > 0 ? "text-red-400" : ""} />
                      <Stat label="Critical" value={r.safety.critical} color={r.safety.critical > 0 ? "text-red-600" : ""} />
                    </div>
                  </div>

                  {/* RFIs */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-primary mb-2">❓ RFIs</div>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <Stat label="Open" value={r.rfis.open} color={r.rfis.open > 0 ? "text-purple-400" : ""} />
                      <Stat label="Answered" value={r.rfis.answered} color="text-green-400" />
                    </div>
                  </div>

                  {/* Submittals */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-primary mb-2">📋 Submittals</div>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <Stat label="Pending" value={r.submittals.pending} color={r.submittals.pending > 0 ? "text-yellow-400" : ""} />
                      <Stat label="Approved" value={r.submittals.approved} color="text-green-400" />
                    </div>
                  </div>

                  {/* Crew */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-primary mb-2">👷 Crew</div>
                    <Stat label="Active" value={r.crew.active} />
                  </div>

                  {/* Time */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-primary mb-2">⏱️ Time</div>
                    <Stat label="Hours" value={r.time.totalHours.toFixed(0)} />
                  </div>

                  {/* Daily Logs */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-primary mb-2">📝 Logs</div>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <Stat label="Total" value={r.dailyLogs.total} />
                      <Stat label="This Week" value={r.dailyLogs.recent} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(reports ?? []).length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-lg font-bold mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground text-sm">Create a project to see health scores and analytics.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() { return <AppShell><ReportsContent /></AppShell>; }
