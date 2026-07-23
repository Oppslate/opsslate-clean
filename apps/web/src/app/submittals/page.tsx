
"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import { TableToolbar } from "@opsslate/suite-ui/table-toolbar";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const REVIEW_ACTIONS = ["Approved", "Approved as Noted", "Revise and Resubmit", "Rejected"];
const TRADES = ["General", "Electrical", "Plumbing", "HVAC", "Drywall", "Painting", "Flooring", "Roofing", "Framing", "Masonry", "Fire Protection", "Concrete", "Steel", "Other"];

function reviewColor(action?: string): "default" | "destructive" | "secondary" | "outline" {
  if (action === "Approved") return "default";
  if (action === "Approved as Noted") return "secondary";
  if (action === "Rejected") return "destructive";
  return "outline";
}

function SubmittalsContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const submittals = useQuery(api.submittals.list, user ? { companyId: user.companyId, projectId: filterProject || undefined, status: filterStatus || undefined } : "skip") as any[] | undefined;
  const procurementDashboard = useQuery(api.submittals.procurementDashboard as any, user ? { companyId: user.companyId, projectId: filterProject || undefined } : "skip") as any | undefined;
  const createSub = useMutation(api.submittals.create);
  const createFromSpecScan = useMutation(api.submittals.createFromSpecScan as any);
  const reviewSub = useMutation(api.submittals.review);
  const updateSub = useMutation(api.submittals.update as any);
  const markReceived = useMutation(api.submittals.markReceived as any);
  const escalateLate = useMutation(api.submittals.escalateLate as any);
  const sendSubmittalRequest = useAction(api.submittals.sendRequest as any);
  const removeSub = useMutation(api.submittals.remove);
  const scanSpecForSubmittals = useAction(api.submittalScanner.scanSpecForSubmittals as any);
  const genUploadUrl = useMutation(api.companyBranding.generateUploadUrl as any);
  const createDoc = useMutation(api.docManager.create as any);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState("");
  const [reviewComments, setReviewComments] = useState("");
  const [scanProject, setScanProject] = useState("");
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [procurementWorkingId, setProcurementWorkingId] = useState("");
  // Form
  const [fProject, setFProject] = useState(""); const [fTitle, setFTitle] = useState(""); const [fSpec, setFSpec] = useState("");
  const [fDesc, setFDesc] = useState(""); const [fPriority, setFPriority] = useState("Medium");
  const [fReviewer, setFReviewer] = useState(""); const [fDue, setFDue] = useState(""); const [fTrade, setFTrade] = useState("");

  const filtered = useMemo(() => { if (!submittals) return []; if (!search) return submittals; return submittals.filter((s) => JSON.stringify(s).toLowerCase().includes(search.toLowerCase())); }, [submittals, search]);
  const pending = (submittals ?? []).filter((s) => s.status === "Pending").length;

  const handleCreate = async () => {
    if (!fProject || !fTitle) { toast("Required", "error"); return; }
    await createSub({ companyId: user!.companyId, projectId: fProject as Id<"projects">, title: fTitle, specSection: fSpec || undefined, description: fDesc || undefined, priority: fPriority, reviewer: fReviewer || undefined, dueDate: fDue || undefined, trade: fTrade || undefined, submittedBy: user!.name });
    toast("Submittal created", "success"); setShowForm(false); setFTitle(""); setFSpec(""); setFDesc("");
  };

  const handleSpecScan = async () => {
    if (!scanProject || !scanFile || !user) { toast("Project and spec file required", "error"); return; }
    setScanLoading(true);
    try {
      const uploadUrl = await genUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": scanFile.type || "application/pdf" }, body: scanFile });
      const { storageId } = await res.json();
      const documentId = await createDoc({ companyId: user.companyId, projectId: scanProject as Id<"projects">, name: scanFile.name, category: "Specs", storageId, fileSize: scanFile.size, uploadedBy: user.name });
      const result = await scanSpecForSubmittals({ documentId });
      const items = (result?.items || []).filter((item: any) => item?.title);
      if (!items.length) {
        toast("No submittal items detected", "error");
      } else {
        await createFromSpecScan({ companyId: user.companyId, projectId: scanProject as Id<"projects">, sourceDocumentId: documentId, sourceDocumentName: scanFile.name, items });
        toast(`Created ${items.length} submittal items`, "success");
      }
      setScanFile(null);
    } catch (e: any) {
      toast(e?.message || "Spec scan failed", "error");
    } finally {
      setScanLoading(false);
    }
  };

  const handleSubmittalUpload = async (sub: any, file: File | null) => {
    if (!file || !user) return;
    const uploadUrl = await genUploadUrl();
    const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/pdf" }, body: file });
    const { storageId } = await res.json();
    const documentId = await createDoc({ companyId: user.companyId, projectId: sub.projectId, name: file.name, category: "Submittals", storageId, fileSize: file.size, uploadedBy: user.name, notes: `Uploaded for SUB-${sub.number}` });
    await markReceived({ id: sub._id, uploadDocumentId: documentId, uploadDocumentName: file.name });
    toast("Submittal uploaded", "success");
  };

  const handleRequestFromSub = async (sub: any) => {
    setProcurementWorkingId(`request-${sub._id}`);
    try {
      const result = await sendSubmittalRequest({ id: sub._id, requestedBy: user!.name });
      toast(result?.sent ? "Submittal request sent" : result?.error || "Submittal request logged", result?.sent ? "success" : "error");
    } finally {
      setProcurementWorkingId("");
    }
  };

  const handleMarkReceived = async (sub: any) => {
    await markReceived({ id: sub._id });
    toast("Submittal marked received", "success");
  };

  const handleEscalateLate = async (sub: any) => {
    await escalateLate({ id: sub._id, reason: "Submittal request is late or blocking work." });
    toast("Submittal escalated", "success");
  };

  if (!user) return null;
  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-r from-background to-secondary/20"><CardContent className="p-5"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">← Back to Dashboard</Link><div className="flex flex-wrap gap-2 mb-2"><Badge className="bg-blue-500/15 text-blue-300">Submittal Command Center</Badge><Badge variant="outline">{(submittals ?? []).length} total</Badge><Badge className="bg-amber-500/15 text-amber-300">{pending} pending</Badge><Badge className="bg-green-500/15 text-green-300">{(submittals ?? []).filter((s) => s.status === "Approved" || s.status === "Approved as Noted").length} approved</Badge></div><h1 className="text-3xl font-bold tracking-tight">📋 Submittals</h1><p className="text-sm text-muted-foreground mt-2 max-w-3xl">Manage shop drawings, product data, samples, and approval workflows with clearer review status and handoff visibility.</p></div><div className="grid grid-cols-2 gap-2 min-w-[280px]"><Button variant="outline" onClick={() => setShowForm(true)}>+ New Submittal</Button><Link href="/documents"><Button variant="outline" className="w-full">📄 Documents</Button></Link><Button variant="outline" onClick={() => setFilterStatus("Pending")}>Pending Only</Button><Link href="/rfis"><Button variant="outline" className="w-full">❓ RFIs</Button></Link></div></div></CardContent></Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Submittal Actions</div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setShowForm(true)}>+ New</Button><Link href="/documents"><Button variant="outline" className="w-full">📄 Docs</Button></Link><Link href="/rfis"><Button variant="outline" className="w-full">❓ RFIs</Button></Link><Link href="/emails"><Button variant="outline" className="w-full">📧 Emails</Button></Link></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Visual Status</div><div className="grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-secondary/40 p-3"><div className="text-2xl font-bold">{(submittals ?? []).length}</div><div className="text-xs text-muted-foreground">Total</div></div><div className="rounded-xl bg-amber-500/10 p-3"><div className="text-2xl font-bold text-amber-400">{pending}</div><div className="text-xs text-muted-foreground">Pending</div></div><div className="rounded-xl bg-green-500/10 p-3"><div className="text-2xl font-bold text-green-400">{(submittals ?? []).filter((s) => s.status === "Approved" || s.status === "Approved as Noted").length}</div><div className="text-xs text-muted-foreground">Approved</div></div><div className="rounded-xl bg-red-500/10 p-3"><div className="text-2xl font-bold text-red-400">{(submittals ?? []).filter((s) => s.status === "Rejected" || s.status === "Revise & Resubmit").length}</div><div className="text-xs text-muted-foreground">Revise</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Workflow Links</div><div className="grid grid-cols-2 gap-2"><Link href="/documents"><Button variant="outline" className="w-full">📁 Files</Button></Link><Link href="/rfis"><Button variant="outline" className="w-full">❓ RFIs</Button></Link><Link href="/insurance"><Button variant="outline" className="w-full">🛡️ Insurance</Button></Link><Link href="/legal"><Button variant="outline" className="w-full">⚖️ Legal</Button></Link></div></CardContent></Card>
      </div>

      <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-background to-cyan-500/10">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">Submittal Procurement</h2>
                <Badge variant="outline">{procurementDashboard?.requested || 0} requested</Badge>
                <Badge variant={procurementDashboard?.overdueRequests ? "destructive" : "outline"}>{procurementDashboard?.overdueRequests || 0} overdueRequests</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Request required submittals from responsible subcontractors, track received packages, and escalate late items before they block the schedule.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
              <div className="rounded-lg border border-border bg-background/60 px-3 py-2"><div className="text-lg font-bold text-foreground">{procurementDashboard?.readyToRequest || 0}</div>Ready</div>
              <div className="rounded-lg border border-border bg-background/60 px-3 py-2"><div className="text-lg font-bold text-cyan-300">{procurementDashboard?.requested || 0}</div>Asked</div>
              <div className="rounded-lg border border-border bg-background/60 px-3 py-2"><div className="text-lg font-bold text-green-300">{procurementDashboard?.received || 0}</div>Received</div>
              <div className="rounded-lg border border-border bg-background/60 px-3 py-2"><div className="text-lg font-bold text-red-300">{procurementDashboard?.escalated || 0}</div>Escalated</div>
            </div>
          </div>
          {procurementDashboard?.lateItems?.length > 0 && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3">
              <div className="mb-2 text-xs font-bold uppercase text-red-200">Late procurement items</div>
              <div className="grid gap-2 md:grid-cols-2">
                {procurementDashboard.lateItems.slice(0, 4).map((item: any) => (
                  <div key={item._id} className="rounded-md border border-border bg-background/60 p-2 text-xs">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-muted-foreground"> - due {item.dueDate || "TBD"} - {item.responsibleCompany || item.responsibleContact || "unassigned"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-gradient-to-r from-blue-500/5 via-background to-green-500/5"><CardContent className="p-5 space-y-4"><div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-lg font-semibold">AI Spec Scan</div><p className="text-sm text-muted-foreground mt-1">Upload a spec section or project manual, let AI extract likely submittal items, and build the register automatically.</p></div><Badge className="bg-blue-500/15 text-blue-300">Spec → Submittal Register</Badge></div><div className="grid md:grid-cols-[1.2fr,1fr,auto] gap-3 items-end"><select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={scanProject} onChange={(e) => setScanProject(e.target.value)}><option value="">Select Project...</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select><Input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setScanFile(e.target.files?.[0] || null)} /><Button onClick={handleSpecScan} disabled={scanLoading}>{scanLoading ? "Scanning..." : "Scan Specs"}</Button></div><div className="text-xs text-muted-foreground">This creates submittal items with item number, description, spec section, and source document linkage. Users can then upload the actual submittal against each item.</div></CardContent></Card>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{(submittals ?? []).length}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
        <Card className={`border-border ${pending > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-card"}`}><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-amber-400">{pending}</div><div className="text-xs text-muted-foreground">Pending</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-green-400">{(submittals ?? []).filter((s) => s.status === "Approved" || s.status === "Approved as Noted").length}</div><div className="text-xs text-muted-foreground">Approved</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-red-400">{(submittals ?? []).filter((s) => s.status === "Rejected" || s.status === "Revise & Resubmit").length}</div><div className="text-xs text-muted-foreground">Rejected/Revise</div></CardContent></Card>
      </div>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setShowForm(true)} addLabel="New Submittal" onExport={() => {}}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}><option value="">All Projects</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">All</option><option>Pending</option><option>Approved</option><option>Approved as Noted</option><option>Revise & Resubmit</option><option>Rejected</option></select>
      </TableToolbar>

      <div className="space-y-3">
        {filtered.map((sub: any) => {
          const isExp = expandedId === sub._id;
          return (
            <Card key={sub._id} className="bg-card border-border">
              <div className="p-4 cursor-pointer hover:bg-secondary/30" onClick={() => setExpandedId(isExp ? null : sub._id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">SUB-{String(sub.number)}</span>
                    <span className="font-medium">{sub.title}</span>
                    {sub.itemNumber && <Badge variant="outline">Item {sub.itemNumber}</Badge>}
                    <Badge variant="outline">{sub.projectName}</Badge>
                    <Badge variant={reviewColor(sub.reviewAction)}>{sub.status}</Badge>
                    <Badge variant="outline">{sub.procurementStatus || sub.procurementState || "not_requested"}</Badge>
                    {sub.trade && <Badge variant="outline">{sub.trade}</Badge>}
                  </div>
                  <span className="text-muted-foreground text-sm">{sub.submittedDate} {isExp ? "▲" : "▼"}</span>
                </div>
              </div>
              {isExp && (
                <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
                  {sub.specSection && <div className="text-sm"><span className="text-muted-foreground">Spec Section:</span> {sub.specSection}</div>}
                  {sub.sourceDocumentName && <div className="text-sm"><span className="text-muted-foreground">Source Spec:</span> {sub.sourceDocumentName}</div>}
                  {sub.description && <p className="text-sm">{sub.description}</p>}
                  {(sub.sourceSpecSection || sub.sourcePage || sub.sourceQuote || sub.sourceType === "spec_intelligence") && (
                    <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3">
                      <h4 className="text-xs font-bold text-cyan-300 mb-2">SOURCE EVIDENCE</h4>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {sub.sourceSpecSection && <span>Spec: {sub.sourceSpecSection}</span>}
                        {sub.sourcePage && <span>Page: {sub.sourcePage}</span>}
                        {typeof sub.sourceConfidence === "number" && <span>Confidence: {Math.round(sub.sourceConfidence * 100)}%</span>}
                        {sub.sourceItemId && <span>Matrix item: {String(sub.sourceItemId).slice(-8)}</span>}
                      </div>
                      {sub.sourceQuote && <p className="mt-2 text-xs leading-5 text-muted-foreground whitespace-pre-wrap">"{sub.sourceQuote}"</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Submitted by:</span> {sub.submittedBy || "—"}</div>
                    <div><span className="text-muted-foreground">Reviewer:</span> {sub.reviewer || "—"}</div>
                    <div><span className="text-muted-foreground">Due:</span> {sub.dueDate || "—"}</div>
                  </div>
                  {(sub.responsibleCompany || sub.responsibleContact || sub.responsibleEmail || sub.responsiblePhone) && (
                    <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-orange-300">Responsible party</h4>
                        <Badge variant="outline">{sub.requestStatus || "not_requested"}</Badge>
                      </div>
                      <div className="mb-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                        {sub.requestedAt && <div><span className="text-muted-foreground">Requested:</span> {new Date(sub.requestedAt).toLocaleDateString()}</div>}
                        {sub.requestedBy && <div><span className="text-muted-foreground">By:</span> {sub.requestedBy}</div>}
                        {sub.receivedAt && <div><span className="text-muted-foreground">Received:</span> {new Date(sub.receivedAt).toLocaleDateString()}</div>}
                        {sub.escalatedAt && <div><span className="text-muted-foreground">Escalated:</span> {new Date(sub.escalatedAt).toLocaleDateString()}</div>}
                      </div>
                      <div className="grid gap-2 text-sm md:grid-cols-2">
                        <div><span className="text-muted-foreground">Company:</span> {sub.responsibleCompany || "—"}</div>
                        <div><span className="text-muted-foreground">Contact:</span> {sub.responsibleContact || "—"}</div>
                        <div><span className="text-muted-foreground">Email:</span> {sub.responsibleEmail ? <a className="text-primary hover:underline" href={`mailto:${sub.responsibleEmail}`}>{sub.responsibleEmail}</a> : "—"}</div>
                        <div><span className="text-muted-foreground">Phone:</span> {sub.responsiblePhone ? <a className="text-primary hover:underline" href={`tel:${sub.responsiblePhone}`}>{sub.responsiblePhone}</a> : "—"}</div>
                      </div>
                      {sub.escalationReason && <p className="mt-2 text-xs text-red-300">{sub.escalationReason}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={!sub.responsibleEmail || procurementWorkingId === `request-${sub._id}`} onClick={() => handleRequestFromSub(sub)}>
                          {procurementWorkingId === `request-${sub._id}` ? "Sending..." : "Request from Sub"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleMarkReceived(sub)}>Mark Received</Button>
                        <Button size="sm" variant="outline" onClick={() => handleEscalateLate(sub)}>Escalate Late</Button>
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-border bg-secondary/20 p-3"><div className="flex items-center justify-between gap-3 flex-wrap"><div><div className="text-sm font-medium">Submittal Upload</div><div className="text-xs text-muted-foreground mt-1">Attach the actual shop drawing, product data, sample sheet, or other submittal file for this item.</div>{sub.uploadDocumentName ? <div className="text-xs mt-2">Uploaded: {sub.uploadDocumentName} {sub.uploadDate ? `on ${sub.uploadDate}` : ""}</div> : <div className="text-xs mt-2 text-amber-300">No submittal file uploaded yet.</div>}</div><label className="inline-flex"><input type="file" className="hidden" onChange={(e) => handleSubmittalUpload(sub, e.target.files?.[0] || null)} /><span className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-background">Upload File</span></label></div></div>
                  {sub.reviewAction && (
                    <div className={`border rounded-lg p-3 ${sub.reviewAction === "Approved" || sub.reviewAction === "Approved as Noted" ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                      <div className="font-bold text-sm">{sub.reviewAction}</div>
                      {sub.reviewComments && <p className="text-sm mt-1">{sub.reviewComments}</p>}
                      <div className="text-xs text-muted-foreground mt-1">By {sub.reviewer} on {sub.reviewDate}</div>
                    </div>
                  )}
                  {sub.status === "Pending" && (
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <h4 className="text-xs font-bold mb-2">Review Action</h4>
                      <div className="flex gap-2 mb-2">{REVIEW_ACTIONS.map((a) => (
                        <button key={a} className={`px-3 py-1 rounded-lg text-xs border ${reviewAction === a ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`} onClick={() => setReviewAction(a)}>{a}</button>
                      ))}</div>
                      <Textarea rows={2} value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} placeholder="Review comments..." className="mb-2" />
                      <Button size="sm" disabled={!reviewAction} onClick={() => { reviewSub({ id: sub._id, reviewAction, reviewer: user!.name, reviewComments: reviewComments || undefined }).then(() => { toast("Reviewed", "success"); setReviewAction(""); setReviewComments(""); }); }}>Submit Review</Button>
                    </div>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => removeSub({ id: sub._id }).then(() => toast("Deleted", "success"))}>Delete</Button>
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && <EmptyState icon="📋" title="No submittals" description="Track shop drawings, material data, and document approvals" actionLabel="+ New Submittal" onAction={() => setShowForm(true)} />}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border"><h3 className="font-bold text-lg">New Submittal</h3></div>
            <div className="p-4 space-y-3">
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={fProject} onChange={(e) => setFProject(e.target.value)}><option value="">Select Project...</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Title *" />
              <div className="grid grid-cols-2 gap-3"><Input value={fSpec} onChange={(e) => setFSpec(e.target.value)} placeholder="Spec Section" />
                <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={fTrade} onChange={(e) => setFTrade(e.target.value)}><option value="">Trade...</option>{TRADES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <Textarea rows={3} value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Description" />
              <div className="grid grid-cols-3 gap-3">
                <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={fPriority} onChange={(e) => setFPriority(e.target.value)}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
                <Input value={fReviewer} onChange={(e) => setFReviewer(e.target.value)} placeholder="Reviewer" />
                <Input type="date" value={fDue} onChange={(e) => setFDue(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" /></div>
            </div>
            <div className="p-4 border-t border-border flex justify-between"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleCreate}>Create</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubmittalsPage() { return <AppShell><SubmittalsContent /></AppShell>; }
