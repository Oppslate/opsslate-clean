"use client";

import type {
  HeliosIntelligenceFinding,
  HeliosProjectIntelligence,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@opsslate/suite-ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSearch,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

import { humanizeStatus } from "@/lib/format";

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

function effectiveTitle(finding?: HeliosIntelligenceFinding) {
  if (!finding) return "Project intelligence source";
  return finding.review.correctedTitle || finding.title;
}

function effectiveDetail(finding?: HeliosIntelligenceFinding) {
  if (!finding) {
    return "Select a finding to compare its interpretation with the cited source.";
  }
  return finding.review.correctedDetail || finding.detail;
}

export function EvidenceReviewCockpit({
  projectId,
  intelligence,
  selectedEvidenceId,
  selectedFinding,
  onSelectEvidence,
}: {
  projectId: string;
  intelligence: HeliosProjectIntelligence;
  selectedEvidenceId?: string;
  selectedFinding?: HeliosIntelligenceFinding;
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
      <div className="flex min-h-[620px] flex-col items-center justify-center bg-background text-center">
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
    <section className="min-w-0 bg-background" aria-label="Evidence workspace">
      <h2 className="sr-only">Source documents and Cited evidence</h2>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border bg-card/55 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText
            className="size-4 shrink-0 text-ai-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0">
            {documents.length > 1 ? (
              <Select
                value={selectedDocument.id}
                onValueChange={(documentId) => {
                  const document = documentsById.get(documentId);
                  if (document) selectEvidence(document.evidence[0]);
                }}
              >
                <SelectTrigger
                  className="h-7 w-56 max-w-full border-0 bg-transparent px-0 text-xs font-semibold shadow-none focus:ring-0"
                  aria-label="Select cited source document"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="truncate text-xs font-semibold">
                {selectedDocument.name}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground">
              {selectedEvidence.pageNumber
                ? `PDF page ${selectedEvidence.pageNumber}`
                : "Page not identified"}{" "}
              · {selectedEvidence.locator || "No section label"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
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
            size="icon-sm"
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

      <div className="grid border-b border-border md:grid-cols-[112px_minmax(0,1fr)]">
        <nav
          className="hidden max-h-[350px] overflow-y-auto border-r border-border bg-card/35 p-2 md:block"
          aria-label="Cited pages"
        >
          <div className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Cited pages
          </div>
          <div className="space-y-2">
            {selectedDocument.evidence.map((evidence) => {
              const active = evidence.id === selectedEvidence.id;
              return (
                <button
                  key={evidence.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectEvidence(evidence)}
                  className={`w-full rounded-md border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "border-primary bg-selected-surface"
                      : "border-border bg-background hover:bg-muted/30"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold">
                    <FileText
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {evidence.pageNumber
                      ? `Page ${evidence.pageNumber}`
                      : "Unnumbered"}
                  </span>
                  <span className="mt-1 line-clamp-3 block text-[9px] leading-3 text-muted-foreground">
                    {evidence.locator || evidence.excerpt}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="relative hidden h-[350px] min-w-0 bg-muted md:block">
          {loading && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-muted"
              role="status"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            className="h-full w-full border-0"
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
      </div>

      <div className="grid bg-card/35 lg:grid-cols-[minmax(230px,0.7fr)_minmax(0,1.3fr)]">
        <div className="border-b border-border p-2.5 lg:border-b-0 lg:border-r">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Citation
          </div>
          <dl className="mt-1.5 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-[10px] leading-4">
            <dt className="text-muted-foreground">Document</dt>
            <dd className="truncate" title={selectedDocument.name}>
              {selectedDocument.name}
            </dd>
            <dt className="text-muted-foreground">Section</dt>
            <dd>{selectedEvidence.locator || "Not identified"}</dd>
            <dt className="text-muted-foreground">Page</dt>
            <dd>{selectedEvidence.pageNumber || "Not identified"}</dd>
            <dt className="text-muted-foreground">Evidence</dt>
            <dd>
              {selectedIndex + 1} of {selectedDocument.evidence.length} cited
              passages
            </dd>
          </dl>
        </div>
        <div className="p-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              AI explanation
            </div>
            {selectedFinding && (
              <Badge variant="outline" className="text-[9px]">
                {humanizeStatus(selectedFinding.review.status)}
              </Badge>
            )}
          </div>
          <h3 className="mt-1.5 text-xs font-semibold">
            {effectiveTitle(selectedFinding)}
          </h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
            {effectiveDetail(selectedFinding)}
          </p>
          <blockquote className="mt-1.5 line-clamp-2 border-l-2 border-ai-border pl-2 text-[10px] leading-4 text-ai-foreground">
            “{selectedEvidence.excerpt}”
          </blockquote>
          <p className="mt-1.5 text-[9px] text-muted-foreground">
            Human verification against the original PDF is required before
            downstream use.
          </p>
        </div>
      </div>
    </section>
  );
}
