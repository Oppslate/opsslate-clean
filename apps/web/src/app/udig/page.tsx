
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Badge } from "@opsslate/suite-ui/badge";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { SkeletonTable } from "@opsslate/suite-ui/skeleton";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import { TableToolbar, exportCSV } from "@opsslate/suite-ui/table-toolbar";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const STATUSES = ["Open", "Pending", "Marked", "Complete", "Expired"];
const STATES = ["NY", "PA", "OH", "CT", "NJ", "MA", "FL", "TX", "CA", "IL", "Other"];

function Content() {
  const { user } = useAuth();
  const { toast } = useToast();

  const tickets = useQuery(api.udigTickets.list, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;

  const createTicket = useMutation(api.udigTickets.create);
  const updateTicket = useMutation(api.udigTickets.update);
  const removeTicket = useMutation(api.udigTickets.remove);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailTicket, setDetailTicket] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [formProject, setFormProject] = useState("");
  const [formDateCalled, setFormDateCalled] = useState(new Date().toISOString().slice(0, 10));
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("NY");
  const [formTicketNumber, setFormTicketNumber] = useState("");
  const [formEmailCopy, setFormEmailCopy] = useState("");
  const [formCompletionDate, setFormCompletionDate] = useState("");
  const [formStatus, setFormStatus] = useState("Open");
  const [formNotes, setFormNotes] = useState("");

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    (projects ?? []).forEach((p) => m.set(String(p._id), String(p.name ?? "")));
    return m;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    let r = [...tickets];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((t) => JSON.stringify(t).toLowerCase().includes(q));
    }
    if (filterProject) r = r.filter((t) => String(t.projectId ?? "") === filterProject);
    if (filterStatus) r = r.filter((t) => String(t.status ?? "") === filterStatus);
    return r.sort((a, b) => String(b.dateCalled ?? "").localeCompare(String(a.dateCalled ?? "")));
  }, [tickets, search, filterProject, filterStatus]);

  const resetForm = () => {
    setFormProject("");
    setFormDateCalled(new Date().toISOString().slice(0, 10));
    setFormAddress("");
    setFormCity("");
    setFormState("NY");
    setFormTicketNumber("");
    setFormEmailCopy("");
    setFormCompletionDate("");
    setFormStatus("Open");
    setFormNotes("");
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (t: Record<string, unknown>) => {
    setEditId(String(t._id));
    setFormProject(String(t.projectId ?? ""));
    setFormDateCalled(String(t.dateCalled ?? ""));
    setFormAddress(String(t.address ?? ""));
    setFormCity(String(t.city ?? ""));
    setFormState(String(t.state ?? "NY"));
    setFormTicketNumber(String(t.ticketNumber ?? ""));
    setFormEmailCopy(String(t.emailCopy ?? ""));
    setFormCompletionDate(String(t.completionDate ?? ""));
    setFormStatus(String(t.status ?? "Open"));
    setFormNotes(String(t.notes ?? ""));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !formAddress || !formTicketNumber || !formDateCalled) {
      toast("Please fill in Date Called, Address, and Ticket Number", "error");
      return;
    }

    try {
      if (editId) {
        await updateTicket({
          id: editId as Id<"udigTickets">,
          projectId: formProject || undefined,
          dateCalled: formDateCalled,
          address: formAddress,
          city: formCity,
          state: formState,
          ticketNumber: formTicketNumber,
          emailCopy: formEmailCopy || undefined,
          completionDate: formCompletionDate || undefined,
          status: formStatus,
          notes: formNotes || undefined,
        });
        toast("✅ U-Dig ticket updated", "success");
      } else {
        await createTicket({
          companyId: user.companyId,
          projectId: formProject || undefined,
          dateCalled: formDateCalled,
          address: formAddress,
          city: formCity,
          state: formState,
          ticketNumber: formTicketNumber,
          emailCopy: formEmailCopy || undefined,
          completionDate: formCompletionDate || undefined,
          status: formStatus,
          notes: formNotes || undefined,
        });
        toast("✅ U-Dig ticket created & added to project communications", "success");
      }
      resetForm();
    } catch (e: any) {
      toast(`❌ ${e.message}`, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this U-Dig ticket?")) return;
    await removeTicket({ id: id as Id<"udigTickets"> });
    toast("Ticket deleted", "success");
  };

  const handleExport = () => {
    const headers = ["Ticket #", "Project", "Date Called", "Address", "City", "State", "Completion Date", "Status", "Notes"];
    const rows = filtered.map((t) => [
      String(t.ticketNumber ?? ""),
      projectMap.get(String(t.projectId ?? "")) ?? "",
      String(t.dateCalled ?? ""),
      String(t.address ?? ""),
      String(t.city ?? ""),
      String(t.state ?? ""),
      String(t.completionDate ?? ""),
      String(t.status ?? ""),
      String(t.notes ?? ""),
    ]);
    exportCSV(headers, rows, "udig-tickets.csv");
  };

  // KPI Stats
  const stats = useMemo(() => {
    const all = tickets ?? [];
    return {
      total: all.length,
      open: all.filter((t) => t.status === "Open" || t.status === "Pending").length,
      complete: all.filter((t) => t.status === "Complete" || t.status === "Marked").length,
      expired: all.filter((t) => t.status === "Expired").length,
    };
  }, [tickets]);

  const statusColor = (s: string) => {
    switch (s) {
      case "Open": return "bg-blue-500/20 text-blue-400";
      case "Pending": return "bg-yellow-500/20 text-yellow-400";
      case "Marked": return "bg-green-500/20 text-green-400";
      case "Complete": return "bg-green-600/20 text-green-500";
      case "Expired": return "bg-red-500/20 text-red-400";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  if (!user || !tickets || !projects) return <SkeletonTable rows={6} cols={8} />;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold mb-1">🔧 U-Dig Utility Locates</h1>
          <p className="text-muted-foreground text-sm">Track utility locate tickets — auto-adds to project communications</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Tickets</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-xs text-muted-foreground">Open / Pending</div>
          <div className="text-2xl font-bold text-blue-400">{stats.open}</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-xs text-muted-foreground">Marked / Complete</div>
          <div className="text-2xl font-bold text-green-400">{stats.complete}</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-xs text-muted-foreground">Expired</div>
          <div className="text-2xl font-bold text-red-400">{stats.expired}</div>
        </CardContent></Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-card border-border mb-4">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">{editId ? "Edit" : "New"} U-Dig Ticket</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Project</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={formProject} onChange={(e) => setFormProject(e.target.value)}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={String(p._id)} value={String(p._id)}>{String(p.name ?? "")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Date Called *</label>
                <Input type="date" value={formDateCalled} onChange={(e) => setFormDateCalled(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Ticket Number *</label>
                <Input placeholder="e.g. 2026030600123" value={formTicketNumber} onChange={(e) => setFormTicketNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Address *</label>
                <Input placeholder="123 Main St" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">City</label>
                <Input placeholder="Buffalo" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">State</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={formState} onChange={(e) => setFormState(e.target.value)}>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Completion Date</label>
                <Input type="date" value={formCompletionDate} onChange={(e) => setFormCompletionDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Status</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Copy of Email</label>
              <Textarea placeholder="Paste the U-Dig confirmation email here..." value={formEmailCopy} onChange={(e) => setFormEmailCopy(e.target.value)} rows={5} className="font-mono text-sm" />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Notes</label>
              <Textarea placeholder="Any additional notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-orange-500 to-amber-600">
                {editId ? "💾 Update Ticket" : "✅ Create Ticket"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => { resetForm(); setShowForm(true); }} addLabel="New U-Dig Ticket" onExport={handleExport}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-medium" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map((p) => <option key={String(p._id)} value={String(p._id)}>{String(p.name ?? "")}</option>)}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-medium" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </TableToolbar>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon="🔧" title="No U-Dig Tickets" description="Create a new utility locate ticket to get started." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Date Called</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={String(t._id)} className="cursor-pointer hover:bg-secondary/50" onClick={() => setDetailTicket(t)}>
                  <TableCell className="font-mono font-bold">{String(t.ticketNumber ?? "")}</TableCell>
                  <TableCell>
                    {t.projectId ? (
                      <Badge variant="outline" className="text-xs">{projectMap.get(String(t.projectId)) ?? "—"}</Badge>
                    ) : (
                      <span className="text-yellow-400 text-xs">⚠️ No project</span>
                    )}
                  </TableCell>
                  <TableCell>{String(t.dateCalled ?? "")}</TableCell>
                  <TableCell>{String(t.address ?? "")}</TableCell>
                  <TableCell>{String(t.city ?? "")}</TableCell>
                  <TableCell>{String(t.state ?? "")}</TableCell>
                  <TableCell>{String(t.completionDate ?? "—")}</TableCell>
                  <TableCell><Badge className={statusColor(String(t.status ?? ""))}>{String(t.status ?? "Open")}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>✏️</Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(String(t._id))}>🗑️</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      {detailTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetailTicket(null)}>
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">🔧 U-Dig Ticket #{String(detailTicket.ticketNumber ?? "")}</h2>
                <Badge className={`mt-1 ${statusColor(String(detailTicket.status ?? ""))}`}>{String(detailTicket.status ?? "Open")}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetailTicket(null)}>✕</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-muted-foreground">Project:</span> <span className="font-medium">{detailTicket.projectId ? projectMap.get(String(detailTicket.projectId)) ?? "—" : "None"}</span></div>
              <div><span className="text-muted-foreground">Date Called:</span> <span className="font-medium">{String(detailTicket.dateCalled ?? "")}</span></div>
              <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{String(detailTicket.address ?? "")}</span></div>
              <div><span className="text-muted-foreground">City:</span> <span className="font-medium">{String(detailTicket.city ?? "")}</span></div>
              <div><span className="text-muted-foreground">State:</span> <span className="font-medium">{String(detailTicket.state ?? "")}</span></div>
              <div><span className="text-muted-foreground">Completion:</span> <span className="font-medium">{String(detailTicket.completionDate ?? "—")}</span></div>
            </div>
            {Boolean(detailTicket.emailCopy) && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-muted-foreground mb-1">📧 Email Copy</h3>
                <pre className="bg-secondary/50 border border-border rounded-lg p-3 text-xs whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">{String(detailTicket.emailCopy ?? "")}</pre>
              </div>
            )}
            {Boolean(detailTicket.notes) && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-muted-foreground mb-1">📝 Notes</h3>
                <p className="text-sm">{String(detailTicket.notes ?? "")}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { openEdit(detailTicket); setDetailTicket(null); }}>✏️ Edit</Button>
              <Button variant="outline" size="sm" onClick={() => setDetailTicket(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UDigPage() {
  return <AppShell><Content /></AppShell>;
}
