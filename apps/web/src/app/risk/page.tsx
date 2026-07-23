
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { CrudModal, FieldDef } from "@/components/crud-modal";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import { TableToolbar, exportCSV } from "@opsslate/suite-ui/table-toolbar";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
// pdf.js loaded dynamically to avoid SSR issues

function ContractAnalysisSection() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const analyses = useQuery(api.contractAnalysis.list, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const createAnalysis = useMutation(api.contractAnalysis.create);
  const removeAnalysis = useMutation(api.contractAnalysis.remove);
  const generateUploadUrl = useMutation(api.contractAnalysis.generateUploadUrl);
  const analyzeContract = useAction(api.analyzeContract.analyze as any);
  const pushToRisks = useAction(api.contractToRisks.pushToRiskRegister as any);
  const { toast } = useToast();
  const [pushing, setPushing] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedProject) return;

    setUploading(true);
    try {
      // Extract text from PDF on client side
      const arrayBuffer = await file.arrayBuffer();

      // Dynamic import to avoid SSR issues
      // @ts-expect-error no types for mjs build
      const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(" ");
        fullText += text + "\n\n";
      }

      if (!fullText.trim()) {
        toast("Could not extract text from PDF. It may be scanned/image-based.", "error");
        setUploading(false);
        return;
      }

      // Upload file to Convex storage
      const uploadUrl = await generateUploadUrl();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await uploadRes.json();

      // Create analysis record
      const analysisId = await createAnalysis({
        companyId: user.companyId,
        projectId: selectedProject as Id<"projects">,
        fileName: file.name,
        fileSize: file.size,
        storageId,
        rawText: fullText.slice(0, 100000),
      });

      toast("PDF uploaded. Analyzing with AI...", "success");

      // Trigger AI analysis
      await analyzeContract({
        analysisId,
        text: fullText,
      });

      toast("Analysis complete!", "success");
    } catch (err) {
      toast("Error: " + (err as Error).message, "error");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <Card className="bg-card border-border mb-6">
      <CardHeader>
        <CardTitle>Contract Analysis (AI)</CardTitle>
        <p className="text-muted-foreground text-xs">Upload a contract PDF — AI will extract project summary, insurance requirements, critical dates, milestones, and risks.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Project</label>
            <select
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Select project...</option>
              {(projects ?? []).map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              !selectedProject || uploading ? "bg-secondary text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}>
              {uploading ? "Analyzing..." : "Upload PDF"}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={!selectedProject || uploading}
              />
            </label>
          </div>
        </div>

        {(analyses ?? []).map((a) => {
          const isExpanded = expandedId === (a._id as string) || a.status === "complete";
          return (
          <div key={a._id as string} className="border border-border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-3 bg-secondary/30 cursor-pointer hover:bg-secondary/50"
              onClick={() => setExpandedId(expandedId === (a._id as string) ? null : (a._id as string))}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{a.fileName as string}</span>
                <Badge variant="outline">{a.projectName as string}</Badge>
                <Badge variant={a.status === "complete" ? "default" : a.status === "error" ? "destructive" : "secondary"}>
                  {(a.status as string) ?? "processing"}
                </Badge>
              </div>
              <div className="flex gap-2">
                {a.status === "complete" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pushing === (a._id as string)}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setPushing(a._id as string);
                      try {
                        const result = await pushToRisks({ analysisId: a._id as Id<"contractAnalysis"> });
                        toast(`Added ${(result as any).count} items to Risk Register`, "success");
                      } catch (err) {
                        toast("Failed: " + (err as Error).message, "error");
                      }
                      setPushing(null);
                    }}
                  >
                    {pushing === (a._id as string) ? "Adding..." : "Add to Risk Register"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAnalysis({ id: a._id as Id<"contractAnalysis"> });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>

            {a.status === "complete" && (
              <div className="p-4 space-y-5">
                {/* Summary */}
                {Boolean(a.summary) && (
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-2">PROJECT SUMMARY</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.summary as string}</p>
                  </div>
                )}

                {/* Insurance Requirements */}
                {(a.insuranceRequirements as any[])?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-2">INSURANCE REQUIREMENTS</h4>
                    <ul className="space-y-1">
                      {(a.insuranceRequirements as any[]).map((req: any, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{req.requirement}{req.limit ? <span className="font-semibold text-green-400 ml-1">({req.limit})</span> : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Critical Dates */}
                {(a.criticalDates as any[])?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-2">CRITICAL DATES</h4>
                    <ul className="space-y-1">
                      {(a.criticalDates as any[]).map((d: any, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-destructive mt-0.5">•</span>
                          <span><span className="font-semibold">{d.date}</span> — {d.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scheduling Milestones */}
                {(a.schedulingMilestones as any[])?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-2">SCHEDULING MILESTONES</h4>
                    <ul className="space-y-1">
                      {(a.schedulingMilestones as any[]).map((m: any, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-yellow-400 mt-0.5">•</span>
                          <span>{m.milestone}{m.date ? <span className="font-semibold ml-1">({m.date})</span> : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {(a.risks as any[])?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-2">IDENTIFIED RISKS</h4>
                    <ul className="space-y-1">
                      {(a.risks as any[]).map((r: any, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className={`mt-0.5 ${r.severity === "High" ? "text-destructive" : r.severity === "Medium" ? "text-yellow-400" : "text-muted-foreground"}`}>•</span>
                          <span>{r.risk} <Badge variant={r.severity === "High" ? "destructive" : r.severity === "Medium" ? "default" : "secondary"} className="ml-1 text-xs">{r.severity ?? "—"}</Badge></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {a.status === "processing" && (
              <div className="p-4 text-center text-muted-foreground text-sm animate-pulse">
                AI is analyzing the document... this may take 30-60 seconds.
              </div>
            )}

            {a.status === "error" && (
              <div className="p-4 text-destructive text-sm">{a.summary as string}</div>
            )}
          </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RiskContent() {
  const { user } = useAuth();
  const risks = useQuery(api.risks.listByCompany, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const createRisk = useMutation(api.risks.create);
  const updateRisk = useMutation(api.risks.update);
  const removeRisk = useMutation(api.risks.remove);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);

  const filtered = useMemo(() => {
    if (!risks) return [];
    let r = risks;
    if (search) { const q = search.toLowerCase(); r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q)); }
    if (filterProject) r = r.filter((x) => x.projectId === filterProject);
    if (filterStatus) r = r.filter((x) => (x.status ?? "Open") === filterStatus);
    return r;
  }, [risks, search, filterProject, filterStatus]);

  const fields: FieldDef[] = [
    { key: "projectId", label: "Project", type: "select", required: true, options: (projects ?? []).map((p) => ({ label: p.name, value: p._id })) },
    { key: "description", label: "Risk Description", type: "textarea", required: true },
    { key: "probability", label: "Probability", type: "select", options: [{ label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" }] },
    { key: "impact", label: "Impact", type: "select", options: [{ label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" }] },
    { key: "mitigation", label: "Mitigation Plan", type: "textarea" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", type: "select", options: [{ label: "Open", value: "Open" }, { label: "Mitigated", value: "Mitigated" }, { label: "Closed", value: "Closed" }, { label: "Occurred", value: "Occurred" }] },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    if (modal?.mode === "edit" && modal.data) {
      const allowedKeys = ["description", "probability", "impact", "mitigation", "owner", "status"];
      const cleaned: Record<string, unknown> = {};
      for (const k of allowedKeys) {
        if (values[k] !== undefined) cleaned[k] = values[k];
      }
      await updateRisk({ id: modal.data._id as Id<"risks">, ...cleaned as Record<string, string | undefined> });
    } else {
      await createRisk(values as Parameters<typeof createRisk>[0]);
    }
  };

  const handleExport = () => {
    const headers = ["Project", "Description", "Probability", "Impact", "Mitigation", "Owner", "Status"];
    const rows = filtered.map((r) => [(r.projectName as string) ?? "", (r.description as string) ?? "", (r.probability as string) ?? "", (r.impact as string) ?? "", (r.mitigation as string) ?? "", (r.owner as string) ?? "", (r.status as string) ?? "Open"]);
    exportCSV(headers, rows, "risk-register.csv");
  };

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">Risk Register</h1>
      <p className="text-muted-foreground text-sm mb-4">Identify, assess, and mitigate project risks</p>

      <ContractAnalysisSection />

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setModal({ mode: "create" })} addLabel="Add Risk" onExport={handleExport}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Mitigated">Mitigated</option>
          <option value="Closed">Closed</option>
          <option value="Occurred">Occurred</option>
        </select>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Probability</TableHead>
            <TableHead>Impact</TableHead>
            <TableHead>Mitigation</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r._id as string} className="cursor-pointer hover:bg-secondary/50" onClick={() => setModal({ mode: "edit", data: r })}>
              <TableCell>{(r.projectName as string) ?? ""}</TableCell>
              <TableCell className="font-medium max-w-xs truncate">{(r.description as string) ?? ""}</TableCell>
              <TableCell><Badge variant={(r.probability as string) === "High" ? "destructive" : "secondary"}>{(r.probability as string) ?? ""}</Badge></TableCell>
              <TableCell><Badge variant={(r.impact as string) === "High" ? "destructive" : "secondary"}>{(r.impact as string) ?? ""}</Badge></TableCell>
              <TableCell className="text-xs max-w-xs truncate">{(r.mitigation as string) ?? ""}</TableCell>
              <TableCell>{(r.owner as string) ?? ""}</TableCell>
              <TableCell><Badge>{(r.status as string) ?? "Open"}</Badge></TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (<tr><td colSpan={7}><EmptyState icon="!" title="No risks logged" description="Identify and track project risks with mitigation plans." actionLabel="+ Add First Risk" onAction={() => setModal({ mode: "create" })} /></td></tr>)}
        </TableBody>
      </Table>

      {modal && (
        <CrudModal
          title={modal.mode === "edit" ? "Edit Risk" : "Add Risk"}
          fields={fields}
          initialValues={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.mode === "edit" ? async () => { await removeRisk({ id: modal.data!._id as Id<"risks"> }); } : undefined}
        />
      )}
    </div>
  );
}

export default function RiskPage() {
  return <AppShell><RiskContent /></AppShell>;
}
