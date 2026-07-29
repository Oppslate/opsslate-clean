"use client";

import type {
  HeliosBidBasisProfile,
  HeliosPlanReviewInput,
  HeliosPlanSetIntelligence,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Compass,
  GitBranch,
  LoaderCircle,
  Map,
  Ruler,
  ScanLine,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PlanSheetConflictReview } from "./plan-sheet-conflict-review";

function readable(value: string) {
  return value.replaceAll("_", " ");
}
function statusVariant(status: string) {
  if (["ready_for_review", "approved", "resolved"].includes(status)) return "secondary" as const;
  if (["failed", "exception", "unresolved"].includes(status)) return "destructive" as const;
  return "outline" as const;
}

export function PlanIntelligencePanel({
  projectId,
  bidBasis,
  planSet,
}: {
  projectId: string;
  bidBasis: HeliosBidBasisProfile;
  planSet?: HeliosPlanSetIntelligence;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string>();
  const [openConflictId, setOpenConflictId] = useState<string>();
  const planBasis = bidBasis.categories.find((category) => category.category === "plans");
  const hasPlans = planBasis?.state === "received" && (planBasis.fileCount || 0) > 0;
  const processing = planSet && ["queued", "processing"].includes(planSet.status);

  async function act(input: HeliosPlanReviewInput, success: string) {
    const key = input.action + (input.calibrationId || "");
    setSaving(key);
    try {
      const response = await fetch(`/api/projects/${projectId}/plan-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Plan-intelligence action failed.");
      toast(success, "success");
      router.refresh();
      return true;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Plan-intelligence action failed.", "error");
      return false;
    } finally {
      setSaving(undefined);
    }
  }

  if (!hasPlans && !planSet) {
    return (
      <Card className="border-border bg-card/60 py-0">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Map className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Plan Intelligence</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Plans are not part of the current bid basis. The estimate remains open from the available specifications or written scope.
              </p>
            </div>
          </div>
          <Badge variant="outline">Not applicable</Badge>
        </CardContent>
      </Card>
    );
  }

  if (!planSet) {
    return (
      <Card className="border-orange-500/25 bg-card/75 py-0">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <ScanLine className="mt-0.5 size-5 text-orange-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Plan Intelligence · Revision {bidBasis.packageRevision}</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Reconstruct {planBasis?.fileCount || 0} plan PDF{planBasis?.fileCount === 1 ? "" : "s"} into an addressable sheet inventory, individual views, scales, and cross-sheet relationships.
              </p>
            </div>
          </div>
          <Button
            disabled={saving === "request_reconstruction"}
            onClick={() => void act({ action: "request_reconstruction" }, "Plan reconstruction queued.")}
          >
            {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ScanLine aria-hidden="true" />}
            Build plan model
          </Button>
        </CardContent>
      </Card>
    );
  }

  const visiblePages = planSet.pages.slice(0, 40);
  const unresolvedSheetConflicts = planSet.sheetConflicts.filter((conflict) => conflict.status !== "resolved");
  const selectedConflict = planSet.sheetConflicts.find((conflict) => conflict.id === openConflictId);
  const nonConflictIssues = planSet.issues.filter((issue) => !/(?:drawing (?:version|authority) conflict|duplicate sheet identifier)/i.test(issue));
  const unresolvedReferences = planSet.references.filter((reference) => reference.status === "unresolved").slice(0, 20);
  const proposedCalibrations = planSet.calibrations.filter((calibration) => ["proposed", "conflicted"].includes(calibration.status)).slice(0, 30);

  return (
    <Card className="border-orange-500/25 bg-card/75 py-0">
      <CardContent className="p-0">
        <div className="flex flex-col justify-between gap-4 p-4 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Compass className="size-5 text-orange-300" aria-hidden="true" />
              <h2 className="font-semibold">Plan Intelligence · Revision {planSet.packageRevision}</h2>
              <Badge variant={statusVariant(planSet.status)} className="capitalize">{readable(planSet.status)}</Badge>
              {processing && <LoaderCircle className="size-4 animate-spin text-orange-300" aria-label="Plan reconstruction in progress" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Original PDFs remain unchanged. Sheets, views, relationships, and scale controls are revision-scoped.
            </p>
          </div>
          {planSet.status === "failed" && (
            <Button variant="outline" disabled={Boolean(saving)} onClick={() => void act({ action: "request_reconstruction" }, "Plan reconstruction requeued.")}>
              Reconstruct again
            </Button>
          )}
        </div>

        <div className="grid border-y border-border sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Source pages", planSet.sourcePageCount],
            ["Registered", planSet.registeredPageCount],
            ["Sheets", planSet.sheetCount],
            ["Measurable views", planSet.measurableViewCount],
            ["Approved scales", planSet.approvedCalibrationCount],
            ["Measurement blocks", planSet.blockedMeasurementCount],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-border px-4 py-3 last:border-b-0 sm:border-r xl:border-b-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
              <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {(unresolvedSheetConflicts.length > 0 || nonConflictIssues.length > 0) && (
          <div className="m-4 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                {unresolvedSheetConflicts.length > 0 && (
                  <div className="font-semibold">
                    {unresolvedSheetConflicts.length} drawing authority conflict{unresolvedSheetConflicts.length === 1 ? "" : "s"} require review.
                  </div>
                )}
                {nonConflictIssues.length > 0 && <div className="mt-1 text-xs text-muted-foreground">{nonConflictIssues.join(" ")}</div>}
              </div>
            </div>
            {unresolvedSheetConflicts[0] && (
              <Button size="sm" variant="outline" onClick={() => setOpenConflictId(unresolvedSheetConflicts[0].id)}>
                Review conflicts
              </Button>
            )}
          </div>
        )}

        {!processing && planSet.status !== "not_applicable_to_current_basis" && (
          <div className="divide-y divide-border">
            {planSet.sheetConflicts.length > 0 && (
              <details open={unresolvedSheetConflicts.length > 0} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <span className="flex items-center gap-2"><AlertTriangle className="size-4 text-orange-300" aria-hidden="true" />Drawing authority</span>
                  <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{unresolvedSheetConflicts.length} open · {planSet.sheetConflicts.length - unresolvedSheetConflicts.length} resolved<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
                </summary>
                <div className="grid gap-2 border-t border-border p-4 md:grid-cols-2 xl:grid-cols-3">
                  {planSet.sheetConflicts.map((conflict) => {
                    const suggested = planSet.pages.find((page) => page.id === conflict.suggestedPrimaryPageId);
                    const selected = planSet.pages.find((page) => page.id === conflict.primaryPageId);
                    return (
                      <article key={conflict.normalizedSheetNumber} className={`rounded-lg border p-3 ${conflict.status === "resolved" ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-mono font-semibold text-orange-200">{conflict.sheetNumber}</div>
                            <div className="mt-1 text-xs capitalize text-muted-foreground">{readable(conflict.conflictType)} · {conflict.pageIds.length} sources</div>
                          </div>
                          <Badge variant={conflict.status === "resolved" ? "secondary" : "destructive"} className="capitalize">{readable(conflict.status)}</Badge>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                          {selected ? `Current: ${selected.documentName}` : suggested ? `Recommended: ${suggested.documentName}` : conflict.reason}
                        </p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpenConflictId(conflict.id)}>
                          Review sources
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </details>
            )}
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <span className="flex items-center gap-2"><Map className="size-4 text-orange-300" aria-hidden="true" />Sheet inventory</span>
                <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{planSet.sheetCount} sheets · {planSet.nonSheetPageCount} non-sheet · {planSet.exceptionPageCount} exceptions<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
              </summary>
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-muted/25 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <tr><th className="px-4 py-2.5">Sheet</th><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Authority</th><th className="px-4 py-2.5">Discipline</th><th className="px-4 py-2.5">Source</th><th className="px-4 py-2.5">Modality</th><th className="px-4 py-2.5">Views</th><th className="px-4 py-2.5">Confidence</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visiblePages.map((page) => (
                      <tr key={page.id} className="hover:bg-muted/15">
                        <td className="px-4 py-3 font-mono font-semibold text-orange-200">{page.sheetNumber || `PDF ${page.physicalPageNumber}`}</td>
                        <td className="px-4 py-3"><div className="font-medium">{page.title || readable(page.pageKind)}</div>{page.unresolvedIssues.length > 0 && <div className="mt-1 text-xs text-amber-200">{page.unresolvedIssues[0]}</div>}</td>
                        <td className="px-4 py-3"><Badge variant={page.authorityRole === "current_bid" ? "secondary" : "outline"} className="capitalize">{readable(page.authorityRole || "current_bid")}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{page.discipline || "—"}</td>
                        <td className="max-w-48 truncate px-4 py-3 text-muted-foreground" title={page.documentName}>{page.documentName} · p.{page.physicalPageNumber}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{page.modality}</Badge></td>
                        <td className="px-4 py-3 font-mono">{page.views.length}</td>
                        <td className="px-4 py-3 font-mono">{page.confidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <span className="flex items-center gap-2"><Ruler className="size-4 text-orange-300" aria-hidden="true" />Scale control</span>
                <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{proposedCalibrations.length} candidates · {planSet.blockedMeasurementCount} blocked views<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
              </summary>
              <div className="border-t border-border p-4">
                {proposedCalibrations.length ? (
                  <div className="grid gap-2 xl:grid-cols-2">
                    {proposedCalibrations.map((calibration) => {
                      const page = planSet.pages.find((candidate) => candidate.id === calibration.pageId);
                      const view = page?.views.find((candidate) => candidate.viewKey === calibration.viewKey);
                      return (
                        <div key={calibration.id} className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background/35 p-3 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <div className="font-medium">{page?.sheetNumber || `PDF page ${page?.physicalPageNumber || "?"}`} · {view?.label || calibration.viewKey}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{calibration.scale} {calibration.units ? `· ${calibration.units}` : ""} · {readable(calibration.source)} · {calibration.confidence}%</div>
                          </div>
                          <Button size="sm" disabled={Boolean(saving)} onClick={() => void act({ action: "approve_calibration", calibrationId: calibration.id }, "View scale approved; dependent measurement is now eligible.")}>
                            <CheckCircle2 aria-hidden="true" />Approve scale
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No scale candidates are awaiting approval.</p>}
              </div>
            </details>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <span className="flex items-center gap-2"><GitBranch className="size-4 text-orange-300" aria-hidden="true" />Cross-sheet relationships</span>
                <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{planSet.references.length} indexed · {planSet.unresolvedReferenceCount} unresolved<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
              </summary>
              <div className="border-t border-border p-4">
                {unresolvedReferences.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {unresolvedReferences.map((reference) => (
                      <div key={reference.id} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3"><span className="font-medium">{reference.sourceSheetNumber || "Unknown source"} → {reference.targetSheetNumber || reference.targetSpecification || "unresolved target"}</span><Badge variant="destructive">Unresolved</Badge></div>
                        <div className="mt-1 text-xs text-muted-foreground">{readable(reference.referenceType)} · {reference.label || reference.locator}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">All indexed cross-sheet targets resolve to one current sheet.</p>}
              </div>
            </details>
          </div>
        )}
      </CardContent>
      <PlanSheetConflictReview
        projectId={projectId}
        conflict={selectedConflict}
        pages={planSet.pages}
        open={Boolean(selectedConflict)}
        saving={Boolean(saving)}
        onOpenChange={(open) => { if (!open) setOpenConflictId(undefined); }}
        onDecision={act}
      />
    </Card>
  );
}
