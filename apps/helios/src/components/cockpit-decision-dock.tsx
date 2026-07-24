"use client";

import type {
  HeliosFindingReviewAction,
  HeliosIntelligenceFinding,
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
import { Textarea } from "@opsslate/suite-ui/textarea";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  Archive,
  Check,
  History,
  LoaderCircle,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { humanizeStatus } from "@/lib/format";

const actionLabels: Record<HeliosFindingReviewAction, string> = {
  approve: "Approve",
  correct: "Correct",
  reject: "Reject",
  request_reanalysis: "Reanalyze",
  supersede: "Supersede",
};

const actionDescriptions: Record<HeliosFindingReviewAction, string> = {
  approve:
    "Accept this cited interpretation for later preconstruction use.",
  correct:
    "Preserve the AI finding and record the estimator’s corrected interpretation.",
  reject:
    "Record why this finding should not be used. The original remains in history.",
  request_reanalysis:
    "Record the concern and create a new Project Intelligence generation.",
  supersede:
    "Retire this finding because newer information or another finding replaces it.",
};

function effectiveTitle(finding: HeliosIntelligenceFinding) {
  return finding.review.correctedTitle || finding.title;
}

function effectiveDetail(finding: HeliosIntelligenceFinding) {
  return finding.review.correctedDetail || finding.detail;
}

export function CockpitDecisionDock({
  projectId,
  intelligenceId,
  finding,
  locked,
}: {
  projectId: string;
  intelligenceId: string;
  finding?: HeliosIntelligenceFinding;
  locked: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] =
    useState<HeliosFindingReviewAction>();
  const [correctedTitle, setCorrectedTitle] = useState("");
  const [correctedDetail, setCorrectedDetail] = useState("");
  const [trade, setTrade] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  function openAction(
    action: HeliosFindingReviewAction,
    trigger: HTMLButtonElement,
  ) {
    if (!finding) return;
    lastTriggerRef.current = trigger;
    setPendingAction(action);
    setCorrectedTitle(effectiveTitle(finding));
    setCorrectedDetail(effectiveDetail(finding));
    setTrade(finding.review.trade || "");
    setComment("");
  }

  function closeAction() {
    if (submitting) return;
    setPendingAction(undefined);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }

  async function submitReview() {
    if (!finding || !pendingAction) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(
          projectId,
        )}/intelligence/${encodeURIComponent(
          intelligenceId,
        )}/findings/${encodeURIComponent(finding.id)}/review`,
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
                ? trade
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
      <section
        className="grid gap-2.5 border-t border-border bg-card/90 p-2.5 shadow-lg lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.5fr)] lg:items-center"
        aria-label="Selected finding decision"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Selected finding
          </div>
          {finding ? (
            <>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold">
                  {effectiveTitle(finding)}
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {humanizeStatus(finding.review.status)}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{finding.confidence}% confidence</span>
                <span>{humanizeStatus(finding.category)}</span>
                <span>{finding.evidenceIds.length} citations</span>
                {finding.review.history.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <History className="size-3" aria-hidden="true" />
                    {finding.review.history.length} review events
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Select a finding to review its evidence and record a decision.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your decision
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              disabled={!finding || locked}
              onClick={(event) =>
                openAction("approve", event.currentTarget)
              }
            >
              <Check className="size-3.5" aria-hidden="true" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!finding || locked}
              onClick={(event) =>
                openAction("correct", event.currentTarget)
              }
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Correct
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!finding || locked}
              onClick={(event) =>
                openAction("request_reanalysis", event.currentTarget)
              }
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Reanalyze
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!finding || locked}
              onClick={(event) =>
                openAction("supersede", event.currentTarget)
              }
            >
              <Archive className="size-3.5" aria-hidden="true" />
              Supersede
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!finding || locked}
              onClick={(event) =>
                openAction("reject", event.currentTarget)
              }
            >
              <X className="size-3.5" aria-hidden="true" />
              Reject
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={Boolean(finding && pendingAction)}
        onOpenChange={(open) => {
          if (!open) closeAction();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {finding && pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle>{actionLabels[pendingAction]} finding</DialogTitle>
                <DialogDescription>
                  {actionDescriptions[pendingAction]}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-border bg-muted/15 p-3">
                <div className="text-sm font-medium">
                  {effectiveTitle(finding)}
                </div>
                <p className="mt-1 line-clamp-4 text-sm leading-5 text-muted-foreground">
                  {effectiveDetail(finding)}
                </p>
              </div>

              {pendingAction === "correct" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cockpit-corrected-title">
                      Corrected title
                    </Label>
                    <Input
                      id="cockpit-corrected-title"
                      value={correctedTitle}
                      maxLength={240}
                      onChange={(event) =>
                        setCorrectedTitle(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cockpit-corrected-detail">
                      Corrected interpretation
                    </Label>
                    <Textarea
                      id="cockpit-corrected-detail"
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
                  <Label htmlFor="cockpit-finding-trade">
                    Trade / discipline{" "}
                    <span className="font-normal text-muted-foreground">
                      Optional
                    </span>
                  </Label>
                  <Input
                    id="cockpit-finding-trade"
                    value={trade}
                    maxLength={120}
                    placeholder="Example: Utilities, concrete, earthwork"
                    onChange={(event) => setTrade(event.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="cockpit-review-note">
                  Review note{" "}
                  {!noteRequired && (
                    <span className="font-normal text-muted-foreground">
                      Optional
                    </span>
                  )}
                </Label>
                <Textarea
                  id="cockpit-review-note"
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
                  {submitting
                    ? "Saving…"
                    : `${actionLabels[pendingAction]} finding`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
