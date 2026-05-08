"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const CATEGORIES = [
  "Proposal", "Bid", "Contract", "Drawings", "Specs", "Shop Drawings",
  "Permits", "Insurance", "Safety", "Photos", "Pictures", "Reports", "Correspondence",
  "Submittals", "RFIs", "Change Orders", "Meeting Minutes",
  "Vendors", "Subcontractors", "Prevailing Wage", "Customer Invoices", "Checklist", "Other"
];

// Auto-categorize based on filename patterns
function detectCategory(filename: string): string {
  const name = filename.toLowerCase();

  // Contracts
  if (name.match(/contract|agreement|aia|subcontract|master.?service/)) return "Contract";
  // Insurance
  if (name.match(/insurance|certificate|coi|acord|liab|coverage|bond|surety/)) return "Insurance";
  // Permits
  if (name.match(/permit|license|approval|variance|zoning|dot |nysdot|osha/)) return "Permits";
  // Drawings / Plans
  if (name.match(/drawing|plan|blueprint|detail|elevation|section|floor.?plan|site.?plan|civil|arch|structural|mep|dwg|cad/)) return "Drawings";
  // Specs
  if (name.match(/spec|specification|division|section.?\d|technical|standard/)) return "Specs";
  // Shop Drawings
  if (name.match(/shop.?draw|fabricat|manufacturer|submittal.?draw/)) return "Shop Drawings";
  // Submittals
  if (name.match(/submittal|sub.?\d|product.?data|cut.?sheet|catalog/)) return "Submittals";
  // RFIs
  if (name.match(/rfi|request.?for.?info/)) return "RFIs";
  // Change Orders
  if (name.match(/change.?order|co.?\d|modification|amendment|addendum|bulletin/)) return "Change Orders";
  // Proposals / Bids
  if (name.match(/proposal|bid|quote|estimate|pricing|cost/)) return "Proposal";
  if (name.match(/bid.?tab|bid.?form|invitation/)) return "Bid";
  // Safety
  if (name.match(/safety|hazard|msds|sds|toolbox|jha|osha|incident|accident/)) return "Safety";
  // Reports
  if (name.match(/report|inspection|test|soil|geotech|survey|assessment|log|daily/)) return "Reports";
  // Meeting Minutes
  if (name.match(/minute|meeting|agenda|attendan/)) return "Meeting Minutes";
  // Photos
  if (name.match(/photo|img|image|pic|dsc|dcim|screenshot/) || name.match(/\.(jpg|jpeg|png|gif|heic|heif|webp)$/)) return "Photos";
  // Correspondence
  if (name.match(/letter|email|memo|notice|correspondence|transmittal|rfi.?resp/)) return "Correspondence";

  return "Other";
}

function fileIcon(name: string): string {
  if (name.match(/\.pdf$/i)) return "📕";
  if (name.match(/\.(doc|docx)$/i)) return "📘";
  if (name.match(/\.(xls|xlsx|csv)$/i)) return "📗";
  if (name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)) return "🖼️";
  if (name.match(/\.(ppt|pptx)$/i)) return "📙";
  if (name.match(/\.(dwg|dxf)$/i)) return "📐";
  return "📄";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Detect category from folder path
function detectCategoryFromPath(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return null; // just a filename, no folder
  // Use the immediate parent folder name
  const folder = parts[parts.length - 2].toLowerCase();
  
  if (folder.match(/contract|agreement/)) return "Contract";
  if (folder.match(/insurance|cert|coi|bond/)) return "Insurance";
  if (folder.match(/permit|license|approval/)) return "Permits";
  if (folder.match(/drawing|plan|blueprint|cad|dwg/)) return "Drawings";
  if (folder.match(/spec|specification/)) return "Specs";
  if (folder.match(/shop.?draw|fabricat/)) return "Shop Drawings";
  if (folder.match(/submittal|sub\b/)) return "Submittals";
  if (folder.match(/rfi/)) return "RFIs";
  if (folder.match(/change.?order|co\b|addend/)) return "Change Orders";
  if (folder.match(/propos|bid|quote|estimat/)) return "Proposal";
  if (folder.match(/safety|hazard|osha|incident/)) return "Safety";
  if (folder.match(/report|inspect|test|survey|daily/)) return "Reports";
  if (folder.match(/meeting|minute|agenda/)) return "Meeting Minutes";
  if (folder.match(/photo|image|pic|site.?media/)) return "Photos";
  if (folder.match(/picture/)) return "Pictures";
  if (folder.match(/correspond|email|letter|memo/)) return "Correspondence";
  if (folder.match(/vendor/)) return "Vendors";
  if (folder.match(/sub.?contract|subcontract/)) return "Subcontractors";
  if (folder.match(/prevail|wage|certified.?payroll/)) return "Prevailing Wage";
  if (folder.match(/invoice|billing|pay.?app/)) return "Customer Invoices";
  if (folder.match(/check.?list|checklist|punch/)) return "Checklist";
  return null;
}

interface QueuedFile {
  file: File;
  category: string;
  folderPath: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

function BulkUploadContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const projects = useQuery(api.projects.list, user?.companyId ? { companyId: user.companyId as Id<"companies"> } : "skip");
  const createDoc = useMutation(api.docManager.create);
  const generateUploadUrl = useMutation(api.siteMedia.generateUploadUrl);

  const [selectedProject, setSelectedProject] = useState("");
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const queued: QueuedFile[] = Array.from(newFiles).map((f) => {
      const relativePath = (f as any).webkitRelativePath || f.name;
      const folderCategory = detectCategoryFromPath(relativePath);
      return {
        file: f,
        category: folderCategory || detectCategory(f.name),
        folderPath: relativePath,
        status: "pending" as const,
      };
    });
    setFiles((prev) => [...prev, ...queued]);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    // Try to read directory entries for folder support
    const items = e.dataTransfer.items;
    if (items && items.length > 0 && (items[0] as any).webkitGetAsEntry) {
      const allFiles: File[] = [];
      
      const readEntry = (entry: any, path: string): Promise<void> => {
        return new Promise((resolve) => {
          if (entry.isFile) {
            entry.file((f: File) => {
              // Attach the relative path
              Object.defineProperty(f, "webkitRelativePath", { value: path + f.name, writable: false });
              allFiles.push(f);
              resolve();
            });
          } else if (entry.isDirectory) {
            const reader = entry.createReader();
            reader.readEntries(async (entries: any[]) => {
              for (const e of entries) {
                await readEntry(e, path + entry.name + "/");
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      };

      const entries: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as any).webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      
      for (const entry of entries) {
        await readEntry(entry, "");
      }
      
      if (allFiles.length > 0) {
        addFiles(allFiles);
        return;
      }
    }
    
    // Fallback: regular file drop
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const updateCategory = (index: number, cat: string) => {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, category: cat } : f));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    if (!selectedProject || !user?.companyId) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;
      setFiles((prev) => prev.map((f, j) => j === i ? { ...f, status: "uploading" } : f));

      try {
        const file = files[i].file;
        
        // Check file size (Convex limit ~20MB)
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`File too large (${formatBytes(file.size)}). Max 20MB per file.`);
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload file with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const errText = await res.text().catch(() => "Unknown error");
          throw new Error(`Upload failed (${res.status}): ${errText}`);
        }
        const { storageId } = await res.json();

        // Create document record
        await createDoc({
          companyId: user.companyId as Id<"companies">,
          projectId: selectedProject as Id<"projects">,
          name: file.name,
          category: files[i].category,
          storageId,
          fileSize: file.size,
          uploadedBy: user.name || "Unknown",
        });

        setFiles((prev) => prev.map((f, j) => j === i ? { ...f, status: "done" } : f));

        // Small delay between uploads to avoid overwhelming the server
        await new Promise((r) => setTimeout(r, 300));
      } catch (err: any) {
        const msg = err.name === "AbortError" ? "Upload timed out — file may be too large" : err.message;
        setFiles((prev) => prev.map((f, j) => j === i ? { ...f, status: "error", error: msg } : f));
      }
    }

    setUploading(false);
    const doneCount = files.filter((f) => f.status !== "error").length;
    toast(`✅ ${doneCount} files uploaded!`, "success");
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  // Group files by category for summary
  const catSummary: Record<string, number> = {};
  files.forEach((f) => { catSummary[f.category] = (catSummary[f.category] || 0) + 1; });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/documents" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Documents</Link>
      <div>
        <h1 className="text-2xl font-bold">📦 Bulk Upload</h1>
        <p className="text-sm text-muted-foreground mt-1">Drop an entire folder of files — AI auto-categorizes them into the right project.</p>
      </div>

      {/* Project Selector */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <label className="text-sm font-medium block mb-2">Select Project</label>
          <select
            className="w-full bg-secondary border border-border rounded-lg px-3 py-3 text-sm"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Choose a project...</option>
            {(projects || [])
              .filter((p: any) => p.status !== "Inactive" && p.status !== "Archived")
              .map((p: any) => (
                <option key={p._id} value={p._id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
              ))}
          </select>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      {selectedProject && (
        <Card
          className={`bg-card border-2 border-dashed transition-colors cursor-pointer ${
            dragOver ? "border-orange-500 bg-orange-500/5" : "border-border hover:border-orange-500/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-lg font-medium">Drop a folder or files here</p>
            <p className="text-sm text-muted-foreground mt-2">
              Drag an entire folder — AI reads subfolder names and auto-sorts files.<br />
              Subfolders named "Contracts", "Submittals", "Insurance", etc. are auto-tagged.
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>📄 Select Files</Button>
              <Button variant="outline" size="sm" onClick={() => (document.getElementById("folder-input") as HTMLInputElement)?.click()}>📁 Select Folder</Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
            />
            <input
              id="folder-input"
              type="file"
              multiple
              className="hidden"
              {...{ webkitdirectory: "", directory: "" } as any}
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
            />
          </CardContent>
        </Card>
      )}

      {/* Category Summary */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(catSummary).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <Badge key={cat} variant="secondary" className="text-xs">{cat}: {count}</Badge>
          ))}
          <Badge variant="outline" className="text-xs">{files.length} files ({formatBytes(files.reduce((s, f) => s + f.file.size, 0))})</Badge>
          {doneCount > 0 && <Badge className="bg-green-600 text-xs">✅ {doneCount} uploaded</Badge>}
          {errorCount > 0 && <Badge variant="destructive" className="text-xs">❌ {errorCount} failed</Badge>}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Files ({files.length})</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setFiles([])}>Clear All</Button>
                <Button
                  size="sm"
                  disabled={uploading || !pendingCount}
                  className="bg-gradient-to-r from-orange-500 to-amber-600"
                  onClick={uploadAll}
                >
                  {uploading ? `Uploading... (${doneCount}/${files.length})` : `Upload ${pendingCount} Files`}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/50">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/30">
                  {/* Status */}
                  <span className="text-lg w-6 text-center">
                    {f.status === "done" ? "✅" :
                     f.status === "error" ? "❌" :
                     f.status === "uploading" ? "🔄" :
                     fileIcon(f.file.name)}
                  </span>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.folderPath && f.folderPath !== f.file.name && (
                        <span className="text-blue-400 mr-1">📁 {f.folderPath.split("/").slice(0, -1).join("/")}/</span>
                      )}
                      {formatBytes(f.file.size)}
                      {f.file.size > 20 * 1024 * 1024 && <span className="text-red-400 ml-1">⚠️ Too large (max 20MB)</span>}
                    </div>
                    {f.error && <div className="text-xs text-red-400">{f.error}</div>}
                  </div>

                  {/* Category selector */}
                  <select
                    className="bg-secondary border border-border rounded px-2 py-1 text-xs w-32"
                    value={f.category}
                    disabled={f.status !== "pending"}
                    onChange={(e) => updateCategory(i, e.target.value)}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {/* Remove */}
                  {f.status === "pending" && (
                    <button className="text-red-400 hover:text-red-300 text-sm" onClick={() => removeFile(i)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done Summary */}
      {doneCount > 0 && doneCount === files.length && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-lg font-bold text-green-400">All {doneCount} files uploaded!</p>
            <p className="text-sm text-muted-foreground mt-2">Files are now in the project&apos;s Documents section, organized by category.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Link href="/documents"><Button variant="outline">View Documents</Button></Link>
              <Button onClick={() => { setFiles([]); setSelectedProject(""); }}>Upload More</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedProject && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">👆</p>
          <p>Select a project to start uploading files</p>
        </div>
      )}
    </div>
  );
}

export default function BulkUploadPage() {
  return <AppShell><BulkUploadContent /></AppShell>;
}
