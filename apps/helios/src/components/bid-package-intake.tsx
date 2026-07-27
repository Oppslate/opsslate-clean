"use client";

import {
  formatFileSize,
  HELIOS_MANIFEST_VERSION,
  hasPdfMagicBytes,
  type HeliosBidPackage,
  type HeliosPackageRevisionKind,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@opsslate/suite-ui/card";
import { useToast } from "@opsslate/suite-ui/toast";
import { Input } from "@opsslate/suite-ui/input";
import { Label } from "@opsslate/suite-ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@opsslate/suite-ui/select";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronDown,
  FileStack,
  FolderOpen,
  LoaderCircle,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  prepareSelectedFiles,
  prepareZipPackage,
  type PreparedBidPackage,
  type PreparedPackageFile,
} from "@/lib/package-files";
import { WrittenScopeDialog } from "./written-scope-dialog";

const UPLOAD_CONCURRENCY = 3;

type LocalUploadState =
  | "queued"
  | "uploading"
  | "registering"
  | "ready"
  | "duplicate"
  | "failed";

type LocalUpload = {
  id: string;
  entryId: string;
  packageId: string;
  candidate: PreparedPackageFile;
  progress: number;
  state: LocalUploadState;
  error?: string;
};

function uploadToStorage(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", uploadUrl);
    request.setRequestHeader("Content-Type", "application/pdf");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new Error("The PDF upload was interrupted."));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("Secure storage rejected the PDF."));
        return;
      }
      try {
        const payload = JSON.parse(request.responseText) as {
          storageId?: unknown;
        };
        if (typeof payload.storageId !== "string") throw new Error();
        resolve(payload.storageId);
      } catch {
        reject(new Error("Secure storage returned an invalid response."));
      }
    };
    request.send(file);
  });
}

function sourceLabel(source: HeliosBidPackage["sourceType"]) {
  if (source === "folder") return "Folder";
  if (source === "zip") return "ZIP package";
  if (source === "written_scope") return "Written scope";
  return "Selected files";
}

const revisionLabels: Record<HeliosPackageRevisionKind, string> = {
  initial: "Initial bid package",
  addendum: "Addendum",
  revision: "Revised documents",
  supplemental: "Supplemental information",
};

export function BidPackageIntake({
  projectId,
  packages,
}: {
  projectId: string;
  packages: HeliosBidPackage[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<PreparedBidPackage>();
  const [preparing, setPreparing] = useState(false);
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [creating, setCreating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [revisionKind, setRevisionKind] =
    useState<HeliosPackageRevisionKind>(
      packages.length ? "supplemental" : "initial",
    );
  const [revisionLabel, setRevisionLabel] = useState("");

  const activePackage = useMemo(
    () =>
      packages.find((bidPackage) =>
        ["uploading", "ready_for_analysis", "processing", "failed"].includes(
          bidPackage.status,
        ),
      ) || packages[0],
    [packages],
  );
  const activeUpload =
    activePackage?.status === "uploading" ? activePackage : undefined;
  const effectiveRevisionKind = activeUpload?.revisionKind || revisionKind;
  const effectiveRevisionLabel = activeUpload?.revisionLabel || revisionLabel;

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  function patchUpload(id: string, patch: Partial<LocalUpload>) {
    setUploads((current) =>
      current.map((upload) =>
        upload.id === id ? { ...upload, ...patch } : upload,
      ),
    );
  }

  async function prepareFiles(
    selected: File[],
    source: "files" | "folder" | "zip",
  ) {
    setPreparing(true);
    try {
      const next =
        source === "zip"
          ? await prepareZipPackage(selected[0])
          : await prepareSelectedFiles(selected, source);
      setPrepared(next);
      setUploads([]);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Package could not be read.",
        "error",
      );
    } finally {
      setPreparing(false);
    }
  }

  async function uploadCandidate(
    upload: LocalUpload,
  ): Promise<"ready" | "duplicate" | "failed"> {
    patchUpload(upload.id, {
      state: "uploading",
      progress: 0,
      error: undefined,
    });
    try {
      const signature = new Uint8Array(
        await upload.candidate.file.slice(0, 5).arrayBuffer(),
      );
      if (!hasPdfMagicBytes(signature)) {
        throw new Error("The file does not contain a valid PDF signature.");
      }
      const intentResponse = await fetch(
        `/api/projects/${projectId}/upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageId: upload.packageId,
            packageEntryId: upload.entryId,
          }),
        },
      );
      const intentPayload = await intentResponse.json();
      if (!intentResponse.ok) {
        throw new Error(
          intentPayload.error || "Upload could not be authorized.",
        );
      }
      const storageId = await uploadToStorage(
        intentPayload.data.uploadUrl,
        upload.candidate.file,
        (progress) => patchUpload(upload.id, { progress }),
      );
      patchUpload(upload.id, { state: "registering", progress: 100 });
      const registerResponse = await fetch(
        `/api/projects/${projectId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intentId: intentPayload.data.intentId,
            storageId,
            fileName: upload.candidate.relativePath,
          }),
        },
      );
      const registerPayload = await registerResponse.json();
      if (!registerResponse.ok) {
        throw new Error(
          registerPayload.error || "PDF registration failed.",
        );
      }
      const state =
        registerPayload.data.kind === "duplicate" ? "duplicate" : "ready";
      patchUpload(upload.id, {
        state,
        progress: 100,
      });
      return state;
    } catch (error) {
      patchUpload(upload.id, {
        state: "failed",
        error: error instanceof Error ? error.message : "Upload failed.",
      });
      return "failed";
    }
  }

  async function startPackageUpload() {
    if (!prepared) return;
    setCreating(true);
    try {
      const packageInput = {
        envelopeId: prepared.envelopeId,
        adapter: "manual" as const,
        manifestVersion: HELIOS_MANIFEST_VERSION,
        name: prepared.name,
        sourceType: prepared.sourceType,
        revisionKind: effectiveRevisionKind,
        revisionLabel: effectiveRevisionLabel.trim() || undefined,
        entries: [
          ...prepared.files.map((candidate) => ({
            kind: "pdf" as const,
            sourceCategory:
              effectiveRevisionKind === "addendum"
                ? ("addendum" as const)
                : ("unknown" as const),
            relativePath: candidate.relativePath,
            size: candidate.file.size,
            sha256: candidate.sha256,
            accepted: true,
          })),
          ...prepared.writtenScopes.map((scope) => ({
            kind: "written_scope" as const,
            sourceCategory: "written_scope" as const,
            relativePath: scope.relativePath,
            size: scope.size,
            sha256: scope.sha256,
            title: scope.title,
            content: scope.content,
            sourceLocation: scope.sourceLocation,
            accepted: true,
          })),
          ...prepared.rejected.map((entry) => ({
            ...entry,
            accepted: false,
          })),
        ],
      };
      let bidPackage: HeliosBidPackage;
      if (activePackage?.status === "uploading") {
        const response = await fetch(
          `/api/projects/${projectId}/packages/${activePackage.id}/entries`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(packageInput),
          },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload.error || "Files could not be added to the bid package.",
          );
        }
        bidPackage = payload.data as HeliosBidPackage;
      } else {
        const response = await fetch(`/api/projects/${projectId}/packages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(packageInput),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Bid package could not be created.");
        }
        bidPackage = payload.data as HeliosBidPackage;
      }

      const uploadRows = prepared.files.flatMap((candidate) => {
        const entry = bidPackage.entries.find(
          (row) =>
            row.relativePath.toLowerCase() ===
              candidate.relativePath.toLowerCase() &&
            ["pending", "failed"].includes(row.status),
        );
        return entry
          ? [
              {
                id: `${bidPackage.id}:${entry.id}`,
                entryId: entry.id,
                packageId: bidPackage.id,
                candidate,
                progress: 0,
                state: "queued" as const,
              },
            ]
          : [];
      });
      if (!uploadRows.length) {
        toast(
          prepared.writtenScopes.length
            ? "Written scope registered. Review the package receipt before analysis."
            : "These PDFs are already registered in the current package.",
          "success",
        );
        router.refresh();
        return;
      }
      setUploads(uploadRows);
      const results: Array<"ready" | "duplicate" | "failed"> = [];
      for (
        let index = 0;
        index < uploadRows.length;
        index += UPLOAD_CONCURRENCY
      ) {
        results.push(
          ...(await Promise.all(
            uploadRows
              .slice(index, index + UPLOAD_CONCURRENCY)
              .map(uploadCandidate),
          )),
        );
      }
      const failureCount = results.filter((state) => state === "failed").length;
      toast(
        failureCount
          ? `${failureCount} PDF${failureCount === 1 ? "" : "s"} could not be uploaded. Retry the marked files.`
          : "Bid package upload finished. Review it before analysis.",
        failureCount ? "error" : "success",
      );
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Package upload failed.",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  async function finalizePackage() {
    if (!activePackage) return;
    setFinalizing(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/packages/${activePackage.id}/finalize`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Package could not be finalized.");
      }
      toast(
        payload.data.status === "ready_for_review"
          ? "Package registered. Its written scope is ready for bid-basis review."
          : "Package finalized. Helios is reading the bid set.",
        "success",
      );
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Package finalization failed.",
        "error",
      );
    } finally {
      setFinalizing(false);
    }
  }

  const unresolved =
    activePackage?.entries.filter((entry) =>
      ["pending", "failed"].includes(entry.status),
    ).length || 0;
  const accepted =
    (activePackage?.uploadedCount || 0) +
    (activePackage?.duplicateCount || 0);
  const registeredSourceCount =
    (activePackage?.pdfCount || 0) +
    (activePackage?.writtenScopeCount || 0);
  const latestEnvelope = activePackage?.envelopes.at(-1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid package intake</CardTitle>
        <CardDescription>
          Register the bid basis you actually received, verify its canonical
          manifest, then release it for coordinated project intelligence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={filesInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="sr-only"
          onChange={(event) => {
            void prepareFiles(Array.from(event.target.files || []), "files");
            event.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            void prepareFiles(Array.from(event.target.files || []), "folder");
            event.target.value = "";
          }}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(event) => {
            void prepareFiles(Array.from(event.target.files || []), "zip");
            event.target.value = "";
          }}
        />

        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <UploadCloud
            className="mx-auto mb-3 size-10 text-orange-300"
            aria-hidden="true"
          />
          <h2 className="font-semibold">Add the bid package</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
            Add PDFs, one or more folders, a ZIP package, or an exact written
            scope. Folder paths and every manual intake receipt are retained.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              disabled={preparing || creating}
              onClick={() => filesInputRef.current?.click()}
            >
              <FileStack className="size-4" aria-hidden="true" />
              Select PDFs
            </Button>
            <Button
              variant="outline"
              disabled={preparing || creating}
              onClick={() => folderInputRef.current?.click()}
            >
              <FolderOpen className="size-4" aria-hidden="true" />
              Select folder
            </Button>
            <Button
              variant="outline"
              disabled={preparing || creating}
              onClick={() => zipInputRef.current?.click()}
            >
              <Archive className="size-4" aria-hidden="true" />
              Select ZIP
            </Button>
            <WrittenScopeDialog
              disabled={preparing || creating}
              onPrepared={(next) => {
                setPrepared(next);
                setUploads([]);
              }}
            />
          </div>
          {preparing && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Inspecting package safely…
            </div>
          )}
        </div>

        {prepared && (
          <div className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">{prepared.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {prepared.files.length} PDF
                  {prepared.files.length === 1 ? "" : "s"}
                  {prepared.writtenScopes.length
                    ? ` · ${prepared.writtenScopes.length} written scope${prepared.writtenScopes.length === 1 ? "" : "s"}`
                    : ""}
                  {" · "}
                  {formatFileSize(
                    prepared.files.reduce(
                      (sum, candidate) => sum + candidate.file.size,
                      0,
                    ) +
                      prepared.writtenScopes.reduce(
                        (sum, scope) => sum + scope.size,
                        0,
                      ),
                  )}
                  {prepared.rejected.length
                    ? ` · ${prepared.rejected.length} excluded`
                    : ""}
                </div>
              </div>
              <Badge variant="outline">{sourceLabel(prepared.sourceType)}</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="revision-purpose">Package purpose</Label>
                <Select
                  value={effectiveRevisionKind}
                  disabled={Boolean(activeUpload)}
                  onValueChange={(value) =>
                    setRevisionKind(value as HeliosPackageRevisionKind)
                  }
                >
                  <SelectTrigger id="revision-purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(revisionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revision-label">Revision label (optional)</Label>
                <Input
                  id="revision-label"
                  value={effectiveRevisionLabel || ""}
                  disabled={Boolean(activeUpload)}
                  maxLength={120}
                  placeholder="Example: Addendum 2"
                  onChange={(event) => setRevisionLabel(event.target.value)}
                />
              </div>
            </div>
            {activeUpload && (
              <p className="mt-2 text-xs text-muted-foreground">
                Additional selections join Revision {activeUpload.revision} as{" "}
                {revisionLabels[effectiveRevisionKind].toLowerCase()}.
              </p>
            )}
            <details className="group mt-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                <ChevronDown
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
                Review local manifest
              </summary>
              <div className="mt-2 max-h-64 space-y-1 overflow-auto rounded-md border border-border p-2 text-xs">
                {prepared.files.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex justify-between gap-3 rounded px-2 py-1.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">
                        {candidate.relativePath}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        SHA-256 {candidate.sha256}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatFileSize(candidate.file.size)}
                    </span>
                  </div>
                ))}
                {prepared.writtenScopes.map((scope) => (
                  <div
                    key={scope.relativePath}
                    className="rounded border border-orange-500/20 bg-orange-500/5 px-2 py-2"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">
                        {scope.title}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatFileSize(scope.size)}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      SHA-256 {scope.sha256}
                    </div>
                  </div>
                ))}
                {prepared.rejected.map((entry) => (
                  <div
                    key={`rejected:${entry.relativePath}`}
                    className="rounded bg-red-500/5 px-2 py-1.5 text-red-200"
                  >
                    {entry.relativePath} — {entry.reason}
                  </div>
                ))}
              </div>
            </details>
            <Button
              className="mt-4"
              disabled={creating}
              onClick={() => void startPackageUpload()}
            >
              {creating ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <UploadCloud className="size-4" aria-hidden="true" />
              )}
              {activePackage?.status === "uploading"
                ? "Add receipt to current package"
                : prepared.writtenScopes.length
                  ? "Register written scope"
                  : "Create package and upload"}
            </Button>
          </div>
        )}

        {uploads.length > 0 && (
          <div className="space-y-2" aria-live="polite">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {upload.candidate.relativePath}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(upload.candidate.file.size)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {upload.state === "failed" ? (
                      <AlertCircle
                        className="size-4 text-red-300"
                        aria-hidden="true"
                      />
                    ) : ["ready", "duplicate"].includes(upload.state) ? (
                      <CheckCircle2
                        className="size-4 text-green-300"
                        aria-hidden="true"
                      />
                    ) : null}
                    {upload.state === "uploading"
                      ? `Uploading ${upload.progress}%`
                      : upload.state === "registering"
                        ? "Validating"
                        : upload.state}
                  </div>
                </div>
                {["uploading", "registering"].includes(upload.state) && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-orange-500 transition-[width]"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.error && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-red-300">{upload.error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void uploadCandidate(upload)}
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activePackage && (
          <div className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  Revision {activePackage.revision} · {activePackage.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {accepted}/{registeredSourceCount} sources registered
                  {activePackage.writtenScopeCount
                    ? ` · ${activePackage.writtenScopeCount} written scope${activePackage.writtenScopeCount === 1 ? "" : "s"}`
                    : ""}
                  {activePackage.rejectedCount
                    ? ` · ${activePackage.rejectedCount} excluded`
                    : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {revisionLabels[activePackage.revisionKind]}
                  {activePackage.revisionLabel
                    ? ` · ${activePackage.revisionLabel}`
                    : ""}
                  {latestEnvelope
                    ? ` · ${activePackage.envelopes.length} intake receipt${activePackage.envelopes.length === 1 ? "" : "s"}`
                    : ""}
                </div>
              </div>
              <Badge variant="outline">{activePackage.status}</Badge>
            </div>
            {activePackage.status === "uploading" && unresolved > 0 && (
              <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-amber-100">
                {unresolved} PDFs still require upload or retry. Reselect the
                same folder or ZIP if this browser no longer holds the files.
              </div>
            )}
            {activePackage.status === "uploading" && (
              <Button
                className="mt-4"
                disabled={
                  finalizing ||
                  unresolved > 0 ||
                  registeredSourceCount === 0
                }
                onClick={() => void finalizePackage()}
              >
                {finalizing && (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Package ready for analysis
              </Button>
            )}
            {activePackage.lastError && (
              <div className="mt-3 text-sm text-red-200">
                {activePackage.lastError}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
