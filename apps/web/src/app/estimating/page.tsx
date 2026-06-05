"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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

const SECTION_PARENT_NOTE = "OPSSLATE_SECTION_PARENT";
const MILESTONE_PARENT_NOTE = "OPSSLATE_MILESTONE_PARENT";
const MILESTONE_ITEM_NOTE_PREFIX = "OPSSLATE_MILESTONE:";
const ORDER_NOTE_PREFIX = "OPSSLATE_ORDER:";
const RFQ_INTENT_NOTE = "OPSSLATE_RFQ_INTENT";
const SUBMITTAL_INTENT_NOTE = "OPSSLATE_SUBMITTAL_INTENT";

const COMMON_MILESTONES = [
  "Pre-bid review",
  "Submittal checkpoint",
  "Material release",
  "Utility coordination",
  "Crew mobilization",
  "Inspection ready",
  "Substantial completion",
  "Closeout",
];

function isSectionParentItem(item: Record<string, unknown>) {
  return String(item.notes || "").includes(SECTION_PARENT_NOTE) || String(item.unit || "").toUpperCase() === "SECTION";
}

function isMilestoneParentItem(item: Record<string, unknown>) {
  return String(item.notes || "").includes(MILESTONE_PARENT_NOTE) || String(item.unit || "").toUpperCase() === "MILESTONE";
}

function milestoneNameForItem(item: Record<string, unknown>) {
  const notes = String(item.notes || "");
  const line = notes.split("\n").find((entry) => entry.startsWith(MILESTONE_ITEM_NOTE_PREFIX));
  return line ? line.replace(MILESTONE_ITEM_NOTE_PREFIX, "").trim() : "";
}

function orderForItem(item: Record<string, unknown>, fallback = 0) {
  const notes = String(item.notes || "");
  const line = notes.split("\n").find((entry) => entry.startsWith(ORDER_NOTE_PREFIX));
  const parsed = Number(line?.replace(ORDER_NOTE_PREFIX, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function notesWithOrder(notes: unknown, order: number) {
  const lines = String(notes || "").split("\n").filter((line) => line.trim() && !line.startsWith(ORDER_NOTE_PREFIX));
  return [...lines, `${ORDER_NOTE_PREFIX} ${order}`].join("\n");
}

function itemHasIntent(item: Record<string, unknown>, intent: string) {
  return String(item.notes || "").includes(intent);
}

function sortByEstimateOrder(items: Array<Record<string, unknown>>) {
  return [...items].sort((a, b) => {
    const orderDelta = orderForItem(a, Number(a._creationTime || 0)) - orderForItem(b, Number(b._creationTime || 0));
    return orderDelta || Number(a._creationTime || 0) - Number(b._creationTime || 0);
  });
}

type BidPortfolioRow = {
  key: string;
  project?: Record<string, unknown>;
  estimate?: Record<string, unknown>;
};

function recordId(record?: Record<string, unknown>) {
  return String(record?._id || "");
}

function projectDisplayName(project?: Record<string, unknown>, estimate?: Record<string, unknown>) {
  return String(project?.name || project?.projectName || estimate?.name || "Unnamed project");
}

function projectAddressLine(project?: Record<string, unknown>, estimate?: Record<string, unknown>) {
  const parts = [
    project?.address,
    project?.city,
    project?.state,
    project?.zip,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : String(estimate?.location || estimate?.description || "No project address yet");
}

function portfolioClientLabel(project?: Record<string, unknown>, estimate?: Record<string, unknown>) {
  return String(estimate?.client || project?.client || project?.contractor || "No client");
}

function portfolioTypeLabel(project?: Record<string, unknown>, estimate?: Record<string, unknown>) {
  return String(estimate?.bidType || estimate?.buildingType || project?.projectType || project?.type || "Project");
}

function portfolioStoredTotal(estimate?: Record<string, unknown>) {
  const total = estimate?.total ?? estimate?.totalAmount ?? estimate?.bidValue ?? estimate?.contractValue ?? estimate?.amount;
  return typeof total === "number" || typeof total === "string" ? total : undefined;
}

function estimateForProject(project: Record<string, unknown>, estimates: Array<Record<string, unknown>> = []) {
  const projectId = recordId(project);
  return estimates.find((estimate) => String(estimate.projectId || "") === projectId);
}

function bidPortfolioRows({
  projects,
  estimates,
  selectedProjectId,
}: {
  projects: Array<Record<string, unknown>>;
  estimates: Array<Record<string, unknown>>;
  selectedProjectId: string;
}) {
  const visibleProjects = selectedProjectId ? projects.filter((project) => recordId(project) === selectedProjectId) : projects;
  const rows: BidPortfolioRow[] = visibleProjects.map((project) => ({
    key: `project-${recordId(project)}`,
    project,
    estimate: estimateForProject(project, estimates),
  }));
  const projectIds = new Set(visibleProjects.map((project) => recordId(project)));
  const matchedEstimateIds = new Set(rows.map((row) => recordId(row.estimate)).filter(Boolean));
  if (!selectedProjectId) {
    estimates.forEach((estimate) => {
      const estimateProjectId = String(estimate.projectId || "");
      if (!estimateProjectId || (!projectIds.has(estimateProjectId) && !matchedEstimateIds.has(recordId(estimate)))) {
        rows.push({
          key: `estimate-${recordId(estimate)}`,
          estimate,
        });
      }
    });
  }
  return rows;
}

type EstimatingToolKey =
  | "cockpit"
  | "estimate-detail"
  | "estimates"
  | "rfq"
  | "takeoff"
  | "production-breakdown"
  | "equipment-analyzer"
  | "equipment-dealers"
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
  { key: "production-breakdown", label: "Production Breakdown", icon: "PROD", description: "Convert bid quantities into labor, equipment, and production days" },
  { key: "equipment-analyzer", label: "Equipment Analyzer", icon: "EQ", description: "Equipment hours, rates, utilization, and gaps" },
  { key: "equipment-dealers", label: "Equipment Dealers", icon: "DLR", description: "Dealer and rental quote sourcing" },
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

const COMMON_CONSTRUCTION_PHASES = [
  "Preconstruction",
  "Mobilization",
  "Survey Operations",
  "Site Preparation",
  "Demolition",
  "Earthwork",
  "Underground Utilities",
  "Storm Drainage",
  "Concrete",
  "Asphalt Paving",
  "Electrical",
  "Site Lighting",
  "Landscaping",
  "Restoration",
  "Closeout",
];

const ESTIMATE_PHASE_LIBRARY: Record<string, string[]> = {
  Preconstruction: ["Mobilization", "Survey / Layout", "Permits", "Safety Setup", "Temporary Controls", "Project Administration"],
  Mobilization: ["Move Equipment", "Jobsite Setup", "Temporary Facilities", "Initial Coordination"],
  "Site Preparation": ["Clearing", "Erosion Control", "Traffic Control", "Saw Cutting", "Demolition"],
  Earthwork: ["Excavation", "Backfill", "Subbase", "Export / Disposal", "Compaction"],
  "Underground Utilities": ["Trenching", "Conduit", "Drainage", "Water / Sewer", "Utility Coordination"],
  Concrete: ["Forming", "Reinforcing", "Place Concrete", "Curing", "Sawcut / Jointing"],
  "Asphalt Paving": ["Subbase Prep", "Binder Course", "Top Course", "Pavement Markings"],
  Electrical: ["Duct Bank", "Pull Boxes", "Wire / Cable", "Panels / Gear", "EV Equipment", "Testing"],
  Restoration: ["Topsoil", "Seed / Mulch", "Cleanup", "Punchlist"],
  Closeout: ["As-Builts", "Final Testing", "Submittal Closeout", "Demobilization"],
};

const ESTIMATE_ITEM_STARTERS: Record<string, string[]> = {
  Mobilization: ["Move equipment to site", "Jobsite setup", "Temporary facilities"],
  "Move Equipment": ["Move equipment to site", "Unload equipment", "Demobilize equipment"],
  "Survey / Layout": ["Initial layout", "Stake work limits", "Layout utility alignment"],
  Excavation: ["Excavation for duct bank", "Load and haul spoils", "Trench excavation"],
  Backfill: ["Backfill material", "Place and compact backfill"],
  "Duct Bank": ["Install conduit duct bank", "Concrete encasement", "Pull string and mandrel"],
  Forming: ["Concrete forming and accessories", "Form slab edges"],
  "Binder Course": ["Asphalt binder course"],
  "Top Course": ["Asphalt top course"],
};

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

function productionCategoryForItem(item: Record<string, unknown>) {
  const text = `${item.section || ""} ${item.description || ""}`.toLowerCase();
  if (/mobilization|setup|temporary|permit|preconstruction|survey|layout/.test(text)) return "Preconstruction";
  if (/excavat|trench|earth|backfill|stone|aggregate|subbase/.test(text)) return "Earthwork";
  if (/concrete|form|rebar|pad|curb|sidewalk/.test(text)) return "Concrete";
  if (/asphalt|paving|binder|top course|milling/.test(text)) return "Paving";
  if (/electric|conduit|wire|cable|charger|switch|panel/.test(text)) return "Electrical";
  return "General Construction";
}

function productionRateForItem(item: Record<string, unknown>) {
  const unit = String(item.unit || "LS").toLowerCase();
  const category = productionCategoryForItem(item);
  if (unit.includes("lf")) return { rate: category === "Electrical" ? 240 : 320, basis: "LF/day", crewSize: 3 };
  if (unit.includes("cy")) return { rate: category === "Concrete" ? 28 : 110, basis: "CY/day", crewSize: 4 };
  if (unit.includes("ton")) return { rate: 85, basis: "Ton/day", crewSize: 4 };
  if (unit.includes("each") || unit.includes("ea")) return { rate: 8, basis: "EA/day", crewSize: 2 };
  return { rate: category === "Preconstruction" ? 0 : 1, basis: "allowance", crewSize: category === "Preconstruction" ? 0 : 2 };
}

function productionRowsForItems(items: Array<Record<string, unknown>> = []) {
  return items.map((item, index) => {
    const quantity = Number(item.quantity || 0) || 0;
    const unitCost = Number(item.unitCost || 0) || 0;
    const baseCost = quantity * unitCost;
    const category = productionCategoryForItem(item);
    const rate = productionRateForItem(item);
    const days = rate.rate > 0 ? quantity / rate.rate : 0;
    const manHours = days * rate.crewSize * 8;
    const equipmentHours = category === "Preconstruction" ? 0 : days * 8 * (category === "Earthwork" || category === "Paving" ? 1.5 : 0.65);
    const laborCost = manHours * 85;
    const equipmentCost = equipmentHours * 155;
    return {
      id: String(item._id || `${item.description || "item"}-${index}`),
      section: String(item.section || "Unassigned"),
      description: String(item.description || "Estimate item"),
      category,
      quantity,
      unit: String(item.unit || "LS"),
      baseCost,
      percent: baseCost ? Math.max(1, Math.min(10, Math.round((laborCost + equipmentCost) / baseCost * 100))) : 0,
      days,
      manHours,
      equipmentHours,
      laborCost,
      equipmentCost,
      total: laborCost + equipmentCost + baseCost,
      rateBasis: rate.basis,
      prodRate: rate.rate,
      crewSize: rate.crewSize,
    };
  });
}

function productionSummaryForRows(rows: ReturnType<typeof productionRowsForItems>) {
  return rows.reduce((summary, row) => ({
    equipmentHours: summary.equipmentHours + row.equipmentHours,
    manHours: summary.manHours + row.manHours,
    productionDays: summary.productionDays + row.days,
    laborCost: summary.laborCost + row.laborCost,
    equipmentCost: summary.equipmentCost + row.equipmentCost,
    total: summary.total + row.total,
  }), { equipmentHours: 0, manHours: 0, productionDays: 0, laborCost: 0, equipmentCost: 0, total: 0 });
}

function itemLineTotal(item: Record<string, unknown>) {
  const quantity = Number(item.quantity || 0) || 0;
  const unitCost = Number(item.unitCost || 0) || 0;
  const taxPct = Number(item.taxPct || 0) || 0;
  return quantity * unitCost * (1 + taxPct / 100);
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

function SectionPhaseModal({
  open,
  phaseOptions,
  selectedPhase,
  customPhase,
  onPhaseChange,
  onCustomPhaseChange,
  onCancel,
  onContinue,
}: {
  open: boolean;
  phaseOptions: string[];
  selectedPhase: string;
  customPhase: string;
  onPhaseChange: (value: string) => void;
  onCustomPhaseChange: (value: string) => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-white">Add Section / Phase</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose the phase for the new parent line in the bid. Custom phases are saved for future dropdowns.</p>
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Parent Phase</label>
          <select
            value={selectedPhase}
            onChange={(event) => onPhaseChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
          >
            {phaseOptions.map((phase) => (
              <option key={phase} value={phase}>{phase}</option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>
        {selectedPhase === "Other" && (
          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Custom Phase Name</label>
            <input
              value={customPhase}
              onChange={(event) => onCustomPhaseChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              placeholder="Type a phase name..."
            />
          </div>
        )}
        <div className="mt-3 text-xs text-muted-foreground">
          The selected phase becomes a parent line in the estimate. Items and milestones can be added beneath it later.
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onContinue} disabled={selectedPhase === "Other" && !customPhase.trim()}>Continue</Button>
        </div>
      </div>
    </div>
  );
}

function MilestoneModal({
  open,
  sectionOptions,
  selectedSection,
  selectedMilestone,
  customMilestone,
  onSectionChange,
  onMilestoneChange,
  onCustomMilestoneChange,
  onCancel,
  onContinue,
}: {
  open: boolean;
  sectionOptions: string[];
  selectedSection: string;
  selectedMilestone: string;
  customMilestone: string;
  onSectionChange: (value: string) => void;
  onMilestoneChange: (value: string) => void;
  onCustomMilestoneChange: (value: string) => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-white">Add Milestone</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select the section parent, then add a milestone child line beneath it.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Section</label>
            <select
              value={selectedSection}
              onChange={(event) => onSectionChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Select section...</option>
              {sectionOptions.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Milestone</label>
            <select
              value={selectedMilestone}
              onChange={(event) => onMilestoneChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Select milestone...</option>
              {COMMON_MILESTONES.map((milestone) => <option key={milestone} value={milestone}>{milestone}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        {selectedMilestone === "Other" && (
          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Custom Milestone</label>
            <input
              value={customMilestone}
              onChange={(event) => onCustomMilestoneChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              placeholder="Type milestone name..."
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onContinue} disabled={!selectedSection || !selectedMilestone || (selectedMilestone === "Other" && !customMilestone.trim())}>Add Milestone</Button>
        </div>
      </div>
    </div>
  );
}

function BidItemModal({
  open,
  title = "Add Item Under Milestone",
  intro = "Choose the milestone home first, then enter the priced bid item.",
  submitLabel = "Add Item",
  milestoneOptions,
  selectedMilestone,
  description,
  quantity,
  unit,
  taxPct,
  unitCost,
  requestRfq,
  requestSubmittal,
  onMilestoneChange,
  onDescriptionChange,
  onQuantityChange,
  onUnitChange,
  onTaxPctChange,
  onUnitCostChange,
  onRequestRfqChange,
  onRequestSubmittalChange,
  onCancel,
  onContinue,
}: {
  open: boolean;
  title?: string;
  intro?: string;
  submitLabel?: string;
  milestoneOptions: Array<{ section: string; milestone: string }>;
  selectedMilestone: string;
  description: string;
  quantity: string;
  unit: string;
  taxPct: string;
  unitCost: string;
  requestRfq: boolean;
  requestSubmittal: boolean;
  onMilestoneChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onTaxPctChange: (value: string) => void;
  onUnitCostChange: (value: string) => void;
  onRequestRfqChange: (value: boolean) => void;
  onRequestSubmittalChange: (value: boolean) => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const quantityNumber = Number(quantity || 0) || 0;
  const unitCostNumber = Number(unitCost || 0) || 0;
  const taxNumber = Number(taxPct || 0) || 0;
  const lineTotal = quantityNumber * unitCostNumber;
  const extended = lineTotal * (1 + taxNumber / 100);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Milestone</label>
            <select
              value={selectedMilestone}
              onChange={(event) => onMilestoneChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Select milestone...</option>
              {milestoneOptions.map((option) => (
                <option key={`${option.section}::${option.milestone}`} value={`${option.section}::${option.milestone}`}>
                  {option.section} / {option.milestone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Item Description</label>
            <input
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              placeholder="Type item description..."
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Quantity</label>
            <input value={quantity} onChange={(event) => onQuantityChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Unit of Measure</label>
            <input value={unit} onChange={(event) => onUnitChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Tax %</label>
            <input value={taxPct} onChange={(event) => onTaxPctChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Unit Cost</label>
            <input value={unitCost} onChange={(event) => onUnitCostChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
          </div>
          <div className="rounded-md border border-border bg-background/60 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Line Total</div>
            <div className="mt-2 font-mono text-lg font-black text-white">{money(lineTotal)}</div>
          </div>
          <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-orange-200">Extended</div>
            <div className="mt-2 font-mono text-lg font-black text-green-400">{money(extended)}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-blue-500/25 bg-blue-500/10 p-3 text-sm text-blue-100">
            <input
              type="checkbox"
              checked={requestRfq}
              onChange={(event) => onRequestRfqChange(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-bold text-white">RFQ required</span>
              Create a draft RFQ intent for this item so the estimator can send vendor pricing without re-entering scope.
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-orange-500/25 bg-orange-500/10 p-3 text-sm text-orange-100">
            <input
              type="checkbox"
              checked={requestSubmittal}
              onChange={(event) => onRequestSubmittalChange(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-bold text-white">Request submittal</span>
              Flag product data, shop drawing, and approval tracking at item creation so the handoff does not miss it.
            </span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onContinue} disabled={!selectedMilestone || !description.trim()}>{submitLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function ProofModal({
  item,
  rfqStatus,
  onClose,
  onEdit,
  onRequestQuote,
}: {
  item: Record<string, unknown> | null;
  rfqStatus: string;
  onClose: () => void;
  onEdit: (item: Record<string, unknown>) => void;
  onRequestQuote: (item: Record<string, unknown>) => void;
}) {
  if (!item) return null;
  const section = String(item.section || item.sourceSpecSection || "Unassigned");
  const milestone = milestoneNameForItem(item);
  const quantity = Number(item.quantity || 0) || 0;
  const unitCost = Number(item.unitCost || 0) || 0;
  const taxPct = Number(item.taxPct || 0) || 0;
  const lineTotal = quantity * unitCost;
  const extended = itemLineTotal(item);
  const notes = String(item.notes || "").split("\n").filter((line) => line.trim());
  const costWarnings = [
    !quantity ? "Quantity is zero or missing." : "",
    !unitCost ? "Unit cost is zero or missing." : "",
    !milestone ? "Item is not tied to a milestone." : "",
    rfqStatus === "No RFQ" && itemHasIntent(item, RFQ_INTENT_NOTE) ? "RFQ intent exists but no vendor RFQ has been drafted yet." : "",
  ].filter(Boolean);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="mb-2 bg-blue-500/15 text-blue-200">Estimate Proof</Badge>
            <h2 className="text-2xl font-black text-white">{String(item.description || "Estimate item")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{section}{milestone ? ` / ${milestone}` : ""}</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Extended</div>
            <div className="font-mono text-2xl font-black text-green-400">{money(extended)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Quantity</div>
            <div className="mt-1 font-mono text-lg text-white">{quantity} {String(item.unit || "LS")}</div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Unit Cost</div>
            <div className="mt-1 font-mono text-lg text-white">{money(unitCost)}</div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Tax</div>
            <div className="mt-1 font-mono text-lg text-white">{taxPct}%</div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">RFQ</div>
            <div className="mt-1 text-lg font-bold text-white">{rfqStatus === "No RFQ" ? "Not Requested" : statusLabel(rfqStatus)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-background/40 p-4">
            <h3 className="font-bold text-white">Estimator Checks</h3>
            <ul className="mt-3 space-y-2 text-sm text-blue-100">
              <li>Line total: {money(lineTotal)}</li>
              <li>Milestone home: {milestone || "Missing"}</li>
              <li>Spec/source: {String(item.sourceSpecSection || item.specSection || "No spec book linked")}</li>
              <li>RFQ intent: {itemHasIntent(item, RFQ_INTENT_NOTE) ? "Yes" : "No"}</li>
              <li>Submittal intent: {itemHasIntent(item, SUBMITTAL_INTENT_NOTE) ? "Yes" : "No"}</li>
            </ul>
          </section>
          <section className={`rounded-lg border p-4 ${costWarnings.length ? "border-orange-500/35 bg-orange-500/10" : "border-green-500/30 bg-green-500/10"}`}>
            <h3 className="font-bold text-white">AI Estimator Watch</h3>
            {costWarnings.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-orange-100">
                {costWarnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-green-200">This line has a home, quantity, cost, and no immediate RFQ/price warning.</p>
            )}
          </section>
        </div>

        <section className="mt-4 rounded-lg border border-border bg-background/40 p-4">
          <h3 className="font-bold text-white">Notes / Source Trail</h3>
          {notes.length ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs text-blue-100">{notes.join("\n")}</pre>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No notes have been recorded for this line.</p>
          )}
        </section>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => onRequestQuote(item)}>Request RFQ</Button>
          <Button onClick={() => onEdit(item)}>Edit Item</Button>
        </div>
      </div>
    </div>
  );
}

function MoveControls({
  label,
  onMoveUp,
  onMoveDown,
}: {
  label: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        title={`Move ${label} up`}
        onClick={onMoveUp}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-xs font-black text-blue-100 hover:border-orange-500/40 hover:text-white"
      >
        ↑
      </button>
      <button
        type="button"
        title={`Move ${label} down`}
        onClick={onMoveDown}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-xs font-black text-blue-100 hover:border-orange-500/40 hover:text-white"
      >
        ↓
      </button>
    </div>
  );
}

function EstimateDetailView({
  estimate,
  project,
  items,
  selectedItemIds,
  selectedEstimateTotal,
  rfqSummary,
  scheduleScore,
  predictiveSignals,
  onToggleItem,
  onRequestQuote,
  onOpenProof,
  onEditItem,
  onDeleteItem,
  onEditDetails,
  onMoveLine,
  rfqStatusForItem,
}: {
  estimate?: Record<string, unknown>;
  project?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  selectedItemIds: string[];
  selectedEstimateTotal: number;
  rfqSummary: ReturnType<typeof rfqCounts>;
  scheduleScore: number;
  predictiveSignals: Array<{ label: string; detail: string; severity: "high" | "medium" | "low" }>;
  onToggleItem: (id: string, checked: boolean) => void;
  onRequestQuote: (item: Record<string, unknown>) => void;
  onOpenProof: (item: Record<string, unknown>) => void;
  onEditItem: (item: Record<string, unknown>) => void;
  onDeleteItem: (item: Record<string, unknown>) => void;
  onEditDetails: () => void;
  onMoveLine: (item: Record<string, unknown>, siblings: Array<Record<string, unknown>>, direction: "up" | "down") => void;
  rfqStatusForItem: (item: Record<string, unknown>) => string;
}) {
  const groupedItems: Record<string, Array<Record<string, unknown>>> = {};
  items.forEach((item) => {
    const key = String(item.section || item.sourceSpecSection || "Unassigned");
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });
  const sectionParentItems = sortByEstimateOrder(items.filter((item) => isSectionParentItem(item)));

  const estimateName = String(estimate?.name || projectDisplayName(project, estimate));
  const projectMeta = [
    portfolioClientLabel(project, estimate) !== "No client" ? `Client: ${portfolioClientLabel(project, estimate)}` : "",
    estimate?.bidDate ? `Bid Date: ${String(estimate.bidDate)}` : "",
    projectAddressLine(project, estimate),
  ].filter(Boolean).join(" | ");
  const selectableItems = items.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-white">{estimateName}</h1>
          <p className="mt-2 max-w-4xl text-sm text-blue-100">{projectMeta}</p>
        </div>
        <Button variant="outline" onClick={onEditDetails}>Edit Details</Button>
      </div>

      <section className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {[
            ["Needs Action", predictiveSignals.length],
            ["Submittals", 0],
            ["RFQs", rfqSummary.open],
            ["Scope Gaps", predictiveSignals.filter((signal) => signal.label.includes("Scope")).length],
            ["Risk / Requirements", predictiveSignals.length],
            ["Dismissed", 0],
          ].map(([label, value], index) => (
            <Badge key={String(label)} className={index === 0 ? "bg-orange-500 text-white" : "bg-secondary text-blue-100"}>
              {label} <span className="ml-1 rounded-full bg-blue-500/20 px-1.5">{String(value)}</span>
            </Badge>
          ))}
        </div>
        <h2 className="text-sm font-bold text-blue-100">Draft Actions</h2>
        <p className="mt-1 text-xs text-muted-foreground">Action cards include Approve, Review, and Dismiss controls.</p>
        <p className="mt-4 text-sm text-blue-100">{predictiveSignals.length ? `${predictiveSignals.length} bid signal${predictiveSignals.length === 1 ? "" : "s"} need estimator review.` : "No actions in this lane right now."}</p>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{statusLabel(String(estimate?.status || "draft"))}</Badge>
            <span className="text-muted-foreground">{items.length} bid item{items.length === 1 ? "" : "s"}</span>
            <span className="text-muted-foreground">Schedule readiness {scheduleScore}%</span>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Estimate Total</div>
            <div className="text-lg font-black text-green-400">{money(selectedEstimateTotal)}</div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-background text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="w-12 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectableItems.length > 0 && selectableItems.every((item) => selectedItemIds.includes(String(item._id)))}
                    disabled={!selectableItems.length}
                    onChange={(event) => selectableItems.forEach((item) => onToggleItem(String(item._id), event.target.checked))}
                  />
                </th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-right">Tax %</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-right">Line Total</th>
                <th className="p-3 text-right">Extended</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedItems).sort(([sectionA, itemsA], [sectionB, itemsB]) => {
                const parentA = itemsA.find((item) => isSectionParentItem(item));
                const parentB = itemsB.find((item) => isSectionParentItem(item));
                return orderForItem(parentA || itemsA[0] || {}, Number((parentA || itemsA[0])?._creationTime || 0)) - orderForItem(parentB || itemsB[0] || {}, Number((parentB || itemsB[0])?._creationTime || 0)) || sectionA.localeCompare(sectionB);
              }).map(([section, sectionItems]) => {
                const sectionParent = sectionItems.find((item) => isSectionParentItem(item));
                const childItems = sectionItems.filter((item) => !isSectionParentItem(item));
                const milestoneParents = sortByEstimateOrder(childItems.filter((item) => isMilestoneParentItem(item)));
                const pricedItems = sortByEstimateOrder(childItems.filter((item) => !isMilestoneParentItem(item)));
                const unassignedItems = sortByEstimateOrder(pricedItems.filter((item) => !milestoneNameForItem(item)));
                const sectionTotal = estimateTotal(pricedItems);
                const allSectionSelected = pricedItems.length > 0 && pricedItems.every((item) => selectedItemIds.includes(String(item._id)));
                return (
                  <Fragment key={`group-${section}`}>
                    <tr key={`section-${section}`} className="border-t border-border bg-secondary/45">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={allSectionSelected}
                          disabled={!pricedItems.length}
                          onChange={(event) => pricedItems.forEach((item) => onToggleItem(String(item._id), event.target.checked))}
                        />
                      </td>
                      <td className="p-3 font-black text-white">Folder {section}</td>
                      <td className="p-3 text-right text-xs text-muted-foreground" colSpan={5}>{pricedItems.length ? "Select all" : "Parent line"}</td>
                      <td className="p-3 text-right font-black text-white">{money(sectionTotal)}</td>
                      <td className="p-3">
                        {sectionParent ? (
                          <MoveControls
                            label="section"
                            onMoveUp={() => onMoveLine(sectionParent, sectionParentItems, "up")}
                            onMoveDown={() => onMoveLine(sectionParent, sectionParentItems, "down")}
                          />
                        ) : null}
                      </td>
                    </tr>
                    {!pricedItems.length && !milestoneParents.length && (
                      <tr className="border-t border-border">
                        <td className="p-3" />
                        <td colSpan={8} className="p-4 pl-10 text-sm text-muted-foreground">No estimate items yet. Add a child item under this phase when scope is ready.</td>
                      </tr>
                    )}
                    {milestoneParents.map((milestone) => {
                      const milestoneName = String(milestone.description || "Milestone");
                      const milestoneItems = sortByEstimateOrder(pricedItems.filter((item) => milestoneNameForItem(item) === milestoneName));
                      const milestoneTotal = estimateTotal(milestoneItems);
                      return (
                        <Fragment key={`milestone-${section}-${milestoneName}`}>
                          <tr className="border-t border-border bg-background/45">
                            <td className="p-3">
                              <MoveControls
                                label="milestone"
                                onMoveUp={() => onMoveLine(milestone, milestoneParents, "up")}
                                onMoveDown={() => onMoveLine(milestone, milestoneParents, "down")}
                              />
                            </td>
                            <td className="p-3 pl-8 font-bold text-orange-100">Milestone {milestoneName}</td>
                            <td className="p-3 text-right text-xs text-muted-foreground" colSpan={5}>{milestoneItems.length ? `${milestoneItems.length} child item${milestoneItems.length === 1 ? "" : "s"}` : "No child items yet"}</td>
                            <td className="p-3 text-right font-black text-white">{money(milestoneTotal)}</td>
                            <td className="p-3" />
                          </tr>
                          {milestoneItems.map((item) => {
                            const itemId = String(item._id);
                            const rfqStatus = rfqStatusForItem(item);
                            return (
                              <tr key={itemId} className="border-t border-border">
                                <td className="p-3">
                                  <input type="checkbox" checked={selectedItemIds.includes(itemId)} onChange={(event) => onToggleItem(itemId, event.target.checked)} />
                                </td>
                                <td className="p-3 pl-12">
                                  <div className="font-bold text-white">{String(item.description || "Estimate item")}</div>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    <Badge variant="outline">Spec: {String(item.sourceSpecSection || item.specSection || "No book")}</Badge>
                                    <Badge className="bg-orange-500/15 text-orange-100">Milestone: {milestoneName}</Badge>
                                    <Badge className="bg-blue-500/15 text-blue-200">RFQ Status: {rfqStatus === "No RFQ" ? "Not Requested" : rfqStatus}</Badge>
                                    {itemHasIntent(item, RFQ_INTENT_NOTE) ? <Badge className="bg-cyan-500/15 text-cyan-200">RFQ Intent</Badge> : null}
                                    {itemHasIntent(item, SUBMITTAL_INTENT_NOTE) ? <Badge className="bg-purple-500/15 text-purple-200">Submittal Intent</Badge> : null}
                                  </div>
                                </td>
                                <td className="p-3 text-right text-white">{String(item.quantity || 0)}</td>
                                <td className="p-3 text-muted-foreground">{String(item.unit || "LS")}</td>
                                <td className="p-3 text-right text-muted-foreground">{String(item.taxPct || 0)}</td>
                                <td className="p-3 text-right font-mono text-white">{money(item.unitCost)}</td>
                                <td className="p-3 text-right font-mono text-white">{money(Number(item.quantity || 0) * Number(item.unitCost || 0))}</td>
                                <td className="p-3 text-right font-mono font-bold text-white">{money(estimateTotal([item]))}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <MoveControls
                                      label="task"
                                      onMoveUp={() => onMoveLine(item, milestoneItems, "up")}
                                      onMoveDown={() => onMoveLine(item, milestoneItems, "down")}
                                    />
                                    <Button size="sm" variant="outline" onClick={() => onOpenProof(item)}>Proof</Button>
                                    <Button size="sm" variant="outline" onClick={() => onRequestQuote(item)}>Request RFQ</Button>
                                    <Button size="sm" variant="outline" onClick={() => onEditItem(item)}>Edit</Button>
                                    <Button size="sm" variant="destructive" onClick={() => onDeleteItem(item)}>x</Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                    {unassignedItems.map((item) => {
                      const itemId = String(item._id);
                      const rfqStatus = rfqStatusForItem(item);
                      return (
                        <tr key={itemId} className="border-t border-border">
                          <td className="p-3">
                            <input type="checkbox" checked={selectedItemIds.includes(itemId)} onChange={(event) => onToggleItem(itemId, event.target.checked)} />
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-white">{String(item.description || "Estimate item")}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge variant="outline">Spec: {String(item.sourceSpecSection || item.specSection || "No book")}</Badge>
                              <Badge className="bg-blue-500/15 text-blue-200">RFQ Status: {rfqStatus === "No RFQ" ? "Not Requested" : rfqStatus}</Badge>
                              {itemHasIntent(item, RFQ_INTENT_NOTE) ? <Badge className="bg-cyan-500/15 text-cyan-200">RFQ Intent</Badge> : null}
                              {itemHasIntent(item, SUBMITTAL_INTENT_NOTE) ? <Badge className="bg-purple-500/15 text-purple-200">Submittal Intent</Badge> : null}
                            </div>
                          </td>
                          <td className="p-3 text-right text-white">{String(item.quantity || 0)}</td>
                          <td className="p-3 text-muted-foreground">{String(item.unit || "LS")}</td>
                          <td className="p-3 text-right text-muted-foreground">{String(item.taxPct || "-")}</td>
                          <td className="p-3 text-right font-mono text-white">{money(item.unitCost)}</td>
                          <td className="p-3 text-right font-mono text-white">{money(itemLineTotal(item))}</td>
                          <td className="p-3 text-right font-mono text-white">{money(itemLineTotal(item))}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <MoveControls
                                label="task"
                                onMoveUp={() => onMoveLine(item, unassignedItems, "up")}
                                onMoveDown={() => onMoveLine(item, unassignedItems, "down")}
                              />
                              <Button size="sm" variant="outline" onClick={() => onOpenProof(item)}>Proof</Button>
                              <Button size="sm" variant="outline" onClick={() => onRequestQuote(item)}>Request RFQ</Button>
                              <Button size="sm" variant="outline" onClick={() => onEditItem(item)}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => onDeleteItem(item)}>x</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
              {!items.length && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-muted-foreground">No bid items yet. Add an item or import from takeoff/cost database to build this estimate.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function EstimatesListView({
  rows,
  selectedProject,
  selectedPhase,
  selectedSection,
  starterDescription,
  starterQuantity,
  starterUnit,
  starterUnitCost,
  creatingStarter,
  selectedEstimateId,
  selectedEstimateTotal,
  selectedEstimateItemCount,
  onOpenEstimate,
  onSelectedPhaseChange,
  onSelectedSectionChange,
  onStarterDescriptionChange,
  onStarterQuantityChange,
  onStarterUnitChange,
  onStarterUnitCostChange,
  onCreateStarter,
  onDuplicateEstimate,
  onDeleteEstimate,
  onNewEstimate,
  onAutoBid,
  onQuickTemplates,
}: {
  rows: BidPortfolioRow[];
  selectedProject?: Record<string, unknown>;
  selectedPhase: string;
  selectedSection: string;
  starterDescription: string;
  starterQuantity: string;
  starterUnit: string;
  starterUnitCost: string;
  creatingStarter: boolean;
  selectedEstimateId: string;
  selectedEstimateTotal: number;
  selectedEstimateItemCount: number;
  onOpenEstimate: (row: BidPortfolioRow) => void;
  onSelectedPhaseChange: (value: string) => void;
  onSelectedSectionChange: (value: string) => void;
  onStarterDescriptionChange: (value: string) => void;
  onStarterQuantityChange: (value: string) => void;
  onStarterUnitChange: (value: string) => void;
  onStarterUnitCostChange: (value: string) => void;
  onCreateStarter: () => void;
  onDuplicateEstimate: (estimate: Record<string, unknown>) => void;
  onDeleteEstimate: (estimate: Record<string, unknown>) => void;
  onNewEstimate: () => void;
  onAutoBid: () => void;
  onQuickTemplates: () => void;
}) {
  const phaseSections = ESTIMATE_PHASE_LIBRARY[selectedPhase] || [];
  const sectionSuggestions = phaseSections.length ? phaseSections : [...new Set(Object.values(ESTIMATE_PHASE_LIBRARY).flat())].slice(0, 24);
  const starterItems = ESTIMATE_ITEM_STARTERS[selectedSection] || ESTIMATE_ITEM_STARTERS[selectedPhase] || [];
  const selectedProjectHasEstimate = selectedProject ? rows.some((row) => row.project && recordId(row.project) === recordId(selectedProject) && row.estimate) : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h1 className="text-2xl font-black text-white">Estimates</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onNewEstimate}>+ New Estimate</Button>
          <Button className="bg-purple-600 hover:bg-purple-500" onClick={onAutoBid}>AI Auto-Bid</Button>
          <Button variant="outline" onClick={onQuickTemplates}>Quick Templates</Button>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <select className="min-w-48 rounded-md border border-border bg-background px-3 py-2 text-sm text-white">
            <option>All Types</option>
          </select>
          <select className="min-w-48 rounded-md border border-border bg-background px-3 py-2 text-sm text-white">
            <option>All Status</option>
          </select>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-background text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Bid Date</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Items</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { project, estimate } = row;
                const isSelected = Boolean(estimate?._id && String(estimate._id) === selectedEstimateId);
                const storedTotal = portfolioStoredTotal(estimate);
                return (
                  <tr key={row.key} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{estimate ? "Bid" : "Project"}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => onOpenEstimate(row)} className="text-left">
                        <div className="font-bold text-white hover:text-orange-300">{projectDisplayName(project, estimate)}</div>
                        <div className="text-xs text-blue-200">{projectAddressLine(project, estimate)}</div>
                      </button>
                    </td>
                    <td className="p-3 text-muted-foreground">{portfolioClientLabel(project, estimate)}</td>
                    <td className="p-3 text-muted-foreground">{String(estimate?.bidDate || "No date")}</td>
                    <td className="p-3"><Badge variant={estimate ? "outline" : "secondary"}>{estimate ? statusLabel(String(estimate.status || "draft")) : "No estimate"}</Badge></td>
                    <td className="p-3 text-white">{isSelected ? selectedEstimateItemCount : estimate ? "Open" : "-"}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{isSelected ? money(selectedEstimateTotal) : storedTotal !== undefined ? money(storedTotal) : "-"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => onOpenEstimate(row)}>{estimate?._id ? "Edit" : "Start"}</Button>
                        <Button size="sm" variant="outline" disabled={!estimate?._id} onClick={() => estimate?._id && onDuplicateEstimate(estimate)}>Dup</Button>
                        <Button size="sm" variant="destructive" disabled={!estimate?._id} onClick={() => estimate?._id && onDeleteEstimate(estimate)}>x</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">No projects or estimates found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProject && !selectedProjectHasEstimate && (
        <section className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge className="mb-2 bg-orange-500/20 text-orange-200">Blank Estimate Slate</Badge>
              <h2 className="text-2xl font-black text-white">Build the estimate structure</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Type the phase, section, milestone, and item freely. OpsSlate keeps every item attached to a home before it can enter the estimate.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-4 py-3 text-sm text-blue-100">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected Project</div>
              <div className="font-bold text-white">{projectDisplayName(selectedProject)}</div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/55 p-3">
              <button type="button" className="inline-flex h-9 items-center rounded-xl border border-yellow-500/35 bg-yellow-500/85 px-3 text-xs font-bold text-black hover:bg-yellow-400" onClick={() => { onSelectedPhaseChange(""); onSelectedSectionChange(""); onStarterDescriptionChange(""); }}>+ Phase</button>
              <button type="button" className="inline-flex h-9 items-center rounded-xl border border-blue-500/35 bg-blue-500/80 px-3 text-xs font-bold text-white hover:bg-blue-500" onClick={() => { onSelectedSectionChange(""); onStarterDescriptionChange(""); }}>+ Section</button>
              <button type="button" className="inline-flex h-9 items-center rounded-xl border border-orange-500/35 bg-orange-500/85 px-3 text-xs font-bold text-white hover:bg-orange-500" onClick={() => onStarterDescriptionChange(starterDescription || "Milestone - ")}>+ Milestone</button>
              <button type="button" className="inline-flex h-9 items-center rounded-xl border border-green-500/35 bg-green-500/85 px-3 text-xs font-bold text-white hover:bg-green-500" disabled={!selectedPhase.trim() || !selectedSection.trim() || !starterDescription.trim() || creatingStarter} onClick={onCreateStarter}>+ Add Item</button>
            </div>

            <div className="border-b border-border bg-secondary/40 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-orange-300">Phase</div>
                  <h3 className="mt-1 text-xl font-black text-white">{selectedPhase || "No phase named yet"}</h3>
                </div>
                <input
                  list="estimate-phase-suggestions"
                  value={selectedPhase}
                  onChange={(event) => onSelectedPhaseChange(event.target.value)}
                  placeholder="Type phase name, e.g. Preconstruction"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white lg:w-80"
                />
                <datalist id="estimate-phase-suggestions">
                  {Object.keys(ESTIMATE_PHASE_LIBRARY).map((phase) => <option key={phase} value={phase} />)}
                </datalist>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="self-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Optional suggestions</span>
                {Object.keys(ESTIMATE_PHASE_LIBRARY).map((phase) => (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => onSelectedPhaseChange(phase)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${phase === selectedPhase ? "border-orange-500/50 bg-orange-500/15 text-orange-100" : "border-border bg-background/50 text-blue-100"}`}
                  >
                    {phase}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-border p-4 pl-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Section Under Phase</div>
                  <h3 className="mt-1 text-lg font-black text-white">{selectedSection || "No section named yet"}</h3>
                </div>
                <input
                  list="estimate-section-suggestions"
                  value={selectedSection}
                  onChange={(event) => onSelectedSectionChange(event.target.value)}
                  placeholder="Type section name, e.g. Mobilization"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white lg:w-80"
                />
                <datalist id="estimate-section-suggestions">
                  {sectionSuggestions.map((section) => <option key={section} value={section} />)}
                </datalist>
              </div>
              {!!sectionSuggestions.length && <div className="mt-3 flex flex-wrap gap-2">
                <span className="self-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Optional suggestions</span>
                {sectionSuggestions.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => onSelectedSectionChange(section)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${section === selectedSection ? "border-blue-500/50 bg-blue-500/15 text-blue-100" : "border-border bg-background/50 text-muted-foreground"}`}
                  >
                    {section}
                  </button>
                ))}
              </div>}
            </div>

            <div className="p-4 pl-12">
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-green-300">Item Under Section</div>
              <div className="grid gap-3 xl:grid-cols-[1fr_110px_110px_150px]">
                <input
                  value={starterDescription}
                  onChange={(event) => onStarterDescriptionChange(event.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
                  placeholder="Type item or milestone name..."
                />
                <input value={starterQuantity} onChange={(event) => onStarterQuantityChange(event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Qty" />
                <input value={starterUnit} onChange={(event) => onStarterUnitChange(event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Unit" />
                <input value={starterUnitCost} onChange={(event) => onStarterUnitCostChange(event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Unit cost" />
              </div>
              {!!starterItems.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {starterItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onStarterDescriptionChange(item)}
                      className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold text-blue-100 hover:border-orange-500/40"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
                <span>{selectedPhase.trim() && selectedSection.trim() ? <>This will create the estimate and file the first item under <span className="font-bold text-white">{selectedPhase} / {selectedSection}</span>.</> : "Guardrail: an item cannot be created until Phase, Section, and Item are filled in."}</span>
                <Button disabled={!selectedPhase.trim() || !selectedSection.trim() || !starterDescription.trim() || creatingStarter} onClick={onCreateStarter}>
                  {creatingStarter ? "Creating estimate..." : "Create Estimate + Add Item"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ProductionRateBreakdownView({
  estimate,
  rows,
  summary,
  onBack,
  onEditDetails,
}: {
  estimate?: Record<string, unknown>;
  rows: ReturnType<typeof productionRowsForItems>;
  summary: ReturnType<typeof productionSummaryForRows>;
  onBack: () => void;
  onEditDetails: () => void;
}) {
  const groupedRows = rows.reduce((groups, row) => {
    const key = row.section || "Unassigned";
    groups[key] = groups[key] || [];
    groups[key].push(row);
    return groups;
  }, {} as Record<string, typeof rows>);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge className="mb-2 bg-orange-500/15 text-orange-300">Production Rate Breakdown</Badge>
          <h1 className="text-3xl font-black tracking-tight text-white">Production Rate Breakdown</h1>
          <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
            Estimate: {String(estimate?.name || "Selected estimate")} — Converts quantity bid into manhours, equipment hours, production days, and contractor review dollars.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.alert("Prevailing rate editor is next in the production buildout. Current production math stays tied to the estimate rows shown below.")}>Prevailing Rates</Button>
          <Button variant="outline" onClick={onBack}>Back to Estimate</Button>
          <Button variant="outline" onClick={onEditDetails}>Edit Details</Button>
          <Button onClick={() => window.print()}>Print / PDF</Button>
          <Button variant="outline" onClick={() => window.alert("Production totals recalculate automatically from the current estimate lines.")}>Recalculate</Button>
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Equipment Hours", summary.equipmentHours.toFixed(1)],
          ["Man-Hours", Math.round(summary.manHours).toLocaleString()],
          ["Production Days", summary.productionDays.toFixed(1)],
          ["Labor Cost", money(summary.laborCost)],
          ["Equipment Cost", money(summary.equipmentCost)],
          ["Total (L+E+M)", money(summary.total)],
        ].map(([label, value], index) => (
          <div key={label} className="rounded-md border border-border bg-background/50 p-3">
            <div className={index === 5 ? "text-lg font-black text-green-400" : "text-lg font-black text-white"}>{value}</div>
            <div className="text-xs text-blue-100">{label}</div>
          </div>
        ))}
      </section>

      {Object.entries(groupedRows).map(([section, sectionRows]) => {
        const sectionSummary = productionSummaryForRows(sectionRows);
        return (
          <section key={section} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-secondary/55 px-4 py-3">
              <div>
                <h2 className="text-lg font-black text-white">Folder {section}</h2>
                <p className="text-xs text-muted-foreground">
                  {sectionRows.length} task{sectionRows.length === 1 ? "" : "s"} | {sectionSummary.productionDays.toFixed(1)} production days | {Math.round(sectionSummary.manHours)} man-hours
                </p>
              </div>
              <div className="flex gap-2">
                <button className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-xs text-blue-100">↑</button>
                <button className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-xs text-blue-100">↓</button>
              </div>
            </div>
            <div className="divide-y divide-border">
              {sectionRows.map((row) => (
                <article key={row.id} className="grid gap-4 p-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <div>
                    <h3 className="font-bold text-white">{row.description}</h3>
                    <div className="mt-3 rounded-lg border border-yellow-500/25 bg-yellow-500/5 p-3">
                      <div className="text-xs font-bold uppercase text-yellow-200">{row.category} Production Builder</div>
                      <p className="mt-1 text-xs text-muted-foreground">Use this to validate crew assumptions, production rate, and how bid quantity turns into hours.</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-muted-foreground">Qty</div>
                          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-white">{row.quantity} {row.unit}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-muted-foreground">Prod Rate</div>
                          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-white">{row.prodRate} {row.rateBasis}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-muted-foreground">Crew Size</div>
                          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-white">{row.crewSize.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background/50 p-3">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Broad Category</div>
                      <div className="mt-1 text-sm font-bold text-white">{row.category}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/50 p-3">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Base Cost</div>
                      <div className="mt-1 text-sm font-bold text-white">{money(row.baseCost)}</div>
                    </div>
                    <div className="rounded-lg border border-orange-500/25 bg-orange-500/10 p-3">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Total Hours</div>
                      <div className="mt-1 text-lg font-black text-yellow-300">{row.manHours.toFixed(1)}</div>
                    </div>
                    <div className="rounded-lg border border-orange-500/25 bg-orange-500/10 p-3">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Total $</div>
                      <div className="mt-1 text-lg font-black text-green-400">{money(row.total)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/50 p-3">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Days</div>
                      <div className="mt-1 text-sm font-bold text-white">{row.days.toFixed(1)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/50 p-3">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Equipment Hours</div>
                      <div className="mt-1 text-sm font-bold text-white">{row.equipmentHours.toFixed(1)}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      {!rows.length && (
        <section className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No estimate items are available yet. Add bid items first, then production rates will calculate here.
        </section>
      )}
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
  const [productionMenuOpen, setProductionMenuOpen] = useState(false);
  const [sectionPhaseModalOpen, setSectionPhaseModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [bidItemModalOpen, setBidItemModalOpen] = useState(false);
  const [customPhaseOptions, setCustomPhaseOptions] = useState<string[]>([]);
  const [selectedPhaseType, setSelectedPhaseType] = useState(COMMON_CONSTRUCTION_PHASES[0]);
  const [customPhaseName, setCustomPhaseName] = useState("");
  const [selectedMilestoneSection, setSelectedMilestoneSection] = useState("");
  const [selectedMilestoneType, setSelectedMilestoneType] = useState(COMMON_MILESTONES[0]);
  const [customMilestoneName, setCustomMilestoneName] = useState("");
  const [selectedItemMilestone, setSelectedItemMilestone] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("LS");
  const [newItemTaxPct, setNewItemTaxPct] = useState("0");
  const [newItemUnitCost, setNewItemUnitCost] = useState("0");
  const [newItemRequestRfq, setNewItemRequestRfq] = useState(false);
  const [newItemRequestSubmittal, setNewItemRequestSubmittal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const projectFilteredEstimates = useMemo(() => {
    if (!selectedProjectId) return estimates || [];
    return (estimates || []).filter((estimate) => String(estimate.projectId || "") === selectedProjectId);
  }, [estimates, selectedProjectId]);
  const selectedEstimate = projectFilteredEstimates.find((estimate) => String(estimate._id) === selectedEstimateId) || projectFilteredEstimates[0] || (selectedProjectId ? undefined : estimates?.[0]);
  const estimateId = selectedEstimate?._id ? String(selectedEstimate._id) : "";
  const portfolioRows = useMemo(() => bidPortfolioRows({
    projects: projects || [],
    estimates: estimates || [],
    selectedProjectId,
  }), [projects, estimates, selectedProjectId]);

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
  const createEstimate = useMutation(api.estimating.createEstimate);
  const updateEstimate = useMutation(api.estimating.updateEstimate);
  const duplicateEstimate = useMutation(api.estimating.duplicateEstimate);
  const deleteEstimate = useMutation(api.estimating.deleteEstimate);
  const createEstimateItem = useMutation(api.estimating.createEstimateItem);
  const updateEstimateItem = useMutation(api.estimating.updateEstimateItem);
  const deleteEstimateItem = useMutation(api.estimating.deleteEstimateItem);
  const createVendor = useMutation(api.vendors.create);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [proofItem, setProofItem] = useState<Record<string, unknown> | null>(null);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [editItemMilestone, setEditItemMilestone] = useState("");
  const [editItemDescription, setEditItemDescription] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState("1");
  const [editItemUnit, setEditItemUnit] = useState("LS");
  const [editItemTaxPct, setEditItemTaxPct] = useState("0");
  const [editItemUnitCost, setEditItemUnitCost] = useState("0");
  const [editItemRequestRfq, setEditItemRequestRfq] = useState(false);
  const [editItemRequestSubmittal, setEditItemRequestSubmittal] = useState(false);
  const [inlineRfqItemId, setInlineRfqItemId] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [pricingDueDate, setPricingDueDate] = useState("");
  const [specNotes, setSpecNotes] = useState("");
  const [signatureProfile, setSignatureProfile] = useState<CorrespondenceSignatureProfile>(() => defaultSignatureProfile(user));
  const [creatingDrafts, setCreatingDrafts] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", contactName: "", email: "", phone: "", category: "Material Supplier" });
  const [selectedBuilderPhase, setSelectedBuilderPhase] = useState("");
  const [selectedBuilderSection, setSelectedBuilderSection] = useState("");
  const [starterDescription, setStarterDescription] = useState("");
  const [starterQuantity, setStarterQuantity] = useState("1");
  const [starterUnit, setStarterUnit] = useState("LS");
  const [starterUnitCost, setStarterUnitCost] = useState("0");
  const [creatingStarterEstimate, setCreatingStarterEstimate] = useState(false);
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
  const selectedProject = (projects || []).find((project) => String(project._id) === String(selectedProjectId || selectedEstimate?.projectId || ""));
  const selectedEstimateTotal = useMemo(() => estimateTotal(estimateItems || []), [estimateItems]);
  const rfqSummary = useMemo(() => rfqCounts(rfqsWithNotes), [rfqsWithNotes]);
  const scheduleScore = useMemo(() => scheduleReadinessScore(estimateItems || []), [estimateItems]);
  const predictiveSignals = useMemo(() => predictiveSignalsForEstimate({
    estimate: selectedEstimate,
    items: estimateItems || [],
    rfqSummary,
    costItems: costItems || [],
  }), [selectedEstimate, estimateItems, rfqSummary, costItems]);
  const productionRows = useMemo(() => productionRowsForItems(estimateItems || []), [estimateItems]);
  const productionSummary = useMemo(() => productionSummaryForRows(productionRows), [productionRows]);
  const activeBids = projectFilteredEstimates.filter((estimate) => !["won", "lost", "archived"].includes(String(estimate.status || "").toLowerCase())).length;
  const draftBids = projectFilteredEstimates.filter((estimate) => String(estimate.status || "").toLowerCase() === "draft").length;
  const wonBids = projectFilteredEstimates.filter((estimate) => String(estimate.status || "").toLowerCase() === "won").length;
  const submittedOrClosed = projectFilteredEstimates.filter((estimate) => ["submitted", "won", "lost"].includes(String(estimate.status || "").toLowerCase())).length;
  const winRate = submittedOrClosed ? Math.round((wonBids / submittedOrClosed) * 100) : 0;
  const inspirationLine = INSPIRATION_LINES[projectFilteredEstimates.length % INSPIRATION_LINES.length];
  const phaseOptions = useMemo(() => {
    return [...new Set([...COMMON_CONSTRUCTION_PHASES, ...customPhaseOptions])].sort((a, b) => a.localeCompare(b));
  }, [customPhaseOptions]);
  const estimateSectionOptions = useMemo(() => {
    const sections = (estimateItems || []).map((item) => String(item.section || "").split(" / ")[0]).filter(Boolean);
    return [...new Set([...sections, ...phaseOptions])].sort((a, b) => a.localeCompare(b));
  }, [estimateItems, phaseOptions]);
  const estimateMilestoneOptions = useMemo(() => {
    return (estimateItems || [])
      .filter((item) => isMilestoneParentItem(item))
      .map((item) => ({ section: String(item.section || "Unassigned"), milestone: String(item.description || "Milestone") }))
      .sort((a, b) => `${a.section} ${a.milestone}`.localeCompare(`${b.section} ${b.milestone}`));
  }, [estimateItems]);

  useEffect(() => {
    setSignatureProfile(loadSignatureProfile(user));
  }, [user?._id, user?.email, user?.name]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("opsslate_estimate_custom_phases") || "[]");
      if (Array.isArray(saved)) setCustomPhaseOptions(saved.filter((phase) => typeof phase === "string" && phase.trim()));
    } catch {
      setCustomPhaseOptions([]);
    }
  }, []);

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
    setActiveTool("rfq");
  }

  function rfqStatusForItem(item: Record<string, unknown>) {
    return rfqStatusByItemId.get(String(item._id)) || "No RFQ";
  }

  function openItemEditor(item: Record<string, unknown>) {
    const section = String(item.section || "");
    const milestone = milestoneNameForItem(item);
    const fallbackMilestone = estimateMilestoneOptions.find((option) => option.section === section) || estimateMilestoneOptions[0];
    setEditingItem(item);
    setEditItemMilestone(milestone ? `${section}::${milestone}` : fallbackMilestone ? `${fallbackMilestone.section}::${fallbackMilestone.milestone}` : "");
    setEditItemDescription(String(item.description || ""));
    setEditItemQuantity(String(item.quantity ?? "1"));
    setEditItemUnit(String(item.unit || "LS"));
    setEditItemTaxPct(String(item.taxPct ?? "0"));
    setEditItemUnitCost(String(item.unitCost ?? "0"));
    setEditItemRequestRfq(itemHasIntent(item, RFQ_INTENT_NOTE));
    setEditItemRequestSubmittal(itemHasIntent(item, SUBMITTAL_INTENT_NOTE));
  }

  function cleanItemNotesForEdit(item: Record<string, unknown>) {
    return String(item.notes || "")
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return trimmed &&
          !trimmed.startsWith(MILESTONE_ITEM_NOTE_PREFIX) &&
          !trimmed.startsWith(RFQ_INTENT_NOTE) &&
          !trimmed.startsWith(SUBMITTAL_INTENT_NOTE);
      });
  }

  async function saveEditedItemLine() {
    if (!editingItem?._id) return;
    const [sectionName, milestoneName] = editItemMilestone.split("::");
    const description = editItemDescription.trim();
    if (!sectionName || !milestoneName || !description) return;
    const notes = [
      `${MILESTONE_ITEM_NOTE_PREFIX} ${milestoneName}`,
      ...cleanItemNotesForEdit(editingItem),
      editItemRequestRfq ? `${RFQ_INTENT_NOTE}: Draft RFQ requested during item edit.` : "",
      editItemRequestSubmittal ? `${SUBMITTAL_INTENT_NOTE}: Submittal draft requested during item edit.` : "",
    ].filter(Boolean).join("\n");
    await updateEstimateItem({
      id: editingItem._id as Id<"estimateItems">,
      section: sectionName,
      description,
      quantity: Number(editItemQuantity || 0) || 0,
      unit: editItemUnit.trim() || "LS",
      unitCost: Number(editItemUnitCost || 0) || 0,
      taxPct: Number(editItemTaxPct || 0) || 0,
      notes,
    });
    if (editItemRequestRfq && selectedEstimate?._id && user && rfqStatusForItem(editingItem) === "No RFQ") {
      await createRfq({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        vendorName: "TBD supplier",
        status: "draft",
        notes: JSON.stringify({
          specNotes: `RFQ requested during item edit for ${description}.`,
          itemIds: [String(editingItem._id)],
          itemSnapshots: [{
            id: String(editingItem._id),
            description,
            quantity: Number(editItemQuantity || 0) || 0,
            unit: editItemUnit.trim() || "LS",
            unitCost: Number(editItemUnitCost || 0) || 0,
            section: sectionName,
            milestone: milestoneName,
          }],
          packageText: `REQUEST FOR QUOTE\nItem: ${description}\nSection: ${sectionName}\nMilestone: ${milestoneName}\nQty: ${editItemQuantity || 0} ${editItemUnit || "LS"}\nPlease provide unit price, total price, lead time, freight, tax, exclusions, and quote expiration.`,
        }),
      });
    }
    setEditingItem(null);
  }

  async function deleteBidItem(item: Record<string, unknown>) {
    if (!item?._id) return;
    const label = String(item.description || item.section || "this estimate line");
    if (typeof window !== "undefined" && !window.confirm(`Delete ${label}?`)) return;
    await deleteEstimateItem({ id: item._id as Id<"estimateItems"> });
    setSelectedItemIds((current) => current.filter((itemId) => itemId !== String(item._id)));
    if (String(proofItem?._id || "") === String(item._id)) setProofItem(null);
  }

  async function duplicateEstimateRow(estimate: Record<string, unknown>) {
    if (!estimate?._id) return;
    const newId = await duplicateEstimate({ id: estimate._id as Id<"estimates"> });
    setSelectedEstimateId(String(newId));
    setActiveTool("estimate-detail");
  }

  async function deleteEstimateRow(estimate: Record<string, unknown>) {
    if (!estimate?._id) return;
    const label = String(estimate.name || "this estimate");
    if (typeof window !== "undefined" && !window.confirm(`Delete ${label} and all bid items/RFQs?`)) return;
    await deleteEstimate({ id: estimate._id as Id<"estimates"> });
    if (String(selectedEstimate?._id || "") === String(estimate._id)) setSelectedEstimateId("");
    setSelectedItemIds([]);
    setActiveTool("estimates");
  }

  function startNewEstimateFlow() {
    if (!selectedProject) {
      if (typeof window !== "undefined") window.alert("Choose a project in the Estimating Cockpit first, then click + New Estimate.");
      setActiveTool("cockpit");
      return;
    }
    setSelectedBuilderPhase("");
    setSelectedBuilderSection("");
    setStarterDescription("");
    setActiveTool("estimates");
  }

  function openAutoBidQueue() {
    if (typeof window !== "undefined") window.alert("AI Auto-Bid is staged as a review-first tool. Use AI Tools from an open estimate to review scope, RFQs, submittals, and risks before creating draft actions.");
    setActiveTool("war-room");
  }

  function openQuickTemplates() {
    if (typeof window !== "undefined") window.alert("Quick Templates are being tied to the cost database and historical bid database. For now, use + Section, + Milestone, and + Add Item to keep this estimate structured.");
  }

  function openPortfolioRow(row: BidPortfolioRow) {
    if (row.project?._id) setSelectedProjectId(String(row.project._id));
    setSelectedEstimateId(row.estimate?._id ? String(row.estimate._id) : "");
    setSelectedItemIds([]);
    setActiveTool(row.estimate?._id ? "estimate-detail" : "estimates");
  }

  async function createStarterEstimate() {
    const phaseName = selectedBuilderPhase.trim();
    const sectionName = selectedBuilderSection.trim();
    const itemName = starterDescription.trim();
    if (!user || !selectedProject || !phaseName || !sectionName || !itemName) return;
    setCreatingStarterEstimate(true);
    try {
      const projectName = projectDisplayName(selectedProject);
      const estimateName = `${projectName} EST`;
      const location = projectAddressLine(selectedProject);
      const estimateIdCreated = await createEstimate({
        companyId: user.companyId,
        name: estimateName,
        client: portfolioClientLabel(selectedProject),
        location,
        status: "draft",
        bidType: portfolioTypeLabel(selectedProject),
        description: `Estimate started from blank slate guardrail: ${phaseName} / ${sectionName}`,
      });
      await updateEstimate({
        id: estimateIdCreated as Id<"estimates">,
        projectId: selectedProject._id as Id<"projects">,
      });
      await createEstimateItem({
        companyId: user.companyId,
        estimateId: estimateIdCreated as Id<"estimates">,
        section: `${phaseName} / ${sectionName}`,
        description: itemName,
        quantity: Number(starterQuantity || 0) || 0,
        unit: starterUnit.trim() || "LS",
        unitCost: Number(starterUnitCost || 0) || 0,
        taxPct: 0,
        notes: "Created from blank estimate slate with Phase / Section / Item guardrails.",
      });
      setSelectedEstimateId(String(estimateIdCreated));
      setSelectedItemIds([]);
      setActiveTool("estimate-detail");
    } finally {
      setCreatingStarterEstimate(false);
    }
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

  async function saveSectionPhase() {
    const nextPhase = selectedPhaseType === "Other" ? customPhaseName.trim() : selectedPhaseType;
    if (!user || !nextPhase || !selectedEstimate?._id) return;
    if (selectedPhaseType === "Other") {
      const nextOptions = [...new Set([...customPhaseOptions, nextPhase])].sort((a, b) => a.localeCompare(b));
      setCustomPhaseOptions(nextOptions);
      if (typeof window !== "undefined") localStorage.setItem("opsslate_estimate_custom_phases", JSON.stringify(nextOptions));
      setSelectedPhaseType(nextPhase);
      setCustomPhaseName("");
    }
    const existingParent = (estimateItems || []).some((item) => isSectionParentItem(item) && String(item.section || "") === nextPhase);
    if (!existingParent) {
      await createEstimateItem({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        section: nextPhase,
        description: nextPhase,
        quantity: 0,
        unit: "SECTION",
        unitCost: 0,
        taxPct: 0,
        notes: [
          `${SECTION_PARENT_NOTE}: Parent phase line created from + Section.`,
          `${ORDER_NOTE_PREFIX} ${(estimateItems || []).filter((item) => isSectionParentItem(item)).length + 1}`,
        ].join("\n"),
      });
    }
    setSectionPhaseModalOpen(false);
    setActiveTool("estimate-detail");
  }

  async function saveMilestoneLine() {
    const sectionName = selectedMilestoneSection.trim();
    const milestoneName = selectedMilestoneType === "Other" ? customMilestoneName.trim() : selectedMilestoneType;
    if (!user || !selectedEstimate?._id || !sectionName || !milestoneName) return;
    const existingSectionParent = (estimateItems || []).some((item) => isSectionParentItem(item) && String(item.section || "") === sectionName);
    if (!existingSectionParent) {
      await createEstimateItem({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        section: sectionName,
        description: sectionName,
        quantity: 0,
        unit: "SECTION",
        unitCost: 0,
        taxPct: 0,
        notes: [
          `${SECTION_PARENT_NOTE}: Parent phase line created automatically for milestone.`,
          `${ORDER_NOTE_PREFIX} ${(estimateItems || []).filter((item) => isSectionParentItem(item)).length + 1}`,
        ].join("\n"),
      });
    }
    const existingMilestone = (estimateItems || []).some((item) => isMilestoneParentItem(item) && String(item.section || "") === sectionName && String(item.description || "") === milestoneName);
    if (!existingMilestone) {
      await createEstimateItem({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        section: sectionName,
        description: milestoneName,
        quantity: 0,
        unit: "MILESTONE",
        unitCost: 0,
        taxPct: 0,
        notes: [
          `${MILESTONE_PARENT_NOTE}: Milestone child line under ${sectionName}.`,
          `${ORDER_NOTE_PREFIX} ${(estimateItems || []).filter((item) => isMilestoneParentItem(item) && String(item.section || "") === sectionName).length + 1}`,
        ].join("\n"),
      });
    }
    setMilestoneModalOpen(false);
    setCustomMilestoneName("");
    setActiveTool("estimate-detail");
  }

  async function saveBidItemLine() {
    const [sectionName, milestoneName] = selectedItemMilestone.split("::");
    const description = newItemDescription.trim();
    if (!user || !selectedEstimate?._id || !sectionName || !milestoneName || !description) return;
    const itemIdCreated = await createEstimateItem({
      companyId: user.companyId,
      estimateId: selectedEstimate._id as Id<"estimates">,
      section: sectionName,
      description,
      quantity: Number(newItemQuantity || 0) || 0,
      unit: newItemUnit.trim() || "LS",
      unitCost: Number(newItemUnitCost || 0) || 0,
      taxPct: Number(newItemTaxPct || 0) || 0,
      notes: [
        `${MILESTONE_ITEM_NOTE_PREFIX} ${milestoneName}`,
        `${ORDER_NOTE_PREFIX} ${(estimateItems || []).filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item) && String(item.section || "") === sectionName && milestoneNameForItem(item) === milestoneName).length + 1}`,
        newItemRequestRfq ? `${RFQ_INTENT_NOTE}: Draft RFQ requested at item creation.` : "",
        newItemRequestSubmittal ? `${SUBMITTAL_INTENT_NOTE}: Submittal draft requested at item creation.` : "",
      ].filter(Boolean).join("\n"),
    });
    if (newItemRequestRfq) {
      await createRfq({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        vendorName: "TBD supplier",
        status: "draft",
        notes: JSON.stringify({
          specNotes: `RFQ requested at item creation for ${description}.`,
          itemIds: [String(itemIdCreated)],
          itemSnapshots: [{
            id: String(itemIdCreated),
            description,
            quantity: Number(newItemQuantity || 0) || 0,
            unit: newItemUnit.trim() || "LS",
            unitCost: Number(newItemUnitCost || 0) || 0,
            section: sectionName,
            milestone: milestoneName,
          }],
          packageText: `REQUEST FOR QUOTE\nItem: ${description}\nSection: ${sectionName}\nMilestone: ${milestoneName}\nQty: ${newItemQuantity || 0} ${newItemUnit || "LS"}\nPlease provide unit price, total price, lead time, freight, tax, exclusions, and quote expiration.`,
        }),
      });
    }
    setBidItemModalOpen(false);
    setNewItemDescription("");
    setNewItemQuantity("1");
    setNewItemUnit("LS");
    setNewItemTaxPct("0");
    setNewItemUnitCost("0");
    setNewItemRequestRfq(false);
    setNewItemRequestSubmittal(false);
    setActiveTool("estimate-detail");
  }

  async function moveEstimateLine(item: Record<string, unknown>, siblings: Array<Record<string, unknown>>, direction: "up" | "down") {
    const ordered = sortByEstimateOrder(siblings);
    const index = ordered.findIndex((entry) => String(entry._id) === String(item._id));
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    const current = ordered[index];
    const target = ordered[targetIndex];
    const currentOrder = orderForItem(current, index + 1);
    const targetOrder = orderForItem(target, targetIndex + 1);
    await Promise.all([
      updateEstimateItem({
        id: current._id as Id<"estimateItems">,
        notes: notesWithOrder(current.notes, targetOrder),
      }),
      updateEstimateItem({
        id: target._id as Id<"estimateItems">,
        notes: notesWithOrder(target.notes, currentOrder),
      }),
    ]);
  }

  if (!user) return null;
  const activeToolConfig = ESTIMATING_TOOLS.find((tool) => tool.key === activeTool) || ESTIMATING_TOOLS[0];
  const bidActionButtonClass = "inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-xs font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-colors hover:border-orange-500/45 hover:bg-secondary";
  const bidActionToolbar = (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/65 p-3">
      <button type="button" className={bidActionButtonClass} onClick={() => setActiveTool("cockpit")}>← Back</button>
      <button type="button" className={`${bidActionButtonClass} border-yellow-500/35 bg-yellow-500/85 text-black hover:bg-yellow-400`} onClick={() => setSectionPhaseModalOpen(true)}>+ Section</button>
      <button
        type="button"
        className={`${bidActionButtonClass} border-orange-500/35 bg-orange-500/85 text-white hover:bg-orange-500`}
        onClick={() => {
          setSelectedMilestoneSection(selectedMilestoneSection || estimateSectionOptions[0] || "");
          setMilestoneModalOpen(true);
        }}
      >
        + Milestone
      </button>
      <button
        type="button"
        className={`${bidActionButtonClass} border-green-500/35 bg-green-500/85 text-white hover:bg-green-500`}
        onClick={() => {
          const firstMilestone = estimateMilestoneOptions[0];
          setSelectedItemMilestone(selectedItemMilestone || (firstMilestone ? `${firstMilestone.section}::${firstMilestone.milestone}` : ""));
          setBidItemModalOpen(true);
        }}
      >
        + Add Item
      </button>
      <button type="button" className={bidActionButtonClass} onClick={() => setActiveTool("cost")}>+ From Cost DB</button>
      <button type="button" className={bidActionButtonClass} onClick={() => window.print()}>Print Bid</button>
      <button type="button" className={`${bidActionButtonClass} border-green-500/30`} onClick={() => setActiveTool("cockpit")}>AI Tools</button>
      <div className="relative">
        <button
          type="button"
          className={`${bidActionButtonClass} border-blue-500/30`}
          onClick={() => setProductionMenuOpen((open) => !open)}
          aria-expanded={productionMenuOpen}
        >
          Production
        </button>
        {productionMenuOpen && (
          <div className="absolute left-0 top-11 z-40 w-64 rounded-xl border border-border bg-card p-2 shadow-[0_22px_60px_rgba(0,0,0,0.5)]">
            {[
              ["takeoff", "Ops-Takeoff"],
              ["production-breakdown", "Production Breakdown"],
              ["equipment-analyzer", "Equipment Analyzer"],
              ["equipment-dealers", "Equipment Dealers"],
            ].map(([tool, label]) => (
              <button
                key={tool}
                type="button"
                className="mb-2 flex w-full items-center rounded-lg border border-border bg-secondary/70 px-3 py-2 text-left text-sm font-bold text-white last:mb-0 hover:border-orange-500/45 hover:bg-secondary"
                onClick={() => {
                  setProductionMenuOpen(false);
                  setActiveTool(tool as EstimatingToolKey);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className={`${bidActionButtonClass} border-orange-500/35`} onClick={() => setActiveTool("rfq")}>Bid Package</button>
      <button type="button" className={bidActionButtonClass} onClick={() => setActiveTool("settings")}>Settings</button>
    </div>
  );
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
        {activeTool !== "cockpit" && activeTool !== "estimates" ? bidActionToolbar : null}
        <SectionPhaseModal
          open={sectionPhaseModalOpen}
          phaseOptions={phaseOptions}
          selectedPhase={selectedPhaseType}
          customPhase={customPhaseName}
          onPhaseChange={setSelectedPhaseType}
          onCustomPhaseChange={setCustomPhaseName}
          onCancel={() => setSectionPhaseModalOpen(false)}
          onContinue={saveSectionPhase}
        />
        <MilestoneModal
          open={milestoneModalOpen}
          sectionOptions={estimateSectionOptions}
          selectedSection={selectedMilestoneSection}
          selectedMilestone={selectedMilestoneType}
          customMilestone={customMilestoneName}
          onSectionChange={setSelectedMilestoneSection}
          onMilestoneChange={setSelectedMilestoneType}
          onCustomMilestoneChange={setCustomMilestoneName}
          onCancel={() => setMilestoneModalOpen(false)}
          onContinue={() => void saveMilestoneLine()}
        />
        <BidItemModal
          open={bidItemModalOpen}
          milestoneOptions={estimateMilestoneOptions}
          selectedMilestone={selectedItemMilestone}
          description={newItemDescription}
          quantity={newItemQuantity}
          unit={newItemUnit}
          taxPct={newItemTaxPct}
          unitCost={newItemUnitCost}
          requestRfq={newItemRequestRfq}
          requestSubmittal={newItemRequestSubmittal}
          onMilestoneChange={setSelectedItemMilestone}
          onDescriptionChange={setNewItemDescription}
          onQuantityChange={setNewItemQuantity}
          onUnitChange={setNewItemUnit}
          onTaxPctChange={setNewItemTaxPct}
          onUnitCostChange={setNewItemUnitCost}
          onRequestRfqChange={setNewItemRequestRfq}
          onRequestSubmittalChange={setNewItemRequestSubmittal}
          onCancel={() => setBidItemModalOpen(false)}
          onContinue={() => void saveBidItemLine()}
        />
        <BidItemModal
          open={Boolean(editingItem)}
          title="Edit Estimate Item"
          intro="Keep the bid item tied to a milestone while updating quantity, unit, cost, RFQ intent, and submittal intent."
          submitLabel="Save Item Changes"
          milestoneOptions={estimateMilestoneOptions}
          selectedMilestone={editItemMilestone}
          description={editItemDescription}
          quantity={editItemQuantity}
          unit={editItemUnit}
          taxPct={editItemTaxPct}
          unitCost={editItemUnitCost}
          requestRfq={editItemRequestRfq}
          requestSubmittal={editItemRequestSubmittal}
          onMilestoneChange={setEditItemMilestone}
          onDescriptionChange={setEditItemDescription}
          onQuantityChange={setEditItemQuantity}
          onUnitChange={setEditItemUnit}
          onTaxPctChange={setEditItemTaxPct}
          onUnitCostChange={setEditItemUnitCost}
          onRequestRfqChange={setEditItemRequestRfq}
          onRequestSubmittalChange={setEditItemRequestSubmittal}
          onCancel={() => setEditingItem(null)}
          onContinue={() => void saveEditedItemLine()}
        />
        <ProofModal
          item={proofItem}
          rfqStatus={proofItem ? rfqStatusForItem(proofItem) : "No RFQ"}
          onClose={() => setProofItem(null)}
          onEdit={(item) => {
            setProofItem(null);
            openItemEditor(item);
          }}
          onRequestQuote={(item) => {
            setProofItem(null);
            requestQuoteForItem(item);
          }}
        />
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
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[280px]">
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Project Selection</label>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => {
                      setSelectedProjectId(event.target.value);
                      setSelectedEstimateId("");
                      setSelectedItemIds([]);
                    }}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
                  >
                    <option value="">All projects</option>
                    {(projects || []).map((project) => (
                      <option key={String(project._id)} value={String(project._id)}>
                        {project.name || project.projectName || project.code || "Unnamed project"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <CockpitMetricCard label="Bid Portfolio" value={portfolioRows.length} sub={`${projectFilteredEstimates.length} estimate${projectFilteredEstimates.length === 1 ? "" : "s"}${selectedProject ? ` for ${selectedProject.name || "selected project"}` : ""}`} />
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
                        <th className="p-3 text-left">Project</th>
                        <th className="p-3 text-left">Client</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioRows.map((row) => {
                        const { project, estimate } = row;
                        const isSelected = Boolean(estimate?._id && String(estimate._id) === estimateId);
                        const storedTotal = portfolioStoredTotal(estimate);
                        const totalLabel = isSelected ? money(selectedEstimateTotal) : storedTotal !== undefined ? money(storedTotal) : estimate ? "Open" : "No estimate";
                        return (
                          <tr key={row.key} className="border-t border-border">
                            <td className="p-3">
                              <div className="font-bold text-white">{projectDisplayName(project, estimate)}</div>
                              <div className="text-xs text-muted-foreground">{projectAddressLine(project, estimate)}</div>
                              {estimate?.name && project && String(estimate.name) !== projectDisplayName(project, estimate) ? (
                                <div className="mt-1 text-[11px] font-semibold text-blue-200">Estimate: {String(estimate.name)}</div>
                              ) : null}
                            </td>
                            <td className="p-3 text-muted-foreground">{portfolioClientLabel(project, estimate)}</td>
                            <td className="p-3">
                              <Badge variant={estimate ? "outline" : "secondary"}>{estimate ? statusLabel(String(estimate.status || "draft")) : "No estimate"}</Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{portfolioTypeLabel(project, estimate)}</td>
                            <td className="p-3 text-right font-bold text-white">{totalLabel}</td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPortfolioRow(row)}
                              >
                                {estimate?._id ? "Open Estimate" : "Start Estimate"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {!portfolioRows.length && (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-muted-foreground">
                            {selectedProject ? "No portfolio row is available for this project yet." : "No projects or estimates yet. Create a project first, then open its estimate from the Bid Portfolio."}
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
                      ["Submitted Bids", projectFilteredEstimates.filter((estimate) => String(estimate.status || "").toLowerCase() === "submitted").length, "bg-blue-400"],
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
        ) : activeTool === "production-breakdown" ? (
          <ProductionRateBreakdownView
            estimate={selectedEstimate}
            rows={productionRows}
            summary={productionSummary}
            onBack={() => setActiveTool("estimate-detail")}
            onEditDetails={() => setActiveTool("estimates")}
          />
        ) : activeTool === "estimate-detail" ? (
          <EstimateDetailView
            estimate={selectedEstimate}
            project={selectedProject}
            items={estimateItems || []}
            selectedItemIds={selectedItemIds}
            selectedEstimateTotal={selectedEstimateTotal}
            rfqSummary={rfqSummary}
            scheduleScore={scheduleScore}
            predictiveSignals={predictiveSignals}
            onToggleItem={toggleItem}
            onRequestQuote={requestQuoteForItem}
            onOpenProof={setProofItem}
            onEditItem={openItemEditor}
            onDeleteItem={(item) => void deleteBidItem(item)}
            onEditDetails={() => setActiveTool("estimates")}
            onMoveLine={(item, siblings, direction) => void moveEstimateLine(item, siblings, direction)}
            rfqStatusForItem={rfqStatusForItem}
          />
        ) : activeTool === "estimates" ? (
          <EstimatesListView
            rows={portfolioRows}
            selectedProject={selectedProject}
            selectedPhase={selectedBuilderPhase}
            selectedSection={selectedBuilderSection}
            starterDescription={starterDescription}
            starterQuantity={starterQuantity}
            starterUnit={starterUnit}
            starterUnitCost={starterUnitCost}
            creatingStarter={creatingStarterEstimate}
            selectedEstimateId={estimateId}
            selectedEstimateTotal={selectedEstimateTotal}
            selectedEstimateItemCount={(estimateItems || []).length}
            onOpenEstimate={openPortfolioRow}
            onSelectedPhaseChange={setSelectedBuilderPhase}
            onSelectedSectionChange={setSelectedBuilderSection}
            onStarterDescriptionChange={setStarterDescription}
            onStarterQuantityChange={setStarterQuantity}
            onStarterUnitChange={setStarterUnit}
            onStarterUnitCostChange={setStarterUnitCost}
            onCreateStarter={() => void createStarterEstimate()}
            onDuplicateEstimate={(estimate) => void duplicateEstimateRow(estimate)}
            onDeleteEstimate={(estimate) => void deleteEstimateRow(estimate)}
            onNewEstimate={startNewEstimateFlow}
            onAutoBid={openAutoBidQueue}
            onQuickTemplates={openQuickTemplates}
          />
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
              {projectFilteredEstimates.map((estimate) => (
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
