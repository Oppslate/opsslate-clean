"use client";

import {
  formatFileSize,
  type HeliosProjectDetail,
} from "@opsslate/helios-domain";
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
import { FileText, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDate, formatTimestamp } from "@/lib/format";
import { BidPackageIntake } from "./bid-package-intake";
import { StatusBadge } from "./status-badge";

export function ProjectDocumentControl({
  detail,
}: {
  detail: HeliosProjectDetail;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [retryingDocument, setRetryingDocument] = useState<string>();
  const { project } = detail;

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
                <p className="font-medium">No PDFs registered</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add PDFs above, or use written scope when no files were
                  issued.
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
                              onClick={() => void retryDocument(document.id)}
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
                                className="max-w-64 text-right text-xs text-danger-foreground"
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

        {detail.writtenScopes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Written scope evidence</CardTitle>
              <CardDescription>
                Exact text registered as part of the project bid basis. Each
                version is immutable and independently auditable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.writtenScopes.map((scope) => (
                <details
                  key={scope.id}
                  className="group rounded-lg border border-border p-3"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{scope.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Version {scope.version} · {formatFileSize(scope.size)} ·{" "}
                        {formatTimestamp(scope.createdAt)}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-orange-300">
                      View exact scope
                    </span>
                  </summary>
                  <div className="mt-3 border-t border-border pt-3">
                    {scope.sourceLocation && (
                      <div className="mb-2 text-xs text-muted-foreground">
                        Source: {scope.sourceLocation}
                      </div>
                    )}
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 font-sans text-sm leading-6">
                      {scope.content}
                    </pre>
                    <div className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                      SHA-256 {scope.sha256}
                    </div>
                  </div>
                </details>
              ))}
            </CardContent>
          </Card>
        )}
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
              [
                "Sources",
                String(project.documentCount + detail.writtenScopes.length),
              ],
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
  );
}
