"use client";

import {
  calculateEstimateTotals,
  type HeliosEstimateBuildInput,
  type HeliosEstimateCostCode,
  type HeliosEstimateEvidenceLink,
  type HeliosEstimateQuantityRecord,
  type HeliosEstimateResource,
  type HeliosEstimateRisk,
  type HeliosEstimateRfq,
  type HeliosEstimateSection,
  type HeliosEstimateSubmittal,
  type HeliosEstimateSupportInput,
  type HeliosEstimateWorkspace,
  type HeliosOwnerPayItem,
  type HeliosProjectIntelligence,
  type HeliosProjectSummary,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@opsslate/suite-ui/tabs";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Calculator,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  History,
  Layers3,
  LoaderCircle,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatDate, formatTimestamp, humanizeStatus } from "@/lib/format";
import { EstimateSupportQuickActions } from "./estimate-support-center";
import { StatusBadge } from "./status-badge";

type ReviewLane = "all" | "scope" | "quantity" | "pricing" | "procurement" | "evidence" | "risk";
type SelectionKind = "section" | "pay_item" | "cost_code" | "resource" | "quantity" | "rfq" | "submittal" | "risk" | "evidence_link";
type Severity = "critical" | "high" | "medium" | "low";

type CockpitSelection = {
  kind: SelectionKind;
  id: string;
  sectionId?: string;
  payItemId?: string;
  costCodeId?: string;
};

type ReviewItem = {
  id: string;
  lane: Exclude<ReviewLane, "all">;
  severity: Severity;
  title: string;
  detail: string;
  meta: string;
  confidence?: number;
  impactCents?: number;
  selection: CockpitSelection;
};

type EstimateIndex = {
  sections: Map<string, HeliosEstimateSection>;
  payItems: Map<string, HeliosOwnerPayItem>;
  costCodes: Map<string, HeliosEstimateCostCode>;
  resources: Map<string, HeliosEstimateResource>;
  quantities: Map<string, HeliosEstimateQuantityRecord>;
  rfqs: Map<string, HeliosEstimateRfq>;
  submittals: Map<string, HeliosEstimateSubmittal>;
  risks: Map<string, HeliosEstimateRisk>;
  evidenceLinks: Map<string, HeliosEstimateEvidenceLink>;
};

const laneLabels: Record<ReviewLane, string> = {
  all: "All work",
  scope: "Scope",
  quantity: "Quantity",
  pricing: "Pricing",
  procurement: "Procurement",
  evidence: "Evidence",
  risk: "Risk",
};

const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const laneRank: Record<Exclude<ReviewLane, "all">, number> = { risk: 0, scope: 1, quantity: 2, pricing: 3, procurement: 4, evidence: 5 };

function money(value?: number) {
  if (value === undefined) return "Unpriced";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function compactMoney(value?: number) {
  if (value === undefined) return "—";
  if (Math.abs(value) >= 100_000_000) return `$${(value / 100_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 100_000) return `$${Math.round(value / 100_000)}K`;
  return money(value);
}

function quantity(value: number | undefined, unit: string) {
  return value === undefined ? `Takeoff · ${unit}` : `${value.toLocaleString()} ${unit}`;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function severityClass(value: Severity) {
  if (value === "critical") return "border-danger/50 bg-danger/15 text-danger-foreground";
  if (value === "high") return "border-orange-500/45 bg-orange-500/10 text-orange-300";
  if (value === "medium") return "border-warning/45 bg-warning/10 text-warning-foreground";
  return "border-info/40 bg-info/10 text-info-foreground";
}

function statusClass(value: string) {
  if (["accepted", "corrected", "priced", "verified", "balanced", "quote_accepted"].includes(value)) {
    return "border-success/35 bg-success/10 text-success-foreground";
  }
  if (["rejected", "disputed", "critical", "unbalanced", "orphan"].includes(value)) {
    return "border-danger/40 bg-danger/10 text-danger-foreground";
  }
  if (["proposed", "deferred", "partial", "pending", "takeoff_required", "incomplete"].includes(value)) {
    return "border-warning/40 bg-warning/10 text-warning-foreground";
  }
  return "border-border bg-muted/30 text-muted-foreground";
}

function buildIndex(workspace: HeliosEstimateWorkspace): EstimateIndex {
  const index: EstimateIndex = {
    sections: new Map(), payItems: new Map(), costCodes: new Map(), resources: new Map(), quantities: new Map(),
    rfqs: new Map(workspace.rfqs.map((row) => [row.id, row])),
    submittals: new Map(workspace.submittals.map((row) => [row.id, row])),
    risks: new Map(workspace.risks.map((row) => [row.id, row])),
    evidenceLinks: new Map(workspace.evidenceLinks.map((row) => [row.id, row])),
  };
  for (const section of workspace.sections) {
    index.sections.set(section.id, section);
    for (const payItem of section.payItems) {
      index.payItems.set(payItem.id, payItem);
      for (const code of payItem.costCodes) {
        index.costCodes.set(code.id, code);
        code.resources.forEach((row) => index.resources.set(row.id, row));
        code.quantities.forEach((row) => index.quantities.set(row.id, row));
      }
    }
  }
  return index;
}

function createReviewItems(workspace: HeliosEstimateWorkspace) {
  const rows: ReviewItem[] = [];
  for (const section of workspace.sections) {
    for (const payItem of section.payItems) {
      const base = { sectionId: section.id, payItemId: payItem.id };
      if (["proposed", "deferred"].includes(payItem.reviewStatus)) {
        rows.push({
          id: `scope-pay-${payItem.id}`, lane: "scope", severity: payItem.importChangeType === "conflict" ? "critical" : "high",
          title: `${payItem.officialItemNumber} · ${payItem.description}`, detail: "Owner pay item needs an estimator decision before downstream use.",
          meta: `${section.name} · ${label(payItem.reviewStatus)}`, confidence: payItem.confidence,
          impactCents: payItem.directCostCents, selection: { kind: "pay_item", id: payItem.id, ...base },
        });
      }
      if (payItem.quantityStatus === "takeoff_required" || payItem.bidQuantity === undefined) {
        rows.push({
          id: `qty-pay-${payItem.id}`, lane: "quantity", severity: "high", title: `${payItem.officialItemNumber} quantity not established`,
          detail: "The owner quantity is missing or a takeoff is required.", meta: `${section.name} · ${payItem.bidUnit}`,
          confidence: payItem.confidence, selection: { kind: "pay_item", id: payItem.id, ...base },
        });
      }
      for (const code of payItem.costCodes) {
        const codeSelection = { kind: "cost_code" as const, id: code.id, ...base, costCodeId: code.id };
        if (["proposed", "deferred"].includes(code.reviewStatus)) {
          rows.push({
            id: `scope-code-${code.id}`, lane: "scope", severity: code.scopeOwnership === "unassigned" ? "high" : "medium",
            title: `${code.code} · ${code.description}`, detail: `Scope ownership is ${label(code.scopeOwnership)} and needs review.`,
            meta: payItem.officialItemNumber, confidence: code.confidence, impactCents: code.directCostCents, selection: codeSelection,
          });
        }
        if (code.productionQuantity === undefined || code.quantities.some((row) => row.reviewStatus === "proposed" || row.status === "takeoff_required")) {
          const proposed = code.quantities.find((row) => row.reviewStatus === "proposed");
          rows.push({
            id: `qty-code-${code.id}`, lane: "quantity", severity: "high", title: `${code.code} production quantity needs review`,
            detail: proposed ? `${proposed.sourceLabel}: ${quantity(proposed.value, proposed.unit)}` : "No accepted production quantity is connected to this cost code.",
            meta: payItem.officialItemNumber, confidence: proposed?.confidence ?? code.confidence,
            selection: proposed ? { kind: "quantity", id: proposed.id, ...base, costCodeId: code.id } : codeSelection,
          });
        }
        if (code.pricingStatus !== "priced") {
          rows.push({
            id: `price-${code.id}`, lane: "pricing", severity: code.pricingStatus === "unpriced" ? "critical" : "high",
            title: `${code.code} is ${label(code.pricingStatus)}`, detail: "One or more resource rates are missing or have not been resolved.",
            meta: `${code.resources.length} resources · ${payItem.officialItemNumber}`, confidence: code.confidence,
            impactCents: code.directCostCents, selection: codeSelection,
          });
        }
      }
    }
  }
  for (const rfq of workspace.rfqs.filter((row) => !["quote_accepted", "closed"].includes(row.status))) {
    rows.push({ id: `rfq-${rfq.id}`, lane: "procurement", severity: rfq.status === "sent" ? "high" : "medium", title: rfq.title,
      detail: `RFQ is ${label(rfq.status)}; quote coverage is not complete.`, meta: rfq.requiredQuoteDate ? `Due ${rfq.requiredQuoteDate}` : "Quote due date not set",
      selection: { kind: "rfq", id: rfq.id, payItemId: rfq.linkedPayItemIds[0], costCodeId: rfq.linkedCostCodeIds[0] } });
  }
  for (const submittal of workspace.submittals.filter((row) => !["accepted", "closed"].includes(row.status))) {
    rows.push({ id: `submittal-${submittal.id}`, lane: "procurement", severity: "medium", title: submittal.description,
      detail: `Required ${label(submittal.type)} is ${label(submittal.status)}.`, meta: submittal.specification || "Specification not established",
      selection: { kind: "submittal", id: submittal.id, payItemId: submittal.linkedPayItemIds[0], costCodeId: submittal.linkedCostCodeIds[0] } });
  }
  const evidenceGroups = new Map<string, HeliosEstimateEvidenceLink[]>();
  for (const link of workspace.evidenceLinks.filter((row) => ["proposed", "disputed"].includes(row.verificationStatus))) {
    const key = `${link.recordType}:${link.recordId}`;
    evidenceGroups.set(key, [...(evidenceGroups.get(key) || []), link]);
  }
  for (const links of evidenceGroups.values()) {
    const first = links[0];
    rows.push({ id: `evidence-${first.id}`, lane: "evidence", severity: links.some((row) => row.verificationStatus === "disputed") ? "high" : "medium",
      title: first.recordLabel, detail: `${links.length} citation${links.length === 1 ? "" : "s"} require evidence verification.`,
      meta: label(first.relationship), selection: { kind: "evidence_link", id: first.id } });
  }
  for (const risk of workspace.risks.filter((row) => row.disposition === "open" || row.carryDecision === "pending")) {
    const severity: Severity = risk.severity === "critical" ? "critical" : risk.severity === "high" ? "high" : risk.severity === "medium" ? "medium" : "low";
    rows.push({ id: `risk-${risk.id}`, lane: "risk", severity, title: risk.title, detail: risk.detail,
      meta: `${label(risk.category)} · ${risk.probabilityPercent}% probability`, confidence: risk.confidence,
      impactCents: risk.expectedExposureCents, selection: { kind: "risk", id: risk.id, payItemId: risk.linkedPayItemIds[0], costCodeId: risk.linkedCostCodeIds[0] } });
  }
  return rows.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || laneRank[a.lane] - laneRank[b.lane] || a.title.localeCompare(b.title));
}

function initialSelection(workspace: HeliosEstimateWorkspace): CockpitSelection {
  const section = workspace.sections[0];
  const payItem = section?.payItems[0];
  const code = payItem?.costCodes[0];
  if (code) return { kind: "cost_code", id: code.id, sectionId: section.id, payItemId: payItem.id, costCodeId: code.id };
  if (payItem) return { kind: "pay_item", id: payItem.id, sectionId: section.id, payItemId: payItem.id };
  return { kind: "section", id: section?.id || workspace.id, sectionId: section?.id };
}

export function EstimateCockpit2({ project, status, intelligence, workspace, latestError }: {
  project: HeliosProjectSummary;
  status: string;
  intelligence: HeliosProjectIntelligence;
  workspace: HeliosEstimateWorkspace;
  latestError?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const reviewItems = useMemo(() => createReviewItems(workspace), [workspace]);
  const [selection, setSelection] = useState<CockpitSelection>(() => createReviewItems(workspace)[0]?.selection || initialSelection(workspace));
  const [lane, setLane] = useState<ReviewLane>("all");
  const [search, setSearch] = useState("");
  const [contextTab, setContextTab] = useState(() => selection.kind === "risk" ? "risk" : "proof");
  const [busy, setBusy] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => new Set(workspace.sections.map((row) => row.id)));
  const [expandedPayItems, setExpandedPayItems] = useState(() => new Set(workspace.sections.flatMap((row) => row.payItems.slice(0, 1).map((item) => item.id))));

  const index = useMemo(() => buildIndex(workspace), [workspace]);
  const filteredReviewItems = useMemo(() => reviewItems.filter((row) => {
    const matchesLane = lane === "all" || row.lane === lane;
    const haystack = `${row.title} ${row.detail} ${row.meta}`.toLowerCase();
    return matchesLane && (!search || haystack.includes(search.toLowerCase()));
  }), [lane, reviewItems, search]);

  const allCodes = workspace.sections.flatMap((row) => row.payItems.flatMap((item) => item.costCodes));
  const activeCodes = allCodes.filter((row) => row.reviewStatus !== "rejected");
  const quantityReady = activeCodes.filter((row) => row.productionQuantity !== undefined || row.quantities.some((quantityRow) => quantityRow.reviewStatus === "accepted" || quantityRow.reviewStatus === "corrected")).length;
  const pricingReady = activeCodes.filter((row) => row.pricingStatus === "priced").length;
  const quoteReady = workspace.rfqs.filter((row) => ["quote_received", "quote_accepted", "closed"].includes(row.status)).length;
  const verifiedEvidence = workspace.evidenceLinks.filter((row) => row.verificationStatus === "verified").length;
  const decidedRisks = workspace.risks.filter((row) => row.carryDecision !== "pending").length;
  const metrics = [
    { lane: "scope" as const, label: "Estimate coverage", value: workspace.reviewSummary.percentComplete, detail: `${workspace.reviewSummary.reviewed}/${workspace.reviewSummary.total}` },
    { lane: "quantity" as const, label: "Quantity coverage", value: percentage(quantityReady, activeCodes.length), detail: `${quantityReady}/${activeCodes.length}` },
    { lane: "pricing" as const, label: "Pricing coverage", value: percentage(pricingReady, activeCodes.length), detail: `${pricingReady}/${activeCodes.length}` },
    { lane: "procurement" as const, label: "Quote coverage", value: percentage(quoteReady, workspace.rfqs.length), detail: `${quoteReady}/${workspace.rfqs.length}` },
    { lane: "evidence" as const, label: "Evidence verified", value: percentage(verifiedEvidence, workspace.evidenceLinks.length), detail: `${verifiedEvidence}/${workspace.evidenceLinks.length}` },
    { lane: "risk" as const, label: "Risk decisions", value: percentage(decidedRisks, workspace.risks.length), detail: `${decidedRisks}/${workspace.risks.length}` },
  ];
  const readiness = Math.round(metrics.reduce((total, metric) => total + metric.value, 0) / metrics.length);
  const directCostCents = activeCodes.reduce((total, row) => total + (row.directCostCents || 0), 0);
  const totals = calculateEstimateTotals({ directCostCents, overheadBasisPoints: workspace.overheadBasisPoints, profitBasisPoints: workspace.profitBasisPoints, bondBasisPoints: workspace.bondBasisPoints });

  const selectedSection = selection.sectionId ? index.sections.get(selection.sectionId) : selection.kind === "section" ? index.sections.get(selection.id) : undefined;
  const selectedPayItem = selection.payItemId ? index.payItems.get(selection.payItemId) : selection.kind === "pay_item" ? index.payItems.get(selection.id) : undefined;
  const selectedCostCode = selection.costCodeId ? index.costCodes.get(selection.costCodeId) : selection.kind === "cost_code" ? index.costCodes.get(selection.id) : undefined;
  const selectedQuantity = selection.kind === "quantity" ? index.quantities.get(selection.id) : undefined;
  const selectedResource = selection.kind === "resource" ? index.resources.get(selection.id) : undefined;
  const selectedRfq = selection.kind === "rfq" ? index.rfqs.get(selection.id) : undefined;
  const selectedSubmittal = selection.kind === "submittal" ? index.submittals.get(selection.id) : undefined;
  const selectedRisk = selection.kind === "risk" ? index.risks.get(selection.id) : undefined;
  const selectedEvidenceLink = selection.kind === "evidence_link" ? index.evidenceLinks.get(selection.id) : undefined;
  const contextRecordId = selectedEvidenceLink?.recordId || selection.id;
  const contextLinks = workspace.evidenceLinks.filter((row) => row.recordId === contextRecordId || (selection.kind === "evidence_link" && row.recordId === selectedEvidenceLink?.recordId));
  const contextRisks = workspace.risks.filter((row) => row.id === selection.id || row.linkedCostCodeIds.includes(selectedCostCode?.id || "") || row.linkedPayItemIds.includes(selectedPayItem?.id || "") || row.linkedQuantityIds.includes(selectedQuantity?.id || ""));
  const contextRfqs = workspace.rfqs.filter((row) => row.id === selection.id || row.linkedCostCodeIds.includes(selectedCostCode?.id || "") || row.linkedPayItemIds.includes(selectedPayItem?.id || ""));
  const contextSubmittals = workspace.submittals.filter((row) => row.id === selection.id || row.linkedCostCodeIds.includes(selectedCostCode?.id || "") || row.linkedPayItemIds.includes(selectedPayItem?.id || ""));
  const contextHistory = workspace.decisionHistory.filter((row) => row.recordId === contextRecordId || row.recordId === selectedCostCode?.id || row.recordId === selectedPayItem?.id).slice().reverse();
  const selectedTitle =
    selectedRisk?.title ??
    selectedRfq?.title ??
    selectedSubmittal?.description ??
    selectedResource?.description ??
    selectedQuantity?.sourceLabel ??
    selectedEvidenceLink?.recordLabel ??
    (selectedCostCode
      ? `${selectedCostCode.code} ${selectedCostCode.description}`
      : selectedPayItem
        ? `${selectedPayItem.officialItemNumber} ${selectedPayItem.description}`
        : selectedSection?.name || "Estimate review");

  function choose(next: CockpitSelection, tab?: string) {
    setSelection(next);
    if (next.sectionId) setExpandedSections((current) => new Set(current).add(next.sectionId!));
    if (next.payItemId) setExpandedPayItems((current) => new Set(current).add(next.payItemId!));
    if (tab) setContextTab(tab);
  }

  async function post(path: "build" | "support" | "review", input: HeliosEstimateBuildInput | HeliosEstimateSupportInput | Record<string, unknown>, success: string) {
    setBusy(`${path}:${selection.id}`);
    try {
      const response = await fetch(`/api/projects/${project.id}/estimate/${workspace.id}/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The review decision could not be saved.");
      toast(success);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "The review decision could not be saved.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function retryProject() {
    setRetrying(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/intelligence/retry`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Project reanalysis failed.");
      toast("Project intelligence was queued again.");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Project reanalysis failed.", "error");
    } finally {
      setRetrying(false);
    }
  }

  const isUpdating = ["queued", "processing"].includes(status) || workspace.status === "proposal_processing";

  return (
    <div className="relative z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl xl:-mt-20 xl:h-[calc(100vh-7rem)] xl:min-h-[720px] xl:max-h-[960px]">
      <header className="grid shrink-0 gap-3 border-b border-border bg-card/90 p-3 md:grid-cols-2 md:items-center xl:grid-cols-[minmax(250px,1.45fr)_repeat(3,minmax(125px,.55fr))_auto] xl:pr-20">
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-base font-semibold">{project.name}</h1><StatusBadge value={project.status} /></div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{project.location || "Location not set"}</span>
            <span>{project.projectNumber || "No project number"}</span>
          </div>
        </div>
        <HeaderStat label="Bid due" icon={<CalendarClock className="size-3.5 text-muted-foreground" />} value={formatDate(project.bidDate)} />
        <HeaderStat label="Estimate state" icon={isUpdating ? <LoaderCircle className="size-3.5 animate-spin text-ai-foreground" /> : <ShieldCheck className="size-3.5 text-success-foreground" />} value={humanizeStatus(workspace.status)} />
        <div className="border-l border-border pl-3">
          <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Bid readiness</div>
          <div className="mt-1 flex items-center gap-2"><span className="text-xs font-semibold">{readiness}%</span><div className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${readiness}%` }} /></div></div>
        </div>
        <div className="flex items-center justify-end gap-2 md:col-span-2 xl:col-span-1">
          <Button asChild size="sm" variant="outline"><Link href={`/projects/${project.id}/estimate`}><ArrowUpRight aria-hidden="true" />Full estimate</Link></Button>
          <Button size="sm" disabled={retrying || isUpdating} onClick={retryProject}><RefreshCw className={retrying ? "animate-spin" : ""} aria-hidden="true" />Reanalyze</Button>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 border-b border-border bg-muted/10 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <button key={metric.lane} type="button" aria-pressed={lane === metric.lane} onClick={() => setLane(lane === metric.lane ? "all" : metric.lane)} className={`border-r border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${lane === metric.lane ? "bg-orange-500/10" : ""}`}>
            <div className="flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-[.13em] text-muted-foreground"><span>{metric.label}</span><span>{metric.detail}</span></div>
            <div className="mt-1.5 flex items-center gap-2"><strong className="text-sm">{metric.value}%</strong><div className="h-1 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${metric.value >= 80 ? "bg-success" : metric.value >= 50 ? "bg-warning" : "bg-orange-500"}`} style={{ width: `${metric.value}%` }} /></div></div>
          </button>
        ))}
      </div>

      {(latestError || intelligence.isStale || workspace.error) && (
        <div className="shrink-0 border-b border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger-foreground"><AlertTriangle className="mr-2 inline size-3.5" aria-hidden="true" />{workspace.error || latestError || "The estimate is based on stale project intelligence. Reanalyze before final bid review."}</div>
      )}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[minmax(245px,.7fr)_minmax(500px,1.55fr)_minmax(280px,.82fr)]">
        <ReviewQueue rows={filteredReviewItems} allRows={reviewItems} lane={lane} search={search} selection={selection} setSearch={setSearch} setLane={setLane} onChoose={(row) => choose(row.selection, row.lane === "risk" ? "risk" : row.lane === "procurement" ? "procurement" : "proof")} />
        <StackedEstimate workspace={workspace} selection={selection} expandedSections={expandedSections} expandedPayItems={expandedPayItems} totals={totals} onToggleSection={(id) => setExpandedSections((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onTogglePayItem={(id) => setExpandedPayItems((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onChoose={choose} />
        <ContextPanel projectId={project.id} workspace={workspace} tab={contextTab} setTab={setContextTab} selection={selection} title={selectedTitle} costCode={selectedCostCode} links={contextLinks} risks={contextRisks} rfqs={contextRfqs} submittals={contextSubmittals} history={contextHistory} busy={busy !== null} onPost={post} />
      </div>

      <DecisionDock projectId={project.id} workspace={workspace} selection={selection} title={selectedTitle} section={selectedSection} payItem={selectedPayItem} code={selectedCostCode} resource={selectedResource} quantityRecord={selectedQuantity} evidenceLink={selectedEvidenceLink} risk={selectedRisk} rfq={selectedRfq} submittal={selectedSubmittal} busy={busy !== null} onPost={post} />
    </div>
  );
}

function HeaderStat({ label: statLabel, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  return <div className="border-l border-border pl-3"><div className="text-[9px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{statLabel}</div><div className="mt-1 flex items-center gap-1.5 text-xs font-medium">{icon}{value}</div></div>;
}

function ReviewQueue({ rows, allRows, lane, search, selection, setSearch, setLane, onChoose }: {
  rows: ReviewItem[]; allRows: ReviewItem[]; lane: ReviewLane; search: string; selection: CockpitSelection;
  setSearch: (value: string) => void; setLane: (value: ReviewLane) => void; onChoose: (row: ReviewItem) => void;
}) {
  const laneCount = (value: ReviewLane) => value === "all" ? allRows.length : allRows.filter((row) => row.lane === value).length;
  return (
    <section aria-label="Bid review queue" className="flex h-[560px] min-h-0 flex-col border-b border-border lg:h-[640px] lg:border-r xl:h-auto xl:border-b-0">
      <div className="shrink-0 space-y-3 border-b border-border p-3">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-info-foreground">Bid review queue</div><h2 className="text-sm font-semibold">{rows.length} actions ready</h2></div><Badge variant="outline" className="border-warning/40 text-warning-foreground">{allRows.filter((row) => row.severity === "critical" || row.severity === "high").length} priority</Badge></div>
        <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Search bid review queue</span><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search scope, item, or risk" className="pl-9" /></label>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(laneLabels) as ReviewLane[]).map((value) => <button key={value} type="button" onClick={() => setLane(value)} className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${lane === value ? "border-orange-500/50 bg-orange-500/15 text-orange-300" : "border-border bg-background/35 text-muted-foreground hover:text-foreground"}`}>{laneLabels[value]} <span className="ml-1 opacity-70">{laneCount(value)}</span></button>)}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain xl:min-h-0">
        {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground"><ClipboardCheck className="mx-auto mb-3 size-7 text-success-foreground" aria-hidden="true" />No open actions match this lane.</div> : rows.map((row) => {
          const selected = selection.kind === row.selection.kind && selection.id === row.selection.id;
          return <button key={row.id} type="button" aria-pressed={selected} onClick={() => onChoose(row)} className={`block w-full border-b border-border px-3 py-3 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selected ? "border-l-2 border-l-orange-500 bg-orange-500/10" : "hover:bg-muted/25"}`}>
            <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5"><Badge variant="outline" className={`h-5 px-1.5 text-[9px] uppercase ${severityClass(row.severity)}`}>{row.severity}</Badge><Badge variant="outline" className="h-5 px-1.5 text-[9px] capitalize">{row.lane}</Badge></div>{row.impactCents !== undefined && <span className="font-mono text-[11px] font-semibold">{compactMoney(row.impactCents)}</span>}</div>
            <div className="mt-2 line-clamp-2 text-xs font-semibold leading-4">{row.title}</div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{row.detail}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span className="truncate">{row.meta}</span>{row.confidence !== undefined && <span className={row.confidence >= 80 ? "text-success-foreground" : "text-warning-foreground"}>{row.confidence}%</span>}</div>
          </button>;
        })}
      </div>
    </section>
  );
}

function StackedEstimate({ workspace, selection, expandedSections, expandedPayItems, totals, onToggleSection, onTogglePayItem, onChoose }: {
  workspace: HeliosEstimateWorkspace; selection: CockpitSelection; expandedSections: Set<string>; expandedPayItems: Set<string>;
  totals: ReturnType<typeof calculateEstimateTotals>; onToggleSection: (id: string) => void; onTogglePayItem: (id: string) => void; onChoose: (selection: CockpitSelection) => void;
}) {
  return (
    <section aria-label="Stacked estimate" className="flex h-[620px] min-h-0 flex-col border-b border-border bg-background/20 lg:h-[640px] xl:h-auto xl:border-b-0 xl:border-r">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-info-foreground">Live stacked estimate</div><h2 className="text-sm font-semibold">Section → owner item → cost code → resource</h2></div><div className="text-right"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Current bid</div><div className="font-mono text-sm font-bold text-success-foreground">{money(totals.grandTotalCents)}</div></div></div>
      <div className="hidden shrink-0 border-b border-border bg-muted/20 px-3 py-2 text-[9px] font-semibold uppercase tracking-[.12em] text-muted-foreground md:grid md:grid-cols-[minmax(150px,1fr)_72px_82px] xl:grid-cols-[minmax(150px,1fr)_62px_72px_82px_82px]"><span>Description</span><span className="hidden text-right xl:block">Basis</span><span className="text-right">Production</span><span className="hidden text-right xl:block">Unit cost</span><span className="text-right">Extended</span></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {workspace.sections.map((section) => {
          const sectionCost = section.payItems.reduce((total, item) => total + (item.directCostCents || 0), 0);
          const sectionCostReady = section.payItems.every((item) => item.directCostCents !== undefined);
          const fixedSubtotal = section.payItems.reduce((total, item) => total + (item.fixedAmountCents || 0), 0);
          const expanded = expandedSections.has(section.id);
          const reviewed = section.payItems.filter((row) => ["accepted", "corrected"].includes(row.reviewStatus)).length;
          const proposed = section.payItems.filter((row) => ["proposed", "deferred"].includes(row.reviewStatus)).length;
          return <div key={section.id} className="border-b border-border">
            <button type="button" onClick={() => onToggleSection(section.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-muted/35 px-3 py-2.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span className="flex min-w-0 items-start gap-2">{expanded ? <ChevronDown className="mt-0.5 size-4 text-orange-400" /> : <ChevronRight className="mt-0.5 size-4 text-orange-400" />}<Layers3 className="mt-0.5 size-3.5 text-info-foreground" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{section.key} · {section.name}</span><span className="mt-1 flex flex-wrap gap-x-2 text-[9px] text-muted-foreground"><span>{section.payItems.length} item{section.payItems.length === 1 ? "" : "s"}</span><span>{reviewed} accepted</span><span>{proposed} proposed</span><span>Owner {money(fixedSubtotal)}</span></span></span></span><span className="text-right"><span className="block font-mono text-xs font-semibold">{sectionCostReady ? money(sectionCost) : "Unpriced"}</span><span className="text-[9px] text-muted-foreground">estimated</span></span>
            </button>
            {expanded && section.payItems.map((payItem) => {
              const itemExpanded = expandedPayItems.has(payItem.id);
              const itemSelected = selection.id === payItem.id;
              const derived = payItem.derivedUnitCostCents;
              return <div key={payItem.id}>
                <div className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-border/70 px-3 py-2 md:grid-cols-[minmax(150px,1fr)_72px_82px] xl:grid-cols-[minmax(150px,1fr)_62px_72px_82px_82px] ${itemSelected ? "bg-orange-500/10" : "bg-card/35"}`}>
                  <button type="button" onClick={() => { onTogglePayItem(payItem.id); onChoose({ kind: "pay_item", id: payItem.id, sectionId: section.id, payItemId: payItem.id }); }} className="flex min-w-0 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {itemExpanded ? <ChevronDown className="mt-0.5 size-3.5 shrink-0" /> : <ChevronRight className="mt-0.5 size-3.5 shrink-0" />}<span className="min-w-0"><span className="block truncate font-mono text-[10px] text-orange-300">{payItem.officialItemNumber}</span><span className="block truncate text-xs font-semibold">{payItem.estimatorDescription || payItem.description}</span><span className="mt-1 flex flex-wrap gap-1"><Badge variant="outline" className={`h-4 px-1 text-[8px] capitalize ${statusClass(payItem.reviewStatus)}`}>{label(payItem.reviewStatus)}</Badge>{payItem.quantityStatus === "takeoff_required" && <Badge variant="outline" className="h-4 border-warning/40 px-1 text-[8px] text-warning-foreground">Takeoff</Badge>}</span></span>
                  </button>
                  <div className="hidden text-right font-mono text-[11px] xl:block xl:self-center">{quantity(payItem.bidQuantity, payItem.bidUnit)}</div><div className="hidden text-right text-[11px] text-muted-foreground md:block md:self-center">{payItem.costCodes.length} codes</div><div className="hidden text-right font-mono text-[11px] xl:block xl:self-center">{money(derived)}</div><div className="self-center text-right font-mono text-[11px] font-semibold">{money(payItem.directCostCents)}</div>
                </div>
                {itemExpanded && payItem.costCodes.map((code) => {
                  const codeSelected = selection.id === code.id;
                  return <div key={code.id}>
                    <button type="button" onClick={() => onChoose({ kind: "cost_code", id: code.id, sectionId: section.id, payItemId: payItem.id, costCodeId: code.id })} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-border/50 py-2 pl-9 pr-3 text-left transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(150px,1fr)_72px_82px] xl:grid-cols-[minmax(150px,1fr)_62px_72px_82px_82px] ${codeSelected ? "border-l-2 border-l-orange-500 bg-orange-500/10" : ""}`}>
                      <span className="min-w-0"><span className="flex items-center gap-2"><span className="font-mono text-[10px] text-info-foreground">{code.code}</span><span className="truncate text-[11px] font-medium">{code.description}</span></span><span className="mt-1 flex flex-wrap gap-1"><Badge variant="outline" className={`h-4 px-1 text-[8px] capitalize ${statusClass(code.reviewStatus)}`}>{label(code.reviewStatus)}</Badge><Badge variant="outline" className={`h-4 px-1 text-[8px] capitalize ${statusClass(code.pricingStatus)}`}>{label(code.pricingStatus)}</Badge>{code.reconciliationIssues.length > 0 && <Badge variant="outline" className="h-4 border-danger/40 px-1 text-[8px] text-danger-foreground">{code.reconciliationIssues.length} issues</Badge>}</span></span>
                      <span className="hidden self-center text-right font-mono text-[11px] text-muted-foreground xl:block">{code.resources.length} res.</span><span className="hidden self-center text-right font-mono text-[11px] md:block">{quantity(code.productionQuantity, code.productionUnit)}</span><span className="hidden self-center text-right font-mono text-[11px] xl:block">{code.productionQuantity && code.directCostCents !== undefined ? money(Math.round(code.directCostCents / code.productionQuantity)) : "—"}</span><span className="self-center text-right font-mono text-[11px] font-semibold">{money(code.directCostCents)}</span>
                    </button>
                    {codeSelected && code.resources.length > 0 && <div className="border-t border-border/40 bg-background/45 py-1 pl-14 pr-3">{code.resources.map((resource) => <button key={resource.id} type="button" onClick={() => onChoose({ kind: "resource", id: resource.id, sectionId: section.id, payItemId: payItem.id, costCodeId: code.id })} className={`grid w-full grid-cols-[minmax(0,1fr)_80px_90px] gap-2 border-b border-border/30 py-1.5 text-left text-[10px] last:border-b-0 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selection.id === resource.id ? "text-orange-300" : "text-muted-foreground"}`}><span className="truncate"><span className="mr-2 uppercase tracking-wider">{resource.resourceClass}</span>{resource.description}</span><span className="text-right font-mono">{resource.quantity?.toLocaleString() || "—"} {resource.unit}</span><span className="text-right font-mono">{money(resource.directCostCents)}</span></button>)}</div>}
                  </div>;
                })}
              </div>;
            })}
          </div>;
        })}
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-x-4 border-t border-border bg-card px-3 py-2 text-[10px] sm:grid-cols-5"><Total label="Direct" value={totals.directCostCents} /><Total label={`OH ${workspace.overheadBasisPoints / 100}%`} value={totals.overheadCents} /><Total label={`Profit ${workspace.profitBasisPoints / 100}%`} value={totals.profitCents} /><Total label={`Bond ${workspace.bondBasisPoints / 100}%`} value={totals.bondCents} /><Total label="Grand total" value={totals.grandTotalCents} accent /></div>
    </section>
  );
}

function Total({ label: totalLabel, value, accent }: { label: string; value: number; accent?: boolean }) {
  return <div className="flex items-center justify-between gap-2 sm:block sm:text-right"><span className="uppercase tracking-wider text-muted-foreground">{totalLabel}</span><div className={`font-mono font-semibold ${accent ? "text-success-foreground" : ""}`}>{money(value)}</div></div>;
}

function ContextPanel({ projectId, workspace, tab, setTab, selection, title, costCode, links, risks, rfqs, submittals, history, busy, onPost }: {
  projectId: string; workspace: HeliosEstimateWorkspace; tab: string; setTab: (value: string) => void; selection: CockpitSelection; title: string;
  costCode?: HeliosEstimateCostCode; links: HeliosEstimateEvidenceLink[]; risks: HeliosEstimateRisk[]; rfqs: HeliosEstimateRfq[]; submittals: HeliosEstimateSubmittal[];
  history: HeliosEstimateWorkspace["decisionHistory"]; busy: boolean;
  onPost: (path: "build" | "support" | "review", input: HeliosEstimateBuildInput | HeliosEstimateSupportInput | Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <aside aria-label="Contextual intelligence and proof" className="flex h-[520px] min-h-0 flex-col lg:col-span-2 xl:col-span-1 xl:h-auto">
      <div className="shrink-0 border-b border-border px-3 py-2.5"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-info-foreground">Intelligence & proof</div><h2 className="mt-0.5 truncate text-sm font-semibold">{title}</h2></div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="h-auto w-full shrink-0 justify-start rounded-none border-b border-border bg-muted/10 px-2 py-1">
          <TabsTrigger value="proof" className="px-2 text-[10px]"><FileSearch />Proof</TabsTrigger><TabsTrigger value="risk" className="px-2 text-[10px]"><ShieldAlert />Risk</TabsTrigger><TabsTrigger value="procurement" className="px-2 text-[10px]"><ShoppingCart />Buyout</TabsTrigger><TabsTrigger value="history" className="px-2 text-[10px]"><History />History</TabsTrigger>
        </TabsList>
        <TabsContent value="proof" className="min-h-0 flex-1 overflow-y-auto p-3"><ProofContext projectId={projectId} workspace={workspace} links={links} busy={busy} onPost={onPost} /></TabsContent>
        <TabsContent value="risk" className="min-h-0 flex-1 overflow-y-auto p-3"><RiskContext risks={risks} busy={busy} onPost={onPost} /></TabsContent>
        <TabsContent value="procurement" className="min-h-0 flex-1 overflow-y-auto p-3"><ProcurementContext projectId={projectId} workspace={workspace} costCode={costCode} rfqs={rfqs} submittals={submittals} /></TabsContent>
        <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto p-3"><HistoryContext history={history} /></TabsContent>
      </Tabs>
      <div className="shrink-0 border-t border-border bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground">Selected: <span className="capitalize text-foreground">{label(selection.kind)}</span></div>
    </aside>
  );
}

function ProofContext({ projectId, workspace, links, busy, onPost }: { projectId: string; workspace: HeliosEstimateWorkspace; links: HeliosEstimateEvidenceLink[]; busy: boolean; onPost: ContextPanelProps["onPost"] }) {
  if (links.length === 0) return <EmptyContext icon={<FileSearch />} title="No direct proof linked" detail="Select another estimate record or open the full evidence matrix." />;
  return <div className="space-y-3">{links.map((link) => {
    const evidence = workspace.evidence.find((row) => row.id === link.evidenceId);
    return <article key={link.id} className="rounded-lg border border-border bg-background/45 p-3">
      <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-semibold text-foreground">{evidence?.documentName || "Project document"}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{evidence?.pageNumber ? `PDF page ${evidence.pageNumber} · ` : ""}{evidence?.locator}</div></div><Badge variant="outline" className={`text-[9px] capitalize ${statusClass(link.verificationStatus)}`}>{link.verificationStatus}</Badge></div>
      <blockquote className="mt-3 border-l-2 border-orange-500/60 pl-3 text-[11px] leading-4 text-muted-foreground">{evidence?.excerpt || "Citation text unavailable."}</blockquote>
      <div className="mt-3 flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href={`/projects/${projectId}/documents/${evidence?.documentId}/content${evidence?.pageNumber ? `#page=${evidence.pageNumber}` : ""}`} target="_blank"><ArrowUpRight />Open source</Link></Button><Button size="sm" disabled={busy || link.verificationStatus === "verified"} onClick={() => onPost("support", { action: "verify_evidence", evidenceId: link.evidenceId, recordType: link.recordType, recordId: link.recordId }, "Evidence verified and recorded.")}><Check />Verify</Button></div>
    </article>;
  })}</div>;
}

function RiskContext({ risks, busy, onPost }: { risks: HeliosEstimateRisk[]; busy: boolean; onPost: ContextPanelProps["onPost"] }) {
  if (risks.length === 0) return <EmptyContext icon={<ShieldCheck />} title="No linked open risk" detail="The selected record has no active risk-register connection." />;
  return <div className="space-y-3">{risks.map((risk) => <article key={risk.id} className="rounded-lg border border-border bg-background/45 p-3"><div className="flex items-center justify-between gap-2"><Badge variant="outline" className={`text-[9px] uppercase ${severityClass(risk.severity === "critical" ? "critical" : risk.severity === "high" ? "high" : risk.severity === "medium" ? "medium" : "low")}`}>{risk.severity}</Badge><span className="font-mono text-[10px]">{compactMoney(risk.expectedExposureCents)}</span></div><h3 className="mt-2 text-xs font-semibold">{risk.title}</h3><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{risk.detail}</p><div className="mt-2 rounded-md bg-muted/25 p-2 text-[10px]"><span className="font-semibold text-foreground">Mitigation: </span><span className="text-muted-foreground">{risk.mitigation}</span></div><div className="mt-3 grid grid-cols-2 gap-1.5">{(["base_estimate", "contingency", "qualification", "no_carry"] as const).map((decision) => <Button key={decision} size="sm" variant={risk.carryDecision === decision ? "default" : "outline"} disabled={busy} onClick={() => onPost("support", { action: "set_risk_decision", riskId: risk.id, riskCarryDecision: decision }, `Risk disposition set to ${label(decision)}.`)} className="justify-start text-[10px]"><Check />{label(decision)}</Button>)}</div></article>)}</div>;
}

function ProcurementContext({ projectId, workspace, costCode, rfqs, submittals }: { projectId: string; workspace: HeliosEstimateWorkspace; costCode?: HeliosEstimateCostCode; rfqs: HeliosEstimateRfq[]; submittals: HeliosEstimateSubmittal[] }) {
  const hasRfq = costCode ? workspace.rfqs.some((row) => row.linkedCostCodeIds.includes(costCode.id) && row.reviewStatus !== "rejected") : false;
  const hasSubmittal = costCode ? workspace.submittals.some((row) => row.linkedCostCodeIds.includes(costCode.id) && row.reviewStatus !== "rejected") : false;
  return <div className="space-y-3">{costCode && ["accepted", "corrected"].includes(costCode.reviewStatus) && <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-orange-300">One-click package actions</div><EstimateSupportQuickActions projectId={projectId} estimateId={workspace.id} costCodeId={costCode.id} hasRfq={hasRfq} hasSubmittal={hasSubmittal} /></div>}{rfqs.map((rfq) => <article key={rfq.id} className="rounded-lg border border-border bg-background/45 p-3"><div className="flex items-start justify-between gap-2"><ShoppingCart className="size-4 text-info-foreground" /><Badge variant="outline" className={`text-[9px] capitalize ${statusClass(rfq.status)}`}>{label(rfq.status)}</Badge></div><h3 className="mt-2 text-xs font-semibold">{rfq.title}</h3><p className="mt-1 text-[10px] text-muted-foreground">{rfq.vendors.length} vendors · {rfq.requiredQuoteDate || "Quote date not set"}</p></article>)}{submittals.map((row) => <article key={row.id} className="rounded-lg border border-border bg-background/45 p-3"><div className="flex items-start justify-between gap-2"><FileCheck2 className="size-4 text-info-foreground" /><Badge variant="outline" className={`text-[9px] capitalize ${statusClass(row.status)}`}>{label(row.status)}</Badge></div><h3 className="mt-2 text-xs font-semibold">{row.description}</h3><p className="mt-1 text-[10px] text-muted-foreground">{row.specification || "Specification not established"}</p></article>)}{rfqs.length === 0 && submittals.length === 0 && !costCode && <EmptyContext icon={<PackageCheck />} title="No linked procurement" detail="Select a cost code to see RFQs, submittals, and package actions." />}</div>;
}

function HistoryContext({ history }: { history: HeliosEstimateWorkspace["decisionHistory"] }) {
  if (history.length === 0) return <EmptyContext icon={<History />} title="No decisions recorded" detail="The append-only review history will appear here." />;
  return <ol className="space-y-2">{history.map((row) => <li key={row.id} className="border-l-2 border-border pl-3 text-[10px]"><div className="font-semibold capitalize text-foreground">{label(row.action)}</div><div className="mt-0.5 text-muted-foreground">{row.reviewerName} · {formatTimestamp(row.createdAt)}</div>{row.comment && <p className="mt-1 text-muted-foreground">{row.comment}</p>}</li>)}</ol>;
}

function EmptyContext({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground"><div className="mx-auto mb-2 flex size-8 items-center justify-center">{icon}</div><div className="text-xs font-semibold text-foreground">{title}</div><p className="mt-1 text-[10px] leading-4">{detail}</p></div>;
}

type ContextPanelProps = Parameters<typeof ContextPanel>[0];

function DecisionDock({ projectId, workspace, selection, title, section, payItem, code, resource, quantityRecord, evidenceLink, risk, rfq, submittal, busy, onPost }: {
  projectId: string; workspace: HeliosEstimateWorkspace; selection: CockpitSelection; title: string; section?: HeliosEstimateSection; payItem?: HeliosOwnerPayItem; code?: HeliosEstimateCostCode; resource?: HeliosEstimateResource; quantityRecord?: HeliosEstimateQuantityRecord; evidenceLink?: HeliosEstimateEvidenceLink; risk?: HeliosEstimateRisk; rfq?: HeliosEstimateRfq; submittal?: HeliosEstimateSubmittal; busy: boolean; onPost: ContextPanelProps["onPost"];
}) {
  const nextRfq = rfq && ({ draft: "ready_to_send", ready_to_send: "sent", sent: "quote_received", quote_received: "quote_accepted" } as const)[rfq.status as "draft" | "ready_to_send" | "sent" | "quote_received"];
  const nextSubmittal = submittal && ({ draft: "required", required: "assigned", assigned: "submitted", submitted: "accepted" } as const)[submittal.status as "draft" | "required" | "assigned" | "submitted"];
  const hasRfq = code ? workspace.rfqs.some((row) => row.linkedCostCodeIds.includes(code.id) && row.reviewStatus !== "rejected") : false;
  const hasSubmittal = code ? workspace.submittals.some((row) => row.linkedCostCodeIds.includes(code.id) && row.reviewStatus !== "rejected") : false;
  return (
    <footer className="sticky bottom-0 z-20 grid shrink-0 gap-3 border-t border-border bg-card/95 px-3 py-2.5 shadow-[0_-12px_30px_rgba(0,0,0,.22)] backdrop-blur md:grid-cols-[minmax(220px,.9fr)_minmax(0,1.5fr)] md:items-center">
      <div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Selected {label(selection.kind)}</div><div className="truncate text-xs font-semibold">{title}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{payItem?.officialItemNumber || section?.name || label(selection.kind)}{code ? ` · ${label(code.scopeOwnership)} · ${money(code.directCostCents)}` : ""}</div></div>
      <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
        {section && selection.kind === "section" && ["proposed", "deferred"].includes(section.reviewStatus) && <Button size="sm" disabled={busy} onClick={() => onPost("review", { recordType: "section", recordId: section.id, action: "accept" }, "Estimate section accepted.")}><Check />Accept section</Button>}
        {payItem && selection.kind === "pay_item" && ["proposed", "deferred"].includes(payItem.reviewStatus) && <Button size="sm" disabled={busy} onClick={() => onPost("review", { recordType: "pay_item", recordId: payItem.id, action: "accept" }, "Owner pay item accepted.")}><Check />Accept item</Button>}
        {code && selection.kind === "cost_code" && ["proposed", "deferred"].includes(code.reviewStatus) && <Button size="sm" disabled={busy} onClick={() => onPost("build", { action: "accept_cost_code", costCodeId: code.id }, "Cost code accepted.")}><Check />Accept cost code</Button>}
        {resource && resource.reviewStatus === "proposed" && <Button size="sm" disabled={busy} onClick={() => onPost("build", { action: "accept_resource", resourceId: resource.id }, "Resource accepted.")}><Check />Accept resource</Button>}
        {quantityRecord && quantityRecord.reviewStatus === "proposed" && <Button size="sm" disabled={busy} onClick={() => onPost("build", { action: "accept_quantity", quantityId: quantityRecord.id }, "Production quantity accepted.")}><Check />Accept quantity</Button>}
        {evidenceLink && evidenceLink.verificationStatus !== "verified" && <Button size="sm" disabled={busy} onClick={() => onPost("support", { action: "verify_evidence", evidenceId: evidenceLink.evidenceId, recordType: evidenceLink.recordType, recordId: evidenceLink.recordId }, "Evidence verified and recorded.")}><ShieldCheck />Verify evidence</Button>}
        {risk && <><Button size="sm" disabled={busy} onClick={() => onPost("support", { action: "set_risk_decision", riskId: risk.id, riskCarryDecision: "base_estimate" }, "Risk carried in base estimate.")}><CircleDollarSign />Carry in base</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => onPost("support", { action: "set_risk_decision", riskId: risk.id, riskCarryDecision: "contingency" }, "Risk carried in contingency.")}><ShieldAlert />Contingency</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => onPost("support", { action: "set_risk_decision", riskId: risk.id, riskCarryDecision: "qualification" }, "Risk carried as a qualification.")}>Qualify</Button></>}
        {rfq && nextRfq && <Button size="sm" disabled={busy} onClick={() => onPost("support", { action: "set_rfq_status", rfqId: rfq.id, rfqStatus: nextRfq }, `RFQ advanced to ${label(nextRfq)}.`)}><ShoppingCart />{label(nextRfq)}</Button>}
        {submittal && nextSubmittal && <Button size="sm" disabled={busy} onClick={() => onPost("support", { action: "set_submittal_status", submittalId: submittal.id, submittalStatus: nextSubmittal }, `Submittal advanced to ${label(nextSubmittal)}.`)}><FileCheck2 />{label(nextSubmittal)}</Button>}
        {code && ["accepted", "corrected"].includes(code.reviewStatus) && <EstimateSupportQuickActions projectId={projectId} estimateId={workspace.id} costCodeId={code.id} hasRfq={hasRfq} hasSubmittal={hasSubmittal} />}
        {code && <Button asChild size="sm" variant="outline"><Link href={`/projects/${projectId}/estimate?costCode=${code.id}`}><Calculator />Open worksheet</Link></Button>}
        {!section && !payItem && !code && !resource && !quantityRecord && !evidenceLink && !risk && !rfq && !submittal && <Button asChild size="sm"><Link href={`/projects/${projectId}/estimate`}><Banknote />Open full estimate</Link></Button>}
      </div>
    </footer>
  );
}
