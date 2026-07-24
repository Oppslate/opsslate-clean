"use client";

import type {
  HeliosFindingReviewStatus,
  HeliosIntelligenceFinding,
  HeliosProjectIntelligence,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Input } from "@opsslate/suite-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@opsslate/suite-ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Search,
} from "lucide-react";
import { useState } from "react";

import { humanizeStatus } from "@/lib/format";

function reviewBadgeClass(status: HeliosFindingReviewStatus) {
  if (status === "approved" || status === "corrected") {
    return "border-success/30 bg-success-surface text-success-foreground";
  }
  if (status === "rejected" || status === "superseded") {
    return "border-danger/30 bg-danger-surface text-danger-foreground";
  }
  if (status === "reanalysis_requested") {
    return "border-ai-border bg-ai-surface text-ai-foreground";
  }
  return "border-warning/30 bg-warning-surface text-warning-foreground";
}

function severityBadgeClass(severity: HeliosIntelligenceFinding["severity"]) {
  if (severity === "critical") {
    return "border-danger/30 bg-danger-surface text-danger-foreground";
  }
  if (severity === "warning") {
    return "border-warning/30 bg-warning-surface text-warning-foreground";
  }
  return "border-info/30 bg-info/10 text-info-foreground";
}

function effectiveTitle(finding: HeliosIntelligenceFinding) {
  return finding.review.correctedTitle || finding.title;
}

function effectiveDetail(finding: HeliosIntelligenceFinding) {
  return finding.review.correctedDetail || finding.detail;
}

export function CockpitFindingQueue({
  intelligence,
  selectedFindingId,
  onSelectFinding,
}: {
  intelligence: HeliosProjectIntelligence;
  selectedFindingId?: string;
  onSelectFinding: (finding: HeliosIntelligenceFinding) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const normalizedSearch = search.trim().toLowerCase();
  const categories = Array.from(
    new Set(intelligence.findings.map((finding) => finding.category)),
  ).sort();
  const filtered = intelligence.findings.filter((finding) => {
    const searchable =
      `${effectiveTitle(finding)} ${effectiveDetail(finding)} ${
        finding.review.trade || ""
      }`.toLowerCase();
    return (
      (!normalizedSearch || searchable.includes(normalizedSearch)) &&
      (category === "all" || finding.category === category) &&
      (status === "all" || finding.review.status === status)
    );
  });

  return (
    <section
      className="flex min-h-0 flex-col border-b border-border bg-card/45 xl:border-b-0 xl:border-r"
      aria-label="Findings inbox"
    >
      <div className="border-b border-border px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Findings inbox
            </div>
            <div className="mt-0.5 text-sm font-semibold">
              {intelligence.findings.length} intelligence findings
            </div>
          </div>
          <Badge
            variant="outline"
            className={reviewBadgeClass("needs_review")}
          >
            {intelligence.reviewSummary.needsReview} open
          </Badge>
        </div>
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search findings or trades"
            aria-label="Search findings"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              aria-label="Filter findings by type"
              className="h-8 min-w-0 text-xs"
            >
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All finding types</SelectItem>
              {categories.map((value) => (
                <SelectItem key={value} value={value}>
                  {humanizeStatus(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              aria-label="Filter findings by review status"
              className="h-8 min-w-0 text-xs"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All review statuses</SelectItem>
              <SelectItem value="needs_review">Needs review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="corrected">Corrected</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="reanalysis_requested">
                Reanalysis requested
              </SelectItem>
              <SelectItem value="superseded">Superseded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span>
          Showing {filtered.length} of {intelligence.findings.length}
        </span>
        <span>Risk · confidence</span>
      </div>

      <div className="max-h-[380px] min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <FileSearch
              className="mb-2 size-7 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">No findings match</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust the search or review filters.
            </p>
          </div>
        ) : (
          filtered.map((finding) => {
            const selected = finding.id === selectedFindingId;
            const reviewed =
              finding.review.status === "approved" ||
              finding.review.status === "corrected";
            return (
              <button
                key={finding.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectFinding(finding)}
                className={`group block w-full border-b border-border px-3 py-3 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  selected
                    ? "bg-selected-surface shadow-[inset_3px_0_0_var(--color-primary)]"
                    : "hover:bg-muted/30"
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`h-5 px-1.5 text-[9px] uppercase ${severityBadgeClass(
                          finding.severity,
                        )}`}
                      >
                        {finding.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`h-5 max-w-36 px-1.5 text-[9px] ${reviewBadgeClass(
                          finding.review.status,
                        )}`}
                      >
                        {humanizeStatus(finding.review.status)}
                      </Badge>
                    </span>
                    <span className="mt-2 line-clamp-2 block text-xs font-semibold leading-4 text-foreground">
                      {effectiveTitle(finding)}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-muted-foreground">
                      {effectiveDetail(finding)}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                      <span>{humanizeStatus(finding.category)}</span>
                      {finding.review.trade && (
                        <span className="text-ai-foreground">
                          {finding.review.trade}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2">
                    {reviewed ? (
                      <CheckCircle2
                        className="size-4 text-success-foreground"
                        aria-label="Reviewed"
                      />
                    ) : (
                      <AlertTriangle
                        className={`size-4 ${
                          finding.severity === "critical"
                            ? "text-danger-foreground"
                            : "text-warning-foreground"
                        }`}
                        aria-label="Needs review"
                      />
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {finding.confidence}%
                    </Badge>
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
