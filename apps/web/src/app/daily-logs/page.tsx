
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import { LiveVoiceInput } from "@/components/voice-recorder";
import Link from "next/link";

interface ManpowerEntry { trade: string; company?: string; headcount: number; hours?: number }
interface EquipmentEntry { name: string; status?: string; hours?: number }
interface DelayEntry { description: string; cause?: string; hoursLost?: number }
interface VisitorEntry { name: string; company?: string; purpose?: string }

function DailyLogForm({ projectId, onClose, existingLog }: {
  projectId: string;
  onClose: () => void;
  existingLog?: Record<string, unknown>;
}) {
  const { user } = useAuth();
  const createLog = useMutation(api.dailyLogs.create);
  const updateLog = useMutation(api.dailyLogs.update);
  const generateAILog = useAction(api.aiDailyLog.generate);
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState((existingLog?.date as string) ?? today);
  const [weather, setWeather] = useState((existingLog?.weatherCondition as string) ?? "");
  const [tempHigh, setTempHigh] = useState<number | undefined>(existingLog?.tempHigh as number);
  const [tempLow, setTempLow] = useState<number | undefined>(existingLog?.tempLow as number);
  const [wind, setWind] = useState((existingLog?.wind as string) ?? "");
  const [precipitation, setPrecipitation] = useState((existingLog?.precipitation as string) ?? "");
  const [manpower, setManpower] = useState<ManpowerEntry[]>((existingLog?.manpower as ManpowerEntry[]) ?? [{ trade: "", headcount: 0 }]);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>((existingLog?.equipmentOnSite as EquipmentEntry[]) ?? []);
  const [workPerformed, setWorkPerformed] = useState((existingLog?.workPerformed as string) ?? "");
  const [delays, setDelays] = useState<DelayEntry[]>((existingLog?.delays as DelayEntry[]) ?? []);
  const [visitors, setVisitors] = useState<VisitorEntry[]>((existingLog?.visitors as VisitorEntry[]) ?? []);
  const [safetyIncidents, setSafetyIncidents] = useState((existingLog?.safetyIncidents as string) ?? "");
  const [toolboxTalk, setToolboxTalk] = useState((existingLog?.toolboxTalk as string) ?? "");
  const [notes, setNotes] = useState((existingLog?.notes as string) ?? "");
  const [saving, setSaving] = useState(false);

  const totalManpower = manpower.reduce((sum, m) => sum + (m.headcount || 0), 0);

  const handleSave = async (status: string) => {
    setSaving(true);
    try {
      const data = {
        weatherCondition: weather || undefined,
        tempHigh: tempHigh ?? undefined,
        tempLow: tempLow ?? undefined,
        wind: wind || undefined,
        precipitation: precipitation || undefined,
        manpower: manpower.filter((m) => m.trade),
        totalManpower,
        equipmentOnSite: equipment.filter((e) => e.name),
        workPerformed: workPerformed || undefined,
        delays: delays.filter((d) => d.description),
        visitors: visitors.filter((v) => v.name),
        safetyIncidents: safetyIncidents || undefined,
        toolboxTalk: toolboxTalk || undefined,
        notes: notes || undefined,
        status,
      };

      if (existingLog) {
        await updateLog({ id: existingLog._id as Id<"dailyLogs">, ...data });
      } else {
        await createLog({
          companyId: user!.companyId,
          projectId: projectId as Id<"projects">,
          date,
          createdBy: user!.name,
          ...data,
        });
      }
      toast(status === "submitted" ? "Daily log submitted" : "Draft saved", "success");
      onClose();
    } catch (e) {
      toast("Error: " + (e as Error).message, "error");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-bold text-lg">{existingLog ? "Edit Daily Log" : "New Daily Log"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">x</button>
        </div>

        <div className="p-4 space-y-6">
          {/* Date */}
          <div>
            <label className="text-sm font-semibold block mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="w-48 cursor-pointer" />
          </div>

          {/* Weather */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Weather Conditions</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Condition</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={weather} onChange={(e) => setWeather(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Clear">Clear</option>
                  <option value="Partly Cloudy">Partly Cloudy</option>
                  <option value="Cloudy">Cloudy</option>
                  <option value="Rain">Rain</option>
                  <option value="Snow">Snow</option>
                  <option value="Fog">Fog</option>
                  <option value="Windy">Windy</option>
                  <option value="Extreme Heat">Extreme Heat</option>
                  <option value="Extreme Cold">Extreme Cold</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">High (F)</label>
                <Input type="number" value={tempHigh ?? ""} onChange={(e) => setTempHigh(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Low (F)</label>
                <Input type="number" value={tempLow ?? ""} onChange={(e) => setTempLow(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Wind</label>
                <Input value={wind} onChange={(e) => setWind(e.target.value)} placeholder="10 mph NW" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Precipitation</label>
                <Input value={precipitation} onChange={(e) => setPrecipitation(e.target.value)} placeholder="None / 0.5 in" />
              </div>
            </div>
          </div>

          {/* Manpower */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Manpower <Badge variant="outline" className="ml-2">{totalManpower} total</Badge></h4>
              <Button size="sm" variant="outline" onClick={() => setManpower([...manpower, { trade: "", headcount: 0 }])}>+ Add Trade</Button>
            </div>
            {manpower.map((m, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                <Input placeholder="Trade" value={m.trade} onChange={(e) => { const n = [...manpower]; n[i] = { ...m, trade: e.target.value }; setManpower(n); }} />
                <Input placeholder="Company/Sub" value={m.company ?? ""} onChange={(e) => { const n = [...manpower]; n[i] = { ...m, company: e.target.value }; setManpower(n); }} />
                <Input type="number" placeholder="Headcount" value={m.headcount || ""} onChange={(e) => { const n = [...manpower]; n[i] = { ...m, headcount: Number(e.target.value) || 0 }; setManpower(n); }} />
                <div className="flex gap-1">
                  <Input type="number" placeholder="Hours" value={m.hours ?? ""} onChange={(e) => { const n = [...manpower]; n[i] = { ...m, hours: Number(e.target.value) || undefined }; setManpower(n); }} />
                  <Button size="sm" variant="destructive" onClick={() => setManpower(manpower.filter((_, j) => j !== i))}>X</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Equipment On Site</h4>
              <Button size="sm" variant="outline" onClick={() => setEquipment([...equipment, { name: "" }])}>+ Add Equipment</Button>
            </div>
            {equipment.map((eq, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <Input placeholder="Equipment name" value={eq.name} onChange={(e) => { const n = [...equipment]; n[i] = { ...eq, name: e.target.value }; setEquipment(n); }} />
                <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={eq.status ?? ""} onChange={(e) => { const n = [...equipment]; n[i] = { ...eq, status: e.target.value }; setEquipment(n); }}>
                  <option value="">Status...</option>
                  <option value="Operating">Operating</option>
                  <option value="Idle">Idle</option>
                  <option value="Down">Down</option>
                </select>
                <div className="flex gap-1">
                  <Input type="number" placeholder="Hours" value={eq.hours ?? ""} onChange={(e) => { const n = [...equipment]; n[i] = { ...eq, hours: Number(e.target.value) || undefined }; setEquipment(n); }} />
                  <Button size="sm" variant="destructive" onClick={() => setEquipment(equipment.filter((_, j) => j !== i))}>X</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Work Performed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Work Performed</h4>
              <div className="flex gap-2">
                <LiveVoiceInput onTranscript={(t) => setWorkPerformed((prev) => prev ? prev + " " + t : t)} />
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!projectId) { toast("Select a project first", "error"); return; }
                  setWorkPerformed("🔄 Generating with AI...");
                  try {
                    const result = await generateAILog({
                      companyId: user!.companyId,
                      projectId: projectId as any,
                      projectName: projectId,
                      date,
                      crewOnSite: manpower.filter((m) => m.trade).map((m) => ({ name: m.company || m.trade, trade: m.trade })),
                      timeEntries: [],
                      punchItems: [],
                      changeOrders: [],
                      incidents: [],
                      rfis: [],
                      submittals: [],
                      weather: `${weather || ""} ${tempHigh ? tempHigh + "°F" : ""}`.trim() || undefined,
                      notes: notes || undefined,
                    });
                    setWorkPerformed(result || "");
                    toast("AI log generated!", "success");
                  } catch (e) { setWorkPerformed(""); toast("AI generation failed: " + (e as Error).message, "error"); }
                }} className="gap-1">🧠 AI Generate</Button>
              </div>
            </div>
            <Textarea rows={4} value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} placeholder="Describe all work performed today... or use 🎙️ Voice / 🧠 AI Generate" />
          </div>

          {/* Delays */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Delays</h4>
              <Button size="sm" variant="outline" onClick={() => setDelays([...delays, { description: "" }])}>+ Add Delay</Button>
            </div>
            {delays.map((d, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <Input placeholder="Description" value={d.description} onChange={(e) => { const n = [...delays]; n[i] = { ...d, description: e.target.value }; setDelays(n); }} />
                <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={d.cause ?? ""} onChange={(e) => { const n = [...delays]; n[i] = { ...d, cause: e.target.value }; setDelays(n); }}>
                  <option value="">Cause...</option>
                  <option value="Weather">Weather</option>
                  <option value="Material">Material Shortage</option>
                  <option value="Equipment">Equipment Failure</option>
                  <option value="Labor">Labor Shortage</option>
                  <option value="Design">Design Issue</option>
                  <option value="Permit">Permit/Inspection</option>
                  <option value="Owner">Owner Directed</option>
                  <option value="Other">Other</option>
                </select>
                <div className="flex gap-1">
                  <Input type="number" placeholder="Hours lost" value={d.hoursLost ?? ""} onChange={(e) => { const n = [...delays]; n[i] = { ...d, hoursLost: Number(e.target.value) || undefined }; setDelays(n); }} />
                  <Button size="sm" variant="destructive" onClick={() => setDelays(delays.filter((_, j) => j !== i))}>X</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Visitors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Visitors</h4>
              <Button size="sm" variant="outline" onClick={() => setVisitors([...visitors, { name: "" }])}>+ Add Visitor</Button>
            </div>
            {visitors.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <Input placeholder="Name" value={v.name} onChange={(e) => { const n = [...visitors]; n[i] = { ...v, name: e.target.value }; setVisitors(n); }} />
                <Input placeholder="Company" value={v.company ?? ""} onChange={(e) => { const n = [...visitors]; n[i] = { ...v, company: e.target.value }; setVisitors(n); }} />
                <div className="flex gap-1">
                  <Input placeholder="Purpose" value={v.purpose ?? ""} onChange={(e) => { const n = [...visitors]; n[i] = { ...v, purpose: e.target.value }; setVisitors(n); }} />
                  <Button size="sm" variant="destructive" onClick={() => setVisitors(visitors.filter((_, j) => j !== i))}>X</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Safety */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Safety Incidents</h4>
              <Textarea rows={2} value={safetyIncidents} onChange={(e) => setSafetyIncidents(e.target.value)} placeholder="None / describe any incidents..." />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Toolbox Talk Topic</h4>
              <Input value={toolboxTalk} onChange={(e) => setToolboxTalk(e.target.value)} placeholder="Fall protection, heat stress, etc." />
            </div>
          </div>

          {/* Notes */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Additional Notes</h4>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any other notes..." />
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-between sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => handleSave("draft")}>
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button disabled={saving} onClick={() => handleSave("submitted")}>
              {saving ? "Submitting..." : "Submit Log"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyLogsContent() {
  const { user } = useAuth();
  const logs = useQuery(api.dailyLogs.list, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const removeLog = useMutation(api.dailyLogs.remove);
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState<Record<string, unknown> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!logs) return [];
    let r = logs;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
    }
    if (filterProject) r = r.filter((x) => x.projectId === filterProject);
    return r;
  }, [logs, search, filterProject]);

  const handleExport = () => {
    const headers = ["Date", "Project", "Weather", "Temp", "Manpower", "Work Performed", "Delays", "Status"];
    const rows = filtered.map((l) => [
      (l.date as string) ?? "",
      (l.projectName as string) ?? "",
      (l.weatherCondition as string) ?? "",
      l.tempHigh ? `${l.tempHigh}/${l.tempLow}` : "",
      String(l.totalManpower ?? 0),
      ((l.workPerformed as string) ?? "").slice(0, 100),
      String((l.delays as any[])?.length ?? 0),
      (l.status as string) ?? "",
    ]);
    exportCSV(headers, rows, "daily-logs.csv");
  };

  if (!user) return null;

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">Daily Logs</h1>
      <p className="text-muted-foreground text-sm mb-4">Daily field reports — weather, manpower, work performed, delays, safety</p>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => { setEditLog(null); setShowForm(true); }}
        addLabel="New Daily Log"
        onExport={handleExport}
      >
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
        </select>
      </TableToolbar>

      {/* Log cards */}
      <div className="space-y-3">
        {filtered.map((l) => {
          const isExpanded = expandedId === (l._id as string);
          return (
            <Card key={l._id as string} className="bg-card border-border">
              <div
                className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : (l._id as string))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{l.date as string}</span>
                    <Badge variant="outline">{l.projectName as string}</Badge>
                    <Badge variant={(l.status as string) === "submitted" ? "default" : "secondary"}>
                      {(l.status as string) ?? "draft"}
                    </Badge>
                    {Boolean(l.weatherCondition) && <span className="text-xs text-muted-foreground">{l.weatherCondition as string} {l.tempHigh ? `${l.tempHigh}°/${l.tempLow}°F` : ""}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{String(l.totalManpower ?? 0)} workers</span>
                    {Boolean((l.delays as any[])?.length > 0) && <Badge variant="destructive">{String((l.delays as any[]).length)} delays</Badge>}
                    <span>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>
                {Boolean(l.workPerformed) && !isExpanded && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-2xl">{(l.workPerformed as string).slice(0, 150)}</p>
                )}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Work Performed */}
                  {Boolean(l.workPerformed) && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">WORK PERFORMED</h4>
                      <p className="text-sm whitespace-pre-wrap">{l.workPerformed as string}</p>
                    </div>
                  )}

                  {/* Manpower */}
                  {(l.manpower as any[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">MANPOWER ({String(l.totalManpower ?? 0)})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(l.manpower as ManpowerEntry[]).map((m, i) => (
                          <div key={i} className="bg-secondary/30 rounded px-3 py-2 text-sm">
                            <span className="font-medium">{m.trade}</span>
                            <span className="text-muted-foreground ml-1">x{m.headcount}</span>
                            {m.company && <span className="text-xs text-muted-foreground block">{m.company}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {(l.equipmentOnSite as any[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">EQUIPMENT ON SITE</h4>
                      <div className="flex flex-wrap gap-2">
                        {(l.equipmentOnSite as EquipmentEntry[]).map((eq, i) => (
                          <Badge key={i} variant={eq.status === "Down" ? "destructive" : eq.status === "Idle" ? "secondary" : "outline"}>
                            {eq.name} {eq.status ? `(${eq.status})` : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delays */}
                  {Boolean((l.delays as any[])?.length > 0) && (
                    <div>
                      <h4 className="text-xs font-bold text-destructive mb-1">DELAYS</h4>
                      <ul className="space-y-1">
                        {(l.delays as DelayEntry[]).map((d, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-destructive">•</span>
                            <span>{d.description}{d.cause ? ` (${d.cause})` : ""}{d.hoursLost ? ` — ${d.hoursLost}hrs lost` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Visitors */}
                  {(l.visitors as any[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">VISITORS</h4>
                      <ul className="space-y-1">
                        {(l.visitors as VisitorEntry[]).map((v, i) => (
                          <li key={i} className="text-sm">{v.name}{v.company ? ` — ${v.company}` : ""}{v.purpose ? ` (${v.purpose})` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Safety */}
                  {(Boolean(l.safetyIncidents) || Boolean(l.toolboxTalk)) && (
                    <div className="grid grid-cols-2 gap-4">
                      {Boolean(l.safetyIncidents) && (
                        <div>
                          <h4 className="text-xs font-bold text-yellow-400 mb-1">SAFETY INCIDENTS</h4>
                          <p className="text-sm">{l.safetyIncidents as string}</p>
                        </div>
                      )}
                      {Boolean(l.toolboxTalk) && (
                        <div>
                          <h4 className="text-xs font-bold text-primary mb-1">TOOLBOX TALK</h4>
                          <p className="text-sm">{l.toolboxTalk as string}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {Boolean(l.notes) && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">NOTES</h4>
                      <p className="text-sm whitespace-pre-wrap">{l.notes as string}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditLog(l); setShowForm(true); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={async () => { await removeLog({ id: l._id as Id<"dailyLogs"> }); toast("Log deleted", "success"); }}>Delete</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon="L"
            title="No daily logs yet"
            description="Start documenting daily field activity — weather, manpower, work performed, and delays."
            actionLabel="+ New Daily Log"
            onAction={() => { setEditLog(null); setShowForm(true); }}
          />
        )}
      </div>

      {showForm && (
        <DailyLogForm
          projectId={filterProject || (projects?.[0]?._id ?? "")}
          onClose={() => { setShowForm(false); setEditLog(null); }}
          existingLog={editLog ?? undefined}
        />
      )}
    </div>
  );
}

export default function DailyLogsPage() {
  return <AppShell><DailyLogsContent /></AppShell>;
}
