"use client";

import {
  HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION,
  HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION,
  type HeliosEuclidCockpitAlignmentDetail,
  type HeliosEuclidReviewedSurfaceDraft,
  type HeliosEuclidSurfaceAssemblyResult,
  type HeliosEuclidSurfaceQuantityReviewWorkspace,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@opsslate/suite-ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@opsslate/suite-ui/select";
import { Calculator, Check, Clock3, Layers3, LoaderCircle, Network, Send, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { humanizeStatus } from "@/lib/format";

function statusClass(status: string) {
  if (status === "verified") return "border-success/35 bg-success/10 text-success-foreground";
  if (status === "preliminary") return "border-warning/40 bg-warning/10 text-warning-foreground";
  return "border-danger/40 bg-danger/10 text-danger-foreground";
}

function station(value: number | undefined) {
  if (value === undefined) return "Not established";
  const major = Math.floor(value / 100);
  const minor = value - major * 100;
  return `${major}+${minor.toFixed(2).padStart(5, "0")}`;
}

function quantity(value: number, unit: string) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;
}

export function EuclidSurfaceAssembler({ projectId, detail }: { projectId: string; detail: HeliosEuclidCockpitAlignmentDetail }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HeliosEuclidSurfaceAssemblyResult>();
  const [workspace, setWorkspace] = useState<HeliosEuclidSurfaceQuantityReviewWorkspace>();
  const [reviewPending, setReviewPending] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [costCodeId, setCostCodeId] = useState("");
  const [quantityUse, setQuantityUse] = useState<"comparative" | "production">("comparative");
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [publicationPending, setPublicationPending] = useState(false);
  const quantityResult = workspace?.result;
  const selectedDraft = quantityResult?.draftQuantities.find((draft) => draft.id === selectedDraftId);
  const selectedTarget = workspace?.boundary.targets.find((target) => target.costCodeId === costCodeId);

  async function assemble() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/euclid/surface-quantities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alignmentId: detail.summary.id }),
      });
      const payload = await response.json() as { data?: HeliosEuclidSurfaceQuantityReviewWorkspace; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Governed surfaces and draft quantities could not be calculated.");
      setWorkspace(payload.data);
      setResult(payload.data.result.surfaceAssembly);
    } catch (reason) {
      setResult(undefined);
      setWorkspace(undefined);
      setError(reason instanceof Error ? reason.message : "Governed surfaces and draft quantities could not be calculated.");
    } finally {
      setPending(false);
    }
  }

  async function reviewDraft(draft: HeliosEuclidReviewedSurfaceDraft, action: "accept" | "defer") {
    if (!workspace) return;
    setReviewPending(draft.id);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/euclid/surface-quantity-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: HELIOS_EUCLID_SURFACE_QUANTITY_REVIEW_VERSION,
          requestId: crypto.randomUUID(),
          euclidModelId: workspace.boundary.euclidModelId,
          modelFingerprint: workspace.boundary.modelFingerprint,
          alignmentId: detail.summary.id,
          resultFingerprint: workspace.result.fingerprint,
          draftQuantityId: draft.id,
          draftQuantityFingerprint: draft.fingerprint,
          action,
          reason: action === "defer" ? "Estimator deferred this draft quantity for later review." : undefined,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Draft quantity review could not be saved.");
      await assemble();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Draft quantity review could not be saved.");
    } finally {
      setReviewPending("");
    }
  }

  function beginPublication(draft: HeliosEuclidReviewedSurfaceDraft) {
    setSelectedDraftId(draft.id);
    setCostCodeId("");
    setQuantityUse("comparative");
    setError("");
    setPublicationOpen(true);
  }

  async function publishDraft() {
    if (
      !workspace || !selectedDraft || !selectedDraft.review || !costCodeId
      || !workspace.boundary.integrationSolutionId || !workspace.boundary.integrationSolutionFingerprint
    ) return;
    setPublicationPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/euclid/surface-quantity-publications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: HELIOS_EUCLID_SURFACE_QUANTITY_PUBLICATION_VERSION,
          requestId: crypto.randomUUID(),
          euclidModelId: workspace.boundary.euclidModelId,
          modelFingerprint: workspace.boundary.modelFingerprint,
          alignmentId: detail.summary.id,
          integrationSolutionId: workspace.boundary.integrationSolutionId,
          integrationSolutionFingerprint: workspace.boundary.integrationSolutionFingerprint,
          resultFingerprint: workspace.result.fingerprint,
          draftQuantityId: selectedDraft.id,
          draftQuantityFingerprint: selectedDraft.fingerprint,
          reviewId: selectedDraft.review.id,
          reviewFingerprint: selectedDraft.review.decisionFingerprint,
          costCodeId,
          use: quantityUse,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Reviewed draft could not be sent to the estimate.");
      setPublicationOpen(false);
      await assemble();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reviewed draft could not be sent to the estimate.");
    } finally {
      setPublicationPending(false);
    }
  }

  if (!result) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-border bg-background/25 px-5 text-center">
        <Network className="mb-3 size-10 text-orange-300" aria-hidden="true" />
        <h3 className="text-base font-semibold">Governed surfaces and draft quantities</h3>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">Build longitudinal existing, proposed, subgrade, and excavation-limit surfaces, then calculate traceable draft earthwork and material quantities from their canonical controls.</p>
        <p className="mt-2 max-w-2xl text-[10px] leading-4 text-muted-foreground">Helios identifies missing or incompatible station bands instead of bridging them. Draft results do not change the estimate until the estimator uses the governed publication workflow.</p>
        <Button type="button" className="mt-4" onClick={assemble} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
          {pending ? "Building governed quantities" : "Build surfaces and draft quantities"}
        </Button>
        {error && <p role="alert" className="mt-3 text-xs text-danger-foreground">{error}</p>}
      </section>
    );
  }

  const visibleGaps = result.surfaces.flatMap((surface) => surface.gaps).slice(0, 8);
  const quantityGaps = quantityResult?.gaps || [];
  const totalGaps = result.surfaces.reduce((sum, surface) => sum + surface.gaps.length, 0) + quantityGaps.length;
  const unresolvedControls = [...new Set([...result.unresolvedControls, ...(quantityResult?.unresolvedControls || [])])];

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border bg-background/25 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Governed surface assembly</h3>
              <Badge variant="outline" className={`text-[9px] ${statusClass(result.status)}`}>{humanizeStatus(result.status)}</Badge>
              <Badge variant="outline" className={`text-[9px] ${result.canCompareSurfaces ? "border-success/35 bg-success/10 text-success-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground"}`}>{result.canCompareSurfaces ? "Comparison ready" : "Comparison not ready"}</Badge>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{result.sampling.sectionCount} governed station slices · {result.sampling.effectiveInterval.toLocaleString()} {result.horizontalUnit} maximum regular interval</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={assemble} disabled={pending}>{pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}Recalculate</Button>
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-2">
        {result.surfaces.map((surface) => (
          <article key={surface.surface} className="rounded-lg border border-border bg-background/25 p-3">
            <div className="flex items-start justify-between gap-2">
              <div><h4 className="text-xs font-semibold capitalize">{humanizeStatus(surface.surface)} surface</h4><p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{station(surface.stationStart)} – {station(surface.stationEnd)}</p></div>
              <Badge variant="outline" className={`text-[9px] ${statusClass(surface.status)}`}>{humanizeStatus(surface.status)}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-[9px]">
              <div><dt className="text-muted-foreground">Sections</dt><dd className="mt-0.5 font-mono text-xs font-semibold">{surface.sectionCount}</dd></div>
              <div><dt className="text-muted-foreground">Points</dt><dd className="mt-0.5 font-mono text-xs font-semibold">{surface.pointCount}</dd></div>
              <div><dt className="text-muted-foreground">Panels</dt><dd className="mt-0.5 font-mono text-xs font-semibold">{surface.panelCount}</dd></div>
              <div><dt className="text-muted-foreground">Gaps</dt><dd className={`mt-0.5 font-mono text-xs font-semibold ${surface.gaps.length ? "text-warning-foreground" : "text-success-foreground"}`}>{surface.gaps.length}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      {workspace && quantityResult && (
        <section className="rounded-xl border border-orange-500/35 bg-orange-500/5 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><Calculator className="size-4 text-orange-300" aria-hidden="true" /><h3 className="text-sm font-semibold">Draft quantity register</h3></div>
              <p className="mt-1 text-[10px] text-muted-foreground">{quantityResult.comparisons.reduce((sum, comparison) => sum + comparison.intervals.length, 0)} governed intervals · {quantityResult.draftQuantities.length} draft results</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-[9px] text-warning-foreground">Estimator review required</Badge>
              <Badge variant="outline" className={`text-[9px] ${workspace.boundary.status === "ready" ? "border-success/35 bg-success/10 text-success-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground"}`}>{humanizeStatus(workspace.boundary.status)}</Badge>
            </div>
          </div>
          {workspace.boundary.reason && <p className="mt-2 rounded-md border border-warning/30 bg-warning/8 px-2.5 py-2 text-[10px] text-warning-foreground">{workspace.boundary.reason}</p>}
          {quantityResult.draftQuantities.length ? (
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[980px] text-left text-[10px]">
                <thead className="bg-muted/25 text-muted-foreground"><tr><th className="px-3 py-2">Draft quantity</th><th className="px-3 py-2">Basis</th><th className="px-3 py-2 text-right">Quantity</th><th className="px-3 py-2 text-right">Confidence</th><th className="px-3 py-2">Review</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-border">{quantityResult.draftQuantities.map((row) => {
                  const publicationTarget = row.publication ? workspace.boundary.targets.find((target) => target.costCodeId === row.publication?.costCodeId) : undefined;
                  const reviewing = reviewPending === row.id;
                  return <tr key={row.id} className="bg-background/25">
                    <td className="px-3 py-2"><div className="font-semibold">{row.label}</div><div className="mt-0.5 text-[9px] capitalize text-muted-foreground">{humanizeStatus(row.calculationType)}</div></td>
                    <td className="max-w-[280px] px-3 py-2 text-muted-foreground"><div className="line-clamp-2">{row.method}</div><div className="mt-1 font-mono text-[9px]">{row.inputEntityIds.length} controls · {row.provenanceIds.length} citations</div></td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{quantity(row.value, row.unit)}</td>
                    <td className="px-3 py-2 text-right"><div className="font-mono">{row.confidence}%</div><div className={`mt-1 text-[9px] ${row.engineeringStatus === "verified" ? "text-success-foreground" : "text-warning-foreground"}`}>{humanizeStatus(row.engineeringStatus)}</div></td>
                    <td className="px-3 py-2">{row.publication
                      ? <div className="text-success-foreground"><Check className="mr-1 inline size-3" aria-hidden="true" />Proposed to {publicationTarget ? publicationTarget.code : "estimate"}</div>
                      : row.review
                        ? <div><Badge variant="outline" className={`text-[9px] ${row.review.action === "accept" ? "border-success/35 bg-success/10 text-success-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground"}`}>{humanizeStatus(row.review.action)}</Badge><div className="mt-1 text-[9px] text-muted-foreground">{row.review.reviewerName}</div></div>
                        : <Badge variant="outline" className="border-warning/40 bg-warning/10 text-[9px] text-warning-foreground">Draft</Badge>}
                    </td>
                    <td className="px-3 py-2"><div className="flex justify-end gap-1.5">
                      {!row.publication && row.review?.action !== "accept" && <Button type="button" size="sm" className="h-7 px-2 text-[10px]" disabled={reviewing || workspace.boundary.status !== "ready" || row.engineeringStatus !== "verified"} onClick={() => reviewDraft(row, "accept")}>{reviewing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}Accept</Button>}
                      {!row.publication && row.review?.action !== "accept" && <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={reviewing} onClick={() => reviewDraft(row, "defer")}><Clock3 aria-hidden="true" />Defer</Button>}
                      {!row.publication && row.review?.action === "accept" && <Button type="button" size="sm" className="h-7 px-2 text-[10px]" disabled={workspace.boundary.status !== "ready"} onClick={() => beginPublication(row)}><Send aria-hidden="true" />Send to estimate</Button>}
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          ) : <p className="mt-3 rounded-lg border border-warning/35 bg-warning/8 p-3 text-xs text-warning-foreground">No draft quantity can be calculated until the required surfaces share governed station spans and exact offsets.</p>}
          <p className="mt-2 text-[9px] text-muted-foreground">{workspace.boundary.reviewedCount} reviewed · {workspace.boundary.acceptedCount} accepted · {workspace.boundary.publishedCount} proposed to the estimate. Acceptance never changes owner quantities or pricing.</p>
          {error && <p role="alert" className="mt-2 text-xs text-danger-foreground">{error}</p>}
        </section>
      )}

      <Dialog open={publicationOpen} onOpenChange={setPublicationOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Send reviewed quantity to estimate</DialogTitle>
            <DialogDescription>Map this accepted 4P draft to one current estimate cost code. Stage 4K creates a new proposed quantity with immutable 4P review lineage; owner quantities and pricing remain unchanged.</DialogDescription>
          </DialogHeader>
          {selectedDraft && <div className="rounded-lg border border-border bg-muted/15 p-3"><div className="text-sm font-semibold">{selectedDraft.label}</div><div className="mt-1 font-mono text-lg font-semibold">{quantity(selectedDraft.value, selectedDraft.unit)}</div><p className="mt-2 text-xs text-muted-foreground">{selectedDraft.formula}</p></div>}
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-semibold" htmlFor="surface-quantity-cost-code">Estimate cost code</label><Select value={costCodeId} onValueChange={setCostCodeId}><SelectTrigger id="surface-quantity-cost-code"><SelectValue placeholder="Select the receiving cost code" /></SelectTrigger><SelectContent>{workspace?.boundary.targets.map((target) => <SelectItem key={target.costCodeId} value={target.costCodeId}>{target.code} · {target.description} · {target.productionUnit}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1 block text-xs font-semibold" htmlFor="surface-quantity-use">Quantity use</label><Select value={quantityUse} onValueChange={(value) => setQuantityUse(value as "comparative" | "production")}><SelectTrigger id="surface-quantity-use"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="comparative">Comparative — check against the estimate</SelectItem><SelectItem value="production">Production — drive resource calculations after approval</SelectItem></SelectContent></Select></div>
            {quantityUse === "production" && selectedDraft && selectedTarget && selectedTarget.productionUnit.trim().toUpperCase() !== selectedDraft.unit && <p role="alert" className="text-xs text-danger-foreground">Production unit mismatch: this result is {selectedDraft.unit}, while the cost code uses {selectedTarget.productionUnit}. Choose a matching cost code or send it as comparative.</p>}
            {error && <p role="alert" className="text-xs text-danger-foreground">{error}</p>}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setPublicationOpen(false)} disabled={publicationPending}>Cancel</Button><Button type="button" onClick={publishDraft} disabled={publicationPending || !selectedDraft || !costCodeId || (quantityUse === "production" && Boolean(selectedTarget) && selectedTarget?.productionUnit.trim().toUpperCase() !== selectedDraft?.unit)}>{publicationPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}{publicationPending ? "Sending" : "Create proposed quantity"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {quantityResult && quantityResult.comparisons.length > 0 && (
        <section className="grid gap-2 lg:grid-cols-3">
          {quantityResult.comparisons.map((comparison) => <article key={comparison.id} className="rounded-lg border border-border bg-background/25 p-3 text-[10px]"><div className="flex items-start justify-between gap-2"><div><h3 className="text-xs font-semibold capitalize">{humanizeStatus(comparison.comparison)}</h3><p className="mt-0.5 text-muted-foreground capitalize">{humanizeStatus(comparison.baseSurface)} to {humanizeStatus(comparison.targetSurface)}</p></div><Badge variant="outline" className={`text-[9px] ${statusClass(comparison.status)}`}>{humanizeStatus(comparison.status)}</Badge></div><dl className="mt-3 grid grid-cols-3 gap-2"><div><dt className="text-muted-foreground">Sections</dt><dd className="mt-0.5 font-mono font-semibold">{comparison.sections.length}</dd></div><div><dt className="text-muted-foreground">Intervals</dt><dd className="mt-0.5 font-mono font-semibold">{comparison.intervals.length}</dd></div><div><dt className="text-muted-foreground">Gaps</dt><dd className="mt-0.5 font-mono font-semibold">{comparison.gaps.length}</dd></div></dl><div className="mt-3 border-t border-border pt-2"><div className="flex justify-between gap-2"><span className="text-muted-foreground">Positive volume</span><span className="font-mono font-semibold">{quantity(comparison.positiveVolume, comparison.volumeUnit)}</span></div><div className="mt-1 flex justify-between gap-2"><span className="text-muted-foreground">Negative volume</span><span className="font-mono font-semibold">{quantity(comparison.negativeVolume, comparison.volumeUnit)}</span></div></div></article>)}
        </section>
      )}

      {(totalGaps > 0 || unresolvedControls.length > 0) && (
        <section className="rounded-xl border border-warning/35 bg-warning/8 p-3">
          <div className="flex items-center gap-2"><TriangleAlert className="size-4 text-warning-foreground" aria-hidden="true" /><h3 className="text-xs font-semibold">Engineering controls requiring review</h3></div>
          {visibleGaps.length > 0 && <div className="mt-3 space-y-1.5">{visibleGaps.map((gap) => <div key={gap.id} className="rounded-md border border-border bg-background/30 px-2.5 py-2 text-[10px]"><div className="font-semibold capitalize">{humanizeStatus(gap.surface)} · {gap.printedStationStart} – {gap.printedStationEnd}</div><div className="mt-0.5 text-muted-foreground">{gap.message}</div></div>)}</div>}
          {quantityGaps.length > 0 && <div className="mt-3 space-y-1.5">{quantityGaps.slice(0, 6).map((gap) => <div key={gap.id} className="rounded-md border border-border bg-background/30 px-2.5 py-2 text-[10px]"><div className="font-semibold capitalize">{humanizeStatus(gap.comparison)} comparison</div><div className="mt-0.5 text-muted-foreground">{gap.message}</div></div>)}</div>}
          {totalGaps > visibleGaps.length + Math.min(quantityGaps.length, 6) && <p className="mt-2 text-[10px] text-muted-foreground">{totalGaps - visibleGaps.length - Math.min(quantityGaps.length, 6)} additional gaps are retained in the governed result.</p>}
          {unresolvedControls.length > 0 && <ul className="mt-3 space-y-1 border-l-2 border-warning/40 pl-2 text-[10px] leading-4 text-muted-foreground">{unresolvedControls.slice(0, 8).map((control) => <li key={control}>{control}</li>)}</ul>}
        </section>
      )}

      <section className="rounded-lg border border-border bg-muted/10 p-3 text-[10px] leading-4 text-muted-foreground">
        <div className="font-semibold text-foreground">Engineering boundary</div>
        <ul className="mt-1 space-y-1">{(quantityResult?.limitations || result.limitations).map((limitation) => <li key={limitation}>• {limitation}</li>)}</ul>
        <div className="mt-2 font-mono text-[9px]">Solver {quantityResult?.solver || result.solver} · Fingerprint {quantityResult?.fingerprint || result.fingerprint}</div>
      </section>
    </div>
  );
}
