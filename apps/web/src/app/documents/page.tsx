"use client";
import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import Link from "next/link";
import { TableToolbar } from "@opsslate/suite-ui/table-toolbar";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";

const CATEGORIES = ["Proposal", "Bid", "Contract", "Drawings", "Specs", "Shop Drawings", "Permits", "Insurance", "Safety", "Photos", "Pictures", "Reports", "Correspondence", "Submittals", "RFIs", "Change Orders", "Meeting Minutes", "Vendors", "Subcontractors", "Prevailing Wage", "Customer Invoices", "Checklist", "Other"];

function formatBytes(b: number) { if (b < 1024) return b + "B"; if (b < 1048576) return (b/1024).toFixed(1)+"KB"; return (b/1048576).toFixed(1)+"MB"; }
function fileIcon(name: string) {
  if (name.match(/\.pdf$/i)) return "📄";
  if (name.match(/\.(doc|docx)$/i)) return "📝";
  if (name.match(/\.(xls|xlsx)$/i)) return "📊";
  if (name.match(/\.(jpg|png|gif|webp)$/i)) return "🖼️";
  if (name.match(/\.(dwg|dxf)$/i)) return "📐";
  return "📁";
}

function DocsContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const [filterProject, setFilterProject] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");
  const docs = useQuery(api.docManager.list, user ? { companyId: user.companyId, projectId: filterProject || undefined, category: filterCat || undefined } : "skip") as any[] | undefined;
  const generateUrl = useMutation(api.siteMedia.generateUploadUrl);
  const createDoc = useMutation(api.docManager.create);
  const autoScanDoc = useAction(api.autoDocScan.scanDocument as any);
  const autoScanAll = useAction(api.autoDocScan.scanAllForProject as any);
  const removeDoc = useMutation(api.docManager.remove);
  const { toast } = useToast();
  const extractDocInfo = useAction(api.bidManager.extractDocumentInfo as any);
  const analyzeDoc = useAction(api.docAnalyzer.analyzeDocument as any);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [uploadProject, setUploadProject] = useState("");
  const [uploadCat, setUploadCat] = useState("Other");

  const filtered = useMemo(() => { if (!docs) return []; if (!search) return docs; return docs.filter((d) => JSON.stringify(d).toLowerCase().includes(search.toLowerCase())); }, [docs, search]);

  const handleUpload = async (files: FileList) => {
    if (!uploadProject) { toast("Select project first", "error"); return; }
    setUploading(true);
    const docsToExtract: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const url = await generateUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const { storageId } = await res.json();
        const docId = await createDoc({ companyId: user!.companyId, projectId: uploadProject as Id<"projects">, name: file.name, category: uploadCat, url: `https://sincere-duck-383.convex.cloud/api/storage/${storageId}`, storageId, fileSize: file.size, uploadedBy: user!.name });
        // Auto-extract images and PDFs
        if (file.name.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i)) {
          docsToExtract.push(docId);
        }
      } catch (e) { toast("Failed: " + file.name, "error"); }
    }
    toast("Uploaded", "success"); setUploading(false);
    // Kick off AI extraction in background
    for (const docId of docsToExtract) {
      toast("🧠 AI reading document...", "info");
      extractDocInfo({ documentId: docId }).then(() => {
        toast("✅ AI extraction complete!", "success");
      }).catch(() => {
        // Fallback: try auto-scan which creates critical tasks on failure
        autoScanDoc({ documentId: docId as any, companyId: user!.companyId as any, projectId: uploadProject as string }).catch(() => {});
      });
    }
    // Auto-scan non-image/PDF files too (doc, xls, etc.)
    // These won't be in docsToExtract but should still be scanned
    if (docsToExtract.length === 0 && uploadProject) {
      toast("🧠 AI scanning documents...", "info");
      autoScanAll({ companyId: user!.companyId as any, projectId: uploadProject as string }).then((r: any) => {
        if (r?.scanned > 0) toast(`✅ Scanned ${r.scanned} documents`, "success");
        if (r?.failed > 0) toast(`⚠️ ${r.failed} documents need manual review — critical tasks created`, "error");
      }).catch(() => {});
    }
  };

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (docs ?? []).forEach((d) => { counts[d.category] = (counts[d.category] ?? 0) + 1; });
    return counts;
  }, [docs]);

  if (!user) return null;
  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-r from-background to-secondary/20">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0">
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">← Back to Dashboard</Link>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className="bg-orange-500/15 text-orange-300">Document Command Center</Badge>
                <Badge variant="outline">{(docs ?? []).length} docs</Badge>
                <Badge variant="outline">{Object.keys(catCounts).length} categories</Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">📄 Documents</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">Organize plans, specs, contracts, insurance, safety files, AI-read documents, and project correspondence in one place.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-[280px]">
              <Button variant="outline" onClick={() => fileRef.current?.click()}>📤 Upload</Button>
              <Link href="/bulk-upload"><Button variant="outline" className="w-full">📦 Bulk Upload</Button></Link>
              <Button variant="outline" onClick={() => uploadProject && autoScanAll({ companyId: user.companyId as any, projectId: uploadProject as string }).then(() => toast("Scan started", "success")).catch(() => toast("Scan failed", "error"))}>🧠 AI Scan</Button>
              <Button variant="outline" onClick={() => setFilterCat("")}>🗂️ View All</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Upload & Intake</div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => fileRef.current?.click()}>📤 Upload</Button><Link href="/bulk-upload"><Button variant="outline" className="w-full">📦 Bulk</Button></Link><Button variant="outline" onClick={() => uploadProject && autoScanAll({ companyId: user.companyId as any, projectId: uploadProject as string }).then(() => toast("Scan started", "success")).catch(() => toast("Scan failed", "error"))}>🧠 Scan</Button><Button variant="outline" onClick={() => setUploadCat("Other")}>🏷️ Reset Cat</Button></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Find & Filter</div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setFilterCat("Specs")}>📐 Specs</Button><Button variant="outline" onClick={() => setFilterCat("Drawings")}>📄 Drawings</Button><Button variant="outline" onClick={() => setFilterCat("Contract")}>🤝 Contracts</Button><Button variant="outline" onClick={() => setFilterCat("Safety")}>🦺 Safety</Button></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Workflow</div><div className="grid grid-cols-2 gap-2"><Link href="/rfis"><Button variant="outline" className="w-full">📋 RFIs</Button></Link><Link href="/submittals"><Button variant="outline" className="w-full">📨 Submittals</Button></Link><Link href="/insurance"><Button variant="outline" className="w-full">🛡️ Insurance</Button></Link><Link href="/legal"><Button variant="outline" className="w-full">⚖️ Legal</Button></Link></div></CardContent></Card>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant={filterCat === "" ? "default" : "outline"} onClick={() => setFilterCat("")}>All ({(docs ?? []).length})</Button>
        {CATEGORIES.filter((c) => catCounts[c]).map((c) => (
          <Button key={c} size="sm" variant={filterCat === c ? "default" : "outline"} onClick={() => setFilterCat(c)}>{c} ({catCounts[c]})</Button>
        ))}
      </div>

      {/* Upload bar */}
      <Card className="bg-card border-border mb-4"><CardContent className="p-3">
        <div className="flex items-end gap-3">
          <div className="flex-1"><label className="text-xs text-muted-foreground">Project</label>
            <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={uploadProject} onChange={(e) => setUploadProject(e.target.value)}><option value="">Select...</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
          <div><label className="text-xs text-muted-foreground">Category</label>
            <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={uploadCat} onChange={(e) => setUploadCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <Link href="/bulk-upload"><Button variant="outline">📦 Bulk Upload</Button></Link>
          <Button disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading..." : "📤 Upload Files"}</Button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
        </div>
      </CardContent></Card>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => fileRef.current?.click()} addLabel="Upload" onExport={() => {}}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}><option value="">All Projects</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
      </TableToolbar>

      <div className="space-y-2">
        {filtered.map((doc: any) => (
          <Card key={doc._id} className="bg-card border-border hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-4 p-3 cursor-pointer" onClick={() => setExpandedDoc(expandedDoc === doc._id ? null : doc._id)}>
              <span className="text-2xl">{fileIcon(doc.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {doc.url ? (
                    <a
                      href={doc.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)
                        ? `https://docs.google.com/gview?url=${encodeURIComponent(doc.url)}&embedded=true`
                        : doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >{doc.name}</a>
                  ) : doc.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{doc.projectName}</Badge>
                  <Badge variant="secondary">{doc.category}</Badge>
                  {doc.uploadedBy && <span>by {doc.uploadedBy}</span>}
                  {doc.uploadedAt && <span>{doc.uploadedAt.slice(0, 10)}</span>}
                  {doc.aiStatus === "done" && <Badge variant="default" className="text-[10px] bg-green-600">🧠 AI Read</Badge>}
                  {doc.aiStatus === "processing" && <Badge variant="outline" className="text-[10px] text-yellow-400">🔄 Reading...</Badge>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{doc.fileSize ? formatBytes(doc.fileSize) : ""}</span>
              {doc.version && <Badge variant="outline">v{doc.version}</Badge>}
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                {doc.name.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i) && !doc.aiExtract && (
                  <Button size="sm" variant="outline" disabled={extractingId === doc._id} title="Read"
                    onClick={async () => {
                      setExtractingId(doc._id);
                      try { await extractDocInfo({ documentId: doc._id }); toast("✅ AI extraction done!", "success"); } catch (e: any) { toast(e.message, "error"); }
                      setExtractingId(null);
                    }}>
                    {extractingId === doc._id ? "🔄..." : "🧠 Read"}
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={analyzingId === doc._id}
                  title="Analyze"
                  className={analyzingId === doc._id ? "animate-pulse" : "border-orange-500/50 text-orange-400 hover:bg-orange-500/10"}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setAnalyzingId(doc._id);
                    try { await analyzeDoc({ documentId: doc._id }); toast("✅ Document analysis complete!", "success"); } catch (err: any) { toast(err.message, "error"); }
                    setAnalyzingId(null);
                  }}>
                  {analyzingId === doc._id ? "🔄 Analyzing..." : "🔍 Analyze"}
                </Button>
                {doc.url && (
                  <>
                    {doc.name.match(/\.(pdf|jpg|jpeg|png|gif|webp|svg)$/i) && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" title="Preview">👁️</Button></a>
                    )}
                    {doc.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) && (
                      <a href={`https://docs.google.com/gview?url=${encodeURIComponent(doc.url)}&embedded=true`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" title="Preview">👁️</Button></a>
                    )}
                    <a href={doc.url} download={doc.name}><Button size="sm" variant="outline" title="Download">↓</Button></a>
                  </>
                )}
                <Button size="sm" variant="destructive" title="Delete" onClick={() => removeDoc({ id: doc._id }).then(() => toast("Deleted", "success"))}>✕</Button>
              </div>
            </div>
            {/* AI Extracted content */}
            {expandedDoc === doc._id && doc.aiExtract && (
              <div className="px-4 pb-3 border-t border-border/50 mt-1 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-green-400">🧠 AI Extracted Information</span>
                  {doc.aiStatus === "failed" && <Badge variant="destructive" className="text-[10px]">Failed</Badge>}
                </div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-secondary/30 rounded-lg p-4 max-h-[70vh] overflow-y-auto leading-relaxed">
                  {doc.aiExtract.split("\n").map((line: string, i: number) => {
                    if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold text-foreground mt-4 mb-1 border-b border-border/30 pb-1">{line.replace("## ", "")}</h3>;
                    if (line.startsWith("# ")) return <h2 key={i} className="text-base font-bold text-foreground mt-4 mb-2">{line.replace("# ", "")}</h2>;
                    if (line.startsWith("| ")) return <code key={i} className="block text-[11px] text-muted-foreground font-mono">{line}</code>;
                    if (line.includes("🔴")) return <p key={i} className="text-red-400 my-0.5">{line}</p>;
                    if (line.includes("🟡")) return <p key={i} className="text-yellow-400 my-0.5">{line}</p>;
                    if (line.includes("🟢")) return <p key={i} className="text-green-400 my-0.5">{line}</p>;
                    if (line.includes("⚠️")) return <p key={i} className="text-orange-400 font-medium my-0.5">{line}</p>;
                    if (line.startsWith("- ")) return <p key={i} className="ml-3 my-0.5">• {line.slice(2)}</p>;
                    return <p key={i} className="my-0.5">{line}</p>;
                  })}
                </div>
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && <EmptyState icon="📄" title="No documents" description="Upload contracts, drawings, specs, and more" actionLabel="📤 Upload" onAction={() => fileRef.current?.click()} />}
      </div>
    </div>
  );
}
export default function DocumentsPage() { return <AppShell><DocsContent /></AppShell>; }
