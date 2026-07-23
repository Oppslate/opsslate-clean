
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import { TableToolbar, exportCSV } from "@opsslate/suite-ui/table-toolbar";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const STATUSES = ["Open", "In Progress", "Complete"];
const TRADES = [
  "General", "Electrical", "Plumbing", "HVAC", "Drywall", "Painting",
  "Flooring", "Roofing", "Framing", "Masonry", "Fire Protection",
  "Insulation", "Glazing", "Landscaping", "Other",
];

function priorityColor(p?: string) {
  if (p === "Critical") return "destructive";
  if (p === "High") return "default";
  if (p === "Medium") return "secondary";
  return "outline";
}

function statusColor(s: string) {
  if (s === "Complete") return "default";
  if (s === "In Progress") return "secondary";
  return "outline";
}

function PunchForm({ onClose, existing, defaultProjectId }: {
  onClose: () => void;
  existing?: Record<string, unknown>;
  defaultProjectId?: string;
}) {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const createItem = useMutation(api.punchList.create);
  const updateItem = useMutation(api.punchList.update);
  const { toast } = useToast();

  const [projectId, setProjectId] = useState((existing?.projectId as string) ?? defaultProjectId ?? "");
  const [title, setTitle] = useState((existing?.title as string) ?? "");
  const [description, setDescription] = useState((existing?.description as string) ?? "");
  const [location, setLocation] = useState((existing?.location as string) ?? "");
  const [trade, setTrade] = useState((existing?.trade as string) ?? "");
  const [assignedTo, setAssignedTo] = useState((existing?.assignedTo as string) ?? "");
  const [assignedCompany, setAssignedCompany] = useState((existing?.assignedCompany as string) ?? "");
  const [priority, setPriority] = useState((existing?.priority as string) ?? "Medium");
  const [dueDate, setDueDate] = useState((existing?.dueDate as string) ?? "");
  const [notes, setNotes] = useState((existing?.notes as string) ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title || !projectId) { toast("Title and project required", "error"); return; }
    setSaving(true);
    try {
      if (existing) {
        await updateItem({
          id: existing._id as Id<"punchList">,
          title, description: description || undefined,
          location: location || undefined,
          trade: trade || undefined,
          assignedTo: assignedTo || undefined,
          assignedCompany: assignedCompany || undefined,
          priority, dueDate: dueDate || undefined,
          notes: notes || undefined,
        });
        toast("Item updated", "success");
      } else {
        await createItem({
          companyId: user!.companyId,
          projectId: projectId as Id<"projects">,
          title, description: description || undefined,
          location: location || undefined,
          trade: trade || undefined,
          assignedTo: assignedTo || undefined,
          assignedCompany: assignedCompany || undefined,
          priority, dueDate: dueDate || undefined,
          notes: notes || undefined,
          createdBy: user!.name,
        });
        toast("Punch item created", "success");
      }
      onClose();
    } catch (e) {
      toast("Error: " + (e as Error).message, "error");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-bold text-lg">{existing ? "Edit Punch Item" : "New Punch Item"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">x</button>
        </div>
        <div className="p-4 space-y-4">
          {!existing && (
            <div>
              <label className="text-sm font-semibold block mb-1">Project *</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Select project...</option>
                {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold block mb-1">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cracked tile in lobby restroom" />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Description</label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of the deficiency..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Floor 2, Room 201" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Trade</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={trade} onChange={(e) => setTrade(e.target.value)}>
                <option value="">Select trade...</option>
                {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">Assigned To</label>
              <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Person name" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Sub / Company</label>
              <Input value={assignedCompany} onChange={(e) => setAssignedCompany(e.target.value)} placeholder="Subcontractor company" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">Priority</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Notes</label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-between sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSave}>{saving ? "Saving..." : existing ? "Update" : "Create"}</Button>
        </div>
      </div>
    </div>
  );
}

function PunchListContent() {
  const { user } = useAuth();
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);

  const items = useQuery(api.punchList.list, user ? {
    companyId: user.companyId,
    projectId: filterProject || undefined,
    status: filterStatus || undefined,
  } : "skip") as Array<Record<string, unknown>> | undefined;

  const stats = useQuery(api.punchList.stats, user ? {
    companyId: user.companyId,
    projectId: filterProject || undefined,
  } : "skip");

  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const markComplete = useMutation(api.punchList.markComplete);
  const reopenItem = useMutation(api.punchList.reopen);
  const removeItem = useMutation(api.punchList.remove);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!items) return [];
    let r = items;
    if (filterPriority) r = r.filter((i) => i.priority === filterPriority);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((i) =>
        (i.title as string)?.toLowerCase().includes(q) ||
        (i.location as string)?.toLowerCase().includes(q) ||
        (i.assignedTo as string)?.toLowerCase().includes(q) ||
        (i.assignedCompany as string)?.toLowerCase().includes(q) ||
        (i.description as string)?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [items, search, filterPriority]);

  const handleExport = () => {
    const headers = ["#", "Title", "Project", "Location", "Trade", "Assigned To", "Company", "Priority", "Status", "Due Date", "Completed"];
    const rows = filtered.map((i) => [
      String(i.number ?? ""), String(i.title ?? ""), String(i.projectName ?? ""),
      String(i.location ?? ""), String(i.trade ?? ""), String(i.assignedTo ?? ""),
      String(i.assignedCompany ?? ""), String(i.priority ?? ""), String(i.status ?? ""),
      String(i.dueDate ?? ""), String(i.completedDate ?? ""),
    ]);
    exportCSV(headers, rows, "punch-list.csv");
  };

  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">Punch List</h1>
      <p className="text-muted-foreground text-sm mb-4">Deficiency tracking for project closeout</p>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.open}</div>
              <div className="text-xs text-muted-foreground">Open</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.complete}</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </CardContent>
          </Card>
        </div>
      )}

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Punch Item"
        onExport={handleExport}
      >
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </TableToolbar>

      {/* Table */}
      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const isOverdue = (item.status as string) !== "Complete" && (item.dueDate as string) && (item.dueDate as string) < today;
              return (
                <TableRow key={item._id as string} className={(item.status as string) === "Complete" ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{String(item.number ?? "")}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.title as string}</div>
                    {Boolean(item.description) && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{(item.description as string).slice(0, 80)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{item.projectName as string}</TableCell>
                  <TableCell className="text-sm">{(item.location as string) || "—"}</TableCell>
                  <TableCell className="text-sm">{(item.trade as string) || "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{(item.assignedTo as string) || "—"}</div>
                    {Boolean(item.assignedCompany) && <div className="text-xs text-muted-foreground">{item.assignedCompany as string}</div>}
                  </TableCell>
                  <TableCell><Badge variant={priorityColor(item.priority as string)}>{(item.priority as string) || "—"}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={statusColor(item.status as string)}>{item.status as string}</Badge>
                    {isOverdue && <Badge variant="destructive" className="ml-1 text-xs">OVERDUE</Badge>}
                  </TableCell>
                  <TableCell className={`text-sm ${isOverdue ? "text-destructive font-semibold" : ""}`}>{(item.dueDate as string) || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {(item.status as string) !== "Complete" ? (
                        <Button size="sm" variant="outline" onClick={() => markComplete({ id: item._id as Id<"punchList"> }).then(() => toast("Marked complete", "success"))}>
                          ✓
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => reopenItem({ id: item._id as Id<"punchList"> }).then(() => toast("Reopened", "success"))}>
                          ↩
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setEditItem(item); setShowForm(true); }}>
                        ✎
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeItem({ id: item._id as Id<"punchList"> }).then(() => toast("Deleted", "success"))}>
                        ✕
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <EmptyState
            icon="✓"
            title="No punch list items"
            description="Track deficiencies, assign to subs, and manage closeout."
            actionLabel="+ New Punch Item"
            onAction={() => { setEditItem(null); setShowForm(true); }}
          />
        )}
      </Card>

      {showForm && (
        <PunchForm
          onClose={() => { setShowForm(false); setEditItem(null); }}
          existing={editItem ?? undefined}
          defaultProjectId={filterProject || (projects?.[0]?._id ?? "")}
        />
      )}
    </div>
  );
}

export default function PunchListPage() {
  return <AppShell><PunchListContent /></AppShell>;
}
