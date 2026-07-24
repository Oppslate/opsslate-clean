"use client";

import type {
  HeliosFindingReviewAction,
  HeliosFindingReviewStatus,
  HeliosIntelligenceFinding,
  HeliosProjectIntelligence,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@opsslate/suite-ui/dialog";
import { Input } from "@opsslate/suite-ui/input";
import { Label } from "@opsslate/suite-ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@opsslate/suite-ui/select";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  Archive,
  Check,
  ChevronDown,
  FileSearch,
  History,
  LoaderCircle,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatTimestamp, humanizeStatus } from "@/lib/format";

const actionLabels: Record<HeliosFindingReviewAction, string> = {
  approve: "Approve finding",
  correct: "Correct finding",
  reject: "Reject finding",
  request_reanalysis: "Request reanalysis",
  supersede: "Mark superseded",
};

const actionDescriptions: Record<HeliosFindingReviewAction, string> = {
  approve:
    "Record that the cited finding is accepted for later preconstruction use.",
  correct:
    "Preserve the AI finding and save the estimator’s corrected interpretation.",
  reject:
    "Record why this finding should not be used. The original remains in history.",
  request_reanalysis:
    "Record the concern and start a new project-intelligence generation.",
  supersede:
    "Retire this finding because newer information or another finding replaces it.",
};

function reviewBadgeClass(status: HeliosFindingReviewStatus) {
  if (status === "approved" || status === "corrected") {
    return "border-green-500/30 bg-green-500/10 text-green-200";
  }
  if (status === "rejected" || status === "superseded") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }
  if (status === "reanalysis_requested") {
    return "border-orange-500/30 bg-orange-500/10 text-orange-200";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

function effectiveTitle(finding: HeliosIntelligenceFinding) {
  return finding.review.correctedTitle || finding.title;
}

function effectiveDetail(finding: HeliosIntelligenceFinding) {
  return finding.review.correctedDetail || finding.detail;
}

export function FindingReviewQueue({
  projectId,
  intelligence,
  locked,
  onOpenEvidence,
}: {
  projectId: string;
  intelligence: HeliosProjectIntelligence;
  locked: boolean;
  onOpenEvidence: (evidenceId: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [status, setStatus] = useState("all");
  const [trade, setTrade] = useState("all");
  const [pendingFinding, setPendingFinding] =
    useState<HeliosIntelligenceFinding>();
  const [pendingAction, setPendingAction] =
    useState<HeliosFindingReviewAction>();
  const [correctedTitle, setCorrectedTitle] = useState("");
  const [correctedDetail, setCorrectedDetail] = useState("");
  const [reviewTrade, setReviewTrade] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = Array.from(
    new Set(intelligence.findings.map((finding) => finding.category)),
  ).sort();
  const trades = Array.from(
    new Set(
      intelligence.findings
        .map((finding) => finding.review.trade)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = intelligence.findings.filter((finding) => {
    const title = effectiveTitle(finding);
    const detail = effectiveDetail(finding);
    const confidenceBand =
      finding.confidence >= 85
        ? "high"
        : finding.confidence >= 65
          ? "medium"
          : "low";
    return (
      (!normalizedSearch ||
        `${title} ${detail} ${finding.review.trade || ""}`
          .toLowerCase()
          .includes(normalizedSearch)) &&
      (category === "all" || finding.category === category) &&
      (severity === "all" || finding.severity === severity) &&
      (confidence === "all" || confidenceBand === confidence) &&
      (status === "all" || finding.review.status === status) &&
      (trade === "all" || finding.review.trade === trade)
    );
  });

  function openAction(
    finding: HeliosIntelligenceFinding,
    action: HeliosFindingReviewAction,
  ) {
    setPendingFinding(finding);
    setPendingAction(action);
    setCorrectedTitle(effectiveTitle(finding));
    setCorrectedDetail(effectiveDetail(finding));
    setReviewTrade(finding.review.trade || "");
    setComment("");
  }

  function closeAction() {
    if (submitting) return;
    setPendingFinding(undefined);
    setPendingAction(undefined);
  }

  async function submitReview() {
    if (!pendingFinding || !pendingAction) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(
          projectId,
        )}/intelligence/${encodeURIComponent(
          intelligence.id,
        )}/findings/${encodeURIComponent(pendingFinding.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: pendingAction,
            correctedTitle:
              pendingAction === "correct" ? correctedTitle : undefined,
            correctedDetail:
              pendingAction === "correct" ? correctedDetail : undefined,
            trade:
              pendingAction === "correct" || pendingAction === "approve"
                ? reviewTrade
                : undefined,
            comment,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Finding review could not be saved.");
      }
      toast(
        pendingAction === "request_reanalysis"
          ? "Review saved. A new intelligence generation was queued."
          : "Finding review saved.",
        "success",
      );
      setPendingFinding(undefined);
      setPendingAction(undefined);
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Finding review could not be saved.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const summary = intelligence.reviewSummary;
  const noteRequired =
    pendingAction &&
    ["reject", "request_reanalysis", "supersede"].includes(pendingAction);
  const correctionInvalid =
    pendingAction === "correct" &&
    (!correctedTitle.trim() || !correctedDetail.trim());
  const submitDisabled =
    submitting ||
    correctionInvalid ||
    Boolean(noteRequired && !comment.trim());

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant="outline"
            className={reviewBadgeClass("needs_review")}
          >
            {summary.needsReview} need review
          </Badge>
          <Badge variant="outline" className={reviewBadgeClass("approved")}>
            {summary.approved} approved
          </Badge>
          <Badge variant="outline" className={reviewBadgeClass("corrected")}>
            {summary.corrected} corrected
          </Badge>
          <Badge variant="outline" className={reviewBadgeClass("rejected")}>
            {summary.rejected} rejected
          </Badge>
          {(summary.reanalysisRequested > 0 || summary.superseded > 0) && (
            <span className="text-muted-foreground">
              {summary.reanalysisRequested} reanalysis requested ·{" "}
              {summary.superseded} superseded
            </span>
          )}
        </div>

        {locked && (
          <div
            className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-amber-100"
            role="alert"
          >
            Review actions are locked while a newer or incomplete intelligence
            generation is active. The retained snapshot remains available for
            reference.
          </div>
        )}

        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/10 p-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search findings or trades"
            aria-label="Search findings"
            className="w-full sm:w-64"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {categories.map((value) => (
                <SelectItem key={value} value={value}>
                  {humanizeStatus(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger aria-label="Filter by risk">
              <SelectValue placeholder="All risk levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="information">Information</SelectItem>
            </SelectContent>
          </Select>
          <Select value={confidence} onValueChange={setConfidence}>
            <SelectTrigger aria-label="Filter by confidence">
              <SelectValue placeholder="All confidence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All confidence</SelectItem>
              <SelectItem value="high">High confidence</SelectItem>
              <SelectItem value="medium">Medium confidence</SelectItem>
              <SelectItem value="low">Low confidence</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by review status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
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
          {trades.length > 0 && (
            <Select value={trade} onValueChange={setTrade}>
              <SelectTrigger aria-label="Filter by trade">
                <SelectValue placeholder="All trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                {trades.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="text-sm text-muted-foreground" aria-live="polite">
          Showing {filtered.length} of {summary.total} findings
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border p-8 text-center">
            <p className="font-medium">No findings match these filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust the review queue filters to see other findings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((finding) => {
              const title = effectiveTitle(finding);
              const detail = effectiveDetail(finding);
              return (
                <article
                  key={finding.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {humanizeStatus(finding.category)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={reviewBadgeClass(finding.review.status)}
                        >
                          {humanizeStatus(finding.review.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {finding.confidence}% confidence ·{" "}
                          {humanizeStatus(finding.severity)}
                        </span>
                        {finding.review.trade && (
                          <Badge variant="secondary">
                            {finding.review.trade}
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-3 font-medium">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {detail}
                      </p>
                      {finding.review.correctedDetail && (
                        <p className="mt-2 text-xs text-green-200">
                          Estimator correction applied; original AI output is
                          retained in review history.
                        </p>
                      )}
                      {finding.review.latestComment && (
                        <div className="mt-3 rounded-md bg-muted/25 px-3 py-2 text-sm">
                          <span className="text-muted-foreground">
                            Latest review note:{" "}
                          </span>
                          {finding.review.latestComment}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5 xl:max-w-80 xl:justify-end">
                      {finding.evidenceIds[0] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onOpenEvidence(finding.evidenceIds[0])
                          }
                        >
                          <FileSearch
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          Source
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={locked}
                        onClick={() => openAction(finding, "approve")}
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={locked}
                        onClick={() => openAction(finding, "correct")}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Correct
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={locked}
                        onClick={() => openAction(finding, "reject")}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={locked}
                        onClick={() =>
                          openAction(finding, "request_reanalysis")
                        }
                      >
                        <RefreshCw
                          className="size-3.5"
                          aria-hidden="true"
                        />
                        Reanalyze
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={locked}
                        onClick={() => openAction(finding, "supersede")}
                      >
                        <Archive className="size-3.5" aria-hidden="true" />
                        Supersede
                      </Button>
                    </div>
                  </div>

                  {finding.review.history.length > 0 && (
                    <details className="group mt-4 border-t border-border pt-3">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">
                        <History className="size-4" aria-hidden="true" />
                        Review history ({finding.review.history.length})
                        <ChevronDown
                          className="size-4 transition-transform group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <ol className="mt-3 space-y-2">
                        {[...finding.review.history]
                          .reverse()
                          .map((event) => (
                            <li
                              key={event.id}
                              className="rounded-md border border-border bg-muted/10 p-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium">
                                  {humanizeStatus(event.action)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {event.reviewerName} ·{" "}
                                  {formatTimestamp(event.createdAt)}
                                </span>
                              </div>
                              {event.comment && (
                                <p className="mt-1 text-muted-foreground">
                                  {event.comment}
                                </p>
                              )}
                              {event.correctedTitle && (
                                <p className="mt-1 text-xs text-green-200">
                                  Corrected to: {event.correctedTitle}
                                </p>
                              )}
                            </li>
                          ))}
                      </ol>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(pendingFinding && pendingAction)}
        onOpenChange={(open) => {
          if (!open) closeAction();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {pendingFinding && pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle>{actionLabels[pendingAction]}</DialogTitle>
                <DialogDescription>
                  {actionDescriptions[pendingAction]}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-border bg-muted/10 p-3">
                <div className="text-sm font-medium">
                  {effectiveTitle(pendingFinding)}
                </div>
                <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">
                  {effectiveDetail(pendingFinding)}
                </p>
              </div>

              {pendingAction === "correct" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="corrected-finding-title">
                      Corrected title
                    </Label>
                    <Input
                      id="corrected-finding-title"
                      value={correctedTitle}
                      maxLength={240}
                      onChange={(event) =>
                        setCorrectedTitle(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="corrected-finding-detail">
                      Corrected interpretation
                    </Label>
                    <Textarea
                      id="corrected-finding-detail"
                      value={correctedDetail}
                      rows={6}
                      maxLength={2400}
                      onChange={(event) =>
                        setCorrectedDetail(event.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {(pendingAction === "correct" ||
                pendingAction === "approve") && (
                <div className="space-y-2">
                  <Label htmlFor="finding-trade">
                    Trade / discipline
                    <span className="font-normal text-muted-foreground">
                      Optional
                    </span>
                  </Label>
                  <Input
                    id="finding-trade"
                    value={reviewTrade}
                    maxLength={120}
                    placeholder="Example: Utilities, concrete, earthwork"
                    onChange={(event) => setReviewTrade(event.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="finding-review-note">
                  Review note
                  {!noteRequired && (
                    <span className="font-normal text-muted-foreground">
                      Optional
                    </span>
                  )}
                </Label>
                <Textarea
                  id="finding-review-note"
                  value={comment}
                  rows={4}
                  maxLength={2000}
                  required={Boolean(noteRequired)}
                  placeholder={
                    noteRequired
                      ? "Explain the review decision."
                      : "Add context for the audit history."
                  }
                  onChange={(event) => setComment(event.target.value)}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={submitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant={
                    pendingAction === "reject" ? "destructive" : "default"
                  }
                  disabled={submitDisabled}
                  onClick={() => void submitReview()}
                >
                  {submitting ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : pendingAction === "request_reanalysis" ? (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  ) : (
                    <Check className="size-4" aria-hidden="true" />
                  )}
                  {submitting ? "Saving…" : actionLabels[pendingAction]}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
