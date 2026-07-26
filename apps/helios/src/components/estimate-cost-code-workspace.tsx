"use client";

import {
  HELIOS_ESTIMATE_RATE_STATUSES,
  HELIOS_ESTIMATE_RESOURCE_CLASSES,
  HELIOS_ESTIMATE_SCOPE_OWNERSHIP,
  type HeliosEstimateBuildInput,
  type HeliosEstimateCostCode,
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
import { Check, Pencil, Plus, ShieldCheck } from "lucide-react";
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
}: {
  projectId: string;
  estimateId: string;
  payItemId: string;
  payItemNumber: string;
  code?: HeliosEstimateCostCode;
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
      productionQuantity: optionalNumber(form.get("productionQuantity")),
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
          <div className="grid grid-cols-2 gap-2"><div className="space-y-2"><Label htmlFor={`production-${code?.id || payItemId}`}>Production qty.</Label><Input id={`production-${code?.id || payItemId}`} name="productionQuantity" type="number" min="0" step="any" defaultValue={code?.productionQuantity} /></div><div className="space-y-2"><Label htmlFor={`production-unit-${code?.id || payItemId}`}>Unit</Label><Input id={`production-unit-${code?.id || payItemId}`} name="productionUnit" defaultValue={code?.productionUnit || "LS"} required /></div></div>
          <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-5">{code && <Button type="button" variant="destructive" onClick={() => setRejecting({ type: "cost_code", id: code.id, label: code.code })}>Reject cost code</Button>}<Button type="submit" disabled={saving !== null}>{code ? "Save cost code" : "Add cost code"}</Button></div>
        </form>

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
