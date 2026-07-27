"use client";

import type {
  HeliosMeasurementType,
  HeliosPlanSetIntelligence,
  HeliosTakeoffReviewInput,
  HeliosTakeoffWorkspace,
  HeliosCivilGeometryReviewInput,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@opsslate/suite-ui/dialog";
import { Input } from "@opsslate/suite-ui/input";
import { Label } from "@opsslate/suite-ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@opsslate/suite-ui/select";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { useToast } from "@opsslate/suite-ui/toast";
import { AlertTriangle, Calculator, Check, ChevronDown, ClipboardCheck, GitBranch, LoaderCircle, Plus, Ruler, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function readable(value: string) {
  return value.replaceAll("_", " ");
}

function amount(value: number, unit: string) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit}`;
}

function variance(value?: number) {
  if (value === undefined) return "Not comparable";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function QuantityIntelligencePanel({
  projectId,
  planSet,
  workspace,
}: {
  projectId: string;
  planSet?: HeliosPlanSetIntelligence;
  workspace: HeliosTakeoffWorkspace | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [measurementType, setMeasurementType] = useState<HeliosMeasurementType>("count");
  const [sourceSelection, setSourceSelection] = useState("");

  if (!planSet || planSet.status === "not_applicable_to_current_basis") return null;

  async function act(input: HeliosTakeoffReviewInput, success: string) {
    const key = `${input.action}:${input.measurementId || input.quantityId || "new"}`;
    setSaving(key);
    try {
      const response = await fetch(`/api/projects/${projectId}/takeoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Quantity-intelligence action failed.");
      toast(success, "success");
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Quantity-intelligence action failed.", "error");
    } finally {
      setSaving(undefined);
    }
  }

  async function actGeometry(input: HeliosCivilGeometryReviewInput, success: string) {
    const key = `${input.action}:${input.recordId || "run"}`;
    setSaving(key);
    try {
      const response = await fetch(`/api/projects/${projectId}/civil-geometry`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Civil geometry action failed.");
      toast(success, "success"); router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Civil geometry action failed.", "error");
    } finally { setSaving(undefined); }
  }

  function createMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const source = String(data.get("source") || "");
    const [sourceKind, sourceId, sourceViewKey] = source.split("::");
    const geometryRecord = sourceKind === "geometry" ? workspace?.geometry?.records.find((row) => row.id === sourceId) : undefined;
    const pageId = geometryRecord?.pageId || sourceId;
    const viewKey = geometryRecord?.viewKey || sourceViewKey;
    const calibration = planSet?.calibrations.find((row) => row.pageId === pageId && row.viewKey === viewKey && row.status === "approved");
    const multiplier = Number(data.get("multiplier") || 1);
    const factorLabel = String(data.get("factorLabel") || "Adjustment factor").trim();
    void act({
      action: "create_measurement",
      measurement: {
        costCodeId: String(data.get("costCodeId") || ""),
        pageId,
        viewKey,
        calibrationId: geometryRecord || measurementType === "count" ? undefined : calibration?.id,
        geometryRecordIds: geometryRecord ? [geometryRecord.id] : [],
        sourceBasis: geometryRecord
          ? geometryRecord.authority === "calibrated_scale_fallback" ? "calibrated_scale_fallback" : geometryRecord.authority === "dimensioned_geometry" ? "dimensioned_geometry" : "coordinate_geometry"
          : measurementType === "count" ? "dimensioned_geometry" : "calibrated_scale_fallback",
        measurementType,
        label: String(data.get("label") || ""),
        geometryKind: measurementType === "count" ? "recognized_objects" : "estimator_measurement",
        geometry: [],
        objectReferences: String(data.get("objectReferences") || "").split(/[\n,]+/).map((row) => row.trim()).filter(Boolean),
        rawValue: Number(data.get("rawValue")),
        rawUnit: String(data.get("rawUnit") || ""),
        outputUnit: String(data.get("outputUnit") || ""),
        factors: multiplier === 1 ? [] : [{ label: factorLabel, value: multiplier, unit: "factor" }],
        includedScope: String(data.get("includedScope") || ""),
        excludedScope: String(data.get("excludedScope") || ""),
        assumptions: String(data.get("assumptions") || "").split("\n").map((row) => row.trim()).filter(Boolean),
        confidence: Number(data.get("confidence") || 100),
      },
    }, "Governed measurement recorded for review.");
  }

  const sourceViews = planSet.pages.flatMap((page) => page.views
    .filter((view) => view.measurable)
    .map((view) => ({
      page,
      view,
      calibration: planSet.calibrations.find((row) => row.pageId === page.id && row.viewKey === view.viewKey && row.status === "approved"),
    })))
    .filter((row) => measurementType === "count" || Boolean(row.calibration));
  const geometrySources = (workspace?.geometry?.records || []).filter((row) => row.status === "accepted" && (
    (measurementType === "count" && row.geometryType === "invert_network") ||
    (measurementType === "length" && ["horizontal_alignment", "vertical_alignment", "invert_network"].includes(row.geometryType)) ||
    (measurementType === "area" && row.geometryType === "material_section") ||
    (measurementType === "volume" && ["cross_section", "material_section"].includes(row.geometryType))
  ));
  const usesCivilGeometry = sourceSelection.startsWith("geometry::");

  if (!workspace) {
    return (
      <Card className="border-border bg-card/60 py-0">
        <CardContent className="flex items-start gap-3 p-4">
          <Calculator className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          <div><h2 className="font-semibold">Quantity Intelligence</h2><p className="mt-1 text-sm text-muted-foreground">Complete plan reconstruction and build the estimate before governed plan takeoff begins. This does not block estimating.</p></div>
        </CardContent>
      </Card>
    );
  }

  const activeMeasurements = workspace.measurements.filter((row) => !["rejected", "superseded"].includes(row.status));
  const activeQuantities = workspace.quantities.filter((row) => row.status !== "rejected" && row.status !== "superseded");

  return (
    <Card className="border-orange-500/25 bg-card/75 py-0">
      <CardContent className="p-0">
        <div className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <Calculator className="mt-0.5 size-5 text-orange-300" aria-hidden="true" />
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Quantity Intelligence · Revision {workspace.packageRevision}</h2><Badge variant={workspace.status === "ready" ? "secondary" : "outline"}>{readable(workspace.status)}</Badge></div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Deterministic plan measurements stay separate from owner quantities and pricing. Every result retains its sheet, view, calibration, formula, assumptions, and review state.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
          {(!workspace.geometry || workspace.geometry.status === "failed") && <Button disabled={Boolean(saving)} onClick={() => void actGeometry({ action: "request_reconstruction" }, "Civil geometry reconstruction queued.")}>{saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <GitBranch aria-hidden="true" />}{workspace.geometry?.status === "failed" ? "Retry civil geometry" : "Build civil geometry"}</Button>}
          {workspace.status === "ready" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus aria-hidden="true" />Add measurement</Button></DialogTrigger>
              <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader><DialogTitle>Add governed plan measurement</DialogTitle><DialogDescription>Record a calibrated estimator measurement or exact object count. Helios calculates only from the values and factors shown here.</DialogDescription></DialogHeader>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={createMeasurement}>
                  <div className="space-y-2"><Label htmlFor="takeoff-type">Measurement type</Label><Select value={measurementType} onValueChange={(value) => { setMeasurementType(value as HeliosMeasurementType); setSourceSelection(""); }}><SelectTrigger id="takeoff-type"><SelectValue /></SelectTrigger><SelectContent>{["count", "length", "area", "volume"].map((value) => <SelectItem key={value} value={value}>{readable(value)}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="takeoff-code">Estimate cost code</Label><Select name="costCodeId" required><SelectTrigger id="takeoff-code"><SelectValue placeholder="Select WBS cost code" /></SelectTrigger><SelectContent>{workspace.targets.map((target) => <SelectItem key={target.costCodeId} value={target.costCodeId}>{target.sectionName} · {target.payItemNumber} · {target.costCode}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="takeoff-source">Accepted geometry or plan view</Label><Select name="source" value={sourceSelection} onValueChange={setSourceSelection} required><SelectTrigger id="takeoff-source"><SelectValue placeholder={geometrySources.length || sourceViews.length ? "Select exact source basis" : "No eligible geometry or calibrated views"} /></SelectTrigger><SelectContent>{geometrySources.map((record) => <SelectItem key={`geometry:${record.id}`} value={`geometry::${record.id}`}>{record.sheetNumber} · {record.alignmentName || readable(record.geometryType)} · {readable(record.authority)}</SelectItem>)}{sourceViews.map(({ page, view, calibration }) => <SelectItem key={`view:${page.id}:${view.viewKey}`} value={`view::${page.id}::${view.viewKey}`}>{page.sheetNumber || `PDF ${page.physicalPageNumber}`} · {view.label}{calibration ? ` · scale fallback ${calibration.scale}` : " · count only"}</SelectItem>)}</SelectContent></Select>{measurementType !== "count" && <p className="text-xs text-muted-foreground">Accepted coordinate geometry appears first. Approved scale views remain available as fallback.</p>}</div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="takeoff-label">Measurement label</Label><Input id="takeoff-label" name="label" placeholder="North culvert run, catch basins, clearing limit…" required /></div>
                  {usesCivilGeometry ? <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-100 sm:col-span-2"><input type="hidden" name="rawValue" value="1" /><input type="hidden" name="rawUnit" value="FT" /><input type="hidden" name="outputUnit" value="FT" /><input type="hidden" name="multiplier" value="1" />Helios will calculate the value server-side from the accepted coordinates, profile, cross sections, inverts, or layer geometry. No paper-scale value is required.</div> : <><div className="space-y-2"><Label htmlFor="takeoff-value">Measured value</Label><Input id="takeoff-value" name="rawValue" type="number" min="0.000001" step="any" required /></div><div className="grid grid-cols-2 gap-2"><div className="space-y-2"><Label htmlFor="takeoff-raw-unit">Measured unit</Label><Input id="takeoff-raw-unit" name="rawUnit" placeholder="EA, LF, SY, CY" required /></div><div className="space-y-2"><Label htmlFor="takeoff-output-unit">Output unit</Label><Input id="takeoff-output-unit" name="outputUnit" placeholder="EA, LF, SY, CY" required /></div></div><div className="space-y-2"><Label htmlFor="takeoff-multiplier">Explicit factor</Label><Input id="takeoff-multiplier" name="multiplier" type="number" min="0.000001" step="any" defaultValue="1" required /></div><div className="space-y-2"><Label htmlFor="takeoff-factor-label">Factor label</Label><Input id="takeoff-factor-label" name="factorLabel" defaultValue="Adjustment factor" /></div></>}
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="takeoff-objects">Object IDs or geometry references</Label><Textarea id="takeoff-objects" name="objectReferences" placeholder="CB-1, CB-2, Detail 3/C-501, Sta. 10+00–14+25" /></div>
                  <div className="space-y-2"><Label htmlFor="takeoff-included">Included scope</Label><Textarea id="takeoff-included" name="includedScope" placeholder="State exactly what was measured" required /></div>
                  <div className="space-y-2"><Label htmlFor="takeoff-excluded">Excluded scope</Label><Textarea id="takeoff-excluded" name="excludedScope" placeholder="Existing work, alternates, end sections…" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="takeoff-assumptions">Assumptions, one per line</Label><Textarea id="takeoff-assumptions" name="assumptions" /></div>
                  <div className="space-y-2"><Label htmlFor="takeoff-confidence">Confidence %</Label><Input id="takeoff-confidence" name="confidence" type="number" min="0" max="100" defaultValue="100" required /></div>
                  <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={Boolean(saving) || (sourceViews.length === 0 && geometrySources.length === 0)}>{saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Ruler aria-hidden="true" />}Record measurement</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          </div>
        </div>

        <div className="grid border-y border-border sm:grid-cols-2 xl:grid-cols-4">
          {[["Measurements", workspace.measurementCount], ["Accepted", workspace.acceptedMeasurementCount], ["Quantity proposals", workspace.proposedQuantityCount], ["Sent to estimate", workspace.estimateQuantityCount]].map(([label, value]) => <div key={label} className="border-b border-border px-4 py-3 last:border-b-0 sm:border-r xl:border-b-0"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div><div className="mt-1 font-mono text-xl font-semibold">{value}</div></div>)}
        </div>

        {workspace.blockedReason && <div className="m-4 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{workspace.blockedReason}</div>}

        <details open className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="flex items-center gap-2"><GitBranch className="size-4 text-orange-300" aria-hidden="true" />Civil geometry model</span><span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{workspace.geometry ? `${workspace.geometry.recordCount} records · ${readable(workspace.geometry.status)}` : "Not built"}<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span></summary>
          <div className="divide-y divide-border border-t border-border">
            {!workspace.geometry ? <div className="p-4 text-sm text-muted-foreground">Build the coordinate model from horizontal control, profile, cross-section, invert, and material-section sheets. Approved coordinate geometry becomes the primary takeoff basis; scale remains fallback.</div> : workspace.geometry.records.length ? workspace.geometry.records.filter((row) => row.status !== "rejected" && row.status !== "superseded").map((record) => {
              const pointCount = record.horizontalPoints.length + record.horizontalSegments.length + record.stationEquations.length + record.verticalPoints.length + record.crossSectionPoints.length + record.invertPoints.length + record.materialLayers.length;
              return <div key={record.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_150px_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{record.alignmentName || readable(record.geometryType)}</span><Badge variant="outline" className="capitalize">{readable(record.geometryType)}</Badge><Badge variant={record.authority === "calibrated_scale_fallback" ? "destructive" : "secondary"} className="capitalize">{readable(record.authority)}</Badge><Badge variant={record.status === "accepted" ? "secondary" : "outline"} className="capitalize">{record.status}</Badge></div><div className="mt-1 text-sm text-muted-foreground">{record.sheetNumber} · {record.viewLabel} · {record.sourceLocator}</div>{record.unresolvedIssues.length > 0 && <div className="mt-1 text-xs text-amber-200">{record.unresolvedIssues[0]}</div>}</div><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Explicit geometry</div><div className="font-mono font-semibold">{pointCount} records</div><div className="text-xs text-muted-foreground">{record.confidence}% confidence</div></div>{record.status === "proposed" ? <div className="flex gap-2"><Button size="sm" disabled={Boolean(saving)} onClick={() => void actGeometry({ action: "accept_geometry", recordId: record.id }, "Civil geometry accepted for deterministic takeoff.")}><Check aria-hidden="true" />Accept</Button><Button size="sm" variant="outline" disabled={Boolean(saving)} onClick={() => void actGeometry({ action: "reject_geometry", recordId: record.id }, "Civil geometry rejected.")}><X aria-hidden="true" />Reject</Button></div> : <div className="text-xs text-muted-foreground">Reviewed by {record.reviewedByName}</div>}</div>;
            }) : <div className="p-4 text-sm text-muted-foreground">{["queued", "processing"].includes(workspace.geometry.status) ? "Civil geometry reconstruction is processing." : "No explicit coordinate, profile, cross-section, invert, or material geometry was found. Calibrated scale remains available as fallback."}</div>}
          </div>
        </details>

        <details open className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="flex items-center gap-2"><Ruler className="size-4 text-orange-300" aria-hidden="true" />Measurement register</span><span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{activeMeasurements.length} current<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span></summary>
          <div className="divide-y divide-border border-t border-border">
            {activeMeasurements.length ? activeMeasurements.map((measurement) => {
              const target = workspace.targets.find((row) => row.costCodeId === measurement.costCodeId);
              return <div key={measurement.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{measurement.label}</span><Badge variant="outline" className="capitalize">{readable(measurement.measurementType)}</Badge><Badge variant={measurement.status === "accepted" ? "secondary" : "outline"} className="capitalize">{measurement.status}</Badge></div><div className="mt-1 text-sm text-muted-foreground">{target?.costCode} · {measurement.sheetNumber} · {measurement.viewLabel}{measurement.calibrationLabel ? ` · ${measurement.calibrationLabel}` : ""}</div><div className="mt-2 font-mono text-xs text-orange-200">{measurement.formula}</div><div className="mt-1 text-xs text-muted-foreground">Included: {measurement.includedScope || "Not stated"}{measurement.excludedScope ? ` · Excluded: ${measurement.excludedScope}` : ""}</div></div><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Calculated</div><div className="font-mono text-lg font-semibold">{amount(measurement.calculatedValue, measurement.outputUnit)}</div><div className="text-xs text-muted-foreground">{measurement.confidence}% confidence</div></div>{measurement.status === "proposed" ? <div className="flex gap-2"><Button size="sm" disabled={Boolean(saving)} onClick={() => void act({ action: "accept_measurement", measurementId: measurement.id }, "Measurement accepted and quantity proposal rebuilt.")}><Check aria-hidden="true" />Accept</Button><Button size="sm" variant="outline" disabled={Boolean(saving)} onClick={() => void act({ action: "reject_measurement", measurementId: measurement.id }, "Measurement rejected.")}><X aria-hidden="true" />Reject</Button></div> : <div className="text-xs text-muted-foreground">Reviewed by {measurement.reviewedByName}</div>}</div>;
            }) : <p className="p-4 text-sm text-muted-foreground">No governed measurements have been recorded for this revision.</p>}
          </div>
        </details>

        <details open className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="flex items-center gap-2"><ClipboardCheck className="size-4 text-orange-300" aria-hidden="true" />Quantity reconciliation</span><span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{activeQuantities.length} current<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span></summary>
          <div className="divide-y divide-border border-t border-border">
            {activeQuantities.length ? activeQuantities.map((quantity) => {
              const target = workspace.targets.find((row) => row.costCodeId === quantity.costCodeId);
              return <div key={quantity.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_150px_150px_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{target?.costCode} · {target?.costCodeDescription}</span><Badge variant={quantity.reconciliationStatus === "variance" ? "destructive" : "secondary"} className="capitalize">{readable(quantity.reconciliationStatus)}</Badge><Badge variant="outline" className="capitalize">{readable(quantity.status)}</Badge></div><div className="mt-1 text-sm text-muted-foreground">{quantity.measurementIds.length} accepted measurement{quantity.measurementIds.length === 1 ? "" : "s"} · {target?.payItemNumber} {target?.payItemDescription}</div></div><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Helios measured</div><div className="font-mono font-semibold">{amount(quantity.value, quantity.unit)}</div></div><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Owner / variance</div><div className="font-mono font-semibold">{quantity.ownerQuantity === undefined ? "Not supplied" : amount(quantity.ownerQuantity, quantity.ownerUnit || quantity.unit)}</div><div className={quantity.variancePercent !== undefined && Math.abs(quantity.variancePercent) > 2 ? "text-xs text-amber-200" : "text-xs text-muted-foreground"}>{variance(quantity.variancePercent)}</div></div>{quantity.status === "proposed" ? <div className="flex flex-wrap gap-2"><Button size="sm" disabled={Boolean(saving)} onClick={() => void act({ action: "propose_quantity_to_estimate", quantityId: quantity.id, quantityUse: "production" }, "Plan quantity sent to the estimate for one-click production review.")}><Send aria-hidden="true" />Use for production</Button><Button size="sm" variant="outline" disabled={Boolean(saving)} onClick={() => void act({ action: "propose_quantity_to_estimate", quantityId: quantity.id, quantityUse: "comparative" }, "Plan quantity sent to the estimate as a comparison.")}>Compare only</Button></div> : <div className="text-xs text-muted-foreground">Connected to estimate quantity</div>}</div>;
            }) : <p className="p-4 text-sm text-muted-foreground">Accept a measurement to create a deterministic quantity proposal.</p>}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
