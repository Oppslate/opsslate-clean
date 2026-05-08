
"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar } from "@/components/table-toolbar";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

interface Requirement {
  category: string;
  description: string;
  limit?: string;
  status?: string;
}

function InsuranceContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const records = useQuery(
    api.insuranceRequirements.list,
    user ? { companyId: user.companyId } : "skip"
  );
  const projects = useQuery(
    api.projects.list,
    user ? { companyId: user.companyId } : "skip"
  );
  const createRecord = useMutation(api.insuranceRequirements.create);
  const updateRecord = useMutation(api.insuranceRequirements.update);
  const removeRecord = useMutation(api.insuranceRequirements.remove);
  const generateUploadUrl = useMutation(api.insuranceRequirements.generateUploadUrl);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    data?: Record<string, unknown>;
  } | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [extractedReqs, setExtractedReqs] = useState<Requirement[]>([]);

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    if (projects) {
      for (const p of projects) {
        m.set(p._id as string, (p as Record<string, unknown>).name as string);
      }
    }
    return m;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!records) return [];
    const recs = records as Array<Record<string, unknown>>;
    let r = recs;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
    }
    if (filterProject) r = r.filter((x) => x.projectId === filterProject);
    return r;
  }, [records, search, filterProject]);

  const openCreate = () => {
    setFormValues({});
    setExtractedReqs([]);
    setModal({ mode: "create" });
  };

  const openEdit = (data: Record<string, unknown>) => {
    setFormValues(data);
    setExtractedReqs((data.requirements as Requirement[]) ?? []);
    setModal({ mode: "edit", data });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let storageId = formValues.storageId as Id<"_storage"> | undefined;
      const file = formValues.file as File | undefined;
      if (file) {
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!res.ok) throw new Error("Upload failed");
        const uploaded = await res.json();
        storageId = uploaded.storageId as Id<"_storage">;
      }

      if (modal?.mode === "edit" && modal.data) {
        await updateRecord({
          id: modal.data._id as Id<"insuranceRequirements">,
          name: (formValues.name as string) || undefined,
          storageId,
          fileName: (formValues.fileName as string) || undefined,
          fileSize: formValues.fileSize as number | undefined,
          extractedText: (formValues.extractedText as string) || undefined,
          requirements: extractedReqs.length > 0 ? extractedReqs : undefined,
          status: (formValues.status as string) || undefined,
        });
      } else {
        await createRecord({
          companyId: user.companyId,
          projectId: formValues.projectId as Id<"projects">,
          name: (formValues.name as string) || undefined,
          storageId,
          fileName: (formValues.fileName as string) || undefined,
          fileSize: formValues.fileSize as number | undefined,
          extractedText: (formValues.extractedText as string) || undefined,
          requirements: extractedReqs.length > 0 ? extractedReqs : undefined,
        });
      }
      toast(modal?.mode === "edit" ? "Updated" : "Created", "success");
      setModal(null);
    } catch (e) {
      toast("Failed: " + (e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addManualReq = () => {
    setExtractedReqs((prev) => [
      ...prev,
      { category: "", description: "", limit: "", status: "pending" },
    ]);
  };

  const updateReq = (idx: number, field: keyof Requirement, value: string) => {
    setExtractedReqs((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const removeReq = (idx: number) => {
    setExtractedReqs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast("Please upload a PDF file", "error");
      return;
    }
    setFormValues((prev) => ({
      ...prev,
      file,
      fileName: file.name,
      fileSize: file.size,
    }));

    // Try to extract text with pdf.js
    try {
      const pdfjsSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = pdfjsSrc;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load pdf.js"));
          document.head.appendChild(s);
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const buf = await file.arrayBuffer();
        const doc = await lib.getDocument({ data: buf }).promise;
        const numPages = doc.numPages;
        const pages: string[] = [];
        for (let i = 1; i <= numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item: { str: string }) => item.str).join(" "));
        }
        const text = pages.join("\n\n");
        setFormValues((prev) => ({ ...prev, extractedText: text }));

        // Basic keyword extraction
        const reqs = extractRequirements(text);
        setExtractedReqs(reqs);
        if (reqs.length > 0) {
          toast(`Found ${reqs.length} insurance requirement(s)`, "success");
        } else {
          toast("No requirements auto-detected. Add manually.", "info");
        }
      }
    } catch {
      // PDF extraction is best-effort
      toast("Could not extract PDF text. Add requirements manually.", "info");
    }
  };

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">🛡️ Insurance Requirements</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Upload project specs and track insurance requirements
      </p>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreate}
        addLabel="Add Insurance Spec"
      >
        <select
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (
            <option key={p._id as string} value={p._id as string}>
              {(p as Record<string, unknown>).name as string}
            </option>
          ))}
        </select>
      </TableToolbar>

      {!records ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="No insurance requirements yet"
          description="Upload a project spec PDF to extract insurance requirements."
          actionLabel="+ Upload Spec"
          onAction={openCreate}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Requirements</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow
                key={r._id as string}
                className="cursor-pointer hover:bg-secondary/50"
                onClick={() => openEdit(r)}
              >
                <TableCell className="font-medium">
                  {projectMap.get(r.projectId as string) ?? ""}
                </TableCell>
                <TableCell>{(r.name as string) ?? "Untitled"}</TableCell>
                <TableCell>
                  {r.fileName ? (
                    <span className="text-xs">📄 {String(r.fileName)}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="default">
                    {((r.requirements as Requirement[]) ?? []).length} items
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      (r.status as string) === "reviewed" ? "default" : "secondary"
                    }
                  >
                    {(r.status as string) ?? "pending"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-lg">
                {modal.mode === "edit"
                  ? "Edit Insurance Spec"
                  : "Upload Insurance Spec"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-auto flex-1">
              {/* Project */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Project <span className="text-destructive">*</span>
                </label>
                <select
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  value={(formValues.projectId as string) ?? ""}
                  onChange={(e) =>
                    setFormValues((p) => ({ ...p, projectId: e.target.value }))
                  }
                >
                  <option value="">Select...</option>
                  {(projects ?? []).map((p) => (
                    <option key={p._id as string} value={p._id as string}>
                      {(p as Record<string, unknown>).name as string}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Spec Name
                </label>
                <Input
                  value={(formValues.name as string) ?? ""}
                  onChange={(e) =>
                    setFormValues((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. General Contract Insurance Requirements"
                />
              </div>

              {/* PDF Upload */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Upload PDF Specification
                </label>
                <Input type="file" accept=".pdf" onChange={handleFileChange} />
                {formValues.fileName ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    📄 {String(formValues.fileName)}
                  </p>
                ) : null}
              </div>

              {/* Requirements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    Insurance Requirements ({extractedReqs.length})
                  </label>
                  <Button variant="outline" size="sm" onClick={addManualReq}>
                    + Add Requirement
                  </Button>
                </div>
                {extractedReqs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Upload a PDF to auto-detect requirements, or add manually.
                  </p>
                )}
                <div className="space-y-2 max-h-60 overflow-auto">
                  {extractedReqs.map((req, idx) => (
                    <div
                      key={idx}
                      className="border border-border rounded-lg p-3 bg-secondary/30 space-y-2"
                    >
                      <div className="flex gap-2">
                        <Input
                          placeholder="Category (e.g. General Liability)"
                          value={req.category}
                          onChange={(e) =>
                            updateReq(idx, "category", e.target.value)
                          }
                          className="flex-1 text-sm"
                        />
                        <Input
                          placeholder="Limit (e.g. $1,000,000)"
                          value={req.limit ?? ""}
                          onChange={(e) => updateReq(idx, "limit", e.target.value)}
                          className="w-40 text-sm"
                        />
                        <select
                          className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs"
                          value={req.status ?? "pending"}
                          onChange={(e) =>
                            updateReq(idx, "status", e.target.value)
                          }
                        >
                          <option value="identified">Identified</option>
                          <option value="pending">Pending</option>
                          <option value="met">Met</option>
                          <option value="not_met">Not Met</option>
                        </select>
                        <button
                          onClick={() => removeReq(idx)}
                          className="text-destructive hover:text-destructive/80 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                      <Input
                        placeholder="Description"
                        value={req.description}
                        onChange={(e) =>
                          updateReq(idx, "description", e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Status (edit only) */}
              {modal.mode === "edit" && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Status
                  </label>
                  <select
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                    value={(formValues.status as string) ?? "pending"}
                    onChange={(e) =>
                      setFormValues((p) => ({ ...p, status: e.target.value }))
                    }
                  >
                    <option value="pending">Pending Review</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="compliant">Compliant</option>
                    <option value="non_compliant">Non-Compliant</option>
                  </select>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div>
                {modal.mode === "edit" && modal.data && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Delete this record?")) return;
                      await removeRecord({
                        id: modal.data!._id as Id<"insuranceRequirements">,
                      });
                      toast("Deleted", "success");
                      setModal(null);
                    }}
                  >
                    🗑️ Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formValues.projectId}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function extractRequirements(text: string): Requirement[] {
  const requirements: Requirement[] = [];
  const lines = text.split(/\n/);
  const keywords = [
    "general liability",
    "commercial general liability",
    "auto liability",
    "automobile liability",
    "workers compensation",
    "workers' compensation",
    "umbrella",
    "excess liability",
    "professional liability",
    "errors and omissions",
    "builder's risk",
    "builders risk",
    "pollution liability",
    "property",
    "inland marine",
    "performance bond",
    "payment bond",
    "additional insured",
    "waiver of subrogation",
  ];
  const dollarPattern =
    /\$[\d,]+(?:\.\d{2})?(?:\s*(?:per|each|aggregate|occurrence|combined)[\w\s]*)?/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        const context = lines.slice(i, i + 3).join(" ");
        const limits = context.match(dollarPattern);
        requirements.push({
          category: keyword
            .split(" ")
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" "),
          description: lines[i].trim().substring(0, 200),
          limit: limits ? limits.join(", ") : undefined,
          status: "identified",
        });
        break;
      }
    }
  }

  const seen = new Set<string>();
  return requirements.filter((r) => {
    const key = r.category.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function InsurancePage() {
  return (
    <AppShell>
      <InsuranceContent />
    </AppShell>
  );
}
