"use client";

import type {
  HeliosIntelligenceFinding,
  HeliosProjectIntelligence,
  HeliosProjectSummary,
} from "@opsslate/helios-domain";
import { Button } from "@opsslate/suite-ui/button";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  FileStack,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDate, formatTimestamp, humanizeStatus } from "@/lib/format";
import { CockpitDecisionDock } from "./cockpit-decision-dock";
import { CockpitFindingQueue } from "./cockpit-finding-queue";
import { EvidenceReviewCockpit } from "./evidence-review-cockpit";
import { StatusBadge } from "./status-badge";

function confidenceClass(value: number) {
  if (value >= 85) return "text-success-foreground";
  if (value >= 65) return "text-warning-foreground";
  return "text-danger-foreground";
}

export function ProjectIntelligenceCockpit({
  project,
  status,
  intelligence,
  latestError,
}: {
  project: HeliosProjectSummary;
  status: string;
  intelligence: HeliosProjectIntelligence;
  latestError?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [retrying, setRetrying] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState(
    intelligence.findings[0]?.id,
  );
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(
    intelligence.findings[0]?.evidenceIds[0] ||
      intelligence.summaryEvidenceIds[0] ||
      intelligence.evidence[0]?.id,
  );
  const selectedFinding =
    intelligence.findings.find(
      (finding) => finding.id === selectedFindingId,
    ) || intelligence.findings[0];
  const effectiveEvidenceId =
    intelligence.evidence.some(
      (evidence) => evidence.id === selectedEvidenceId,
    )
      ? selectedEvidenceId
      : selectedFinding?.evidenceIds[0] || intelligence.evidence[0]?.id;
  const isUpdating = ["queued", "processing"].includes(status);
  const isStale = intelligence.isStale || status === "failed";
  const locked = isUpdating || isStale;
  const reviewed =
    intelligence.reviewSummary.total - intelligence.reviewSummary.needsReview;
  const reviewProgress = intelligence.reviewSummary.total
    ? Math.round((reviewed / intelligence.reviewSummary.total) * 100)
    : 0;
  const citedDocuments = new Set(
    intelligence.evidence.map((evidence) => evidence.documentId),
  ).size;

  function selectFinding(finding: HeliosIntelligenceFinding) {
    setSelectedFindingId(finding.id);
    setSelectedEvidenceId(
      finding.evidenceIds[0] || intelligence.evidence[0]?.id,
    );
  }

  async function retryProject() {
    setRetrying(true);
    try {
      const response = await fetch(
        `/api/projects/${project.id}/intelligence/retry`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Project intelligence retry failed.");
      }
      toast("Project intelligence was queued again.", "success");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Retry failed.",
        "error",
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <header className="grid gap-3 border-b border-border bg-card/80 p-3 md:grid-cols-2 md:items-center xl:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(120px,0.55fr))_auto]">
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold">{project.name}</h1>
            <StatusBadge value={project.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" />
              {project.location || "Location not set"}
            </span>
            <span>{project.projectNumber || "No project number"}</span>
          </div>
        </div>

        <div className="border-l border-border pl-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Bid due
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
            <CalendarClock
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            {formatDate(project.bidDate)}
          </div>
        </div>

        <div className="border-l border-border pl-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Analysis state
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
            {isUpdating ? (
              <LoaderCircle
                className="size-3.5 animate-spin text-ai-foreground"
                aria-hidden="true"
              />
            ) : (
              <ShieldCheck
                className="size-3.5 text-success-foreground"
                aria-hidden="true"
              />
            )}
            {humanizeStatus(status)}
          </div>
        </div>

        <div className="border-l border-border pl-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Review readiness
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs font-semibold">{reviewProgress}%</span>
            <div
              className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
              aria-label={`${reviewProgress}% of findings reviewed`}
            >
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${reviewProgress}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={retrying || isUpdating}
          onClick={() => void retryProject()}
        >
          <RefreshCw
            className={`size-3.5 ${retrying ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Reanalyze
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-muted/10 px-3 py-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <FileStack className="size-3.5 text-ai-foreground" aria-hidden="true" />
          {citedDocuments} cited documents
        </span>
        <span>
          Findings{" "}
          <strong className="font-semibold text-foreground">
            {intelligence.findings.length}
          </strong>
        </span>
        <span>
          Need review{" "}
          <strong className="font-semibold text-warning-foreground">
            {intelligence.reviewSummary.needsReview}
          </strong>
        </span>
        <span>
          Approved / corrected{" "}
          <strong className="font-semibold text-success-foreground">
            {intelligence.reviewSummary.approved +
              intelligence.reviewSummary.corrected}
          </strong>
        </span>
        <span>
          Confidence{" "}
          <strong
            className={`font-semibold ${confidenceClass(
              intelligence.confidence,
            )}`}
          >
            {intelligence.confidence}%
          </strong>
        </span>
        <span className="ml-auto text-muted-foreground">
          Last analysis {formatTimestamp(intelligence.generatedAt)}
        </span>
      </div>

      {(locked || intelligence.confidence < 65) && (
        <div
          className="flex items-start gap-2 border-b border-border bg-warning-surface px-3 py-2 text-[11px] text-warning-foreground"
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>
            {isUpdating
              ? "A new intelligence generation is processing. Review actions are temporarily locked."
              : isStale
                ? `This retained snapshot is stale. Review actions are locked.${
                    latestError ? ` ${latestError}` : ""
                  }`
                : "Overall confidence is below the review threshold. Verify each cited page before making a decision."}
          </span>
        </div>
      )}

      <div className="grid min-h-0 xl:grid-cols-[340px_minmax(0,1fr)]">
        <CockpitFindingQueue
          intelligence={intelligence}
          selectedFindingId={selectedFinding?.id}
          onSelectFinding={selectFinding}
        />
        <EvidenceReviewCockpit
          projectId={project.id}
          intelligence={intelligence}
          selectedEvidenceId={effectiveEvidenceId}
          selectedFinding={selectedFinding}
          onSelectEvidence={setSelectedEvidenceId}
        />
      </div>

      <CockpitDecisionDock
        projectId={project.id}
        intelligenceId={intelligence.id}
        finding={selectedFinding}
        locked={locked}
      />

      <div className="flex items-center justify-center gap-1 border-t border-border bg-background px-3 py-1.5 text-[10px] text-muted-foreground">
        <Bot className="size-3 text-ai-foreground" aria-hidden="true" />
        Helios recommendations do not change project documents. You control
        every recorded decision.
      </div>
    </div>
  );
}
