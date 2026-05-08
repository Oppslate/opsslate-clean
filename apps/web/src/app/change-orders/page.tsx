
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const SOURCES = ["Owner Request", "Design Change", "Field Condition", "Code/Regulatory", "Value Engineering", "Crew Request", "Subcontractor", "Other"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const COST_TYPES = ["Addition", "Deduction", "No Cost", "TBD"];
const STATUSES = ["Pending", "Under Review", "Approved", "Rejected"];
const TRADES = ["General", "Electrical", "Plumbing", "HVAC", "Drywall", "Painting", "Flooring", "Roofing", "Framing", "Masonry", "Fire Protection", "Concrete", "Steel", "Landscaping", "Other"];

function priorityColor(p?: string): "destructive" | "default" | "secondary" | "outline" {
  if (p === "Critical") return "destructive";
  if (p === "High") return "default";
  if (p === "Medium") return "secondary";
  return "outline";
}

function statusColor(s: string): "destructive" | "default" | "secondary" | "outline" {
  if (s === "Approved") return "default";
  if (s === "Rejected") return "destructive";
  if (s === "Under Review") return "secondary";
  return "outline";
}

function formatCurrency(n?: number) {
  if (n === undefined || n === null) return "—";
  return "$" + n.toLocaleString();
}

// ── Comment Thread ──
function CommentThread({ changeOrderId, userName }: { changeOrderId: Id<"changeOrders">; userName: string }) {
  const comments = useQuery(api.changeOrders.listComments, { changeOrderId });
  const addComment = useMutation(api.changeOrders.addComment);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    await addComment({ changeOrderId, author: userName, text: text.trim() });
    setText("");
    setSending(false);
  };

  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold text-primary mb-2">ACTIVITY & COMMENTS ({String(comments?.length ?? 0)})</h4>
      <div className="space-y-2 max-h-60 overflow-auto mb-3">
        {(comments ?? []).map((c) => (
          <div key={c._id} className={`text-sm rounded-lg px-3 py-2 ${c.type === "system" || c.type === "approval" || c.type === "rejection" ? "bg-secondary/30 text-muted-foreground italic" : "bg-secondary/50"}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-xs">{c.author}</span>
              <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap">{c.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment... (visible to field crew)"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button size="sm" disabled={sending || !text.trim()} onClick={handleSend}>Send</Button>
      </div>
    </div>
  );
}

// ── Approval Modal ──
function ApprovalModal({ co, onClose }: { co: Record<string, unknown>; onClose: () => void }) {
  const { user } = useAuth();
  const approveCO = useMutation(api.changeOrders.approve);
  const rejectCO = useMutation(api.changeOrders.reject);
  const { toast } = useToast();
  const [approvedCost, setApprovedCost] = useState<string>(String(co.estimatedCost ?? ""));
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);

  const handleApprove = async () => {
    await approveCO({
      id: co._id as Id<"changeOrders">,
      approvedBy: user!.name,
      approvedCost: approvedCost ? Number(approvedCost) : undefined,
      notes: notes || undefined,
    });
    toast("Change order approved", "success");
    onClose();
  };

  const handleReject = async () => {
    await rejectCO({
      id: co._id as Id<"changeOrders">,
      rejectedBy: user!.name,
      reason: rejectReason || undefined,
    });
    toast("Change order rejected", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-lg">CO #{String(co.number)} — Decision</h3>
          <p className="text-sm text-muted-foreground">{co.title as string}</p>
        </div>
        <div className="p-4 space-y-4">
          {!mode && (
            <div className="flex gap-3">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setMode("approve")}>✅ Approve</Button>
              <Button className="flex-1" variant="destructive" onClick={() => setMode("reject")}>❌ Reject</Button>
            </div>
          )}
          {mode === "approve" && (
            <>
              <div>
                <label className="text-sm font-semibold block mb-1">Approved Cost ($)</label>
                <Input type="number" value={approvedCost} onChange={(e) => setApprovedCost(e.target.value)} placeholder="Leave blank to use estimated" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">Notes</label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Approval notes..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode(null)}>Back</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleApprove}>Confirm Approval</Button>
              </div>
            </>
          )}
          {mode === "reject" && (
            <>
              <div>
                <label className="text-sm font-semibold block mb-1">Reason for Rejection</label>
                <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode(null)}>Back</Button>
                <Button className="flex-1" variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create/Edit Form ──
function COForm({ onClose, existing, defaultProjectId }: {
  onClose: () => void;
  existing?: Record<string, unknown>;
  defaultProjectId?: string;
}) {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const crew = useQuery(api.crew.listByCompany, user ? { companyId: user.companyId } : "skip");
  const createCO = useMutation(api.changeOrders.create);
  const updateCO = useMutation(api.changeOrders.update);
  const { toast } = useToast();

  const [projectId, setProjectId] = useState((existing?.projectId as string) ?? defaultProjectId ?? "");
  const [title, setTitle] = useState((existing?.title as string) ?? "");
  const [description, setDescription] = useState((existing?.description as string) ?? "");
  const [reason, setReason] = useState((existing?.reason as string) ?? "");
  const [source, setSource] = useState((existing?.source as string) ?? "");
  const [priority, setPriority] = useState((existing?.priority as string) ?? "Medium");
  const [costType, setCostType] = useState((existing?.costType as string) ?? "TBD");
  const [estimatedCost, setEstimatedCost] = useState<string>(existing?.estimatedCost !== undefined ? String(existing.estimatedCost) : "");
  const [scheduleDays, setScheduleDays] = useState<string>(existing?.scheduleDaysImpact !== undefined ? String(existing.scheduleDaysImpact) : "");
  const [scopeDesc, setScopeDesc] = useState((existing?.scopeDescription as string) ?? "");
  const [affectedTrades, setAffectedTrades] = useState<string[]>((existing?.affectedTrades as string[]) ?? []);
  const [affectedArea, setAffectedArea] = useState((existing?.affectedArea as string) ?? "");
  const [selectedCrew, setSelectedCrew] = useState<string[]>((existing?.notifyCrewIds as string[]) ?? []);
  const [notes, setNotes] = useState((existing?.notes as string) ?? "");
  const [saving, setSaving] = useState(false);

  const toggleTrade = (t: string) => {
    setAffectedTrades((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const toggleCrew = (id: string) => {
    setSelectedCrew((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!title || !projectId) { toast("Title and project required", "error"); return; }
    setSaving(true);
    try {
      const data = {
        title, description: description || undefined,
        reason: reason || undefined, source: source || undefined,
        priority, costType: costType || undefined,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
        scheduleDaysImpact: scheduleDays ? Number(scheduleDays) : undefined,
        scopeDescription: scopeDesc || undefined,
        affectedTrades: affectedTrades.length ? affectedTrades : undefined,
        affectedArea: affectedArea || undefined,
        notifyCrewIds: selectedCrew.length ? selectedCrew : undefined,
        notes: notes || undefined,
      };
      if (existing) {
        await updateCO({ id: existing._id as Id<"changeOrders">, ...data });
        toast("Updated", "success");
      } else {
        await createCO({ companyId: user!.companyId, projectId: projectId as Id<"projects">, createdBy: user!.name, ...data });
        toast("Change order created", "success");
      }
      onClose();
    } catch (e) {
      toast("Error: " + (e as Error).message, "error");
    }
    setSaving(false);
  };

  // Filter crew by selected project
  const projectCrew = (crew ?? []).filter((c: any) => !projectId || c.projectId === projectId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-bold text-lg">{existing ? "Edit Change Order" : "New Change Order"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">x</button>
        </div>
        <div className="p-4 space-y-5">
          {/* Project + Title */}
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Add electrical outlet in break room" />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Description</label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of the change..." />
          </div>

          {/* Source + Priority */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">Source</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">Select...</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Priority</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Reason</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this needed?" />
            </div>
          </div>

          {/* Cost Impact */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h4 className="text-sm font-bold mb-3">💰 Cost & Schedule Impact</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-1">Cost Type</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={costType} onChange={(e) => setCostType(e.target.value)}>
                  {COST_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">Estimated Cost ($)</label>
                <Input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">Schedule Impact (days)</label>
                <Input type="number" value={scheduleDays} onChange={(e) => setScheduleDays(e.target.value)} placeholder="+/- days" />
              </div>
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="text-sm font-semibold block mb-1">Scope Description</label>
            <Textarea rows={2} value={scopeDesc} onChange={(e) => setScopeDesc(e.target.value)} placeholder="What work is being added, removed, or changed?" />
          </div>

          {/* Affected area */}
          <div>
            <label className="text-sm font-semibold block mb-1">Affected Area</label>
            <Input value={affectedArea} onChange={(e) => setAffectedArea(e.target.value)} placeholder="Floor 3, Mechanical room, etc." />
          </div>

          {/* Affected Trades */}
          <div>
            <label className="text-sm font-semibold block mb-1">Affected Trades</label>
            <div className="flex flex-wrap gap-2">
              {TRADES.map((t) => (
                <button
                  key={t}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${affectedTrades.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:bg-secondary/80"}`}
                  onClick={() => toggleTrade(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Notify Crew */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h4 className="text-sm font-bold mb-2">👷 Notify Field Crew</h4>
            <p className="text-xs text-muted-foreground mb-3">Selected crew will receive an email notification about this change order.</p>
            {projectCrew.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {projectCrew.map((c: any) => (
                  <button
                    key={c._id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${selectedCrew.includes(c._id) ? "bg-primary/20 border-primary border" : "bg-secondary border border-border hover:bg-secondary/80"}`}
                    onClick={() => toggleCrew(c._id)}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${selectedCrew.includes(c._id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {selectedCrew.includes(c._id) ? "✓" : ""}
                    </span>
                    <div>
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-xs text-muted-foreground">{c.trade}{c.email ? " · " + c.email : ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No crew assigned to this project yet. Add crew in the Crew tab.</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1">Notes</label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-between sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSave}>{saving ? "Saving..." : existing ? "Update" : "Create Change Order"}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
function ChangeOrdersContent() {
  const { user } = useAuth();
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<Record<string, unknown> | null>(null);

  const items = useQuery(api.changeOrders.list, user ? {
    companyId: user.companyId,
    projectId: filterProject || undefined,
    status: filterStatus || undefined,
  } : "skip") as Array<Record<string, unknown>> | undefined;

  const stats = useQuery(api.changeOrders.stats, user ? {
    companyId: user.companyId,
    projectId: filterProject || undefined,
  } : "skip");

  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const submitForReview = useMutation(api.changeOrders.submitForReview);
  const removeCO = useMutation(api.changeOrders.remove);
  const notifyCrew = useAction(api.changeOrderNotify.notifyCrew as any);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      (i.title as string)?.toLowerCase().includes(q) ||
      (i.description as string)?.toLowerCase().includes(q) ||
      (i.requestedBy as string)?.toLowerCase().includes(q) ||
      (i.affectedArea as string)?.toLowerCase().includes(q) ||
      String(i.number ?? "").includes(q)
    );
  }, [items, search]);

  const handleExport = () => {
    const headers = ["CO#", "Title", "Project", "Source", "Priority", "Status", "Est. Cost", "Approved Cost", "Days Impact", "Requested By", "Requested Date"];
    const rows = filtered.map((i) => [
      String(i.number ?? ""), String(i.title ?? ""), String(i.projectName ?? ""),
      String(i.source ?? ""), String(i.priority ?? ""), String(i.status ?? ""),
      String(i.estimatedCost ?? ""), String(i.approvedCost ?? ""),
      String(i.scheduleDaysImpact ?? ""), String(i.requestedBy ?? ""), String(i.requestedDate ?? ""),
    ]);
    exportCSV(headers, rows, "change-orders.csv");
  };

  if (!user) return null;

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">Change Orders</h1>
      <p className="text-muted-foreground text-sm mb-4">Track scope changes, cost impact, approvals, and crew notifications</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending Review</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalApproved)}</div>
              <div className="text-xs text-muted-foreground">Approved Cost</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.totalEstimated)}</div>
              <div className="text-xs text-muted-foreground">Total Estimated</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.totalDaysImpact > 0 ? "+" : ""}{stats.totalDaysImpact} days</div>
              <div className="text-xs text-muted-foreground">Schedule Impact</div>
            </CardContent>
          </Card>
        </div>
      )}

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => { setEditItem(null); setShowForm(true); }}
        addLabel="New Change Order"
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
      </TableToolbar>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((co) => {
          const isExpanded = expandedId === (co._id as string);
          return (
            <Card key={co._id as string} className={`bg-card border-border ${(co.status as string) === "Rejected" ? "opacity-60" : ""}`}>
              <div
                className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : (co._id as string))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">CO-{String(co.number ?? "")}</span>
                    <span className="font-medium">{co.title as string}</span>
                    <Badge variant="outline">{co.projectName as string}</Badge>
                    <Badge variant={statusColor(co.status as string)}>{co.status as string}</Badge>
                    <Badge variant={priorityColor(co.priority as string)}>{(co.priority as string) || "—"}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {(co.estimatedCost as number) > 0 && (
                      <span className={`font-semibold ${(co.costType as string) === "Deduction" ? "text-green-400" : "text-yellow-400"}`}>
                        {(co.costType as string) === "Deduction" ? "-" : "+"}{formatCurrency(co.estimatedCost as number)}
                      </span>
                    )}
                    {(co.commentCount as number) > 0 && (
                      <span className="text-muted-foreground">💬 {String(co.commentCount)}</span>
                    )}
                    <span className="text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>
                {Boolean(co.description) && !isExpanded && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-2xl">{(co.description as string).slice(0, 150)}</p>
                )}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Source</div>
                      <div className="text-sm font-medium">{(co.source as string) || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Requested By</div>
                      <div className="text-sm font-medium">{(co.requestedBy as string) || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Requested Date</div>
                      <div className="text-sm font-medium">{(co.requestedDate as string) || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Affected Area</div>
                      <div className="text-sm font-medium">{(co.affectedArea as string) || "—"}</div>
                    </div>
                  </div>

                  {/* Cost Impact */}
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-primary mb-2">💰 COST & SCHEDULE IMPACT</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Cost Type</div>
                        <div className="text-sm font-semibold">{(co.costType as string) || "TBD"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Estimated</div>
                        <div className="text-sm font-semibold text-yellow-400">{formatCurrency(co.estimatedCost as number)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Approved</div>
                        <div className="text-sm font-semibold text-green-400">{formatCurrency(co.approvedCost as number)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Schedule Impact</div>
                        <div className="text-sm font-semibold">{(co.scheduleDaysImpact as number) ? `${(co.scheduleDaysImpact as number) > 0 ? "+" : ""}${co.scheduleDaysImpact} days` : "None"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Description + Scope */}
                  {Boolean(co.description) && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">DESCRIPTION</h4>
                      <p className="text-sm whitespace-pre-wrap">{co.description as string}</p>
                    </div>
                  )}
                  {Boolean(co.scopeDescription) && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">SCOPE CHANGE</h4>
                      <p className="text-sm whitespace-pre-wrap">{co.scopeDescription as string}</p>
                    </div>
                  )}

                  {/* Affected Trades */}
                  {(co.affectedTrades as string[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-1">AFFECTED TRADES</h4>
                      <div className="flex flex-wrap gap-2">
                        {(co.affectedTrades as string[]).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                      </div>
                    </div>
                  )}

                  {/* Approval info */}
                  {(co.status as string) === "Approved" && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="text-xs font-bold text-green-400 mb-1">✅ APPROVED</div>
                      <div className="text-sm">By <strong>{co.approvedBy as string}</strong> on {co.approvedDate as string}</div>
                      <div className="text-sm">Approved amount: <strong className="text-green-400">{formatCurrency(co.approvedCost as number)}</strong></div>
                    </div>
                  )}
                  {(co.status as string) === "Rejected" && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="text-xs font-bold text-destructive mb-1">❌ REJECTED</div>
                      {Boolean(co.rejectedReason) && <div className="text-sm">{co.rejectedReason as string}</div>}
                    </div>
                  )}

                  {/* Comments */}
                  <CommentThread changeOrderId={co._id as Id<"changeOrders">} userName={user!.name} />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {(co.status as string) === "Pending" && (
                      <Button size="sm" variant="secondary" onClick={() => submitForReview({ id: co._id as Id<"changeOrders">, submittedBy: user!.name }).then(() => toast("Submitted for review", "success"))}>
                        📋 Submit for Review
                      </Button>
                    )}
                    {((co.status as string) === "Pending" || (co.status as string) === "Under Review") && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setApprovalTarget(co)}>
                        ✅ Approve / Reject
                      </Button>
                    )}
                    {(co.notifyCrewIds as string[])?.length > 0 && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          const result = await notifyCrew({ changeOrderId: co._id as Id<"changeOrders"> });
                          toast(`Notified ${(result as any).sent} crew member(s)`, "success");
                        } catch (e) {
                          toast("Error: " + (e as Error).message, "error");
                        }
                      }}>
                        📧 Notify Crew
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setEditItem(co); setShowForm(true); }}>✎ Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => removeCO({ id: co._id as Id<"changeOrders"> }).then(() => toast("Deleted", "success"))}>✕ Delete</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon="🔄"
            title="No change orders"
            description="Track scope changes, cost impact, and keep your field crew in the loop."
            actionLabel="+ New Change Order"
            onAction={() => { setEditItem(null); setShowForm(true); }}
          />
        )}
      </div>

      {showForm && (
        <COForm
          onClose={() => { setShowForm(false); setEditItem(null); }}
          existing={editItem ?? undefined}
          defaultProjectId={filterProject || (projects?.[0]?._id ?? "")}
        />
      )}

      {approvalTarget && (
        <ApprovalModal co={approvalTarget} onClose={() => setApprovalTarget(null)} />
      )}
    </div>
  );
}

export default function ChangeOrdersPage() {
  return <AppShell><ChangeOrdersContent /></AppShell>;
}
