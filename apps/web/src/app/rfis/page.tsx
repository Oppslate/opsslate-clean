
"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function RFIContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "";
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const [filterProject, setFilterProject] = useState(initialProjectId);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const rfis = useQuery(api.rfis.list, user ? { companyId: user.companyId, projectId: filterProject || undefined, status: filterStatus || undefined } : "skip") as any[] | undefined;
  const createRFI = useMutation(api.rfis.create);
  const answerRFI = useMutation(api.rfis.answer);
  const removeRFI = useMutation(api.rfis.remove);
  const scanAndGenerate = useAction(api.autoRfiGenerator.scanAndGenerate as any);
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [autoGenProject, setAutoGenProject] = useState("");
  const [autoGenFocus, setAutoGenFocus] = useState("all");
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [autoGenResult, setAutoGenResult] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  // Form state
  const [fProject, setFProject] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fQuestion, setFQuestion] = useState("");
  const [fPriority, setFPriority] = useState("Medium");
  const [fAssigned, setFAssigned] = useState("");
  const [fDateReq, setFDateReq] = useState("");
  const [fCost, setFCost] = useState(false);
  const [fSchedule, setFSchedule] = useState(false);

  const filtered = useMemo(() => {
    if (!rfis) return [];
    if (!search) return rfis;
    return rfis.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  }, [rfis, search]);

  const open = (rfis ?? []).filter((r) => r.status === "Open").length;
  const overdue = (rfis ?? []).filter((r) => r.status === "Open" && r.dateRequired && r.dateRequired < new Date().toISOString().slice(0, 10)).length;

  const handleCreate = async () => {
    if (!fProject || !fSubject || !fQuestion) { toast("Project, subject, and question required", "error"); return; }
    await createRFI({ companyId: user!.companyId, projectId: fProject as Id<"projects">, subject: fSubject, question: fQuestion, priority: fPriority, assignedTo: fAssigned || undefined, requestedBy: user!.name, dateRequired: fDateReq || undefined, costImpact: fCost || undefined, scheduleImpact: fSchedule || undefined });
    toast("RFI submitted", "success"); setShowForm(false);
    setFSubject(""); setFQuestion(""); setFAssigned(""); setFDateReq("");
  };

  if (!user) return null;
  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-r from-background to-secondary/20"><CardContent className="p-5"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">← Back to Dashboard</Link><div className="flex flex-wrap gap-2 mb-2"><Badge className="bg-blue-500/15 text-blue-300">RFI Command Center</Badge><Badge variant="outline">{(rfis ?? []).length} total</Badge><Badge className="bg-blue-500/15 text-blue-300">{open} open</Badge>{overdue > 0 && <Badge className="bg-red-500/20 text-red-300">{overdue} overdue</Badge>}</div><h1 className="text-3xl font-bold tracking-tight">❓ RFIs</h1><p className="text-sm text-muted-foreground mt-2 max-w-3xl">Run formal questions, track responses, and surface information gaps before they become field problems.</p></div><div className="grid grid-cols-2 gap-2 min-w-[280px]"><Button variant="outline" onClick={() => setShowForm(true)}>+ New RFI</Button><Button variant="outline" className="border-blue-500/30 hover:bg-blue-500/10" onClick={() => setShowAutoGen(true)}>🤖 Auto-Generate</Button><Button variant="outline" onClick={() => setFilterStatus("Open")}>Open Only</Button><Link href="/documents"><Button variant="outline" className="w-full">📄 Documents</Button></Link></div></div></CardContent></Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">RFI Actions</div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setShowForm(true)}>+ New</Button><Button variant="outline" onClick={() => setShowAutoGen(true)}>🤖 Generate</Button><Link href="/documents"><Button variant="outline" className="w-full">📄 Docs</Button></Link><Link href="/submittals"><Button variant="outline" className="w-full">📋 Submittals</Button></Link></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Visual Status</div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-secondary/40 p-3"><div className="text-2xl font-bold">{(rfis ?? []).length}</div><div className="text-xs text-muted-foreground">Total</div></div><div className="rounded-xl bg-blue-500/10 p-3"><div className="text-2xl font-bold text-blue-400">{open}</div><div className="text-xs text-muted-foreground">Open</div></div><div className="rounded-xl bg-red-500/10 p-3"><div className="text-2xl font-bold text-red-400">{overdue}</div><div className="text-xs text-muted-foreground">Overdue</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Workflow Links</div><div className="grid grid-cols-2 gap-2"><Link href="/documents"><Button variant="outline" className="w-full">📁 Files</Button></Link><Link href="/submittals"><Button variant="outline" className="w-full">📨 Submittals</Button></Link><Link href="/legal"><Button variant="outline" className="w-full">⚖️ Legal</Button></Link><Link href="/emails"><Button variant="outline" className="w-full">📧 Emails</Button></Link></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{(rfis ?? []).length}</div><div className="text-xs text-muted-foreground">Total RFIs</div></CardContent></Card>
        <Card className={`border-border ${open > 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-card"}`}><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-blue-400">{open}</div><div className="text-xs text-muted-foreground">Open</div></CardContent></Card>
        <Card className={`border-border ${overdue > 0 ? "bg-red-500/10 border-red-500/30" : "bg-card"}`}><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-red-400">{overdue}</div><div className="text-xs text-muted-foreground">Overdue</div></CardContent></Card>
      </div>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setShowForm(true)} addLabel="New RFI" onExport={() => {}}>
        <Button size="sm" variant="outline" className="text-xs border-blue-500/30 hover:bg-blue-500/10" onClick={() => setShowAutoGen(true)}>
          🤖 Auto-Generate RFIs
        </Button>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}><option value="">All Projects</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">All</option><option value="Open">Open</option><option value="Answered">Answered</option><option value="Closed">Closed</option></select>
      </TableToolbar>

      <div className="space-y-3">
        {filtered.map((rfi: any) => {
          const isExp = expandedId === rfi._id;
          const isOverdue = rfi.status === "Open" && rfi.dateRequired && rfi.dateRequired < new Date().toISOString().slice(0, 10);
          return (
            <Card key={rfi._id} className={`bg-card border-border ${isOverdue ? "border-red-500/30" : ""}`}>
              <div className="p-4 cursor-pointer hover:bg-secondary/30" onClick={() => setExpandedId(isExp ? null : rfi._id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">RFI-{String(rfi.number)}</span>
                    <span className="font-medium">{rfi.subject}</span>
                    <Badge variant="outline">{rfi.projectName}</Badge>
                    <Badge variant={rfi.status === "Answered" ? "default" : rfi.status === "Open" ? "secondary" : "outline"}>{rfi.status}</Badge>
                    {rfi.costImpact && <Badge variant="destructive" className="text-xs">$$$</Badge>}
                    {rfi.scheduleImpact && <Badge variant="default" className="text-xs">📅</Badge>}
                    {isOverdue && <Badge variant="destructive">OVERDUE</Badge>}
                  </div>
                  <span className="text-muted-foreground text-sm">{rfi.dateSubmitted} {isExp ? "▲" : "▼"}</span>
                </div>
              </div>
              {isExp && (
                <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
                  <div><h4 className="text-xs font-bold text-primary mb-1">QUESTION</h4><p className="text-sm whitespace-pre-wrap">{rfi.question}</p></div>
                  {(rfi.sourceSpecSection || rfi.sourcePage || rfi.sourceQuote || rfi.sourceType === "spec_intelligence") && (
                    <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3">
                      <h4 className="text-xs font-bold text-cyan-300 mb-2">SOURCE EVIDENCE</h4>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {rfi.sourceSpecSection && <span>Spec: {rfi.sourceSpecSection}</span>}
                        {rfi.sourcePage && <span>Page: {rfi.sourcePage}</span>}
                        {typeof rfi.sourceConfidence === "number" && <span>Confidence: {Math.round(rfi.sourceConfidence * 100)}%</span>}
                        {rfi.sourceItemId && <span>Matrix item: {String(rfi.sourceItemId).slice(-8)}</span>}
                      </div>
                      {rfi.sourceQuote && <p className="mt-2 text-xs leading-5 text-muted-foreground whitespace-pre-wrap">"{rfi.sourceQuote}"</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Assigned:</span> {rfi.assignedTo || "—"}</div>
                    <div><span className="text-muted-foreground">Requested by:</span> {rfi.requestedBy || "—"}</div>
                    <div><span className="text-muted-foreground">Date Required:</span> <span className={isOverdue ? "text-red-400 font-bold" : ""}>{rfi.dateRequired || "—"}</span></div>
                  </div>
                  {rfi.answer && <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3"><h4 className="text-xs font-bold text-green-400 mb-1">ANSWER</h4><p className="text-sm whitespace-pre-wrap">{rfi.answer}</p><div className="text-xs text-muted-foreground mt-1">Answered: {rfi.dateAnswered}</div>{rfi.sourceType === "spec_intelligence" && <div className="mt-2 text-xs font-medium text-green-300">Answer synced to Spec Intelligence Matrix</div>}</div>}
                  {rfi.status === "Open" && (
                    <div className="flex gap-2"><Textarea rows={2} value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Type answer..." className="flex-1" />
                      <Button onClick={() => { answerRFI({ id: rfi._id, answer: answerText, answeredBy: user?.name }).then(() => { toast(rfi.sourceType === "spec_intelligence" ? "Answered and synced to Spec Intelligence Matrix" : "Answered", "success"); setAnswerText(""); }); }}>Answer</Button></div>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => removeRFI({ id: rfi._id }).then(() => toast("Deleted", "success"))}>Delete</Button>
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && <EmptyState icon="❓" title="No RFIs" description="Track formal questions and answers" actionLabel="+ New RFI" onAction={() => setShowForm(true)} />}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border"><h3 className="font-bold text-lg">New RFI</h3></div>
            <div className="p-4 space-y-3">
              <div><label className="text-sm font-semibold block mb-1">Project *</label><select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={fProject} onChange={(e) => setFProject(e.target.value)}><option value="">Select...</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1">Subject *</label><Input value={fSubject} onChange={(e) => setFSubject(e.target.value)} /></div>
              <div><label className="text-sm font-semibold block mb-1">Question *</label><Textarea rows={4} value={fQuestion} onChange={(e) => setFQuestion(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-semibold block mb-1">Priority</label><select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={fPriority} onChange={(e) => setFPriority(e.target.value)}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
                <div><label className="text-sm font-semibold block mb-1">Assigned To</label><Input value={fAssigned} onChange={(e) => setFAssigned(e.target.value)} /></div>
                <div><label className="text-sm font-semibold block mb-1">Date Required</label><Input type="date" value={fDateReq} onChange={(e) => setFDateReq(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" /></div>
              </div>
              <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fCost} onChange={(e) => setFCost(e.target.checked)} /> Cost Impact</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fSchedule} onChange={(e) => setFSchedule(e.target.checked)} /> Schedule Impact</label></div>
            </div>
            <div className="p-4 border-t border-border flex justify-between"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleCreate}>Submit RFI</Button></div>
          </div>
        </div>
      )}
      {/* Auto-Generate RFIs Modal */}
      {showAutoGen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">🤖 Auto-Generate RFIs</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowAutoGen(false); setAutoGenResult(null); }}>✕</Button>
            </div>
            <div className="p-4 space-y-4">
              {!autoGenResult ? (
                <>
                  <p className="text-sm text-muted-foreground">AI will scan all project documents (specs, drawings, contracts) and automatically generate RFIs for ambiguities, missing info, conflicts, and constructability concerns.</p>
                  <div>
                    <label className="text-sm font-semibold block mb-1">Project *</label>
                    <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={autoGenProject} onChange={(e) => setAutoGenProject(e.target.value)}>
                      <option value="">Select project...</option>
                      {(projects || []).map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1">Focus Area</label>
                    <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={autoGenFocus} onChange={(e) => setAutoGenFocus(e.target.value)}>
                      <option value="all">All Trades</option>
                      <option value="structural">Structural</option>
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="mechanical/HVAC">Mechanical / HVAC</option>
                      <option value="architectural">Architectural</option>
                      <option value="sitework">Sitework / Civil</option>
                      <option value="roofing">Roofing</option>
                      <option value="fire protection">Fire Protection</option>
                      <option value="concrete">Concrete</option>
                      <option value="steel">Steel / Metals</option>
                    </select>
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!autoGenProject || autoGenLoading}
                    onClick={async () => {
                      setAutoGenLoading(true);
                      try {
                        const result = await scanAndGenerate({
                          projectId: autoGenProject,
                          companyId: user!.companyId,
                          focusArea: autoGenFocus,
                        });
                        setAutoGenResult(result);
                        toast(result.message || "Done!", "success");
                      } catch (e) {
                        toast("Failed: " + (e as Error).message, "error");
                      }
                      setAutoGenLoading(false);
                    }}
                  >
                    {autoGenLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">🔄</span> Analyzing documents... this may take 30-60 seconds
                      </span>
                    ) : "🤖 Scan Documents & Generate RFIs"}
                  </Button>
                </>
              ) : (
                <>
                  {/* Results */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-secondary/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{autoGenResult.rfisGenerated}</p>
                        <p className="text-xs text-muted-foreground">RFIs Generated</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{autoGenResult.documentsAnalyzed}</p>
                        <p className="text-xs text-muted-foreground">Documents Analyzed</p>
                      </div>
                    </div>
                    {autoGenResult.summary && (
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">AI Analysis Summary</h4>
                        <p className="text-sm">{autoGenResult.summary}</p>
                      </div>
                    )}
                    {autoGenResult.rfis?.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase">Generated RFIs</h4>
                        {autoGenResult.rfis.map((rfi: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-secondary/30 rounded px-3 py-2 text-sm">
                            <Badge variant={rfi.priority === "Critical" ? "destructive" : rfi.priority === "High" ? "default" : "secondary"} className="text-[10px] shrink-0">
                              {rfi.priority}
                            </Badge>
                            <span className="truncate">{rfi.subject}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {autoGenResult.rfisGenerated === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        <p className="text-2xl mb-2">✅</p>
                        <p>{autoGenResult.message}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setAutoGenResult(null)}>Run Again</Button>
                    <Button className="flex-1" onClick={() => { setShowAutoGen(false); setAutoGenResult(null); }}>Done</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RFIsPage() { return <AppShell><RFIContent /></AppShell>; }
