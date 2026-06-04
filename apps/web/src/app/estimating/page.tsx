"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  CorrespondenceSignatureProfile,
  defaultSignatureProfile,
  formatCorrespondenceSignature,
  loadSignatureProfile,
} from "@/lib/correspondence-signature";

type RfqNotes = {
  specNotes?: string;
  packageText?: string;
  itemIds?: string[];
  itemSnapshots?: Array<Record<string, unknown>>;
  vendor?: Record<string, unknown>;
  lineResponses?: Record<string, RfqLineResponse>;
};

type RfqLineResponse = {
  unitPrice?: number;
  totalPrice?: number;
  leadTime?: string;
  expiration?: string;
  exclusions?: string;
  alternates?: string;
  selected?: boolean;
};

const VENDOR_CATEGORIES = [
  "Concrete",
  "Electrical",
  "Pipe & Fittings",
  "Steel/Rebar",
  "Equipment",
  "Subcontractor",
  "Material Supplier",
  "Other",
];

function money(value: unknown) {
  const amount = Number(value || 0);
  return "$" + amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function safeRfqNotes(value: unknown): RfqNotes {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { specNotes: String(value) };
  }
}

function missingResponseDetails(response?: RfqLineResponse) {
  const missing: string[] = [];
  if (!response?.unitPrice && !response?.totalPrice) missing.push("price");
  if (!response?.leadTime) missing.push("lead time");
  if (!response?.expiration) missing.push("expiration");
  if (!response?.exclusions) missing.push("exclusions");
  return missing;
}

function itemLabel(item: Record<string, unknown>) {
  return [item.section, item.description].filter(Boolean).join(" - ") || "Estimate item";
}

type EstimatingToolKey =
  | "cockpit"
  | "estimates"
  | "rfq"
  | "takeoff"
  | "cost"
  | "materials"
  | "labor"
  | "equipment"
  | "history"
  | "risk"
  | "war-room"
  | "calendar"
  | "analytics"
  | "settings";

const ESTIMATING_TOOLS: Array<{ key: EstimatingToolKey; label: string; icon: string; description?: string }> = [
  { key: "cockpit", label: "Dashboard", icon: "DB", description: "Bid-first command center" },
  { key: "estimates", label: "Estimates", icon: "EST", description: "Bid portfolio and estimate list" },
  { key: "rfq", label: "RFQ Desk", icon: "RFQ", description: "Draft, compare, and award quote packages" },
  { key: "takeoff", label: "Takeoff Handoff", icon: "QTY", description: "Quantities and proof entering the bid" },
  { key: "cost", label: "Cost Database", icon: "COST", description: "Company cost health" },
  { key: "materials", label: "Materials", icon: "MAT", description: "Shared material costs" },
  { key: "labor", label: "Labor", icon: "LAB", description: "Shared labor costs" },
  { key: "equipment", label: "Equipment", icon: "EQ", description: "Shared equipment costs" },
  { key: "history", label: "Historical Bid Database", icon: "HIST", description: "Past bid intelligence" },
  { key: "risk", label: "Risk Database", icon: "RISK", description: "Known risk language and patterns" },
  { key: "war-room", label: "Bid War Room", icon: "WAR", description: "Bid day pressure and checklist" },
  { key: "calendar", label: "Bid Calendar", icon: "CAL", description: "Due dates and bid milestones" },
  { key: "analytics", label: "Win/Loss Analytics", icon: "WIN", description: "Win rate and lessons learned" },
  { key: "settings", label: "Settings", icon: "SET", description: "Estimator preferences" },
];

const INSPIRATION_LINES = [
  "Anyone can do a takeoff and calculate a markup. OpsSlate predicts whether the number can survive.",
  "The bid is where the money is made or lost.",
  "Protect the margin before the contract exists.",
  "Find the miss before bid day finds it for you.",
  "Do not tell me the price is close. Show me why it survives.",
  "Talent builds the estimate. Discipline wins the bid.",
];

function statusLabel(status?: string) {
  const clean = String(status || "draft").trim();
  if (!clean) return "Draft";
  return clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[-_]/g, " ");
}

function estimateTotal(items: Array<Record<string, unknown>> = []) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0) || 0;
    const unitCost = Number(item.unitCost || 0) || 0;
    const taxPct = Number(item.taxPct || 0) || 0;
    return sum + quantity * unitCost * (1 + taxPct / 100);
  }, 0);
}

function rfqCounts(rfqs: Array<Record<string, unknown>> = []) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: rfqs.length,
    draft: rfqs.filter((rfq) => String(rfq.status || "").toLowerCase() === "draft").length,
    open: rfqs.filter((rfq) => !["received", "accepted"].includes(String(rfq.status || "").toLowerCase())).length,
    overdue: rfqs.filter((rfq) => String(rfq.dueDate || "") && String(rfq.dueDate || "") < today && !["received", "accepted"].includes(String(rfq.status || "").toLowerCase())).length,
    received: rfqs.filter((rfq) => ["received", "accepted"].includes(String(rfq.status || "").toLowerCase())).length,
  };
}

function scheduleReadinessScore(items: Array<Record<string, unknown>> = []) {
  if (!items.length) return 0;
  const ready = items.filter((item) => {
    const text = `${item.section || ""} ${item.notes || ""} ${item.sourceSpecSection || ""}`.toLowerCase();
    return Boolean(item.section || item.sourceSpecSection || text.includes("phase") || text.includes("milestone") || text.includes("lead time"));
  }).length;
  return Math.round((ready / items.length) * 100);
}

function predictiveSignalsForEstimate({
  estimate,
  items,
  rfqSummary,
  costItems,
}: {
  estimate?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  rfqSummary: ReturnType<typeof rfqCounts>;
  costItems: Array<Record<string, unknown>>;
}) {
  const signals: Array<{ label: string; detail: string; severity: "high" | "medium" | "low" }> = [];
  const unsectioned = items.filter((item) => !item.section && !item.sourceSpecSection).length;
  const zeroCost = items.filter((item) => Number(item.unitCost || 0) <= 0).length;
  const materialHeavy = items.filter((item) => /(material|concrete|asphalt|pipe|steel|wire|conduit|stone|aggregate|equipment)/i.test(`${item.description || ""} ${item.section || ""}`)).length;
  if (!estimate?.projectId) signals.push({ label: "Project context missing", detail: "Attach a Project Management record so bid data can hand off cleanly.", severity: "medium" });
  if (unsectioned) signals.push({ label: "Scope map gap", detail: `${unsectioned} item${unsectioned === 1 ? "" : "s"} lack a spec/section connection.`, severity: "high" });
  if (zeroCost) signals.push({ label: "Placeholder pricing", detail: `${zeroCost} line${zeroCost === 1 ? "" : "s"} have no unit cost.`, severity: "high" });
  if (materialHeavy && rfqSummary.total === 0) signals.push({ label: "RFQ exposure", detail: "Material-heavy work exists with no quote records yet.", severity: "high" });
  if (rfqSummary.overdue) signals.push({ label: "Vendor response risk", detail: `${rfqSummary.overdue} RFQ package${rfqSummary.overdue === 1 ? "" : "s"} appear overdue.`, severity: "medium" });
  if (!costItems.length) signals.push({ label: "Cost database empty", detail: "Seed labor, equipment, and material costs before trusting predictions.", severity: "medium" });
  if (!estimate?.bidDate) signals.push({ label: "Bid calendar gap", detail: "Bid date is missing, so bid-day pressure cannot be predicted.", severity: "low" });
  return signals.slice(0, 5);
}

export default function EstimatingPage() {
  return (
    <AppShell showSidebar={false}>
      <EstimatingWorkspace />
    </AppShell>
  );
}

function EstimatorCommandCenter({
  activeTool,
  onSelect,
}: {
  activeTool: EstimatingToolKey;
  onSelect: (tool: EstimatingToolKey) => void;
}) {
  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-7rem)] w-64 shrink-0 overflow-y-auto rounded-lg border border-border bg-card/85 p-3 xl:block">
      <div className="mb-4 border-b border-border pb-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Estimator Command Center</div>
        <div className="mt-2 text-lg font-black text-white">Bid Control</div>
        <p className="mt-1 text-xs text-muted-foreground">The bid-first tools that protect scope, price, risk, and schedule.</p>
      </div>
      <nav className="space-y-1">
        {ESTIMATING_TOOLS.map((tool) => {
          const active = tool.key === activeTool;
          return (
            <button
              key={tool.key}
              type="button"
              onClick={() => onSelect(tool.key)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                active
                  ? "bg-orange-500/18 font-semibold text-orange-300 ring-1 ring-orange-500/25"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-white"
              }`}
            >
              <span className="grid h-5 min-w-8 place-items-center rounded text-[9px] font-black text-current">{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function CockpitMetricCard({ label, value, sub, tone = "orange" }: { label: string; value: string | number; sub: string; tone?: "orange" | "green" | "blue" | "purple" | "red" }) {
  const tones = {
    orange: "text-orange-400",
    green: "text-green-400",
    blue: "text-blue-300",
    purple: "text-purple-300",
    red: "text-red-300",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={`text-2xl font-black ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-100">{label}</div>
      <div className="mt-2 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function EstimatingWorkspace() {
  const { user } = useAuth();
  const estimates = useQuery(api.estimating.listEstimates, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const vendors = useQuery(api.vendors.list, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const costItems = useQuery(api.estimating.listCostItems, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const branding = useQuery(api.companyBranding.get, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any;

  const [activeTool, setActiveTool] = useState<EstimatingToolKey>("cockpit");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const selectedEstimate = (estimates || []).find((estimate) => String(estimate._id) === selectedEstimateId) || estimates?.[0];
  const estimateId = selectedEstimate?._id ? String(selectedEstimate._id) : "";

  const estimateItems = useQuery(
    api.estimating.listEstimateItems,
    estimateId ? { estimateId: estimateId as Id<"estimates"> } : "skip"
  ) as any[] | undefined;
  const rfqs = useQuery(
    api.estimating.listRfqs,
    user && estimateId ? { companyId: user.companyId, estimateId: estimateId as Id<"estimates"> } : "skip"
  ) as any[] | undefined;

  const createRfq = useMutation(api.estimating.createRfq);
  const updateRfq = useMutation(api.estimating.updateRfq);
  const updateEstimateItem = useMutation(api.estimating.updateEstimateItem);
  const createVendor = useMutation(api.vendors.create);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [inlineRfqItemId, setInlineRfqItemId] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [pricingDueDate, setPricingDueDate] = useState("");
  const [specNotes, setSpecNotes] = useState("");
  const [signatureProfile, setSignatureProfile] = useState<CorrespondenceSignatureProfile>(() => defaultSignatureProfile(user));
  const [creatingDrafts, setCreatingDrafts] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", contactName: "", email: "", phone: "", category: "Material Supplier" });
  const [responseDraft, setResponseDraft] = useState({
    rfqId: "",
    itemId: "",
    unitPrice: "",
    totalPrice: "",
    leadTime: "",
    expiration: "",
    exclusions: "",
    alternates: "",
  });

  const selectedItems = useMemo(() => {
    return (estimateItems || []).filter((item) => selectedItemIds.includes(String(item._id)));
  }, [estimateItems, selectedItemIds]);

  const rfqsWithNotes = useMemo(() => {
    return (rfqs || []).map((rfq) => ({ ...rfq, parsedNotes: safeRfqNotes(rfq.notes) }));
  }, [rfqs]);

  const selectedVendors = (vendors || []).filter((vendor) => selectedVendorIds.includes(String(vendor._id)));
  const inlineRfqItem = (estimateItems || []).find((item) => String(item._id) === inlineRfqItemId);
  const rfqStatusByItemId = useMemo(() => {
    const map = new Map<string, string>();
    rfqsWithNotes.forEach((rfq) => {
      const itemIds = rfq.parsedNotes?.itemIds || [];
      itemIds.forEach((itemId: string) => {
        const current = map.get(itemId);
        const next = String(rfq.status || "draft");
        if (!current || current === "draft" || next === "received" || next === "accepted") map.set(itemId, next);
      });
    });
    return map;
  }, [rfqsWithNotes]);
  const selectedProject = (projects || []).find((project) => String(project._id) === String(selectedEstimate?.projectId || ""));
  const selectedEstimateTotal = useMemo(() => estimateTotal(estimateItems || []), [estimateItems]);
  const rfqSummary = useMemo(() => rfqCounts(rfqsWithNotes), [rfqsWithNotes]);
  const scheduleScore = useMemo(() => scheduleReadinessScore(estimateItems || []), [estimateItems]);
  const predictiveSignals = useMemo(() => predictiveSignalsForEstimate({
    estimate: selectedEstimate,
    items: estimateItems || [],
    rfqSummary,
    costItems: costItems || [],
  }), [selectedEstimate, estimateItems, rfqSummary, costItems]);
  const activeBids = (estimates || []).filter((estimate) => !["won", "lost", "archived"].includes(String(estimate.status || "").toLowerCase())).length;
  const draftBids = (estimates || []).filter((estimate) => String(estimate.status || "").toLowerCase() === "draft").length;
  const wonBids = (estimates || []).filter((estimate) => String(estimate.status || "").toLowerCase() === "won").length;
  const submittedOrClosed = (estimates || []).filter((estimate) => ["submitted", "won", "lost"].includes(String(estimate.status || "").toLowerCase())).length;
  const winRate = submittedOrClosed ? Math.round((wonBids / submittedOrClosed) * 100) : 0;
  const inspirationLine = INSPIRATION_LINES[(estimates || []).length % INSPIRATION_LINES.length];

  useEffect(() => {
    setSignatureProfile(loadSignatureProfile(user));
  }, [user?._id, user?.email, user?.name]);

  function toggleItem(id: string, checked: boolean) {
    setSelectedItemIds((current) => checked ? [...new Set([...current, id])] : current.filter((itemId) => itemId !== id));
  }

  function toggleVendor(id: string, checked: boolean) {
    setSelectedVendorIds((current) => checked ? [...new Set([...current, id])] : current.filter((vendorId) => vendorId !== id));
  }

  function requestQuoteForItem(item: Record<string, unknown>) {
    const itemId = String(item._id);
    setInlineRfqItemId(itemId);
    setSelectedItemIds([itemId]);
  }

  function rfqStatusForItem(item: Record<string, unknown>) {
    return rfqStatusByItemId.get(String(item._id)) || "No RFQ";
  }

  function buildPackageText(vendor: Record<string, unknown>, items: Array<Record<string, unknown>>) {
    const companyHeader = [
      branding?.name || "OpsSlate",
      [branding?.address, branding?.city, branding?.state, branding?.zip].filter(Boolean).join(", "),
      [branding?.phone, branding?.email, branding?.website].filter(Boolean).join(" | "),
    ].filter(Boolean);
    const itemLines = items.map((item, index) => {
      const qty = `${item.quantity || 0} ${item.unit || "LS"}`;
      return `${index + 1}. ${item.description || "Estimate item"} | Qty: ${qty} | Section: ${item.section || "Unassigned"} | Current unit cost: ${money(item.unitCost)}`;
    });
    return [
      ...companyHeader,
      "",
      `REQUEST FOR QUOTE - ${selectedEstimate?.name || "Estimate"}`,
      `Vendor: ${vendor.name || "Selected vendor"}`,
      pricingDueDate ? `Pricing due date: ${pricingDueDate}` : "Pricing due date: Please confirm as soon as possible.",
      "",
      "Material requisition",
      ...itemLines,
      "",
      "Specs / attachments / plan notes",
      specNotes || "Provide pricing based on the project plans, specifications, addenda, and takeoff backup provided by the estimator.",
      "",
      "Please include unit price, total price, lead time, quote expiration, freight, taxes, exclusions, alternates, substitutions, and contact information.",
      "",
      formatCorrespondenceSignature(signatureProfile, branding?.name, user),
    ].join("\n");
  }

  async function addVendorInline() {
    if (!user || !newVendor.name.trim()) return;
    const id = await createVendor({
      companyId: user.companyId,
      name: newVendor.name.trim(),
      contactName: newVendor.contactName.trim() || undefined,
      email: newVendor.email.trim() || undefined,
      phone: newVendor.phone.trim() || undefined,
      category: newVendor.category,
      notes: "Added from Estimating RFQ Workspace",
    });
    setSelectedVendorIds((current) => [...new Set([...current, String(id)])]);
    setNewVendor({ name: "", contactName: "", email: "", phone: "", category: "Material Supplier" });
  }

  async function createDraftRfqs(itemsForRfq = selectedItems) {
    if (!user || !estimateId || !itemsForRfq.length || !selectedVendors.length) return;
    setCreatingDrafts(true);
    try {
      for (const vendor of selectedVendors) {
        const notes: RfqNotes = {
          specNotes,
          vendor: {
            id: String(vendor._id),
            name: vendor.name,
            contactName: vendor.contactName,
            email: vendor.email,
            phone: vendor.phone,
          },
          itemIds: itemsForRfq.map((item) => String(item._id)),
          itemSnapshots: itemsForRfq.map((item) => ({
            id: String(item._id),
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
            section: item.section,
            notes: item.notes,
          })),
          lineResponses: {},
          packageText: buildPackageText(vendor, itemsForRfq),
        };
        await createRfq({
          companyId: user.companyId,
          estimateId: estimateId as Id<"estimates">,
          vendorName: String(vendor.name || "Vendor"),
          status: "draft",
          dueDate: pricingDueDate || undefined,
          notes: JSON.stringify(notes),
        });
      }
      setSelectedItemIds([]);
      setSelectedVendorIds([]);
      setInlineRfqItemId("");
      setSpecNotes("");
    } finally {
      setCreatingDrafts(false);
    }
  }

  async function copyPackage(rfq: any) {
    await navigator.clipboard.writeText(rfq.parsedNotes?.packageText || "");
    alert("RFQ package copied.");
  }

  function mailtoForRfq(rfq: any) {
    const vendor = rfq.parsedNotes?.vendor || {};
    const subject = `RFQ - ${selectedEstimate?.name || "Estimate"} - ${rfq.vendorName}`;
    const body = rfq.parsedNotes?.packageText || "";
    return `mailto:${encodeURIComponent(String(vendor.email || ""))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function markSent(rfq: any) {
    await updateRfq({ id: rfq._id, status: "sent" });
  }

  async function saveLineResponse() {
    const rfq = rfqsWithNotes.find((item) => String(item._id) === responseDraft.rfqId);
    if (!rfq || !responseDraft.itemId) return;
    const notes = safeRfqNotes(rfq.notes);
    const totalPrice = Number(responseDraft.totalPrice || 0);
    const lineResponses = {
      ...(notes.lineResponses || {}),
      [responseDraft.itemId]: {
        unitPrice: Number(responseDraft.unitPrice || 0),
        totalPrice,
        leadTime: responseDraft.leadTime,
        expiration: responseDraft.expiration,
        exclusions: responseDraft.exclusions,
        alternates: responseDraft.alternates,
      },
    };
    const totalAmount = Object.values(lineResponses).reduce((sum, line) => sum + Number(line.totalPrice || 0), 0);
    await updateRfq({
      id: rfq._id,
      amount: totalAmount,
      status: "received",
      notes: JSON.stringify({ ...notes, lineResponses }),
    });
    setResponseDraft({ rfqId: "", itemId: "", unitPrice: "", totalPrice: "", leadTime: "", expiration: "", exclusions: "", alternates: "" });
  }

  async function applySelectedQuote(rfq: any, itemId: string) {
    const notes = safeRfqNotes(rfq.notes);
    const response = notes.lineResponses?.[itemId];
    const item = (estimateItems || []).find((entry) => String(entry._id) === itemId);
    if (!response || !item) return;

    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(response.unitPrice || (quantity ? Number(response.totalPrice || 0) / quantity : 0));
    const selectedNote = [
      item.notes || "",
      `Selected RFQ: ${rfq.vendorName}`,
      `Buy Out ($): ${money(response.totalPrice)}`,
      response.leadTime ? `Lead time: ${response.leadTime}` : "",
      response.exclusions ? `Exclusions: ${response.exclusions}` : "",
    ].filter(Boolean).join("\n");
    await updateEstimateItem({
      id: item._id,
      unitCost: unitPrice,
      notes: selectedNote,
    });
    const nextResponses = {
      ...(notes.lineResponses || {}),
      [itemId]: { ...response, selected: true },
    };
    await updateRfq({
      id: rfq._id,
      status: "accepted",
      notes: JSON.stringify({ ...notes, lineResponses: nextResponses }),
    });
  }

  if (!user) return null;
  const activeToolConfig = ESTIMATING_TOOLS.find((tool) => tool.key === activeTool) || ESTIMATING_TOOLS[0];
  const stagedTool = (
    <div className="rounded-lg border border-border bg-card p-6">
      <Badge className="mb-3 bg-orange-500/15 text-orange-300">{activeToolConfig.label}</Badge>
      <h1 className="text-3xl font-black text-white">{activeToolConfig.label}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{activeToolConfig.description}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">First-pass status</div>
          <div className="mt-2 text-lg font-bold text-white">Staged for buildout</div>
          <p className="mt-1 text-xs text-muted-foreground">This tool is now visible in the Estimator Command Center and ready for the shared database workflow.</p>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Shared data</div>
          <div className="mt-2 text-lg font-bold text-white">Project-aware</div>
          <p className="mt-1 text-xs text-muted-foreground">Designed to pull project, estimate, RFQ, cost, risk, and schedule alignment signals.</p>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Predictive layer</div>
          <div className="mt-2 text-lg font-bold text-white">Signal-ready</div>
          <p className="mt-1 text-xs text-muted-foreground">Future panels will feed the Predictive Bid Engine from the same database backbone.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex gap-5">
      <EstimatorCommandCenter activeTool={activeTool} onSelect={setActiveTool} />
      <main className="min-w-0 flex-1 space-y-5">
        <div className="xl:hidden">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Estimator Command Center</label>
          <select
            value={activeTool}
            onChange={(event) => setActiveTool(event.target.value as EstimatingToolKey)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
          >
            {ESTIMATING_TOOLS.map((tool) => <option key={tool.key} value={tool.key}>{tool.label}</option>)}
          </select>
        </div>
        {activeTool === "cockpit" ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge className="mb-3 bg-orange-500/15 text-orange-300">Bid Command Center</Badge>
                <h1 className="text-4xl font-black tracking-tight text-white">Estimating Cockpit</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Pipeline, bid day risk, cost database health, and takeoff handoff in one screen.
                </p>
                <p className="mt-3 max-w-3xl rounded-lg border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-sm font-semibold italic text-orange-100">
                  {inspirationLine}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setActiveTool("takeoff")}>Takeoff</Button>
                <Button variant="outline" onClick={() => setActiveTool("war-room")}>War Room</Button>
                <Button onClick={() => setActiveTool("estimates")}>+ New Estimate</Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <CockpitMetricCard label="Total Estimates" value={(estimates || []).length} sub={`${draftBids} draft${draftBids === 1 ? "" : "s"}`} />
              <CockpitMetricCard label="Active Bids" value={activeBids} sub="Bid work in motion" tone="blue" />
              <CockpitMetricCard label="Bid Value" value={money(selectedEstimateTotal)} sub={selectedEstimate?.name ? "Selected estimate total" : "No estimate selected"} />
              <CockpitMetricCard label="RFQs Open" value={rfqSummary.open} sub={`${rfqSummary.overdue} overdue`} tone={rfqSummary.overdue ? "red" : "purple"} />
              <CockpitMetricCard label="Schedule Readiness" value={`${scheduleScore}%`} sub="Estimate-to-scheduler handoff" tone={scheduleScore > 70 ? "green" : "orange"} />
            </div>

            <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
              <section className="rounded-lg border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Bid Portfolio</h2>
                    <p className="text-xs text-muted-foreground">Bid-first estimate control with project context attached.</p>
                  </div>
                  <div className="flex gap-2">
                    <input className="w-72 rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Search estimates, clients, scopes..." />
                    <Button variant="outline" size="sm" onClick={() => setActiveTool("analytics")}>Analytics</Button>
                  </div>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-background text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Bid</th>
                        <th className="p-3 text-left">Project</th>
                        <th className="p-3 text-left">Client</th>
                        <th className="p-3 text-left">Bid Date</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-left">RFQ</th>
                        <th className="p-3 text-left">Schedule</th>
                        <th className="p-3 text-left">Risk</th>
                        <th className="p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(estimates || []).map((estimate) => {
                        const project = (projects || []).find((entry) => String(entry._id) === String(estimate.projectId || ""));
                        const isSelected = String(estimate._id) === estimateId;
                        return (
                          <tr key={String(estimate._id)} className="border-t border-border">
                            <td className="p-3">
                              <div className="font-bold text-white">{estimate.name}</div>
                              <div className="text-xs text-muted-foreground">{estimate.description || "No scope note yet"}</div>
                            </td>
                            <td className="p-3 text-muted-foreground">{project?.name || estimate.location || "Project link needed"}</td>
                            <td className="p-3 text-muted-foreground">{estimate.client || project?.contractor || "No client"}</td>
                            <td className="p-3 text-muted-foreground">{estimate.bidDate || "No date"}</td>
                            <td className="p-3"><Badge variant="outline">{statusLabel(estimate.status)}</Badge></td>
                            <td className="p-3 text-muted-foreground">{estimate.bidType || estimate.buildingType || "General"}</td>
                            <td className="p-3"><Badge className="bg-blue-500/15 text-blue-200">{isSelected ? `${rfqSummary.total} records` : "Open RFQ Desk"}</Badge></td>
                            <td className="p-3"><Badge className={isSelected && scheduleScore > 70 ? "bg-green-500/15 text-green-300" : "bg-orange-500/15 text-orange-300"}>{isSelected ? `${scheduleScore}% ready` : "Needs map"}</Badge></td>
                            <td className="p-3"><Badge className={predictiveSignals.length ? "bg-red-500/15 text-red-300" : "bg-green-500/15 text-green-300"}>{isSelected ? `${predictiveSignals.length} signals` : "Review"}</Badge></td>
                            <td className="p-3"><Button size="sm" variant="outline" onClick={() => { setSelectedEstimateId(String(estimate._id)); setActiveTool("rfq"); }}>Open</Button></td>
                          </tr>
                        );
                      })}
                      {!(estimates || []).length && (
                        <tr>
                          <td colSpan={10} className="p-10 text-center text-muted-foreground">
                            No estimates yet. Create your first bid, then OpsSlate will start watching RFQ exposure, risk, and schedule readiness.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-lg border border-border bg-card p-4">
                  <h2 className="font-bold text-white">Bid Pulse</h2>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Submitted Bids", (estimates || []).filter((estimate) => String(estimate.status || "").toLowerCase() === "submitted").length, "bg-blue-400"],
                      ["Drafts Needing Review", draftBids, "bg-orange-400"],
                      ["RFQs Waiting", rfqSummary.open, "bg-purple-400"],
                      ["Won Bids", wonBids, "bg-green-400"],
                    ].map(([label, value, color]) => (
                      <div key={String(label)} className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 text-sm">
                        <span className="flex items-center gap-2 text-blue-100"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>
                        <span className="font-bold text-white">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-card p-4">
                  <h2 className="font-bold text-white">Predictive Bid Engine</h2>
                  <p className="mt-1 text-xs text-muted-foreground">What could move the number, hurt the margin, or break the handoff?</p>
                  <div className="mt-3 space-y-2">
                    {predictiveSignals.map((signal) => (
                      <div key={signal.label} className="rounded-md border border-border bg-background/50 p-3">
                        <div className={signal.severity === "high" ? "text-sm font-bold text-red-300" : signal.severity === "medium" ? "text-sm font-bold text-orange-300" : "text-sm font-bold text-blue-200"}>{signal.label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{signal.detail}</div>
                      </div>
                    ))}
                    {!predictiveSignals.length && (
                      <div className="rounded-md border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-200">No major predictive warnings on the selected estimate.</div>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-card p-4">
                  <h2 className="font-bold text-white">Cost Database</h2>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {["Labor", "Equipment", "Materials"].map((category) => {
                      const count = (costItems || []).filter((item) => String(item.category || "").toLowerCase().includes(category.toLowerCase())).length;
                      return (
                        <div key={category} className="rounded-md border border-border bg-background/50 p-3">
                          <div className="text-lg font-black text-white">{count}</div>
                          <div className="text-[10px] uppercase text-muted-foreground">{category}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-card p-4">
                  <h2 className="font-bold text-white">AI Estimator</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Draft actions for the bid room. Review before it changes anything.</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <button className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-left text-blue-100" onClick={() => setActiveTool("rfq")}>Create RFQ drafts for exposed material items</button>
                    <button className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-left text-blue-100" onClick={() => setActiveTool("risk")}>Review risk database matches</button>
                    <button className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-left text-blue-100" onClick={() => setActiveTool("calendar")}>Map bid date and schedule handoff</button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        ) : activeTool !== "rfq" ? stagedTool : (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge className="mb-2 bg-blue-500/15 text-blue-300">Estimating RFQ Workspace</Badge>
          <h1 className="text-3xl font-bold text-white">Request quotes while building the bid</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Select estimate items, create vendor-specific draft RFQs, log responses, and push selected pricing back into the estimate.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <div className="text-muted-foreground">Draft RFQs</div>
          <div className="text-2xl font-bold text-white">{(rfqs || []).filter((rfq) => rfq.status === "draft").length}</div>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Estimate</label>
            <select
              value={estimateId}
              onChange={(event) => {
                setSelectedEstimateId(event.target.value);
                setSelectedItemIds([]);
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              {(estimates || []).map((estimate) => (
                <option key={String(estimate._id)} value={String(estimate._id)}>{estimate.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Pricing due date</label>
            <input
              type="date"
              value={pricingDueDate}
              onChange={(event) => setPricingDueDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" disabled={!selectedItems.length || !selectedVendors.length || creatingDrafts} onClick={() => void createDraftRfqs()}>
              {creatingDrafts ? "Creating..." : "Create draft RFQs"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white">Material requisition from estimate items</h2>
              <p className="text-xs text-muted-foreground">Select one or many estimate items for a multi-item RFQ package.</p>
            </div>
            <Badge variant="outline">{selectedItems.length} selected</Badge>
          </div>
          {inlineRfqItem && (
            <div className="mb-4 rounded-lg border border-blue-500/35 bg-blue-500/10 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-blue-200">Inline RFQ Builder</div>
                  <h3 className="mt-1 font-bold text-white">{inlineRfqItem.description}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Qty {inlineRfqItem.quantity || 0} {inlineRfqItem.unit || "LS"} | Section {inlineRfqItem.section || "Unassigned"} | Unit Cost {money(inlineRfqItem.unitCost)}
                  </p>
                  <p className="mt-2 text-xs text-blue-100">
                    Select vendors, set the pricing due date, add spec notes, then create draft RFQs without leaving this estimate item.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!selectedVendors.length || creatingDrafts}
                    onClick={() => void createDraftRfqs([inlineRfqItem])}
                  >
                    {creatingDrafts ? "Creating..." : "Create RFQ for this item"}
                  </Button>
                  <Button variant="outline" onClick={() => setInlineRfqItemId("")}>Close</Button>
                </div>
              </div>
            </div>
          )}
          <div className="max-h-[520px] overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-10 p-2 text-left">Pick</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-left">Qty</th>
                  <th className="p-2 text-left">Unit</th>
                  <th className="p-2 text-left">Unit Cost</th>
                  <th className="p-2 text-left">Section</th>
                  <th className="p-2 text-left">RFQ</th>
                </tr>
              </thead>
              <tbody>
                {(estimateItems || []).map((item) => (
                  <tr key={String(item._id)} className="border-t border-border">
                    <td className="p-2">
                      <input type="checkbox" checked={selectedItemIds.includes(String(item._id))} onChange={(event) => toggleItem(String(item._id), event.target.checked)} />
                    </td>
                    <td className="p-2">
                      <div className="font-medium text-white">{item.description}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold uppercase tracking-wide text-muted-foreground">RFQ Status:</span>
                        {rfqStatusForItem(item) === "No RFQ" ? (
                          <Badge variant="outline">No RFQ</Badge>
                        ) : (
                          <Badge className="bg-blue-500/15 text-blue-200">RFQ Requested: {rfqStatusForItem(item)}</Badge>
                        )}
                        <button type="button" className="text-blue-300 hover:underline" onClick={() => requestQuoteForItem(item)}>
                          Request Quote
                        </button>
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground">{item.quantity || 0}</td>
                    <td className="p-2 text-muted-foreground">{item.unit || "LS"}</td>
                    <td className="p-2 text-muted-foreground">{money(item.unitCost)}</td>
                    <td className="p-2 text-muted-foreground">{item.section || "Unassigned"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {rfqStatusForItem(item) !== "No RFQ" ? (
                          <Badge className="bg-blue-500/15 text-blue-200">RFQ Requested: {rfqStatusForItem(item)}</Badge>
                        ) : (
                          <Badge variant="outline">No RFQ</Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={() => requestQuoteForItem(item)}>
                          Request Quote
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!(estimateItems || []).length && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No estimate items found for this estimate.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold uppercase text-muted-foreground">Specs / attachments / plan notes</label>
            <textarea
              value={specNotes}
              onChange={(event) => setSpecNotes(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              placeholder="List spec sections, drawing numbers, plan pages, addenda, alternates, and takeoff backup to include in the RFQ package."
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-bold text-white">Vendors</h2>
          <p className="mb-3 text-xs text-muted-foreground">Choose from the vendor directory or add a missing supplier inline.</p>
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            {(vendors || []).map((vendor) => (
              <label key={String(vendor._id)} className="flex items-start gap-2 border-b border-border p-3 text-sm last:border-b-0">
                <input type="checkbox" checked={selectedVendorIds.includes(String(vendor._id))} onChange={(event) => toggleVendor(String(vendor._id), event.target.checked)} />
                <span>
                  <span className="block font-semibold text-white">{vendor.name}</span>
                  <span className="block text-xs text-muted-foreground">{vendor.email || vendor.phone || vendor.category || "No contact on file"}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-border bg-background/50 p-3">
            <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Add missing vendor</div>
            <div className="grid gap-2">
              <input value={newVendor.name} onChange={(event) => setNewVendor((v) => ({ ...v, name: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Vendor company" />
              <input value={newVendor.contactName} onChange={(event) => setNewVendor((v) => ({ ...v, contactName: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Contact name" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newVendor.email} onChange={(event) => setNewVendor((v) => ({ ...v, email: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Email" />
                <input value={newVendor.phone} onChange={(event) => setNewVendor((v) => ({ ...v, phone: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Phone" />
              </div>
              <select value={newVendor.category} onChange={(event) => setNewVendor((v) => ({ ...v, category: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white">
                {VENDOR_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <Button variant="outline" disabled={!newVendor.name.trim()} onClick={() => void addVendorInline()}>Add vendor to directory</Button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold text-white">Vendor-first comparison</h2>
            <p className="text-xs text-muted-foreground">Each draft record is one vendor package. Log responses by item and award item-level pricing.</p>
          </div>
          <Badge variant="outline">{rfqsWithNotes.length} RFQ records</Badge>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {rfqsWithNotes.map((rfq) => {
            const notes = rfq.parsedNotes as RfqNotes;
            const itemSnapshots = notes.itemSnapshots || [];
            return (
              <article key={String(rfq._id)} className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-white">{rfq.vendorName}</div>
                    <div className="text-xs text-muted-foreground">Due {rfq.dueDate || "not set"} | {rfq.status || "draft"} | Total {money(rfq.amount)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void copyPackage(rfq)}>Copy Package</Button>
                    <a href={mailtoForRfq(rfq)} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-semibold text-white hover:bg-secondary">Open Email Draft</a>
                    <Button size="sm" disabled={rfq.status === "sent"} onClick={() => void markSent(rfq)}>Mark Sent</Button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {itemSnapshots.map((snapshot) => {
                    const itemId = String(snapshot.id);
                    const response = notes.lineResponses?.[itemId];
                    const missing = missingResponseDetails(response);
                    return (
                      <div key={itemId} className="rounded-md border border-border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-white">{itemLabel(snapshot)}</div>
                            <div className="text-xs text-muted-foreground">Qty {String(snapshot.quantity || 0)} {String(snapshot.unit || "LS")}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-white">{response?.totalPrice ? money(response.totalPrice) : "No price"}</div>
                            <div className={missing.length ? "text-xs text-red-300" : "text-xs text-green-300"}>
                              {missing.length ? `Missing: ${missing.join(", ")}` : "Complete"}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setResponseDraft((draft) => ({ ...draft, rfqId: String(rfq._id), itemId }))}>Log Response</Button>
                          <Button size="sm" disabled={!response} onClick={() => void applySelectedQuote(rfq, itemId)}>Apply Selected Quote</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
          {!rfqsWithNotes.length && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No RFQ records yet. Select estimate items and vendors, then create draft RFQs.
            </div>
          )}
        </div>
      </section>

      {responseDraft.rfqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Log vendor response</h3>
              <button className="text-sm text-muted-foreground hover:text-white" onClick={() => setResponseDraft({ rfqId: "", itemId: "", unitPrice: "", totalPrice: "", leadTime: "", expiration: "", exclusions: "", alternates: "" })}>Close</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input type="number" min="0" step="0.01" value={responseDraft.unitPrice} onChange={(event) => setResponseDraft((draft) => ({ ...draft, unitPrice: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Unit price" />
              <input type="number" min="0" step="0.01" value={responseDraft.totalPrice} onChange={(event) => setResponseDraft((draft) => ({ ...draft, totalPrice: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Total price / Buy Out" />
              <input value={responseDraft.leadTime} onChange={(event) => setResponseDraft((draft) => ({ ...draft, leadTime: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Lead time" />
              <input type="date" value={responseDraft.expiration} onChange={(event) => setResponseDraft((draft) => ({ ...draft, expiration: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
              <textarea value={responseDraft.exclusions} onChange={(event) => setResponseDraft((draft) => ({ ...draft, exclusions: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white md:col-span-2" placeholder="Exclusions, taxes, freight, assumptions" />
              <textarea value={responseDraft.alternates} onChange={(event) => setResponseDraft((draft) => ({ ...draft, alternates: event.target.value }))} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white md:col-span-2" placeholder="Alternates or substitutions" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResponseDraft({ rfqId: "", itemId: "", unitPrice: "", totalPrice: "", leadTime: "", expiration: "", exclusions: "", alternates: "" })}>Cancel</Button>
              <Button onClick={() => void saveLineResponse()}>Save Response</Button>
            </div>
          </div>
        </div>
      )}
    </div>
        )}
      </main>
    </div>
  );
}
