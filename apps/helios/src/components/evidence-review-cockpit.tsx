"use client";

import type { HeliosProjectIntelligence } from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSearch,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

type EvidenceRow = HeliosProjectIntelligence["evidence"][number];

type SourceDocument = {
  id: string;
  name: string;
  evidence: EvidenceRow[];
};

function documentContentUrl(
  projectId: string,
  documentId: string,
  pageNumber?: number,
) {
  const path = `/api/projects/${encodeURIComponent(
    projectId,
  )}/documents/${encodeURIComponent(documentId)}/content`;
  return pageNumber ? `${path}#page=${pageNumber}&view=FitH` : path;
}

export function EvidenceReviewCockpit({
  projectId,
  intelligence,
  selectedEvidenceId,
  onSelectEvidence,
}: {
  projectId: string;
  intelligence: HeliosProjectIntelligence;
  selectedEvidenceId?: string;
  onSelectEvidence: (evidenceId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const documentsById = new Map<string, SourceDocument>();
  for (const evidence of intelligence.evidence) {
    const existing = documentsById.get(evidence.documentId);
    if (existing) {
      existing.evidence.push(evidence);
    } else {
      documentsById.set(evidence.documentId, {
        id: evidence.documentId,
        name: evidence.documentName,
        evidence: [evidence],
      });
    }
  }
  const documents = Array.from(documentsById.values());
  const selectedEvidence =
    intelligence.evidence.find(
      (evidence) => evidence.id === selectedEvidenceId,
    ) || intelligence.evidence[0];
  const selectedDocument =
    documentsById.get(selectedEvidence?.documentId || "") || documents[0];
  const selectedIndex = selectedDocument
    ? selectedDocument.evidence.findIndex(
        (evidence) => evidence.id === selectedEvidence?.id,
      )
    : -1;
  const viewerUrl = selectedDocument
    ? documentContentUrl(
        projectId,
        selectedDocument.id,
        selectedEvidence?.pageNumber,
      )
    : undefined;

  function selectEvidence(evidence: EvidenceRow) {
    setLoading(true);
    onSelectEvidence(evidence.id);
  }

  if (!selectedDocument || !selectedEvidence || !viewerUrl) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-border text-center">
        <FileSearch
          className="mb-3 size-9 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="font-medium">No cited source is available</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Helios needs a validated citation before it can open a source page.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="grid xl:grid-cols-[210px_minmax(0,1fr)_320px]">
        <nav
          className="border-b border-border bg-muted/10 xl:border-b-0 xl:border-r"
          aria-label="Source documents"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Source documents</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {documents.length} cited{" "}
              {documents.length === 1 ? "document" : "documents"}
            </div>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto p-2 xl:block xl:max-h-[700px] xl:space-y-1 xl:overflow-y-auto">
            {documents.map((document) => {
              const active = document.id === selectedDocument.id;
              return (
                <button
                  key={document.id}
                  type="button"
                  className={`min-w-56 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 xl:min-w-0 xl:w-full ${
                    active
                      ? "border-orange-500/35 bg-orange-500/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/25 hover:text-foreground"
                  }`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => selectEvidence(document.evidence[0])}
                >
                  <span className="flex items-start gap-2">
                    <FileText
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-medium">
                        {document.name}
                      </span>
                      <span className="mt-1 block text-xs">
                        {document.evidence.length} cited{" "}
                        {document.evidence.length === 1
                          ? "passage"
                          : "passages"}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <section className="min-w-0 border-b border-border xl:border-b-0 xl:border-r">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/10 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {selectedDocument.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedEvidence.pageNumber
                  ? `PDF page ${selectedEvidence.pageNumber}`
                  : "Page not identified"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Previous cited passage"
                disabled={selectedIndex <= 0}
                onClick={() =>
                  selectEvidence(selectedDocument.evidence[selectedIndex - 1])
                }
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Next cited passage"
                disabled={
                  selectedIndex < 0 ||
                  selectedIndex >= selectedDocument.evidence.length - 1
                }
                onClick={() =>
                  selectEvidence(selectedDocument.evidence[selectedIndex + 1])
                }
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={viewerUrl} target="_blank" rel="noopener">
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Open PDF
                </a>
              </Button>
            </div>
          </div>

          <div className="relative hidden min-h-[700px] bg-[#202124] md:block">
            {loading && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-[#202124]"
                role="status"
              >
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Loading protected PDF
                </div>
              </div>
            )}
            <iframe
              key={viewerUrl}
              src={viewerUrl}
              title={`${selectedDocument.name}, ${
                selectedEvidence.pageNumber
                  ? `PDF page ${selectedEvidence.pageNumber}`
                  : "source document"
              }`}
              className="h-[700px] w-full border-0"
              onLoad={() => setLoading(false)}
            />
          </div>
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center md:hidden">
            <FileText
              className="mb-3 size-9 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="font-medium">Open the protected PDF</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Mobile browsers open the original source in their native PDF
              reader. Return here to continue reviewing citations.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <a href={viewerUrl} target="_blank" rel="noopener">
                <ExternalLink className="size-4" aria-hidden="true" />
                Open PDF page
              </a>
            </Button>
          </div>
        </section>

        <aside aria-label="Cited passages">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Cited evidence</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Select a passage to open its source page.
            </div>
          </div>
          <div className="max-h-[700px] space-y-2 overflow-y-auto p-3">
            {selectedDocument.evidence.map((evidence) => {
              const active = evidence.id === selectedEvidence.id;
              return (
                <button
                  key={evidence.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
                    active
                      ? "border-orange-500/35 bg-orange-500/10"
                      : "border-border hover:bg-muted/25"
                  }`}
                  aria-pressed={active}
                  onClick={() => selectEvidence(evidence)}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {evidence.locator || "No section label"}
                    </span>
                    <Badge variant="outline">
                      {evidence.pageNumber
                        ? `PDF page ${evidence.pageNumber}`
                        : "Page not identified"}
                    </Badge>
                  </span>
                  <span className="mt-2 line-clamp-5 block border-l-2 border-orange-500/40 pl-3 text-sm leading-5 text-muted-foreground">
                    “{evidence.excerpt}”
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
      <div
        className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        Viewing {selectedEvidence.locator || "cited source"} in{" "}
        {selectedDocument.name}
        {selectedEvidence.pageNumber
          ? `, PDF page ${selectedEvidence.pageNumber}`
          : ""}
        . AI-generated conclusions require human verification against this
        original document.
      </div>
    </div>
  );
}
