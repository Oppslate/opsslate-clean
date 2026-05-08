
"use client";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { LiveVoiceInput } from "@/components/voice-recorder";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

function fmt(n: number) { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function TimeContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const crew = useQuery(api.crew.listByCompany, user ? { companyId: user.companyId } : "skip");
  const [filterProject, setFilterProject] = useState("");
  const [search, setSearch] = useState("");
  const entries = useQuery(api.timeTracking.list, user ? { companyId: user.companyId, projectId: filterProject || undefined } : "skip") as any[] | undefined;
  const stats = useQuery(api.timeTracking.stats, user ? { companyId: user.companyId, projectId: filterProject || undefined } : "skip");
  const createEntry = useMutation(api.timeTracking.create);
  const approveEntry = useMutation(api.timeTracking.approve);
  const removeEntry = useMutation(api.timeTracking.remove);
  const clockIn = useMutation(api.clockInOut.clockIn);
  const clockOut = useMutation(api.clockInOut.clockOut);
  const activeClockIn = useQuery(api.clockInOut.getActiveClockIn, user ? { companyId: user.companyId, userId: user.name } : "skip") as any;
  const [clockProject, setClockProject] = useState("");
  const [clockElapsed, setClockElapsed] = useState("");

  // Live timer for active clock-in
  useEffect(() => {
    if (!activeClockIn?.clockInTime) { setClockElapsed(""); return; }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - activeClockIn.clockInTime) / 1000;
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = Math.floor(elapsed % 60);
      setClockElapsed(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeClockIn]);
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [fProject, setFProject] = useState(""); const [fCrew, setFCrew] = useState(""); const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fHours, setFHours] = useState("8"); const [fOT, setFOT] = useState(""); const [fRate, setFRate] = useState(""); const [fCode, setFCode] = useState(""); const [fDesc, setFDesc] = useState("");

  const filtered = useMemo(() => { if (!entries) return []; if (!search) return entries; return entries.filter((e) => JSON.stringify(e).toLowerCase().includes(search.toLowerCase())); }, [entries, search]);

  const handleAdd = async () => {
    const crewMember = (crew ?? []).find((c: any) => c._id === fCrew);
    if (!fProject || !fCrew || !fHours) { toast("Required", "error"); return; }
    await createEntry({ companyId: user!.companyId, projectId: fProject as Id<"projects">, crewMemberId: fCrew, crewMemberName: crewMember ? `${crewMember.firstName} ${crewMember.lastName}` : fCrew, trade: crewMember?.trade, date: fDate, hoursRegular: Number(fHours), hoursOvertime: fOT ? Number(fOT) : undefined, rateRegular: fRate ? Number(fRate) : undefined, costCode: fCode || undefined, description: fDesc || undefined });
    toast("Entry added", "success"); setShowAdd(false);
  };

  if (!user) return null;
  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">⏱️ Time Tracking</h1>
      <p className="text-muted-foreground text-sm mb-4">Track crew hours, overtime, and labor costs</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{stats.totalEntries}</div><div className="text-xs text-muted-foreground">Entries</div></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{stats.totalRegular.toFixed(1)}</div><div className="text-xs text-muted-foreground">Regular Hours</div></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-yellow-400">{stats.totalOT.toFixed(1)}</div><div className="text-xs text-muted-foreground">OT Hours</div></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-green-400">{fmt(stats.totalCost)}</div><div className="text-xs text-muted-foreground">Labor Cost</div></CardContent></Card>
          <Card className={`border-border ${stats.pending > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-card"}`}><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-yellow-400">{stats.pending}</div><div className="text-xs text-muted-foreground">Pending Approval</div></CardContent></Card>
        </div>
      )}

      {/* One-Tap Clock In/Out */}
      <Card className={`mb-4 border-2 ${activeClockIn ? "bg-green-500/10 border-green-500/40" : "bg-card border-border"}`}>
        <CardContent className="p-4">
          {activeClockIn ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <div className="font-bold text-green-400">⏱️ CLOCKED IN — {activeClockIn.crewMemberName}</div>
                  <div className="text-sm text-muted-foreground">{activeClockIn.trade || "General"} • Started {new Date(activeClockIn.clockInTime).toLocaleTimeString()}</div>
                </div>
                <div className="text-3xl font-mono font-bold text-green-400">{clockElapsed}</div>
              </div>
              <Button variant="destructive" size="lg" onClick={() => clockOut({ id: activeClockIn._id }).then(() => toast("Clocked out!", "success"))} className="text-lg px-8">
                🛑 Clock Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={clockProject} onChange={(e) => setClockProject(e.target.value)}>
                <option value="">Select Project...</option>
                {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <Button size="lg" disabled={!clockProject} onClick={() => {
                clockIn({ companyId: user!.companyId, projectId: clockProject as any, crewMemberName: user!.name, clockedInBy: user!.name }).then(() => toast("Clocked in!", "success"));
              }} className="text-lg px-8 gap-2">
                ▶️ Clock In
              </Button>
              <span className="text-sm text-muted-foreground">One tap. Auto-calculates hours + OT.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setShowAdd(true)} addLabel="Add Time Entry" onExport={() => exportCSV(["Date","Name","Trade","Project","Regular","OT","Rate","Cost","Status"], filtered.map((e: any) => [e.date,e.crewMemberName,e.trade??"",e.projectName,String(e.hoursRegular),String(e.hoursOvertime??0),String(e.rateRegular??0),e.totalCost.toFixed(2),e.status??""]), "time-entries.csv")}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}><option value="">All Projects</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
      </TableToolbar>

      {showAdd && (
        <Card className="bg-secondary/30 border-border mb-3"><CardContent className="p-3">
          <div className="grid grid-cols-8 gap-2 items-end">
            <div><label className="text-xs">Project</label><select className="w-full bg-secondary border border-border rounded-lg px-2 py-2 text-sm" value={fProject} onChange={(e) => setFProject(e.target.value)}><option value="">...</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
            <div><label className="text-xs">Crew</label><select className="w-full bg-secondary border border-border rounded-lg px-2 py-2 text-sm" value={fCrew} onChange={(e) => setFCrew(e.target.value)}><option value="">...</option>{(crew ?? []).map((c: any) => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}</select></div>
            <div><label className="text-xs">Date</label><Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" /></div>
            <div><label className="text-xs">Regular Hrs</label><Input type="number" value={fHours} onChange={(e) => setFHours(e.target.value)} /></div>
            <div><label className="text-xs">OT Hrs</label><Input type="number" value={fOT} onChange={(e) => setFOT(e.target.value)} /></div>
            <div><label className="text-xs">Rate ($/hr)</label><Input type="number" value={fRate} onChange={(e) => setFRate(e.target.value)} /></div>
            <div><label className="text-xs">Cost Code</label><Input value={fCode} onChange={(e) => setFCode(e.target.value)} /></div>
            <div className="flex gap-1"><Button size="sm" onClick={handleAdd}>Add</Button><Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>✕</Button></div>
          </div>
        </CardContent></Card>
      )}

      <Card className="bg-card border-border"><Table><TableHeader><TableRow>
        <TableHead>Date</TableHead><TableHead>Name</TableHead><TableHead>Trade</TableHead><TableHead>Project</TableHead>
        <TableHead className="text-right">Regular</TableHead><TableHead className="text-right">OT</TableHead>
        <TableHead className="text-right">Total Hrs</TableHead><TableHead className="text-right">Cost</TableHead>
        <TableHead>Status</TableHead><TableHead>Actions</TableHead>
      </TableRow></TableHeader><TableBody>
        {filtered.slice(0, 100).map((entry: any) => (
          <TableRow key={entry._id}>
            <TableCell className="text-sm">{entry.date}</TableCell>
            <TableCell className="font-medium text-sm">{entry.crewMemberName}</TableCell>
            <TableCell><Badge variant="outline">{entry.trade || "—"}</Badge></TableCell>
            <TableCell className="text-sm">{entry.projectName}</TableCell>
            <TableCell className="text-right text-sm">{entry.hoursRegular}</TableCell>
            <TableCell className="text-right text-sm text-yellow-400">{entry.hoursOvertime ?? 0}</TableCell>
            <TableCell className="text-right text-sm font-medium">{entry.totalHours.toFixed(1)}</TableCell>
            <TableCell className="text-right text-sm text-green-400">{entry.totalCost > 0 ? fmt(entry.totalCost) : "—"}</TableCell>
            <TableCell><Badge variant={entry.status === "approved" ? "default" : "secondary"}>{entry.status ?? "pending"}</Badge></TableCell>
            <TableCell><div className="flex gap-1">
              {entry.status !== "approved" && <Button size="sm" variant="outline" onClick={() => approveEntry({ id: entry._id, approvedBy: user!.name }).then(() => toast("Approved", "success"))}>✓</Button>}
              <Button size="sm" variant="destructive" onClick={() => removeEntry({ id: entry._id }).then(() => toast("Removed", "success"))}>✕</Button>
            </div></TableCell>
          </TableRow>
        ))}
      </TableBody></Table>
      {filtered.length === 0 && <EmptyState icon="⏱️" title="No time entries" description="Track crew hours and labor costs" actionLabel="+ Add Entry" onAction={() => setShowAdd(true)} />}
      </Card>
    </div>
  );
}

export default function TimeTrackingPage() { return <AppShell><TimeContent /></AppShell>; }
