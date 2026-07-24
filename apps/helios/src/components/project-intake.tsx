"use client";

import {
  formatFileSize,
  type HeliosProjectDetail,
} from "@opsslate/helios-domain";
import type { HeliosPrincipal } from "@/lib/helios-principal";
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
  ArrowLeft,
  FileText,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatDate, formatTimestamp } from "@/lib/format";
import { BidPackageIntake } from "./bid-package-intake";
import { HeliosShell } from "./helios-shell";
import { ProjectIntelligencePanel } from "./project-intelligence-panel";
import { StatusBadge } from "./status-badge";

export function ProjectIntake({
  detail,
  principal,
}: {
  detail: HeliosProjectDetail;
  principal: HeliosPrincipal;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [retryingDocument, setRetryingDocument] = useState<string>();
  const { project } = detail;
  const processing =
    ["queued", "processing"].includes(project.intelligenceStatus) ||
    detail.packages.some((bidPackage) =>
      ["ready_for_analysis", "processing"].includes(bidPackage.status),
    ) ||
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
      topActions={<Badge variant="secondary">Foundation 3D</Badge>}
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
            <BidPackageIntake
              projectId={project.id}
              packages={detail.packages}
            />

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
                          <TableCell className="max-w-[360px]">
                            <div className="truncate font-medium">
                              {document.relativePath || document.fileName}
                            </div>
                            {document.documentType && (
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {document.documentType}
                              </div>
                            )}
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
                                {document.attemptCount > 1
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
          latestError={detail.latestIntelligenceError}
        />
      </div>
    </HeliosShell>
  );
}
