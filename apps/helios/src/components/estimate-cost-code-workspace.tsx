"use client";

import {
  HELIOS_ESTIMATE_RATE_STATUSES,
  HELIOS_ESTIMATE_RESOURCE_CLASSES,
  HELIOS_ESTIMATE_SCOPE_OWNERSHIP,
  HELIOS_QUANTITY_RECORD_TYPES,
  type HeliosEstimateBuildInput,
  type HeliosEstimateAllocation,
  type HeliosEstimateCostCode,
  type HeliosEstimateQuantityRecord,
  type HeliosEstimateResource,
  type HeliosEstimateScopeOwnership,
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
  DialogTrigger,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { useToast } from "@opsslate/suite-ui/toast";
import { Calculator, Check, Pencil, Plus, ShieldCheck, Split } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function money(value?: number) {
  if (value === undefined) return "Unpriced";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function dollarsToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Math.round(Number(value) * 100);
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Number(value);
}

function percentageToBasisPoints(value: FormDataEntryValue | null) {
  return Math.round((optionalNumber(value) || 0) * 100);
}

export function EstimateCostCodeWorkspace({
  projectId,
  estimateId,
  payItemId,
  payItemNumber,
  code,
  ownerItems = [],
}: {
  projectId: string;
  estimateId: string;
  payItemId: string;
  payItemNumber: string;
  code?: HeliosEstimateCostCode;
  ownerItems?: Array<{ id: string; officialItemNumber: string; description: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<HeliosEstimateResource | "new" | null>(null);
  const [rejecting, setRejecting] = useState<{ type: "cost_code" | "resource"; id: string; label: string } | null>(null);

  async function mutate(input: HeliosEstimateBuildInput, success: string) {
    setSaving(input.action + (input.resourceId || input.costCodeId || "new"));
    try {
      const response = await fetch(`/api/projects/${projectId}/estimate/${estimateId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Estimate build change could not be saved.");
      toast(success);
      setEditingResource(null);
      setRejecting(null);
      if (!code && input.action === "create_cost_code") setOpen(false);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Estimate build change could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  function saveCostCode(form: FormData) {
    const costCode = {
      code: String(form.get("code") || ""),
      description: String(form.get("description") || ""),
      scopeOwnership: String(form.get("scopeOwnership")) as HeliosEstimateScopeOwnership,
      productionQuantity: undefined,
      productionUnit: String(form.get("productionUnit") || ""),
    };
    return mutate(
      code
        ? { action: "update_cost_code", costCodeId: code.id, costCode }
        : { action: "create_cost_code", payItemId, costCode },
      code ? "Cost code updated and recorded in history." : "Cost code added to the owner item.",
    );
  }

  function saveResource(form: FormData) {
    const current = editingResource === "new" ? undefined : editingResource || undefined;
    const resource: NonNullable<HeliosEstimateBuildInput["resource"]> = {
      resourceClass: String(form.get("resourceClass")) as HeliosEstimateResource["resourceClass"],
      description: String(form.get("resourceDescription") || ""),
      quantity: optionalNumber(form.get("quantity")),
      unit: String(form.get("unit") || ""),
      wasteBasisPoints: percentageToBasisPoints(form.get("wastePercent")),
      durationHours: optionalNumber(form.get("durationHours")),
      taxStatus: String(form.get("taxStatus")) as HeliosEstimateResource["taxStatus"],
      rateStatus: String(form.get("rateStatus")) as HeliosEstimateResource["rateStatus"],
      rateCents: dollarsToCents(form.get("rateDollars")),
      priceSourceLabel: String(form.get("priceSourceLabel") || "") || undefined,
      priceSourceReference: String(form.get("priceSourceReference") || "") || undefined,
      effectiveDate: String(form.get("effectiveDate") || "") || undefined,
      crewOrAssembly: String(form.get("crewOrAssembly") || "") || undefined,
      escalationBasisPoints: percentageToBasisPoints(form.get("escalationPercent")),
      overrideRateCents: dollarsToCents(form.get("overrideRateDollars")),
      overrideReason: String(form.get("overrideReason") || "") || undefined,
    };
    return mutate(
      current
        ? { action: "update_resource", resourceId: current.id, resource }
        : { action: "create_resource", costCodeId: code!.id, resource },
      current ? "Resource updated and recorded in history." : "Resource added to the cost code.",
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setEditingResource(null); setRejecting(null); } }}>
      <DialogTrigger asChild>
        <Button variant={code ? "outline" : "secondary"} size="sm">
          {code ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {code ? "Open worksheet" : "Add cost code"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[calc(100%-2rem)] xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{code ? `${code.code} · ${code.description}` : `Add cost code to ${payItemNumber}`}</DialogTitle>
          <DialogDescription>
            Focused operational build-up. Scope, pricing source, overrides, and reviewer decisions remain traceable.
          </DialogDescription>
        </DialogHeader>

        <form action={saveCostCode} className="grid gap-4 rounded-lg border bg-card/50 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2"><Label htmlFor={`code-${code?.id || payItemId}`}>NYSDOT / cost code</Label><Input id={`code-${code?.id || payItemId}`} name="code" defaultValue={code?.code} required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor={`description-${code?.id || payItemId}`}>Operation description</Label><Input id={`description-${code?.id || payItemId}`} name="description" defaultValue={code?.description} required /></div>
          <div className="space-y-2"><Label>Scope ownership</Label><Select name="scopeOwnership" defaultValue={code?.scopeOwnership || "undecided"}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_ESTIMATE_SCOPE_OWNERSHIP.filter((value) => value !== "unassigned").map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor={`production-unit-${code?.id || payItemId}`}>Default production unit</Label><Input id={`production-unit-${code?.id || payItemId}`} name="productionUnit" defaultValue={code?.productionUnit || "LS"} readOnly={Boolean(code)} required /><p className="text-xs text-muted-foreground">Existing quantity and unit decisions are controlled in the register below.</p></div>
          <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-5">{code && <Button type="button" variant="destructive" onClick={() => setRejecting({ type: "cost_code", id: code.id, label: code.code })}>Reject cost code</Button>}<Button type="submit" disabled={saving !== null}>{code ? "Save cost code" : "Add cost code"}</Button></div>
        </form>

        {code && <QuantityAllocationPanel code={code} ownerItems={ownerItems} saving={saving !== null} mutate={mutate} />}

        {code && (
          <section className="space-y-3" aria-labelledby={`resources-${code.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 id={`resources-${code.id}`} className="font-semibold">Resource build-up</h3><p className="text-sm text-muted-foreground">Labor, equipment, material, subcontract, trucking, disposal, and other.</p></div>
              <Button size="sm" onClick={() => setEditingResource("new")}><Plus aria-hidden="true" />Add resource</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>Class / resource</TableHead><TableHead>Quantity</TableHead><TableHead>Price source</TableHead><TableHead>Effective rate</TableHead><TableHead className="text-right">Direct cost</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {code.resources.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No resources yet. Add the first resource to build direct cost.</TableCell></TableRow> : code.resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="min-w-56 whitespace-normal"><div className="flex items-center gap-2"><Badge variant="secondary" className="capitalize">{resource.resourceClass}</Badge><Badge variant="outline" className="capitalize">{resource.reviewStatus}</Badge></div><div className="mt-1 font-medium">{resource.description}</div></TableCell>
                      <TableCell>{resource.quantity === undefined ? "Not set" : `${resource.quantity.toLocaleString()} ${resource.unit}`}</TableCell>
                      <TableCell className="min-w-40 whitespace-normal"><div className="capitalize">{resource.rateStatus.replaceAll("_", " ")}</div><div className="text-xs text-muted-foreground">{resource.priceSourceLabel || "No source"}{resource.effectiveDate ? ` · ${resource.effectiveDate}` : ""}</div></TableCell>
                      <TableCell>{money(resource.effectiveRateCents)}{resource.overrideRateCents !== undefined && <div className="text-xs text-orange-300">Override</div>}</TableCell>
                      <TableCell className="text-right font-medium">{money(resource.directCostCents)}</TableCell>
                      <TableCell><div className="flex justify-end gap-2">{resource.reviewStatus === "proposed" && <Button size="sm" onClick={() => mutate({ action: "accept_resource", resourceId: resource.id }, "Resource accepted.")} disabled={saving !== null}><Check aria-hidden="true" />Accept</Button>}<Button variant="outline" size="sm" onClick={() => setEditingResource(resource)}><Pencil aria-hidden="true" />Edit</Button><Button variant="destructive" size="sm" onClick={() => setRejecting({ type: "resource", id: resource.id, label: resource.description })}>Reject</Button></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {code && editingResource && <ResourceForm resource={editingResource === "new" ? undefined : editingResource} saving={saving !== null} onCancel={() => setEditingResource(null)} onSave={saveResource} />}
        {rejecting && <form action={(form) => mutate(rejecting.type === "cost_code" ? { action: "reject_cost_code", costCodeId: rejecting.id, comment: String(form.get("rejectionReason") || "") } : { action: "reject_resource", resourceId: rejecting.id, comment: String(form.get("rejectionReason") || "") }, `${rejecting.type === "cost_code" ? "Cost code" : "Resource"} rejected and recorded in history.`)} className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"><div><h3 className="font-semibold">Reject {rejecting.label}</h3><p className="text-sm text-muted-foreground">A reason is required; the record remains in append-only history.</p></div><div className="space-y-2"><Label htmlFor="rejection-reason">Rejection reason</Label><Textarea id="rejection-reason" name="rejectionReason" required /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={saving !== null}>Confirm rejection</Button></div></form>}
        {code && <div className="rounded-md border border-orange-500/25 bg-orange-500/5 px-4 py-3 text-sm text-muted-foreground"><ShieldCheck className="mr-2 inline size-4 text-orange-300" aria-hidden="true" />Calculated rate and estimator override are stored separately. Overrides require a reason and create a new audit event.</div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuantityAllocationPanel({
  code,
  ownerItems,
  saving,
  mutate,
}: {
  code: HeliosEstimateCostCode;
  ownerItems: Array<{ id: string; officialItemNumber: string; description: string }>;
  saving: boolean;
  mutate: (input: HeliosEstimateBuildInput, success: string) => Promise<void>;
}) {
  const [addingQuantity, setAddingQuantity] = useState(false);
  const [addingAllocation, setAddingAllocation] = useState(false);
  const [allocationType, setAllocationType] = useState<HeliosEstimateAllocation["allocationType"]>("percent");

  function saveQuantity(form: FormData) {
    const quantityType = String(form.get("quantityType")) as HeliosEstimateQuantityRecord["quantityType"];
    return mutate({
      action: "create_quantity",
      costCodeId: code.id,
      quantity: {
        value: optionalNumber(form.get("quantityValue")),
        unit: String(form.get("quantityUnit") || code.productionUnit),
        quantityType,
        sourceLabel: String(form.get("quantitySource") || ""),
        sourceReference: String(form.get("quantityReference") || "") || undefined,
        method: String(form.get("quantityMethod") || ""),
        confidence: Number(form.get("quantityConfidence") || 100),
        use: String(form.get("quantityUse")) as HeliosEstimateQuantityRecord["use"],
      },
    }, "Quantity saved as a reviewed estimator decision.").then(() => setAddingQuantity(false));
  }

  function saveAllocation(form: FormData) {
    const entered = Number(form.get("allocationValue"));
    const controllingValue = allocationType === "percent"
      ? Math.round(entered * 100)
      : allocationType === "amount"
        ? Math.round(entered * 100)
        : entered;
    return mutate({
      action: "create_allocation",
      costCodeId: code.id,
      allocation: {
        targetPayItemId: String(form.get("targetPayItemId")),
        allocationType,
        controllingValue,
      },
    }, "Allocation added; balance checks recalculated.").then(() => setAddingAllocation(false));
  }

  function rejectRecord(type: "quantity" | "allocation", id: string, label: string) {
    const comment = globalThis.prompt(`Why are you rejecting ${label}?`);
    if (!comment?.trim()) return;
    void mutate(
      type === "quantity"
        ? { action: "reject_quantity", quantityId: id, comment }
        : { action: "reject_allocation", allocationId: id, comment },
      `${type === "quantity" ? "Quantity" : "Allocation"} rejected and retained in audit history.`,
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-orange-500/25 bg-orange-500/5 p-4" aria-labelledby={`quantity-allocation-${code.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`quantity-allocation-${code.id}`} className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-orange-300" aria-hidden="true" />Quantity and allocation control</h3>
          <p className="text-sm text-muted-foreground">Production quantities are separate from owner bid quantities. Unknown never means zero.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => mutate({ action: "mark_takeoff_required", costCodeId: code.id }, "Marked Takeoff Required without creating a placeholder quantity.")}>
            Takeoff required
          </Button>
          <Button type="button" size="sm" onClick={() => setAddingQuantity(true)}><Plus aria-hidden="true" />Add quantity</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-background/40">
        <Table>
          <TableHeader><TableRow><TableHead>Use / type</TableHead><TableHead>Quantity</TableHead><TableHead>Source and method</TableHead><TableHead>Confidence</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader>
          <TableBody>
            {(code.quantities || []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No governed quantity record. Add a quantity or mark Takeoff Required.</TableCell></TableRow>
            ) : (code.quantities || []).map((quantityRecord) => (
              <TableRow key={quantityRecord.id}>
                <TableCell><div className="flex flex-wrap gap-1"><Badge variant="secondary" className="capitalize">{quantityRecord.use}</Badge><Badge variant="outline" className="capitalize">{quantityRecord.quantityType.replaceAll("_", " ")}</Badge></div><div className="mt-1 text-xs capitalize text-muted-foreground">{quantityRecord.origin} · {quantityRecord.status.replaceAll("_", " ")}</div></TableCell>
                <TableCell className="font-medium">{quantityRecord.value === undefined ? "Takeoff Required" : `${quantityRecord.value.toLocaleString()} ${quantityRecord.unit}`}</TableCell>
                <TableCell className="min-w-72 whitespace-normal"><div>{quantityRecord.sourceLabel}</div><div className="text-xs text-muted-foreground">{quantityRecord.method}</div></TableCell>
                <TableCell>{quantityRecord.confidence}%</TableCell>
                <TableCell><div className="flex justify-end gap-2">{quantityRecord.reviewStatus === "proposed" && <Button type="button" size="sm" disabled={saving} onClick={() => mutate({ action: "accept_quantity", quantityId: quantityRecord.id }, "Production quantity accepted.")}><Check aria-hidden="true" />Accept</Button>}<Button type="button" size="sm" variant="destructive" disabled={saving} onClick={() => rejectRecord("quantity", quantityRecord.id, quantityRecord.sourceLabel)}>Reject</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {addingQuantity && (
        <form action={saveQuantity} className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2"><Label>Quantity type</Label><Select name="quantityType" defaultValue="estimator_calculated"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_QUANTITY_RECORD_TYPES.filter((value) => value !== "takeoff_required").map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-2"><div className="space-y-2"><Label htmlFor={`quantity-value-${code.id}`}>Quantity</Label><Input id={`quantity-value-${code.id}`} name="quantityValue" type="number" min="0" step="any" required /></div><div className="space-y-2"><Label htmlFor={`quantity-unit-${code.id}`}>Unit</Label><Input id={`quantity-unit-${code.id}`} name="quantityUnit" defaultValue={code.productionUnit} required /></div></div>
          <div className="space-y-2"><Label>Use</Label><Select name="quantityUse" defaultValue="production"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production">Production</SelectItem><SelectItem value="comparative">Comparative</SelectItem><SelectItem value="authoritative">Authoritative</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor={`quantity-confidence-${code.id}`}>Confidence %</Label><Input id={`quantity-confidence-${code.id}`} name="quantityConfidence" type="number" min="0" max="100" defaultValue="100" required /></div>
          <div className="space-y-2 lg:col-span-2"><Label htmlFor={`quantity-source-${code.id}`}>Source</Label><Input id={`quantity-source-${code.id}`} name="quantitySource" placeholder="Estimator takeoff, drawing, vendor schedule" required /></div>
          <div className="space-y-2 lg:col-span-2"><Label htmlFor={`quantity-reference-${code.id}`}>Source reference</Label><Input id={`quantity-reference-${code.id}`} name="quantityReference" placeholder="Sheet, page, detail, quote, or calculation ID" /></div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-4"><Label htmlFor={`quantity-method-${code.id}`}>Calculation / takeoff method</Label><Textarea id={`quantity-method-${code.id}`} name="quantityMethod" placeholder="Explain how the production quantity was established." required /></div>
          <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4"><Button type="button" variant="outline" onClick={() => setAddingQuantity(false)}>Cancel</Button><Button type="submit" disabled={saving}>Save quantity</Button></div>
        </form>
      )}

      <div className="border-t border-orange-500/20 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="flex items-center gap-2 font-semibold"><Split className="size-4 text-orange-300" aria-hidden="true" />Shared-cost allocation</h4><p className="text-sm text-muted-foreground">A shared source is removed from its direct parent rollup until every destination balances.</p></div>
          <Button type="button" size="sm" variant={code.allocationRequired ? "secondary" : "outline"} disabled={saving} onClick={() => mutate({ action: "set_allocation_required", costCodeId: code.id, allocationRequired: !code.allocationRequired }, code.allocationRequired ? "Shared-cost allocation disabled." : "Shared-cost allocation enabled; destinations are now required.")}>{code.allocationRequired ? "Use as direct cost" : "Treat as shared cost"}</Button>
        </div>
        {code.allocationRequired && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2"><Badge variant={code.allocationStatus === "balanced" ? "secondary" : "outline"} className="capitalize">{code.allocationStatus}</Badge><span className="text-sm text-muted-foreground">Source: {code.productionQuantity === undefined ? "Takeoff Required" : `${code.productionQuantity.toLocaleString()} ${code.productionUnit}`} · {money(code.directCostCents)}</span></div>
            {(code.reconciliationIssues || []).length > 0 && <ul className="space-y-1 text-sm text-amber-300">{(code.reconciliationIssues || []).map((issue) => <li key={issue}>• {issue}</li>)}</ul>}
            <div className="overflow-x-auto rounded-md border bg-background/40"><Table><TableHeader><TableRow><TableHead>Destination owner item</TableHead><TableHead>Control</TableHead><TableHead>Quantity</TableHead><TableHead>Percent</TableHead><TableHead>Dollars</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader><TableBody>{(code.allocations || []).length === 0 ? <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Orphan cost: add at least one destination.</TableCell></TableRow> : (code.allocations || []).map((allocation) => { const destination = ownerItems.find((item) => item.id === allocation.targetPayItemId); return <TableRow key={allocation.id}><TableCell className="min-w-64 whitespace-normal"><span className="font-mono text-xs text-orange-300">{destination?.officialItemNumber || "Missing"}</span><div>{destination?.description || "Destination is not current"}</div></TableCell><TableCell className="capitalize">{allocation.allocationType} · {allocation.allocationType === "percent" ? `${allocation.controllingValue / 100}%` : allocation.allocationType === "amount" ? money(allocation.controllingValue) : allocation.controllingValue.toLocaleString()}</TableCell><TableCell>{allocation.quantity?.toLocaleString() ?? "Pending"}</TableCell><TableCell>{allocation.percentBasisPoints === undefined ? "Pending" : `${allocation.percentBasisPoints / 100}%`}</TableCell><TableCell>{money(allocation.amountCents)}</TableCell><TableCell><div className="flex justify-end gap-2">{allocation.reviewStatus === "proposed" && <Button type="button" size="sm" disabled={saving} onClick={() => mutate({ action: "accept_allocation", allocationId: allocation.id }, "Allocation accepted.")}><Check aria-hidden="true" />Accept</Button>}<Button type="button" size="sm" variant="destructive" disabled={saving} onClick={() => rejectRecord("allocation", allocation.id, destination?.officialItemNumber || "allocation")}>Reject</Button></div></TableCell></TableRow>; })}</TableBody></Table></div>
            <div className="flex justify-end"><Button type="button" size="sm" onClick={() => setAddingAllocation(true)}><Plus aria-hidden="true" />Add destination</Button></div>
            {addingAllocation && <form action={saveAllocation} className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-3"><div className="space-y-2"><Label>Destination owner item</Label><Select name="targetPayItemId"><SelectTrigger className="w-full"><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{ownerItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.officialItemNumber} · {item.description}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Controlling method</Label><Select value={allocationType} onValueChange={(value) => setAllocationType(value as HeliosEstimateAllocation["allocationType"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">Percent</SelectItem><SelectItem value="quantity">Quantity</SelectItem><SelectItem value="amount">Dollar amount</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor={`allocation-value-${code.id}`}>{allocationType === "percent" ? "Percent (%)" : allocationType === "amount" ? "Amount ($)" : `Quantity (${code.productionUnit})`}</Label><Input id={`allocation-value-${code.id}`} name="allocationValue" type="number" min="0" step={allocationType === "quantity" ? "any" : "0.01"} required /></div><div className="flex justify-end gap-2 sm:col-span-3"><Button type="button" variant="outline" onClick={() => setAddingAllocation(false)}>Cancel</Button><Button type="submit" disabled={saving}>Add allocation</Button></div></form>}
          </div>
        )}
      </div>
    </section>
  );
}

function ResourceForm({ resource, saving, onCancel, onSave }: { resource?: HeliosEstimateResource; saving: boolean; onCancel: () => void; onSave: (form: FormData) => void | Promise<void> }) {
  return (
    <form action={onSave} className="grid gap-4 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-4"><h3 className="font-semibold">{resource ? `Edit ${resource.description}` : "Add resource"}</h3><p className="text-sm text-muted-foreground">The source date and label are mandatory whenever a rate is entered.</p></div>
      <div className="space-y-2"><Label>Resource class</Label><Select name="resourceClass" defaultValue={resource?.resourceClass || "labor"}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_ESTIMATE_RESOURCE_CLASSES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2 sm:col-span-1 lg:col-span-3"><Label htmlFor="resource-description">Description</Label><Input id="resource-description" name="resourceDescription" defaultValue={resource?.description} required /></div>
      <div className="space-y-2"><Label htmlFor="resource-quantity">Quantity</Label><Input id="resource-quantity" name="quantity" type="number" min="0" step="any" defaultValue={resource?.quantity} /></div>
      <div className="space-y-2"><Label htmlFor="resource-unit">Unit</Label><Input id="resource-unit" name="unit" defaultValue={resource?.unit || "HR"} required /></div>
      <div className="space-y-2"><Label htmlFor="waste-percent">Waste %</Label><Input id="waste-percent" name="wastePercent" type="number" min="0" step="0.01" defaultValue={(resource?.wasteBasisPoints || 0) / 100} /></div>
      <div className="space-y-2"><Label htmlFor="duration-hours">Duration hours</Label><Input id="duration-hours" name="durationHours" type="number" min="0" step="any" defaultValue={resource?.durationHours} /></div>
      <div className="space-y-2"><Label>Tax status</Label><Select name="taxStatus" defaultValue={resource?.taxStatus || "unknown"}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["unknown", "taxable", "exempt"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Price source</Label><Select name="rateStatus" defaultValue={resource?.rateStatus || "unpriced"}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_ESTIMATE_RATE_STATUSES.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="rate-dollars">Source rate ($)</Label><Input id="rate-dollars" name="rateDollars" type="number" min="0" step="0.01" defaultValue={resource?.rateCents === undefined ? undefined : resource.rateCents / 100} /></div>
      <div className="space-y-2"><Label htmlFor="effective-date">Effective date</Label><Input id="effective-date" name="effectiveDate" type="date" defaultValue={resource?.effectiveDate} /></div>
      <div className="space-y-2 lg:col-span-2"><Label htmlFor="source-label">Source label</Label><Input id="source-label" name="priceSourceLabel" placeholder="Estimator entry, quote vendor, database name" defaultValue={resource?.priceSourceLabel} /></div>
      <div className="space-y-2 lg:col-span-2"><Label htmlFor="source-reference">Source reference</Label><Input id="source-reference" name="priceSourceReference" placeholder="Quote, cost database, or historical record ID" defaultValue={resource?.priceSourceReference} /></div>
      <div className="space-y-2"><Label htmlFor="crew-assembly">Crew / assembly</Label><Input id="crew-assembly" name="crewOrAssembly" defaultValue={resource?.crewOrAssembly} /></div>
      <div className="space-y-2"><Label htmlFor="escalation-percent">Escalation %</Label><Input id="escalation-percent" name="escalationPercent" type="number" min="0" step="0.01" defaultValue={(resource?.escalationBasisPoints || 0) / 100} /></div>
      <div className="space-y-2"><Label htmlFor="override-rate">Estimator override ($)</Label><Input id="override-rate" name="overrideRateDollars" type="number" min="0" step="0.01" defaultValue={resource?.overrideRateCents === undefined ? undefined : resource.overrideRateCents / 100} /></div>
      <div className="space-y-2 lg:col-span-3"><Label htmlFor="override-reason">Override reason</Label><Textarea id="override-reason" name="overrideReason" placeholder="Required when an override rate is entered" defaultValue={resource?.overrideReason} /></div>
      <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{resource ? "Save resource" : "Add resource"}</Button></div>
    </form>
  );
}
