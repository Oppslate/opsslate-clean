"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@opsslate/suite-ui/badge";

interface Alert {
  id: string;
  type: string;
  icon: string;
  text: string;
  severity: "critical" | "warning" | "info";
  href: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Pull live data to generate alerts
  const reports = useQuery(api.reporting.projectHealth, user ? { companyId: user.companyId } : "skip") as any[] | undefined;

  const alerts = useMemo(() => {
    if (!reports) return [];
    const items: Alert[] = [];

    for (const r of reports) {
      if (r.punch.overdue > 0) items.push({ id: `punch-${r.projectId}`, type: "punch", icon: "✅", text: `${r.punch.overdue} overdue punch items — ${r.projectName}`, severity: "warning", href: "/punch-list" });
      if (r.safety.critical > 0) items.push({ id: `safety-${r.projectId}`, type: "safety", icon: "🦺", text: `${r.safety.critical} critical incidents — ${r.projectName}`, severity: "critical", href: "/safety" });
      if (r.safety.open > 0) items.push({ id: `safety-open-${r.projectId}`, type: "safety", icon: "🦺", text: `${r.safety.open} open incidents — ${r.projectName}`, severity: "warning", href: "/safety" });
      if (r.changeOrders.pending > 0) items.push({ id: `co-${r.projectId}`, type: "co", icon: "🔄", text: `${r.changeOrders.pending} pending COs — ${r.projectName}`, severity: "info", href: "/change-orders" });
      if (r.rfis.open > 0) items.push({ id: `rfi-${r.projectId}`, type: "rfi", icon: "❓", text: `${r.rfis.open} open RFIs — ${r.projectName}`, severity: "info", href: "/rfis" });
      if (r.submittals.pending > 0) items.push({ id: `sub-${r.projectId}`, type: "sub", icon: "📋", text: `${r.submittals.pending} pending submittals — ${r.projectName}`, severity: "info", href: "/submittals" });
      if (r.healthScore < 60) items.push({ id: `health-${r.projectId}`, type: "health", icon: "📊", text: `Project health critical (${r.healthScore}) — ${r.projectName}`, severity: "critical", href: `/project/${r.projectId}` });
    }

    // Sort: critical first
    items.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
    return items;
  }, [reports]);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const totalCount = alerts.length;

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-secondary transition-colors" title="Notifications">
        <span className="text-xl">🔔</span>
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center ${criticalCount > 0 ? "bg-red-500" : "bg-yellow-500"} text-white`}>
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm">Notifications</h3>
              <Badge variant={criticalCount > 0 ? "destructive" : "secondary"}>{totalCount} alerts</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {alerts.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">✅ All clear — no alerts</div>
              )}
              {alerts.map((a) => (
                <a key={a.id} href={a.href} onClick={() => setOpen(false)} className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 border-b border-border last:border-0 ${a.severity === "critical" ? "bg-red-500/5" : ""}`}>
                  <span className="text-lg mt-0.5">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.text}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full mt-2 ${a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-yellow-500" : "bg-blue-500"}`} />
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
