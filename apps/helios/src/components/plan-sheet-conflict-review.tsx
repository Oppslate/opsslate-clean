"use client";

import type {
  HeliosPlanPage,
  HeliosPlanReviewInput,
  HeliosPlanSheetConflict,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@opsslate/suite-ui/dialog";
import { ArrowUpRight, CheckCircle2, FileWarning, ShieldAlert } from "lucide-react";
import Link from "next/link";

function readable(value: string) {
  return value.replaceAll("_", " ");
}

function phaseLabel(page: HeliosPlanPage) {
  const source = `${page.titleBlockText} ${page.revisionMarker}`;
  if (/\b(?:ISSUED[ -]FOR[ -]BID|BID[ -]PHASE|PHASE:\s*BID|BID)\b/i.test(source)) return "Bid phase";
  if (/\bFINAL\b/i.test(source)) return "Final";
  return "Phase not established";
}

export function PlanSheetConflictReview({
  projectId,
  conflict,
  pages,
  open,
  saving,
  onOpenChange,
  onDecision,
}: {
  projectId: string;
  conflict?: HeliosPlanSheetConflict;
  pages: HeliosPlanPage[];
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onDecision: (input: HeliosPlanReviewInput, success: string) => Promise<boolean>;
}) {
  if (!conflict) return null;
  const candidates = conflict.pageIds
    .map((pageId) => pages.find((page) => page.id === pageId))
    .filter((page): page is HeliosPlanPage => Boolean(page))
    .sort((left, right) => Number(right.id === conflict.suggestedPrimaryPageId) - Number(left.id === conflict.suggestedPrimaryPageId));

  async function decide(input: HeliosPlanReviewInput, success: string) {
    const saved = await onDecision(input, success);
    if (saved) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[calc(100%-2rem)] xl:max-w-5xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={conflict.status === "resolved" ? "secondary" : "destructive"} className="capitalize">
              {readable(conflict.status)}
            </Badge>
            <Badge variant="outline" className="capitalize">{readable(conflict.conflictType)}</Badge>
          </div>
          <DialogTitle>Drawing authority · {conflict.sheetNumber}</DialogTitle>
          <DialogDescription>
            Compare every source carrying this drawing number. Original PDFs remain unchanged; this decision only controls which page may drive geometry, takeoff, and estimating.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold">{conflict.reason}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Helios recommends the issued-for-bid or newest clearly dated source. The estimator remains the authority.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {candidates.map((page) => {
            const suggested = page.id === conflict.suggestedPrimaryPageId;
            const selected = page.id === conflict.primaryPageId;
            const reference = conflict.referencePageIds.includes(page.id);
            return (
              <article key={page.id} className={`rounded-lg border p-4 ${selected ? "border-emerald-500/45 bg-emerald-500/5" : suggested ? "border-orange-500/45 bg-orange-500/5" : "border-border bg-background/35"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileWarning className="size-4 text-orange-300" aria-hidden="true" />
                      <h3 className="font-semibold">{page.sheetNumber} · {page.title}</h3>
                    </div>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{page.documentName}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggested && <Badge variant="secondary">Recommended</Badge>}
                    {selected && <Badge variant="secondary">Current bid</Badge>}
                    {reference && <Badge variant="outline">Reference</Badge>}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><dt className="text-muted-foreground">Issue date</dt><dd className="mt-1 font-medium">{page.issueDate || "Not established"}</dd></div>
                  <div><dt className="text-muted-foreground">Drawing phase</dt><dd className="mt-1 font-medium">{phaseLabel(page)}</dd></div>
                  <div><dt className="text-muted-foreground">PDF location</dt><dd className="mt-1 font-medium">Page {page.physicalPageNumber}</dd></div>
                  <div><dt className="text-muted-foreground">Printed page</dt><dd className="mt-1 font-medium">{page.printedPageNumber || "Not established"}</dd></div>
                  <div><dt className="text-muted-foreground">Revision</dt><dd className="mt-1 font-medium">{page.revisionMarker || "No visible marker"}</dd></div>
                  <div><dt className="text-muted-foreground">Confidence</dt><dd className="mt-1 font-mono font-medium">{page.confidence}%</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/api/projects/${projectId}/documents/${page.documentId}/content#page=${page.physicalPageNumber}`} target="_blank">
                      <ArrowUpRight aria-hidden="true" />Open source
                    </Link>
                  </Button>
                  {!selected && (
                    <Button
                      size="sm"
                      variant={suggested ? "default" : "outline"}
                      disabled={saving}
                      onClick={() => void decide({
                        action: "resolve_sheet_conflict",
                        sheetNumber: conflict.sheetNumber,
                        decision: "use_as_current",
                        primaryPageId: page.id,
                      }, `${page.sheetNumber} authority saved; reference sources remain preserved.`)}
                    >
                      <CheckCircle2 aria-hidden="true" />Use as current bid
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <DialogFooter className="flex-wrap sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void decide({ action: "resolve_sheet_conflict", sheetNumber: conflict.sheetNumber, decision: "keep_both" }, `${conflict.sheetNumber} retained for further comparison.`)}
            >
              Keep both for review
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => void decide({ action: "resolve_sheet_conflict", sheetNumber: conflict.sheetNumber, decision: "escalate" }, `${conflict.sheetNumber} conflict escalated.`)}
            >
              Escalate conflict
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Close</Button>
            {conflict.suggestedPrimaryPageId && (
              <Button
                disabled={saving}
                onClick={() => void decide({ action: "resolve_sheet_conflict", sheetNumber: conflict.sheetNumber, decision: "apply_recommended" }, `${conflict.sheetNumber} classified using the recommended bid authority.`)}
              >
                <CheckCircle2 aria-hidden="true" />Apply recommendation
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
