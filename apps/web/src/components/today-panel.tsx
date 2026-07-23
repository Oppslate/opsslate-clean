"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { Badge } from "@opsslate/suite-ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";

const STORAGE_KEY = "opsslate_today_panel_sections";

function loadSectionState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveSectionState(state: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function SectionToggle({ id, title, count, color = "text-primary", children }: {
  id: string;
  title: string;
  count: number;
  color?: string;
  children: React.ReactNode;
}) {
  const [sections, setSections] = useState<Record<string, boolean>>(loadSectionState);
  const isOpen = sections[id] !== false; // default open

  const toggle = useCallback(() => {
    const next = { ...sections, [id]: !isOpen };
    setSections(next);
    saveSectionState(next);
  }, [sections, id, isOpen]);

  return (
    <div>
      <button onClick={toggle} className="flex items-center gap-2 w-full text-left group">
        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">{isOpen ? "▼" : "▶"}</span>
        <h4 className={`text-sm font-semibold ${color} flex-1`}>{title} ({count})</h4>
        {!isOpen && <Badge variant="outline" className="text-xs">{count} items</Badge>}
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function TodayPanel() {
  const { user } = useAuth();
  const data = useQuery(api.todayPanel.get, user ? { companyId: user.companyId } : "skip");
  const [panelOpen, setPanelOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("opsslate_today_panel_open") !== "false"; } catch { return true; }
  });

  const togglePanel = useCallback(() => {
    const next = !panelOpen;
    setPanelOpen(next);
    try { localStorage.setItem("opsslate_today_panel_open", String(next)); } catch { /* ignore */ }
  }, [panelOpen]);

  if (!data) return null;

  const hasAlerts =
    data.deliveriesToday.length > 0 ||
    data.deliveriesTomorrow.length > 0 ||
    data.lateDeliveries.length > 0 ||
    (data.incomingDeliveries?.length ?? 0) > 0 ||
    data.offRentWarnings.length > 0 ||
    data.criticalRFIs.length > 0 ||
    data.pendingApprovals.length > 0 ||
    data.upcomingPours.length > 0 ||
    (data.crewToday?.length ?? 0) > 0;

  const totalAlerts = data.deliveriesToday.length + data.deliveriesTomorrow.length + data.lateDeliveries.length + (data.incomingDeliveries?.length ?? 0) + data.offRentWarnings.length + data.criticalRFIs.length + data.pendingApprovals.length + data.upcomingPours.length + (data.crewToday?.length ?? 0);

  if (!hasAlerts) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 cursor-pointer" onClick={togglePanel}>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>📋 Today Panel</span>
            <span className="text-xs text-muted-foreground">{panelOpen ? "▼" : "▶"}</span>
          </CardTitle>
        </CardHeader>
        {panelOpen && (
          <CardContent>
            <p className="text-muted-foreground text-sm">✅ All clear — no actions needed right now.</p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 cursor-pointer select-none" onClick={togglePanel}>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            📋 Today Panel — {data.today}
            {!panelOpen && totalAlerts > 0 && (
              <Badge className="bg-orange-500/20 text-orange-400 text-xs">{totalAlerts} items</Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground hover:text-primary transition-colors">{panelOpen ? "▼ Collapse" : "▶ Expand"}</span>
        </CardTitle>
      </CardHeader>
      {panelOpen && (
        <CardContent className="space-y-4">
          {/* Off-Rent Warnings */}
          {data.offRentWarnings.length > 0 && (
            <SectionToggle id="offrent" title="🚨 Off-Rent Warnings" count={data.offRentWarnings.length} color="text-destructive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Weekly</TableHead>
                    <TableHead>Cost to Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.offRentWarnings.map((w) => (
                    <TableRow key={w._id}>
                      <TableCell>{w.projectName}</TableCell>
                      <TableCell>{w.vendor ?? ""}</TableCell>
                      <TableCell className="font-bold">{w.days}</TableCell>
                      <TableCell className="text-accent">${w.weekly.toFixed(0)}</TableCell>
                      <TableCell className="text-accent">${w.costToDate.toFixed(0)}</TableCell>
                      <TableCell><Badge variant="destructive">{w.reason}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionToggle>
          )}

          {/* Deliveries Today */}
          {data.deliveriesToday.length > 0 && (
            <SectionToggle id="delivToday" title="🚚 Deliveries Today" count={data.deliveriesToday.length} color="text-primary">
              {data.deliveriesToday.map((d) => (
                <div key={d._id} className="flex gap-4 text-sm py-1">
                  <span className="text-muted-foreground">{d.projectName}</span>
                  <span>{d.material}</span>
                  <span className="text-muted-foreground">{d.supplier}</span>
                </div>
              ))}
            </SectionToggle>
          )}

          {/* Deliveries Tomorrow */}
          {data.deliveriesTomorrow.length > 0 && (
            <SectionToggle id="delivTomorrow" title="📦 Deliveries Tomorrow" count={data.deliveriesTomorrow.length} color="text-muted-foreground">
              {data.deliveriesTomorrow.map((d) => (
                <div key={d._id} className="flex gap-4 text-sm py-1">
                  <span className="text-muted-foreground">{d.projectName}</span>
                  <span>{d.material}</span>
                  <span className="text-muted-foreground">{d.supplier}</span>
                </div>
              ))}
            </SectionToggle>
          )}

          {/* Late Deliveries */}
          {data.lateDeliveries.length > 0 && (
            <SectionToggle id="delivLate" title="⚠️ Late Deliveries" count={data.lateDeliveries.length} color="text-destructive">
              {data.lateDeliveries.map((d) => (
                <div key={d._id} className="flex gap-4 text-sm py-1">
                  <span className="text-muted-foreground">{d.projectName}</span>
                  <span>{d.material}</span>
                  <span className="text-destructive">ETA was {d.eta}</span>
                  <span className="text-muted-foreground">{d.supplier}</span>
                </div>
              ))}
            </SectionToggle>
          )}

          {/* Incoming Deliveries */}
          {(data.incomingDeliveries?.length ?? 0) > 0 && (
            <SectionToggle id="delivIncoming" title="📋 Incoming Deliveries" count={data.incomingDeliveries.length} color="text-blue-400">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ETA</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>PO</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.incomingDeliveries.map((d: Record<string, unknown>) => (
                    <TableRow key={d._id as string}>
                      <TableCell className="font-medium">{(d.eta as string) ?? ""}</TableCell>
                      <TableCell>{(d.projectName as string) ?? ""}</TableCell>
                      <TableCell>{(d.material as string) ?? ""}</TableCell>
                      <TableCell className="text-muted-foreground">{(d.supplier as string) ?? ""}</TableCell>
                      <TableCell className="text-muted-foreground">{(d.po as string) ?? ""}</TableCell>
                      <TableCell><Badge variant={(d.status as string) === "In Transit" ? "default" : "secondary"}>{(d.status as string) ?? "Scheduled"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionToggle>
          )}

          {/* Critical RFIs */}
          {data.criticalRFIs.length > 0 && (
            <SectionToggle id="rfis" title="📋 Critical RFIs" count={data.criticalRFIs.length} color="text-destructive">
              {data.criticalRFIs.map((r) => (
                <div key={r._id} className="flex gap-4 text-sm py-1">
                  <Badge variant={r.overdue ? "destructive" : "secondary"}>{r.daysOpen}d open</Badge>
                  <span>{r.number}</span>
                  <span>{r.subject}</span>
                  <span className="text-muted-foreground">{r.projectName}</span>
                  {r.ballInCourt && <span className="text-muted-foreground">→ {r.ballInCourt}</span>}
                </div>
              ))}
            </SectionToggle>
          )}

          {/* Pending Approvals */}
          {data.pendingApprovals.length > 0 && (
            <SectionToggle id="approvals" title="✍️ Pending Approvals" count={data.pendingApprovals.length}>
              {data.pendingApprovals.map((s) => (
                <div key={s._id} className="flex gap-4 text-sm py-1">
                  <Badge variant="secondary">{s.daysWaiting}d waiting</Badge>
                  <span>{s.description ?? s.number}</span>
                  <span className="text-muted-foreground">{s.projectName}</span>
                </div>
              ))}
            </SectionToggle>
          )}

          {/* Upcoming Pours */}
          {data.upcomingPours.length > 0 && (
            <SectionToggle id="pours" title="🏗️ Upcoming Concrete Pours" count={data.upcomingPours.length}>
              {data.upcomingPours.map((c) => (
                <div key={c._id} className="flex gap-4 text-sm py-1">
                  <span className="font-medium">{c.date}</span>
                  <span>{c.pour}</span>
                  <span>{c.cy} CY</span>
                  <span className="text-muted-foreground">{c.projectName}</span>
                  {c.weatherRisk && <Badge variant="destructive">{c.weatherRisk}</Badge>}
                </div>
              ))}
            </SectionToggle>
          )}

          {/* Crew Starting Today */}
          {(data.crewToday?.length ?? 0) > 0 && (
            <SectionToggle id="crew" title="👷 Crew Starting Today" count={data.crewToday.length}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.crewToday.map((m: Record<string, unknown>) => (
                    <TableRow key={m._id as string}>
                      <TableCell className="font-medium">{m.firstName as string}{m.lastName ? " " + (m.lastName as string) : ""}</TableCell>
                      <TableCell>{(m.trade as string) ?? ""}</TableCell>
                      <TableCell>{(m.task as string) ?? ""}</TableCell>
                      <TableCell>{(m.projectName as string) ?? ""}</TableCell>
                      <TableCell>{(m.location as string) ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionToggle>
          )}
        </CardContent>
      )}
    </Card>
  );
}
