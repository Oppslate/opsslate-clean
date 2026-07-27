"use client";

import {
  HELIOS_ESTIMATE_REVIEW_ACTIONS,
  HELIOS_OWNER_PAY_ITEM_TYPES,
  type HeliosEstimateReviewAction,
  type HeliosEstimateReviewInput,
  type HeliosEstimateSection,
  type HeliosEstimateWorkspace,
  type HeliosOwnerPayItem,
  type HeliosProjectSummary,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { Checkbox } from "@opsslate/suite-ui/checkbox";
import {
  Dialog,
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
import { Check, ChevronDown, ChevronRight, History, Layers3, LockKeyhole, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ReviewRecord =
  | { recordType: "section"; record: HeliosEstimateSection }
  | { recordType: "pay_item"; record: HeliosOwnerPayItem };

const actionLabels: Record<HeliosEstimateReviewAction, string> = {
  accept: "Accept as proposed",
  correct: "Correct record",
  reject: "Reject record",
  defer: "Defer decision",
  merge: "Merge into existing",
  split: "Split record",
  map: "Map to existing",
};

function statusVariant(status: string) {
  if (status === "rejected") return "destructive" as const;
  if (status === "accepted" || status === "corrected") return "default" as const;
  return "outline" as const;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function money(value: number | undefined) {
  return value === undefined ? "Unpriced" : currency.format(value / 100);
}

export function EstimateImportReview({
  project,
  workspace,
}: {
  project: HeliosProjectSummary;
  workspace: HeliosEstimateWorkspace;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<ReviewRecord | null>(null);
  const [action, setAction] = useState<HeliosEstimateReviewAction>("correct");
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState(
    () => new Set(workspace.sections.map((section) => section.id)),
  );
  const sections = workspace.sections;
  const items = useMemo(() => sections.flatMap((section) => section.payItems), [sections]);
  const changeCounts = useMemo(
    () => items.reduce(
      (counts, item) => {
        const changeType = item.importChangeType || "new";
        return { ...counts, [changeType]: counts[changeType] + 1 };
      },
      { new: 0, unchanged: 0, changed: 0, conflict: 0, missing: 0 },
    ),
    [items],
  );

  async function saveReview(input: HeliosEstimateReviewInput) {
    setSaving(input.recordId);
    try {
      const response = await fetch(
        `/api/projects/${project.id}/estimate/${workspace.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Review decision could not be saved.");
      toast(`${actionLabels[input.action]} saved to the audit history.`);
      setSelected(null);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Review decision could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  async function acceptImport() {
    setSaving("estimate");
    try {
      const response = await fetch(
        `/api/projects/${project.id}/estimate/${workspace.id}/accept-import`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Import review could not be accepted.");
      toast("Owner pay-item register accepted and locked for this version.");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Import review could not be accepted.");
    } finally {
      setSaving(null);
    }
  }

  async function acceptRemaining() {
    setSaving("remaining");
    try {
      const response = await fetch(
        `/api/projects/${project.id}/estimate/${workspace.id}/accept-remaining`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const payload = (await response.json()) as { data?: { accepted?: number }; error?: string };
      if (!response.ok) throw new Error(payload.error || "Remaining proposals could not be accepted.");
      toast(`${payload.data?.accepted || 0} unchanged records accepted with individual audit entries.`);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Remaining proposals could not be accepted.");
    } finally {
      setSaving(null);
    }
  }

  async function applyContractorWbs() {
    setSaving("wbs");
    try {
      const response = await fetch(
        `/api/projects/${project.id}/estimate/${workspace.id}/reclassify-wbs`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const payload = (await response.json()) as {
        data?: { changed?: boolean; sections?: number; items?: number };
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Contractor WBS could not be applied.");
      toast(
        payload.data?.changed
          ? `${payload.data.items || 0} owner items organized into ${payload.data.sections || 0} contractor work phases.`
          : "This estimate already uses the current Helios contractor WBS.",
      );
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Contractor WBS could not be applied.");
    } finally {
      setSaving(null);
    }
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function openReview(record: ReviewRecord, nextAction: HeliosEstimateReviewAction) {
    setAction(nextAction);
    setSelected(record);
  }

  function closeReview() {
    const focusId = selected ? `review-${selected.recordType}-${selected.record.id}` : undefined;
    setSelected(null);
    if (focusId) window.requestAnimationFrame(() => document.getElementById(focusId)?.focus());
  }

  const readOnly = workspace.status === "accepted";
  const summary = workspace.reviewSummary;
  return (
    <div className="space-y-4">
      {(workspace.schemaVersion < 4 || workspace.sections.length < 12) && !readOnly && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-semibold">Contractor work breakdown update available</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Reorganize owner items into Mobilization, Site Preparation, Earthwork, Fill &amp; Embankment, and the remaining Helios work phases. Owner records and decisions are preserved.
              </p>
            </div>
            <Button onClick={applyContractorWbs} disabled={saving !== null} className="shrink-0">
              <Layers3 aria-hidden="true" />Apply contractor WBS
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="border-orange-500/25 bg-orange-500/5">
        <CardHeader>
          <div>
            <CardTitle>Owner pay-item import review</CardTitle>
            <CardDescription>
              Review the official sequence, item number, description, quantity, unit, fixed amount, and evidence before accepting this version.
            </CardDescription>
          </div>
          <Badge variant={readOnly ? "default" : "outline"}>{readOnly ? "Import accepted" : `${summary.percentComplete}% reviewed`}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {([
              ["Total", summary.total],
              ["Proposed", summary.proposed],
              ["Deferred", summary.deferred],
              ["Accepted", summary.accepted],
              ["Corrected", summary.corrected],
              ["Rejected", summary.rejected],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-md border bg-background/45 px-3 py-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="mt-1 text-xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(changeCounts).map(([type, count]) => count > 0 && (
              <Badge key={type} variant={type === "conflict" || type === "missing" ? "destructive" : "outline"} className="capitalize">
                {count} {type}
              </Badge>
            ))}
          </div>
          {summary.blockers.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <div className="font-medium">Acceptance checks</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                {summary.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Accepted versions are immutable. A later addendum creates a new reviewable version.
            </p>
            <div className="flex flex-wrap gap-2">
              {!readOnly && summary.proposed > 0 && (
                <Button variant="outline" onClick={acceptRemaining} disabled={saving !== null}>
                  <Check aria-hidden="true" />Accept remaining unchanged
                </Button>
              )}
              <Button
                onClick={acceptImport}
                disabled={readOnly || !summary.canAcceptImport || saving !== null}
              >
                <LockKeyhole aria-hidden="true" />
                {readOnly ? "Import locked" : "Accept owner-item register"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {sections.map((section) => {
        const expanded = expandedSections.has(section.id);
        const accepted = section.payItems.filter((item) => item.reviewStatus === "accepted" || item.reviewStatus === "corrected").length;
        const proposed = section.payItems.filter((item) => item.reviewStatus === "proposed" || item.reviewStatus === "deferred").length;
        const fixedSubtotal = section.payItems.reduce((sum, item) => sum + (item.fixedAmountCents || 0), 0);
        const pricedItems = section.payItems.filter((item) => item.directCostCents !== undefined);
        const estimatedCost = pricedItems.length === section.payItems.length
          ? pricedItems.reduce((sum, item) => sum + (item.directCostCents || 0), 0)
          : undefined;
        return (
        <Card key={section.id} className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <button type="button" onClick={() => toggleSection(section.id)} aria-expanded={expanded} className="flex min-w-0 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {expanded ? <ChevronDown className="mt-0.5 size-4 shrink-0 text-orange-400" aria-hidden="true" /> : <ChevronRight className="mt-0.5 size-4 shrink-0 text-orange-400" aria-hidden="true" />}
              <span className="min-w-0">
                <CardTitle>{section.key} · {section.name}</CardTitle>
                <CardDescription className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>{section.payItems.length} item{section.payItems.length === 1 ? "" : "s"}</span>
                  <span>{accepted} accepted owner items</span>
                  <span>{proposed} proposed Helios items</span>
                  <span>Owner fixed {money(fixedSubtotal)}</span>
                  <span>Estimated {money(estimatedCost)}</span>
                </CardDescription>
              </span>
            </button>
            <RecordActions
              label={section.name}
              reviewButtonId={`review-section-${section.id}`}
              status={section.reviewStatus}
              disabled={readOnly || saving !== null}
              onAccept={() => saveReview({ recordType: "section", recordId: section.id, action: "accept" })}
              onDefer={() => saveReview({ recordType: "section", recordId: section.id, action: "defer", comment: "Deferred for later import review." })}
              onReview={() => openReview({ recordType: "section", record: section }, "correct")}
            />
          </CardHeader>
          {expanded && <CardContent className="divide-y px-0">
            {[...section.payItems]
              .sort((left, right) => left.officialSequence - right.officialSequence)
              .map((item) => (
                <div key={item.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[7rem_minmax(0,1fr)_9rem_10rem_auto] lg:items-center">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Seq. {item.officialSequence}</div>
                    <div className="font-mono font-semibold text-orange-300">{item.officialItemNumber}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{item.description}</div>
                    {item.estimatorDescription && <div className="mt-1 text-sm text-muted-foreground">{item.estimatorDescription}</div>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary">{item.evidenceIds.length} citations</Badge>
                      <Badge variant="secondary">{item.confidence}% confidence</Badge>
                      <Badge variant="outline" className="capitalize">{item.itemType.replaceAll("_", " ")}</Badge>
                      <Badge variant={item.importChangeType === "conflict" || item.importChangeType === "missing" ? "destructive" : "outline"} className="capitalize">{item.importChangeType || "new"}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Bid quantity</div>
                    <div className="font-medium">{item.bidQuantity ?? "Takeoff required"} {item.bidUnit}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Official fixed amount</div>
                    <div className="font-medium">{item.fixedAmountCents === undefined ? "Not applicable" : money(item.fixedAmountCents)}</div>
                  </div>
                  <RecordActions
                    label={item.officialItemNumber}
                    reviewButtonId={`review-pay_item-${item.id}`}
                    status={item.reviewStatus}
                    disabled={readOnly || saving !== null}
                    onAccept={() => saveReview({ recordType: "pay_item", recordId: item.id, action: "accept" })}
                    onDefer={() => saveReview({ recordType: "pay_item", recordId: item.id, action: "defer", comment: "Deferred for later import review." })}
                    onReview={() => openReview({ recordType: "pay_item", record: item }, "correct")}
                  />
                </div>
              ))}
          </CardContent>}
        </Card>
      );})}

      <Card>
        <CardHeader>
          <div><CardTitle>Decision history</CardTitle><CardDescription>Append-only human decisions for estimate version {workspace.version}.</CardDescription></div>
          <History className="size-5 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          {workspace.decisionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No estimator decisions have been recorded.</p>
          ) : (
            <div className="space-y-2">
              {workspace.decisionHistory.slice(0, 25).map((event) => (
                <div key={event.id} className="flex flex-col justify-between gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center">
                  <div><span className="font-medium capitalize">{event.action.replaceAll("_", " ")}</span> <span className="text-muted-foreground">· {event.recordType.replaceAll("_", " ")}</span>{event.comment && <div className="mt-1 text-muted-foreground">{event.comment}</div>}</div>
                  <div className="shrink-0 text-xs text-muted-foreground">{event.reviewerName} · {new Date(event.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewDialog
        key={selected ? `${selected.recordType}-${selected.record.id}` : "closed"}
        selected={selected}
        action={action}
        sections={sections}
        items={items}
        saving={saving !== null}
        onActionChange={setAction}
        onClose={closeReview}
        onSave={saveReview}
      />
    </div>
  );
}

function RecordActions({
  label,
  reviewButtonId,
  status,
  disabled,
  onAccept,
  onDefer,
  onReview,
}: {
  label: string;
  reviewButtonId: string;
  status: string;
  disabled: boolean;
  onAccept: () => void;
  onDefer: () => void;
  onReview: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Badge variant={statusVariant(status)} className="capitalize">{status}</Badge>
      {status !== "accepted" && <Button aria-label={`Accept ${label}`} size="sm" variant="outline" onClick={onAccept} disabled={disabled}><Check aria-hidden="true" />Accept</Button>}
      {status !== "deferred" && status !== "accepted" && <Button aria-label={`Defer ${label}`} size="sm" variant="ghost" onClick={onDefer} disabled={disabled}>Defer</Button>}
      <Button id={reviewButtonId} aria-label={`Review ${label}`} size="sm" variant="outline" onClick={onReview} disabled={disabled}><PencilLine aria-hidden="true" />Review</Button>
    </div>
  );
}

function ReviewDialog({
  selected,
  action,
  sections,
  items,
  saving,
  onActionChange,
  onClose,
  onSave,
}: {
  selected: ReviewRecord | null;
  action: HeliosEstimateReviewAction;
  sections: HeliosEstimateSection[];
  items: HeliosOwnerPayItem[];
  saving: boolean;
  onActionChange: (action: HeliosEstimateReviewAction) => void;
  onClose: () => void;
  onSave: (input: HeliosEstimateReviewInput) => Promise<void>;
}) {
  const [targetRecordId, setTargetRecordId] = useState("");
  const [moveRecordIds, setMoveRecordIds] = useState<string[]>([]);
  if (!selected) return null;
  const isItem = selected.recordType === "pay_item";
  const record = selected.record;
  const targetRows = action === "map"
    ? sections.filter((section) => isItem || section.id !== record.id)
    : isItem
      ? items.filter((item) => item.id !== record.id && item.reviewStatus !== "rejected")
      : sections.filter((section) => section.id !== record.id && section.reviewStatus !== "rejected");
  const movableRows = isItem ? (record as HeliosOwnerPayItem).costCodes : (record as HeliosEstimateSection).payItems;

  function submit(formData: FormData) {
    const text = (name: string) => String(formData.get(name) || "").trim() || undefined;
    const numeric = (name: string) => {
      const value = text(name);
      return value === undefined ? undefined : Number(value);
    };
    const base = {
      recordType: selected!.recordType,
      recordId: record.id,
      action,
      comment: text("comment"),
      targetRecordId: targetRecordId || undefined,
    } as HeliosEstimateReviewInput;
    if (action === "correct") {
      base.correction = isItem
        ? {
            sectionId: text("sectionId"),
            officialSequence: numeric("officialSequence"),
            officialItemNumber: text("officialItemNumber"),
            description: text("description"),
            estimatorDescription: text("estimatorDescription"),
            bidQuantity: numeric("bidQuantity"),
            bidUnit: text("bidUnit"),
            itemType: text("itemType") as HeliosOwnerPayItem["itemType"],
            fixedAmountCents: numeric("fixedAmountDollars") === undefined ? undefined : Math.round((numeric("fixedAmountDollars") || 0) * 100),
          }
        : { name: text("name"), sequence: numeric("sequence") };
    }
    if (action === "split") {
      base.split = isItem
        ? {
            officialSequence: numeric("officialSequence"),
            officialItemNumber: text("officialItemNumber"),
            description: text("description"),
            bidQuantity: numeric("bidQuantity"),
            bidUnit: text("bidUnit"),
            itemType: text("itemType") as HeliosOwnerPayItem["itemType"],
            fixedAmountCents: numeric("fixedAmountDollars") === undefined ? undefined : Math.round((numeric("fixedAmountDollars") || 0) * 100),
            moveRecordIds,
          }
        : { name: text("name"), moveRecordIds };
    }
    void onSave(base);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review {isItem ? "owner pay item" : "operational section"}</DialogTitle>
          <DialogDescription>{isItem ? (record as HeliosOwnerPayItem).officialItemNumber : (record as HeliosEstimateSection).name} · The original proposal remains in history.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Decision</Label>
            <Select value={action} onValueChange={(value) => { onActionChange(value as HeliosEstimateReviewAction); setTargetRecordId(""); setMoveRecordIds([]); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{HELIOS_ESTIMATE_REVIEW_ACTIONS.map((value) => <SelectItem key={value} value={value}>{actionLabels[value]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {action === "correct" && (
            isItem
              ? <OwnerItemFields item={record as HeliosOwnerPayItem} sections={sections} />
              : <SectionFields section={record as HeliosEstimateSection} />
          )}
          {action === "split" && (
            <>
              {isItem ? <OwnerItemFields sections={sections} /> : <SectionFields />}
              {movableRows.length > 0 && (
                <fieldset className="space-y-2 rounded-md border p-3">
                  <legend className="px-1 text-sm font-medium">Move into the new record</legend>
                  {movableRows.map((row) => (
                    <div key={row.id} className="flex items-start gap-2 text-sm">
                      <Checkbox id={`move-${row.id}`} className="mt-1" checked={moveRecordIds.includes(row.id)} onCheckedChange={(checked) => setMoveRecordIds((current) => checked === true ? [...current, row.id] : current.filter((id) => id !== row.id))} />
                      <Label htmlFor={`move-${row.id}`} className="font-normal leading-5">{"officialItemNumber" in row ? `${row.officialItemNumber} · ${row.description}` : `${row.code} · ${row.description}`}</Label>
                    </div>
                  ))}
                </fieldset>
              )}
            </>
          )}
          {(action === "merge" || action === "map") && (
            <div className="space-y-2">
              <Label>Target {action === "map" || !isItem ? "section" : "owner item"}</Label>
              <Select value={targetRecordId} onValueChange={setTargetRecordId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select target" /></SelectTrigger>
                <SelectContent>{targetRows.map((row) => <SelectItem key={row.id} value={row.id}>{"officialItemNumber" in row ? `${row.officialItemNumber} · ${row.description}` : row.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="review-comment">Review note{["reject", "defer", "merge", "split", "map"].includes(action) ? " (required)" : ""}</Label>
            <Textarea id="review-comment" name="comment" placeholder="Explain the decision, source correction, or reason." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || ((action === "merge" || action === "map") && !targetRecordId)}>{saving ? "Saving…" : "Record decision"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionFields({ section }: { section?: HeliosEstimateSection }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
      <div className="space-y-2"><Label htmlFor="section-name">Section name</Label><Input id="section-name" name="name" defaultValue={section?.name} required /></div>
      <div className="space-y-2"><Label htmlFor="section-sequence">Build sequence</Label><Input id="section-sequence" name="sequence" type="number" min="0" step="1" defaultValue={section?.sequence} /></div>
    </div>
  );
}

function OwnerItemFields({ item, sections }: { item?: HeliosOwnerPayItem; sections: HeliosEstimateSection[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="official-sequence">Official sequence</Label><Input id="official-sequence" name="officialSequence" type="number" min="0" step="1" defaultValue={item?.officialSequence} required /></div>
      <div className="space-y-2"><Label htmlFor="official-item">Official item number</Label><Input id="official-item" name="officialItemNumber" defaultValue={item?.officialItemNumber} required /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="official-description">Official description</Label><Textarea id="official-description" name="description" defaultValue={item?.description} required /></div>
      {item && <div className="space-y-2 sm:col-span-2"><Label htmlFor="estimator-description">Estimator short description</Label><Input id="estimator-description" name="estimatorDescription" defaultValue={item.estimatorDescription} /></div>}
      {item && <div className="space-y-2"><Label>Operational section</Label><Select name="sectionId" defaultValue={sections.find((section) => section.payItems.some((row) => row.id === item.id))?.id}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{sections.filter((section) => section.reviewStatus !== "rejected").map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}</SelectContent></Select></div>}
      <div className="space-y-2"><Label htmlFor="bid-quantity">Official bid quantity</Label><Input id="bid-quantity" name="bidQuantity" type="number" min="0" step="any" defaultValue={item?.bidQuantity} /></div>
      <div className="space-y-2"><Label htmlFor="bid-unit">Bid unit</Label><Input id="bid-unit" name="bidUnit" defaultValue={item?.bidUnit || "LS"} required /></div>
      <div className="space-y-2"><Label>Item type</Label><Select name="itemType" defaultValue={item?.itemType || "lump_sum"}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_OWNER_PAY_ITEM_TYPES.map((type) => <SelectItem key={type} value={type}>{type.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="fixed-amount">Official fixed amount ($)</Label><Input id="fixed-amount" name="fixedAmountDollars" type="number" min="0" step="0.01" defaultValue={item?.fixedAmountCents === undefined ? undefined : item.fixedAmountCents / 100} /></div>
    </div>
  );
}
