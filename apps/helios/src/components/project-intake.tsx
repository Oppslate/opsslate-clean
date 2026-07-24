"use client";

import {
  HELIOS_MAX_UPLOAD_BATCH,
  formatFileSize,
  hasPdfMagicBytes,
  validatePdfCandidate,
  type HeliosProjectDetail,
} from "@opsslate/helios-domain";
import type { HeliosPrincipal } from "@opsslate/suite-auth/types";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@opsslate/suite-ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@opsslate/suite-ui/table";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { formatDate, formatTimestamp } from "@/lib/format";
import { HeliosShell } from "./helios-shell";
import { ProjectIntelligencePanel } from "./project-intelligence-panel";
import { StatusBadge } from "./status-badge";

type UploadState =
  | "queued"
  | "uploading"
  | "registering"
  | "ready"
  | "duplicate"
  | "failed";
type UploadRow = {
  id: string;
  file: File;
  progress: number;
  state: UploadState;
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

function uploadLabel(row: UploadRow) {
  if (row.state === "uploading") return `Uploading ${row.progress}%`;
  if (row.state === "registering") return "Validating";
  if (row.state === "ready") return "Ready";
  if (row.state === "duplicate") return "Duplicate";
  if (row.state === "failed") return "Needs attention";
  return "Queued";
}

export function ProjectIntake({
  detail,
  principal,
}: {
  detail: HeliosProjectDetail;
  principal: HeliosPrincipal;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [retryingDocument, setRetryingDocument] = useState<string>();
  const { project } = detail;
  const processing =
    ["queued", "processing"].includes(project.intelligenceStatus) ||
    detail.documents.some((document) =>
      [
        "ready_for_intelligence",
        "queued",
        "uploading_to_openai",
        "analyzing",
      ].includes(document.status),
    );

  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => router.refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [processing, router]);

  function patchUpload(id: string, patch: Partial<UploadRow>) {
    setUploads((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function processUpload(row: UploadRow) {
    patchUpload(row.id, {
      state: "uploading",
      progress: 0,
      error: undefined,
    });
    try {
      validatePdfCandidate(row.file);
      const header = new Uint8Array(await row.file.slice(0, 5).arrayBuffer());
      if (!hasPdfMagicBytes(header)) {
        throw new Error("The file does not contain a valid PDF signature.");
      }

      const intentResponse = await fetch(
        `/api/projects/${project.id}/upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        row.file,
        (progress) => patchUpload(row.id, { progress }),
      );
      patchUpload(row.id, { state: "registering", progress: 100 });

      const registerResponse = await fetch(
        `/api/projects/${project.id}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intentId: intentPayload.data.intentId,
            storageId,
            fileName: row.file.name,
          }),
        },
      );
      const registerPayload = await registerResponse.json();
      if (!registerResponse.ok) {
        throw new Error(
          registerPayload.error || "PDF registration failed.",
        );
      }

      const duplicate = registerPayload.data.kind === "duplicate";
      patchUpload(row.id, {
        state: duplicate ? "duplicate" : "ready",
        progress: 100,
      });
      toast(
        duplicate
          ? `${row.file.name} already exists in this project.`
          : `${row.file.name} is ready for intelligence.`,
        duplicate ? "info" : "success",
      );
      router.refresh();
    } catch (error) {
      patchUpload(row.id, {
        state: "failed",
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  async function acceptFiles(files: File[]) {
    const limited = files.slice(0, HELIOS_MAX_UPLOAD_BATCH);
    if (files.length > HELIOS_MAX_UPLOAD_BATCH) {
      toast(
        `Upload up to ${HELIOS_MAX_UPLOAD_BATCH} PDFs at a time.`,
        "error",
      );
    }
    const rows = limited.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      progress: 0,
      state: "queued" as const,
    }));
    setUploads((current) => [...rows, ...current]);
    await Promise.all(rows.map(processUpload));
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    void acceptFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void acceptFiles(Array.from(event.dataTransfer.files));
  }

  async function retryDocument(documentId: string) {
    setRetryingDocument(documentId);
    try {
      const response = await fetch(
        `/api/projects/${project.id}/documents/${documentId}/retry`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Document retry failed.");
      }
      toast("Document intelligence was queued again.", "success");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Document retry failed.",
        "error",
      );
    } finally {
      setRetryingDocument(undefined);
    }
  }

  return (
    <HeliosShell
      principal={principal}
      topActions={<Badge variant="secondary">Foundation 3C</Badge>}
    >
      <div className="space-y-5">
        <header>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to cockpit
          </Link>
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-bold leading-9">
                  {project.name}
                </h1>
                <StatusBadge value={project.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.projectNumber || "No project number"} · Bid{" "}
                {formatDate(project.bidDate)}
              </p>
            </div>
            <StatusBadge value={project.intelligenceStatus} />
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.5fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Bid document intake</CardTitle>
                <CardDescription>
                  Add plans, specifications, and addenda as PDFs. Files are
                  validated before they enter the project record.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="sr-only"
                  onChange={onFileInput}
                />
                <div
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center transition-colors ${
                    dragging
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <UploadCloud
                    className="mb-3 size-10 text-orange-300"
                    aria-hidden="true"
                  />
                  <h2 className="font-semibold">
                    Drop PDF bid documents here
                  </h2>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Up to {HELIOS_MAX_UPLOAD_BATCH} files per batch, 50 MB
                    each. Exact file matches are detected within this project.
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                  >
                    Select PDFs
                  </Button>
                </div>

                {uploads.length > 0 && (
                  <div className="mt-5 space-y-2" aria-live="polite">
                    {uploads.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {row.file.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(row.file.size)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {row.state === "failed" ? (
                              <AlertCircle
                                className="size-4 text-red-300"
                                aria-hidden="true"
                              />
                            ) : row.state === "ready" ? (
                              <CheckCircle2
                                className="size-4 text-green-300"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                              {uploadLabel(row)}
                            </span>
                          </div>
                        </div>
                        {(row.state === "uploading" ||
                          row.state === "registering") && (
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-orange-500 transition-[width]"
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                        )}
                        {row.error && (
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-xs text-red-300" role="alert">
                              {row.error}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void processUpload(row)}
                            >
                              <RotateCcw
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project documents</CardTitle>
                <CardDescription>
                  Persistent files accepted into this Helios opportunity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detail.documents.length === 0 ? (
                  <div className="flex min-h-40 flex-col items-center justify-center text-center">
                    <FileText
                      className="mb-3 size-9 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="font-medium">No documents registered</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use the intake area above to add the bid set.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.documents.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell className="max-w-[360px] truncate font-medium">
                            {document.fileName}
                          </TableCell>
                          <TableCell>{formatFileSize(document.size)}</TableCell>
                          <TableCell>
                            <StatusBadge value={document.status} />
                          </TableCell>
                          <TableCell>
                            {formatTimestamp(document.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {document.status === "failed" ? (
                              <div className="inline-flex flex-col items-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={retryingDocument === document.id}
                                  onClick={() =>
                                    void retryDocument(document.id)
                                  }
                                >
                                  <RotateCcw
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  {retryingDocument === document.id
                                    ? "Retrying…"
                                    : "Retry"}
                                </Button>
                                {document.lastError && (
                                  <span
                                    className="max-w-64 text-right text-xs text-red-300"
                                    title={document.lastError}
                                  >
                                    {document.lastError}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {document.attemptCount > 0
                                  ? `Attempt ${document.attemptCount}`
                                  : "—"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Project information</CardTitle>
              <CardDescription>Preconstruction record</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                {[
                  ["Owner / client", project.ownerClient || "Not set"],
                  ["Engineer", project.engineer || "Not set"],
                  ["Location", project.location || "Not set"],
                  ["Bid date", formatDate(project.bidDate)],
                  ["Documents", String(project.documentCount)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[120px_1fr] gap-3 py-3 first:pt-0"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {project.notes && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-5">
                    {project.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ProjectIntelligencePanel
          projectId={project.id}
          status={project.intelligenceStatus}
          intelligence={detail.intelligence}
        />
      </div>
    </HeliosShell>
  );
}
