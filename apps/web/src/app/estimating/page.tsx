"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type BuyoutLinkSummary = {
  quoteCount: number;
  selectedQuote?: {
    rfqId: string;
    vendorName: string;
    totalPrice: number;
    unitPrice: number;
    leadTime?: string;
    status: string;
  };
  awardedVendor?: string;
  awardedAmount?: number;
  sourceRfqId?: string;
  sourceQuoteId?: string;
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

function numericField(record: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "" && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
}

function engineerEstimateValue(estimate?: Record<string, unknown>, project?: Record<string, unknown>) {
  return numericField(estimate, ["engineersEstimate", "engineerEstimate", "engineerEstimateAmount", "ownerEstimate", "budget", "budgetValue"]) ||
    numericField(project, ["engineerEstimate", "engineersEstimate", "engineerEstimateAmount", "ownerEstimate", "budget", "budgetValue", "contractValue"]);
}

function bidDateValue(estimate?: Record<string, unknown>, project?: Record<string, unknown>) {
  return estimate?.bidDate || project?.contractDate || project?.bidDateTime || project?.bidDate || "";
}

function parseBidDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function bidCountdownLabel(bidDate: unknown, now: Date) {
  const date = parseBidDate(bidDate);
  if (!date) return "No bid date";
  const ms = date.getTime() - now.getTime();
  if (ms <= 0) return "Bid due now";
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

function buyoutLinksForItem(item: Record<string, unknown>, rfqHistory: Array<Record<string, unknown>>): BuyoutLinkSummary {
  const itemId = String(item._id || "");
  const quotes = rfqHistory.flatMap((rfq) => {
    const notes = (rfq.parsedNotes && typeof rfq.parsedNotes === "object" ? rfq.parsedNotes : safeRfqNotes(rfq.notes)) as RfqNotes;
    const response = notes.lineResponses?.[itemId];
    if (!response) return [];
    return [{
      rfqId: String(rfq._id || ""),
      vendorName: String(rfq.vendorName || notes.vendor?.name || "Vendor"),
      totalPrice: Number(response.totalPrice || 0),
      unitPrice: Number(response.unitPrice || 0),
      leadTime: response.leadTime,
      status: String(rfq.status || "draft"),
      selected: Boolean(response.selected),
    }];
  });
  const selectedQuote = quotes.find((quote) => quote.selected);
  return {
    quoteCount: quotes.length,
    selectedQuote,
    awardedVendor: selectedQuote?.vendorName,
    awardedAmount: selectedQuote?.totalPrice,
    sourceRfqId: selectedQuote?.rfqId,
    sourceQuoteId: undefined,
  };
}

function itemLabel(item: Record<string, unknown>) {
  return [item.section, item.description].filter(Boolean).join(" - ") || "Estimate item";
}

const SECTION_PARENT_NOTE = "OPSSLATE_SECTION_PARENT";
const MILESTONE_PARENT_NOTE = "OPSSLATE_MILESTONE_PARENT";
const MILESTONE_ITEM_NOTE_PREFIX = "OPSSLATE_MILESTONE:";
const ORDER_NOTE_PREFIX = "OPSSLATE_ORDER:";
const RFQ_INTENT_NOTE = "OPSSLATE_RFQ_INTENT";
const RFI_INTENT_NOTE = "OPSSLATE_RFI_INTENT";
const SUBMITTAL_INTENT_NOTE = "OPSSLATE_SUBMITTAL_INTENT";
const ITEM_SCOPE_NOTE_PREFIX = "OPSSLATE_ITEM_SCOPE:";
const ITEM_RFQ_DETAIL_PREFIX = "OPSSLATE_RFQ_DETAIL:";
const ITEM_RFI_DETAIL_PREFIX = "OPSSLATE_RFI_DETAIL:";
const ITEM_SUBMITTAL_DETAIL_PREFIX = "OPSSLATE_SUBMITTAL_DETAIL:";
const ITEM_SCHEDULE_DETAIL_PREFIX = "OPSSLATE_SCHEDULE_DETAIL:";
const SNIPPET_NOTE_PREFIX = "OPSSLATE_SNIPPET:";
const ESTIMATE_HANDOFF_PREFIX = "OPSSLATE_HANDOFF:";
const ESTIMATOR_ACTION_PREFIX = "OPSSLATE_CICERO_ACTION:";

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

function parseJsonNoteLines(notes: unknown, prefix: string) {
  return String(notes || "")
    .split("\n")
    .filter((line) => line.startsWith(prefix))
    .map((line) => {
      try {
        return JSON.parse(line.replace(prefix, "").trim());
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

function snippetsForItem(item: Record<string, unknown>) {
  return parseJsonNoteLines(item.notes, SNIPPET_NOTE_PREFIX);
}

function handoffsForEstimate(estimate?: Record<string, unknown>) {
  return parseJsonNoteLines(estimate?.notes, ESTIMATE_HANDOFF_PREFIX);
}

function ciceroActionsForEstimate(estimate?: Record<string, unknown>) {
  return parseJsonNoteLines(estimate?.notes, ESTIMATOR_ACTION_PREFIX);
}

function appendNoteLine(notes: unknown, line: string) {
  return [String(notes || "").trim(), line].filter(Boolean).join("\n");
}

function noteValue(notes: unknown, prefix: string) {
  const line = String(notes || "").split("\n").find((entry) => entry.trim().startsWith(prefix));
  return line ? line.replace(prefix, "").trim() : "";
}

function removeManagedItemDetailNotes(notes: unknown) {
  return String(notes || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed &&
        !trimmed.startsWith(ITEM_SCOPE_NOTE_PREFIX) &&
        !trimmed.startsWith(ITEM_RFQ_DETAIL_PREFIX) &&
        !trimmed.startsWith(ITEM_RFI_DETAIL_PREFIX) &&
        !trimmed.startsWith(ITEM_SUBMITTAL_DETAIL_PREFIX) &&
        !trimmed.startsWith(ITEM_SCHEDULE_DETAIL_PREFIX);
    });
}

function itemDetailNoteLines({
  scopeNote,
  rfqVendor,
  rfqDueDate,
  rfiQuestion,
  submittalRequirement,
  productionDays,
  crewSize,
  leadTime,
}: {
  scopeNote: string;
  rfqVendor: string;
  rfqDueDate: string;
  rfiQuestion: string;
  submittalRequirement: string;
  productionDays: string;
  crewSize: string;
  leadTime: string;
}) {
  const scheduleParts = [
    productionDays.trim() ? `production days ${productionDays.trim()}` : "",
    crewSize.trim() ? `crew ${crewSize.trim()}` : "",
    leadTime.trim() ? `lead time ${leadTime.trim()}` : "",
  ].filter(Boolean).join("; ");
  return [
    scopeNote.trim() ? `${ITEM_SCOPE_NOTE_PREFIX} ${scopeNote.trim()}` : "",
    rfqVendor.trim() || rfqDueDate.trim() ? `${ITEM_RFQ_DETAIL_PREFIX} ${[rfqVendor.trim() ? `vendor ${rfqVendor.trim()}` : "", rfqDueDate.trim() ? `due ${rfqDueDate.trim()}` : ""].filter(Boolean).join("; ")}` : "",
    rfiQuestion.trim() ? `${ITEM_RFI_DETAIL_PREFIX} ${rfiQuestion.trim()}` : "",
    submittalRequirement.trim() ? `${ITEM_SUBMITTAL_DETAIL_PREFIX} ${submittalRequirement.trim()}` : "",
    scheduleParts ? `${ITEM_SCHEDULE_DETAIL_PREFIX} ${scheduleParts}` : "",
  ].filter(Boolean);
}

function snippetNoteLine({
  title,
  purpose,
  image,
}: {
  title: string;
  purpose: string;
  image: string;
}) {
  if (!image) return "";
  return `${SNIPPET_NOTE_PREFIX} ${JSON.stringify({
    id: `snippet-${Date.now()}`,
    title: title.trim() || "Estimate item snippet",
    purpose: purpose.trim() || "Estimate Backup",
    image,
    createdAt: new Date().toISOString(),
  })}`;
}

function estimatorCoverageMetrics({
  estimate,
  items,
  rfqSummary,
}: {
  estimate?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  rfqSummary: ReturnType<typeof rfqCounts>;
}) {
  const pricedItems = items.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item));
  const withMilestone = pricedItems.filter((item) => milestoneNameForItem(item)).length;
  const priced = pricedItems.filter((item) => Number(item.unitCost || 0) > 0).length;
  const snippetCount = pricedItems.reduce((sum, item) => sum + snippetsForItem(item).length, 0);
  const handoffs = handoffsForEstimate(estimate);
  const pmReady = Boolean(estimate?.projectId) && pricedItems.length > 0 && priced === pricedItems.length;
  const schedulerReady = pricedItems.length > 0 && withMilestone === pricedItems.length;
  return {
    pricedItems,
    pricedCount: priced,
    withMilestone,
    snippetCount,
    rfqOpen: rfqSummary.open,
    handoffs,
    pmReady,
    schedulerReady,
    coverageScore: pricedItems.length ? Math.round(((priced / pricedItems.length) * 0.45 + (withMilestone / pricedItems.length) * 0.35 + (snippetCount ? 0.1 : 0) + (handoffs.length ? 0.1 : 0)) * 100) : 0,
  };
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

function printEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function printDocumentShell(title: string, body: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${printEscape(title)}</title>
  <style>
    @page { size: letter landscape; margin: 0.38in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; }
    .brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 3px solid #111827; padding-bottom: 12px; margin-bottom: 14px; }
    .brand-mark { color: #f97316; font-size: 12px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; }
    h1 { margin: 4px 0 0; font-size: 24px; line-height: 1.08; }
    h2 { margin: 18px 0 8px; font-size: 15px; }
    .muted { color: #64748b; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 14px; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; break-inside: avoid; }
    .label { color: #64748b; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    .value { margin-top: 3px; font-size: 14px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #111827; color: #fff; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 7px; vertical-align: top; }
    .section-row td { background: #e2e8f0; font-weight: 900; font-size: 12px; }
    .child-desc { padding-left: 22px; }
    .right { text-align: right; }
    .money { font-weight: 900; color: #047857; }
    .badge { display: inline-block; border: 1px solid #cbd5e1; border-radius: 999px; padding: 1px 6px; color: #475569; font-size: 9px; margin-top: 3px; }
    .summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 12px 0 14px; }
    .note { border-top: 1px solid #cbd5e1; margin-top: 14px; padding-top: 8px; color: #64748b; font-size: 10px; }
    tr, .box { break-inside: avoid; page-break-inside: avoid; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function openPrintHtml(title: string, body: string) {
  if (typeof window === "undefined") return;
  document.getElementById("opsslate-print-frame")?.remove();
  const printFrame = document.createElement("iframe");
  printFrame.id = "opsslate-print-frame";
  printFrame.title = title;
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  printFrame.style.opacity = "0";
  document.body.appendChild(printFrame);

  const printWindow = printFrame.contentWindow;
  const printDocument = printFrame.contentDocument || printWindow?.document;
  if (!printWindow || !printDocument) {
    printFrame.remove();
    window.alert("OpsSlate could not create the print package. Please try again.");
    return;
  }

  printDocument.open();
  printDocument.write(printDocumentShell(title, body));
  printDocument.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => printFrame.remove(), 3_000);
  }, 250);
}

function buildEstimatePrintBody({
  estimate,
  project,
  items,
  total,
}: {
  estimate?: Record<string, unknown>;
  project?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  total: number;
}) {
  const groupedItems = items.reduce<Record<string, Array<Record<string, unknown>>>>((groups, item) => {
    const section = String(item.section || item.sourceSpecSection || "Unassigned");
    groups[section] = groups[section] || [];
    groups[section].push(item);
    return groups;
  }, {} as Record<string, Array<Record<string, unknown>>>);
  const engineerEstimate = engineerEstimateValue(estimate, project);
  const bidDelta = engineerEstimate ? total - engineerEstimate : 0;
  const rows = Object.entries(groupedItems).map(([section, sectionItems]) => {
    const pricedItems = sortByEstimateOrder(sectionItems.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item)));
    const sectionTotal = estimateTotal(pricedItems);
    return `
      <tr class="section-row"><td colspan="6">${printEscape(section)}</td><td class="right">${pricedItems.length} item${pricedItems.length === 1 ? "" : "s"}</td><td class="right money">${printEscape(money(sectionTotal))}</td></tr>
      ${pricedItems.map((item) => `
        <tr>
          <td class="child-desc" colspan="2">
            <strong>${printEscape(item.description || "Estimate item")}</strong><br />
            <span class="badge">Spec: ${printEscape(item.sourceSpecSection || item.specSection || "No book")}</span>
          </td>
          <td class="right">${printEscape(item.quantity || 0)}</td>
          <td>${printEscape(item.unit || "LS")}</td>
          <td class="right">${printEscape(item.taxPct || "-")}</td>
          <td class="right">${printEscape(money(item.unitCost))}</td>
          <td class="right">${printEscape(money(itemLineTotal(item)))}</td>
          <td class="right money">${printEscape(money(itemLineTotal(item)))}</td>
        </tr>
      `).join("")}
    `;
  }).join("");
  return `
    <div class="brand">
      <div>
        <div class="brand-mark">OpsSlate Bid Estimate</div>
        <h1>${printEscape(projectDisplayName(project, estimate))}</h1>
        <div class="muted">${printEscape(projectAddressLine(project, estimate))}</div>
      </div>
      <div class="box" style="min-width: 190px;">
        <div class="label">Estimate Total</div>
        <div class="value money">${printEscape(money(total))}</div>
      </div>
    </div>
    <div class="meta">
      <div class="box"><div class="label">Client</div><div class="value">${printEscape(portfolioClientLabel(project, estimate))}</div></div>
      <div class="box"><div class="label">Bid Date</div><div class="value">${printEscape(bidDateValue(estimate, project) || "Not set")}</div></div>
      <div class="box"><div class="label">Engineer Est.</div><div class="value">${printEscape(engineerEstimate ? money(engineerEstimate) : "Not set")}</div></div>
      <div class="box"><div class="label">Bid Delta</div><div class="value">${printEscape(engineerEstimate ? money(bidDelta) : "--")}</div></div>
    </div>
    <table>
      <thead><tr><th colspan="2">Description</th><th class="right">Qty</th><th>Unit</th><th class="right">Tax %</th><th class="right">Unit Cost</th><th class="right">Line Total</th><th class="right">Extended</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="8" class="muted">No estimate items yet.</td></tr>`}</tbody>
    </table>
    <div class="note">Generated from OpsSlate. Review scope, exclusions, RFQs, submittals, and schedule assumptions before submission.</div>
  `;
}

function buildProductionPrintBody({
  estimate,
  rows,
  summary,
}: {
  estimate?: Record<string, unknown>;
  rows: ReturnType<typeof productionRowsForItems>;
  summary: ReturnType<typeof productionSummaryForRows>;
}) {
  const groupedRows = rows.reduce((groups, row) => {
    const key = row.section || "Unassigned";
    groups[key] = groups[key] || [];
    groups[key].push(row);
    return groups;
  }, {} as Record<string, typeof rows>);
  const groups = Object.entries(groupedRows).map(([section, sectionRows]) => `
    <h2>${printEscape(section)}</h2>
    <table>
      <thead><tr><th>Task</th><th>Category</th><th class="right">Qty</th><th>Unit</th><th class="right">Prod Rate</th><th class="right">Crew</th><th class="right">Days</th><th class="right">Hours</th><th class="right">Total</th></tr></thead>
      <tbody>
        ${sectionRows.map((row) => `
          <tr>
            <td><strong>${printEscape(row.description)}</strong></td>
            <td>${printEscape(row.category)}</td>
            <td class="right">${printEscape(row.quantity)}</td>
            <td>${printEscape(row.unit)}</td>
            <td class="right">${printEscape(`${row.prodRate} ${row.rateBasis}`)}</td>
            <td class="right">${printEscape(row.crewSize.toFixed(2))}</td>
            <td class="right">${printEscape(row.days.toFixed(1))}</td>
            <td class="right">${printEscape(row.manHours.toFixed(1))}</td>
            <td class="right money">${printEscape(money(row.total))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `).join("");
  return `
    <div class="brand">
      <div>
        <div class="brand-mark">OpsSlate Production Rate Breakdown</div>
        <h1>${printEscape(estimate?.name || "Selected estimate")}</h1>
        <div class="muted">Converts bid quantities into man-hours, equipment hours, production days, and review dollars.</div>
      </div>
      <div class="box" style="min-width: 190px;">
        <div class="label">Total L+E+M</div>
        <div class="value money">${printEscape(money(summary.total))}</div>
      </div>
    </div>
    <div class="summary">
      <div class="box"><div class="label">Equipment Hours</div><div class="value">${printEscape(summary.equipmentHours.toFixed(1))}</div></div>
      <div class="box"><div class="label">Man-Hours</div><div class="value">${printEscape(Math.round(summary.manHours).toLocaleString())}</div></div>
      <div class="box"><div class="label">Production Days</div><div class="value">${printEscape(summary.productionDays.toFixed(1))}</div></div>
      <div class="box"><div class="label">Labor Cost</div><div class="value">${printEscape(money(summary.laborCost))}</div></div>
      <div class="box"><div class="label">Equipment Cost</div><div class="value">${printEscape(money(summary.equipmentCost))}</div></div>
      <div class="box"><div class="label">Total</div><div class="value money">${printEscape(money(summary.total))}</div></div>
    </div>
    ${groups || `<div class="box muted">No production rows yet.</div>`}
    <div class="note">Generated from OpsSlate production assumptions. Confirm crew sizes, rates, prevailing wage, and equipment assumptions before final bid review.</div>
  `;
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
  | "data-center"
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
  { key: "data-center", label: "Data Center", icon: "DATA", description: "Suite-wide intelligence, memory, and prediction data" },
  { key: "war-room", label: "Bid War Room", icon: "WAR", description: "Bid day pressure and checklist" },
  { key: "calendar", label: "Bid Calendar", icon: "CAL", description: "Due dates and bid milestones" },
  { key: "analytics", label: "Win/Loss Analytics", icon: "WIN", description: "Win rate and lessons learned" },
  { key: "settings", label: "Settings", icon: "SET", description: "Estimator preferences" },
];

type DataCenterTab = "overview" | "estimator-memory" | "market-intelligence" | "strategic-playbooks";

type DataCenterRecordSummary = {
  id: string;
  sourceApp: "estimating" | "rfq" | "buyout" | "production" | "project-management";
  sourceRecordId: string;
  sourceType: "estimate_item" | "rfq_quote" | "buyout_award" | "actual_outcome" | "accepted_recommendation" | "dismissed_recommendation";
  title: string;
  category: string;
  status: string;
  confidence: "Strong" | "Likely" | "Needs Review";
  projectId?: string;
  estimateId?: string;
  estimateItemId?: string;
  sourceDate?: string;
  notes?: string;
};

type DataCenterCategory = {
  group: "Company Intelligence" | "Market Intelligence" | "Strategic Playbooks";
  name: string;
  description: string;
  status: "active" | "starter" | "future";
  tab?: DataCenterTab;
};

const DATA_CENTER_CATEGORIES: DataCenterCategory[] = [
  { group: "Company Intelligence", name: "Cost Database", description: "Labor, equipment, material, and subcontractor unit costs.", status: "starter" },
  { group: "Company Intelligence", name: "Material Database", description: "Material items, quote history, and price movement memory.", status: "starter" },
  { group: "Company Intelligence", name: "Labor Database", description: "Crew labor rates, classifications, and burden assumptions.", status: "starter" },
  { group: "Company Intelligence", name: "Equipment Database", description: "Owned, rented, and dealer equipment costs.", status: "starter" },
  { group: "Company Intelligence", name: "Vendor Pricing", description: "RFQ responses, selected quotes, buyout awards, and quote gaps.", status: "active" },
  { group: "Company Intelligence", name: "Production Rates", description: "Production rows, crew assumptions, man-hours, and equipment hours.", status: "active" },
  { group: "Company Intelligence", name: "Historical Bid Database", description: "Past estimates and company-wide estimate item memory.", status: "active" },
  { group: "Company Intelligence", name: "Risk Database", description: "Known risk language, scope warnings, and bid blockers.", status: "active" },
  { group: "Company Intelligence", name: "Spec Requirements", description: "Indexed requirements, submittal duties, and spec-derived scope.", status: "starter" },
  { group: "Company Intelligence", name: "Estimator Memory", description: "Prediction runs, feedback, outcomes, and Cicero recommendations.", status: "active", tab: "estimator-memory" },
  { group: "Market Intelligence", name: "Public Bid Results", description: "Agency lettings and awarded bid result research queue.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Agency Lettings", description: "Upcoming NYSDOT, NYSERDA, municipal, and utility opportunities.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Prevailing Wage", description: "Regional wage classifications and labor trend inputs.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Commodity Indexes", description: "Fuel, asphalt, lumber, concrete, steel, copper, and escalation inputs.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Fuel and Diesel", description: "Fuel exposure, trucking pressure, and equipment cost trend inputs.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Regional Pricing Trends", description: "Market heat, location pressure, and seasonal bid strategy.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Competitor Bid Patterns", description: "Observed competitor behavior from public results and win/loss review.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Owner Procurement History", description: "Owner-specific award patterns, alternates, and bid timing.", status: "future", tab: "market-intelligence" },
  { group: "Market Intelligence", name: "Funding and Grant Programs", description: "Grant-backed demand signals and program timing.", status: "future", tab: "market-intelligence" },
  { group: "Strategic Playbooks", name: "Bid Strategy Library", description: "Repeatable bid positioning moves and margin protection rules.", status: "starter", tab: "strategic-playbooks" },
  { group: "Strategic Playbooks", name: "Risk Playbooks", description: "Known qualifiers, exclusions, and risk handling paths.", status: "starter", tab: "strategic-playbooks" },
  { group: "Strategic Playbooks", name: "VE Playbooks", description: "Value engineering options, substitutes, and scope alternatives.", status: "starter", tab: "strategic-playbooks" },
  { group: "Strategic Playbooks", name: "Qualification Templates", description: "Reusable qualifications tied to spec, owner, and scope patterns.", status: "starter", tab: "strategic-playbooks" },
  { group: "Strategic Playbooks", name: "Owner Strategy Notes", description: "Owner-specific bidding posture and communication memory.", status: "starter", tab: "strategic-playbooks" },
  { group: "Strategic Playbooks", name: "Market Timing Notes", description: "When to chase, wait, qualify, or walk away.", status: "starter", tab: "strategic-playbooks" },
  { group: "Strategic Playbooks", name: "Cicero Recommendations", description: "Estimator-facing action memory and recommendation history.", status: "active", tab: "estimator-memory" },
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

const COMMON_ESTIMATE_ITEM_DESCRIPTIONS = [
  "Survey Operations",
  "Duct Bank Excavation",
  "Other",
];

const COMMON_UNIT_OF_MEASURE_OPTIONS = [
  "Ton",
  "LF",
  "CF",
  "YD",
  "SF",
  "YRD",
  "Acre",
  "Other",
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
  project,
  items,
  rfqSummary,
  costItems,
}: {
  estimate?: Record<string, unknown>;
  project?: Record<string, unknown>;
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
  if (!bidDateValue(estimate, project)) signals.push({ label: "Bid calendar gap", detail: "Bid date is missing, so bid-day pressure cannot be predicted.", severity: "low" });
  return signals.slice(0, 5);
}

function textTokens(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function similarityScore(a: unknown, b: unknown) {
  const left = new Set(textTokens(a));
  const right = new Set(textTokens(b));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((token) => { if (right.has(token)) shared += 1; });
  return shared / Math.max(left.size, right.size);
}

function riskBand(score: number) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function confidenceBand(score: number) {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Likely";
  return "Needs Review";
}

function buildPredictiveEstimatorModel({
  estimate,
  items,
  rfqSummary,
  productionRows,
  historicalEstimates,
  historicalItems,
}: {
  estimate?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  rfqSummary: ReturnType<typeof rfqCounts>;
  productionRows: ReturnType<typeof productionRowsForItems>;
  historicalEstimates: Array<Record<string, unknown>>;
  historicalItems: Array<Record<string, unknown>>;
}) {
  const pricedItems = items.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item));
  const currentText = [
    estimate?.name,
    estimate?.client,
    estimate?.bidType,
    estimate?.description,
    pricedItems.map((item) => `${item.section || ""} ${item.description || ""}`).join(" "),
  ].filter(Boolean).join(" ");
  const historicalWinRate = (() => {
    const decided = historicalEstimates.filter((entry) => ["won", "lost"].includes(String(entry.status || "").toLowerCase()));
    const won = decided.filter((entry) => String(entry.status || "").toLowerCase() === "won").length;
    return decided.length ? Math.round((won / decided.length) * 100) : 50;
  })();
  const similarEstimateMatches = historicalEstimates
    .filter((entry) => recordId(entry) !== recordId(estimate))
    .map((entry) => ({
      id: recordId(entry),
      name: String(entry.name || "Historical estimate"),
      status: String(entry.status || "draft"),
      score: Math.round(similarityScore(currentText, [entry.name, entry.client, entry.bidType, entry.description].filter(Boolean).join(" ")) * 100),
      total: portfolioStoredTotal(entry),
    }))
    .filter((entry) => entry.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const unpriced = pricedItems.filter((item) => Number(item.unitCost || 0) <= 0).length;
  const unmilestoned = pricedItems.filter((item) => !milestoneNameForItem(item)).length;
  const noSnippet = pricedItems.filter((item) => !snippetsForItem(item).length).length;
  const materialHeavy = pricedItems.filter((item) => /(material|concrete|asphalt|pipe|steel|wire|conduit|stone|aggregate|equipment|subcontract)/i.test(`${item.description || ""} ${item.section || ""}`)).length;
  const scopeGapRisk = pricedItems.length ? Math.round(((unmilestoned / pricedItems.length) * 45) + ((noSnippet / pricedItems.length) * 20) + (!estimate?.projectId ? 25 : 0) + (!estimate?.bidDate ? 10 : 0)) : 80;
  const marginRisk = pricedItems.length ? Math.round(((unpriced / pricedItems.length) * 55) + (rfqSummary.overdue ? 20 : 0) + (historicalWinRate < 35 ? 15 : 0) + (similarEstimateMatches.some((match) => match.status.toLowerCase() === "lost") ? 10 : 0)) : 85;
  const rfqExposure = materialHeavy ? Math.round(Math.min(100, ((rfqSummary.open || (rfqSummary.total ? 0 : materialHeavy)) / Math.max(1, materialHeavy)) * 100)) : 0;
  const productionConfidence = productionRows.length ? Math.round(Math.max(0, Math.min(100, 100 - (productionRows.filter((row) => !row.prodRate || row.rateBasis === "allowance").length / productionRows.length) * 55 - (unmilestoned / Math.max(1, pricedItems.length)) * 25))) : 25;
  const historicalSimilarity = similarEstimateMatches.length ? Math.round(similarEstimateMatches.reduce((sum, match) => sum + match.score, 0) / similarEstimateMatches.length) : 0;
  const survivalScore = Math.max(0, Math.min(100, Math.round(
    100 -
    scopeGapRisk * 0.25 -
    marginRisk * 0.3 -
    rfqExposure * 0.15 +
    productionConfidence * 0.18 +
    historicalWinRate * 0.08 +
    historicalSimilarity * 0.04
  )));
  const predictedOutcome = survivalScore >= 78 ? "Bid is tracking strong" : survivalScore >= 55 ? "Bid can survive with cleanup" : "Bid is exposed";
  const recommendedDraftActions = [
    marginRisk >= 55 ? "Lock down placeholder pricing or create RFQs before bid review." : "",
    scopeGapRisk >= 55 ? "Tie loose items to phase, milestone, proof, and project context." : "",
    rfqExposure >= 45 ? "Build vendor quote coverage for material-heavy and subcontract-heavy lines." : "",
    productionConfidence < 60 ? "Review production rates, crew assumptions, and scheduler handoff durations." : "",
    historicalSimilarity < 20 && historicalEstimates.length ? "No strong historical match. Treat this as a fresh-risk bid and increase review pressure." : "",
    historicalItems.length ? "Compare repeated item language against historical costs before final markup." : "",
  ].filter(Boolean);
  return {
    historicalEstimates,
    historicalItems,
    historicalWinRate,
    similarEstimateMatches,
    scopeGapRisk,
    marginRisk,
    rfqExposure,
    productionConfidence,
    historicalSimilarity,
    bidSurvivalScore: survivalScore,
    survivalScore,
    predictedOutcome,
    recommendedDraftActions,
    learnedFrom: `${historicalEstimates.length} historical estimate${historicalEstimates.length === 1 ? "" : "s"}, ${historicalItems.length} historical/active bid line${historicalItems.length === 1 ? "" : "s"}, ${rfqSummary.total} RFQ record${rfqSummary.total === 1 ? "" : "s"}`,
    modelVersion: "Cicero Predictive Estimator v1",
  };
}

function HistoricalEstimateItemsProbe({
  estimateId,
  onItemsChange,
}: {
  estimateId: string;
  onItemsChange: (estimateId: string, items: Array<Record<string, unknown>>) => void;
}) {
  const items = useQuery(
    api.estimating.listEstimateItems,
    estimateId ? { estimateId: estimateId as Id<"estimates"> } : "skip"
  ) as Array<Record<string, unknown>> | undefined;

  useEffect(() => {
    if (!estimateId || !items) return;
    onItemsChange(estimateId, items);
  }, [estimateId, items, onItemsChange]);

  return null;
}

function HistoricalEstimateItemsCollector({
  estimates,
  onItemsChange,
}: {
  estimates: Array<Record<string, unknown>>;
  onItemsChange: (estimateId: string, items: Array<Record<string, unknown>>) => void;
}) {
  return (
    <>
      {estimates.map((estimate) => {
        const estimateId = String(estimate._id || "");
        return estimateId ? (
          <HistoricalEstimateItemsProbe
            key={estimateId}
            estimateId={estimateId}
            onItemsChange={onItemsChange}
          />
        ) : null;
      })}
    </>
  );
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
  return items.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item)).map((item, index) => {
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

function confidenceForRecord(value: number): DataCenterRecordSummary["confidence"] {
  if (value >= 80) return "Strong";
  if (value >= 45) return "Likely";
  return "Needs Review";
}

function buildEstimatorMemoryRecords({
  estimate,
  items,
  rfqs,
  predictiveEstimatorModel,
  historicalItems,
}: {
  estimate?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  rfqs: Array<Record<string, unknown>>;
  predictiveSignals: Array<Record<string, unknown>>;
  predictiveEstimatorModel: Record<string, unknown>;
  productionRows: Array<Record<string, unknown>>;
  historicalItems: Array<Record<string, unknown>>;
}): DataCenterRecordSummary[] {
  const estimateId = String(estimate?._id || "");
  const projectId = String(estimate?.projectId || "");
  const records: DataCenterRecordSummary[] = [];
  const pricedItems = items.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item));
  const estimatorActions = ciceroActionsForEstimate(estimate);
  const survivalScore = Number(predictiveEstimatorModel.survivalScore || predictiveEstimatorModel.bidSurvivalScore || 0);

  pricedItems.forEach((item) => {
    const total = itemLineTotal(item);
    const itemId = String(item._id || "");
    records.push({
      id: `estimate-item-${itemId}`,
      sourceApp: "estimating",
      sourceRecordId: itemId,
      sourceType: "estimate_item",
      title: itemLabel(item),
      category: String(item.section || "Unassigned"),
      status: total > 0 ? "priced" : "price placeholder",
      confidence: confidenceForRecord(total > 0 ? 70 : 30),
      projectId,
      estimateId,
      estimateItemId: itemId,
      sourceDate: String(item._creationTime || estimate?._creationTime || ""),
      notes: String(item.notes || "").slice(0, 220),
    });
    if (
      String(item.notes || "").includes("actual") ||
      String(item.notes || "").includes("OPSSLATE_ACTUAL_OUTCOME") ||
      String(item.actualTotalCost || item.actualCost || "").trim()
    ) {
      records.push({
        id: `actual-outcome-${itemId}`,
        sourceApp: "production",
        sourceRecordId: itemId,
        sourceType: "actual_outcome",
        title: `${itemLabel(item)} actual outcome`,
        category: "Outcome Memory",
        status: "captured",
        confidence: "Likely",
        projectId,
        estimateId,
        estimateItemId: itemId,
        sourceDate: String(item.updatedAt || item._creationTime || ""),
        notes: "Actual cost or production outcome linked to this estimate item.",
      });
    }
  });

  rfqs.forEach((rfq) => {
    const notes = (rfq.parsedNotes && typeof rfq.parsedNotes === "object" ? rfq.parsedNotes : safeRfqNotes(rfq.notes)) as RfqNotes;
    Object.entries(notes.lineResponses || {}).forEach(([itemId, response]) => {
      const total = Number(response.totalPrice || 0);
      const title = itemLabel(pricedItems.find((item) => String(item._id) === itemId) || { description: "RFQ line response" });
      records.push({
        id: `rfq-quote-${String(rfq._id || "")}-${itemId}`,
        sourceApp: "rfq",
        sourceRecordId: String(rfq._id || ""),
        sourceType: "rfq_quote",
        title: `${title} quote from ${String(rfq.vendorName || notes.vendor?.name || "Vendor")}`,
        category: "Vendor Pricing",
        status: String(rfq.status || "draft"),
        confidence: confidenceForRecord(total > 0 ? 75 : 35),
        projectId,
        estimateId,
        estimateItemId: itemId,
        sourceDate: String(rfq._creationTime || ""),
        notes: missingResponseDetails(response).length ? `Missing ${missingResponseDetails(response).join(", ")}` : "Quote detail is ready for comparison.",
      });
      if (response.selected) {
        records.push({
          id: `buyout-award-${String(rfq._id || "")}-${itemId}`,
          sourceApp: "buyout",
          sourceRecordId: String(rfq._id || ""),
          sourceType: "buyout_award",
          title: `${title} buyout award`,
          category: "Vendor Pricing",
          status: "selected",
          confidence: confidenceForRecord(total > 0 ? 90 : 50),
          projectId,
          estimateId,
          estimateItemId: itemId,
          sourceDate: String(rfq._creationTime || ""),
          notes: `${String(rfq.vendorName || notes.vendor?.name || "Vendor")} selected at ${money(total)}`,
        });
      }
    });
  });

  estimatorActions.forEach((action, index) => {
    const status = String(action.status || "draft").toLowerCase();
    const sourceType: DataCenterRecordSummary["sourceType"] = status === "dismissed" ? "dismissed_recommendation" : "accepted_recommendation";
    records.push({
      id: `cicero-action-${index}-${status}`,
      sourceApp: "estimating",
      sourceRecordId: String(action.id || index),
      sourceType,
      title: String(action.title || action.label || "Cicero recommendation"),
      category: "Estimator Feedback",
      status: status || "recorded",
      confidence: confidenceForRecord(Number(action.confidence || survivalScore || 60)),
      projectId,
      estimateId,
      sourceDate: String(action.createdAt || estimate?._creationTime || ""),
      notes: String(action.reason || action.note || action.description || "").slice(0, 220),
    });
  });

  if (!records.some((record) => record.sourceType === "actual_outcome") && historicalItems.length) {
    records.push({
      id: "actual-outcome-company-history",
      sourceApp: "production",
      sourceRecordId: "company-history",
      sourceType: "actual_outcome",
      title: "Company outcome memory seed",
      category: "Outcome Memory",
      status: "ready for links",
      confidence: "Needs Review",
      projectId,
      estimateId,
      notes: `${historicalItems.length} historical estimate item records are available to connect with actual cost and production outcomes.`,
    });
  }

  return records;
}

export default function EstimatingPage() {
  return (
    <AppShell showSidebar={false} showTopBar={false}>
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
    <aside data-print-hide="true" className="sticky top-4 hidden h-[calc(100vh-5.5rem)] w-64 shrink-0 overflow-y-auto rounded-lg border border-border bg-card/85 p-3 xl:block">
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

function EstimatorMemoryView({
  records,
  predictiveEstimatorModel,
  onBack,
}: {
  records: DataCenterRecordSummary[];
  predictiveEstimatorModel: Record<string, unknown>;
  onBack: () => void;
}) {
  const counts = {
    predictionRuns: records.filter((record) => record.sourceType === "estimate_item").length,
    estimatorFeedback: records.filter((record) => record.category === "Estimator Feedback").length,
    outcomeMemory: records.filter((record) => record.sourceType === "actual_outcome").length,
    acceptedRecommendations: records.filter((record) => record.sourceType === "accepted_recommendation").length,
    dismissedRecommendations: records.filter((record) => record.sourceType === "dismissed_recommendation").length,
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge className="bg-cyan-500/15 text-cyan-200">Estimator Memory</Badge>
          <h2 className="mt-3 text-2xl font-black text-white">Estimator Memory</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Persistent estimating intelligence pulled from prediction runs, quote decisions, buyout selections, actual outcomes, and estimator feedback.
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>Back to Data Center</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Prediction Runs", counts.predictionRuns, "Current estimate item signals"],
          ["Estimator Feedback", counts.estimatorFeedback, "Recorded Cicero decisions"],
          ["Outcome Memory", counts.outcomeMemory, "Actual cost and production links"],
          ["Accepted Recommendations", counts.acceptedRecommendations, "Approved estimator moves"],
          ["Dismissed Recommendations", counts.dismissedRecommendations, "Rejected or blocked moves"],
        ].map(([label, value, helper]) => (
          <div key={String(label)} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="text-2xl font-black text-green-400">{String(value)}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-100">{String(label)}</div>
            <div className="mt-2 text-xs text-muted-foreground">{String(helper)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Current predictive posture</div>
            <div className="mt-1 text-lg font-black text-white">{String(predictiveEstimatorModel.predictedOutcome || "No prediction recorded")}</div>
          </div>
          <div className="rounded-lg border border-green-500/25 bg-green-500/10 px-4 py-2 text-right">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-green-200">Confidence</div>
            <div className="text-xl font-black text-green-400">{String(predictiveEstimatorModel.survivalScore || predictiveEstimatorModel.bidSurvivalScore || 0)}%</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-background/70 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Record</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 18).map((record) => (
              <tr key={record.id} className="border-t border-border">
                <td className="p-3 text-blue-100">{record.sourceType.replaceAll("_", " ")}</td>
                <td className="p-3">
                  <div className="font-bold text-white">{record.title}</div>
                  {record.notes ? <div className="mt-1 text-xs text-muted-foreground">{record.notes}</div> : null}
                </td>
                <td className="p-3 text-muted-foreground">{record.category}</td>
                <td className="p-3"><Badge variant="outline">{record.status}</Badge></td>
                <td className="p-3 text-green-300">{record.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No memory records yet. Cicero will start filling this as estimates, RFQs, buyouts, feedback, and outcomes are captured.
          </div>
        )}
      </div>
    </section>
  );
}

function DataCenterView({
  activeTab,
  onTabChange,
  records,
  predictiveEstimatorModel,
}: {
  activeTab: DataCenterTab;
  onTabChange: (tab: DataCenterTab) => void;
  records: DataCenterRecordSummary[];
  predictiveEstimatorModel: Record<string, unknown>;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const groups: DataCenterCategory["group"][] = ["Company Intelligence", "Market Intelligence", "Strategic Playbooks"];
  const filteredCategories = DATA_CENTER_CATEGORIES.filter((category) => {
    if (!normalizedQuery) return true;
    return `${category.group} ${category.name} ${category.description}`.toLowerCase().includes(normalizedQuery);
  });
  const shownRecords = records.filter((record) => {
    if (!normalizedQuery) return true;
    return `${record.title} ${record.category} ${record.status} ${record.notes || ""}`.toLowerCase().includes(normalizedQuery);
  });

  if (activeTab === "estimator-memory") {
    return (
      <EstimatorMemoryView
        records={records}
        predictiveEstimatorModel={predictiveEstimatorModel}
        onBack={() => onTabChange("overview")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="bg-orange-500/15 text-orange-300">Data Center</Badge>
            <h1 className="mt-3 text-3xl font-black text-white">Data Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Suite-wide intelligence center. Estimating works here; OpsSlate learns here.
            </p>
          </div>
          <input
            data-center-search="true"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search intelligence, memory, vendors, risk..."
            className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["overview", "Overview"],
            ["estimator-memory", "Estimator Memory"],
            ["market-intelligence", "Market Intelligence"],
            ["strategic-playbooks", "Strategic Playbooks"],
          ].map(([tab, label]) => (
            <Button
              key={tab}
              type="button"
              variant={activeTab === tab ? "default" : "outline"}
              onClick={() => onTabChange(tab as DataCenterTab)}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section data-center-detail="true" className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {groups.map((group) => {
            const categories = filteredCategories.filter((category) => category.group === group);
            if (!categories.length) return null;
            return (
              <div key={group} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-blue-100">{group}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {categories.map((category) => (
                    <button
                      key={`${category.group}-${category.name}`}
                      type="button"
                      onClick={() => category.tab && onTabChange(category.tab)}
                      className="rounded-lg border border-border bg-background/45 p-4 text-left transition-colors hover:border-orange-500/35 hover:bg-secondary/60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-black text-white">{category.name}</div>
                        <Badge className={category.status === "active" ? "bg-green-500/15 text-green-200" : category.status === "starter" ? "bg-blue-500/15 text-blue-200" : "bg-secondary text-muted-foreground"}>
                          {category.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{category.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">Estimator Memory</div>
            <div className="mt-2 text-3xl font-black text-white">{records.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Normalized records ready for Cicero, prediction storage, and later outcome training.</p>
            <Button className="mt-4 w-full" onClick={() => onTabChange("estimator-memory")}>Open Estimator Memory</Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Recent intelligence records</div>
            <div className="mt-3 space-y-2">
              {shownRecords.slice(0, 6).map((record) => (
                <div key={record.id} className="rounded-md border border-border bg-background/45 p-3">
                  <div className="text-sm font-bold text-white">{record.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{record.sourceType.replaceAll("_", " ")}</span>
                    <span>{record.confidence}</span>
                  </div>
                </div>
              ))}
              {!shownRecords.length && <div className="text-sm text-muted-foreground">No records match this search yet.</div>}
            </div>
          </div>
        </aside>
      </section>
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

function HierarchyRenameModal({
  open,
  title,
  label,
  value,
  helper,
  onChange,
  onCancel,
  onSave,
}: {
  open: boolean;
  title: string;
  label: string;
  value: string;
  helper: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave} disabled={!value.trim()}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function BidItemModal({
  open,
  title = "Add Estimate Item",
  intro = "Choose the section home first, then enter the priced bid item.",
  submitLabel = "Add Item",
  sectionOptions,
  descriptionOptions,
  unitOptions,
  selectedSection,
  selectedDescription,
  customDescription,
  description,
  selectedUnit,
  customUnit,
  quantity,
  unit,
  taxPct,
  unitCost,
  requestRfq,
  requestRfi,
  requestSubmittal,
  attachSnippet,
  scopeNote,
  rfqVendor,
  rfqDueDate,
  rfiQuestion,
  submittalRequirement,
  snippetTitle,
  snippetPurpose,
  snippetImage,
  productionDays,
  crewSize,
  leadTime,
  onSectionChange,
  onSelectedDescriptionChange,
  onCustomDescriptionChange,
  onDescriptionChange,
  onSelectedUnitChange,
  onCustomUnitChange,
  onQuantityChange,
  onUnitChange,
  onTaxPctChange,
  onUnitCostChange,
  onRequestRfqChange,
  onRequestRfiChange,
  onRequestSubmittalChange,
  onAttachSnippetChange,
  onScopeNoteChange,
  onRfqVendorChange,
  onRfqDueDateChange,
  onRfiQuestionChange,
  onSubmittalRequirementChange,
  onSnippetTitleChange,
  onSnippetPurposeChange,
  onSnippetImageChange,
  onProductionDaysChange,
  onCrewSizeChange,
  onLeadTimeChange,
  onCancel,
  onContinue,
}: {
  open: boolean;
  title?: string;
  intro?: string;
  submitLabel?: string;
  sectionOptions: string[];
  descriptionOptions: string[];
  unitOptions: string[];
  selectedSection: string;
  selectedDescription: string;
  customDescription: string;
  description: string;
  selectedUnit: string;
  customUnit: string;
  quantity: string;
  unit: string;
  taxPct: string;
  unitCost: string;
  requestRfq: boolean;
  requestRfi: boolean;
  requestSubmittal: boolean;
  attachSnippet: boolean;
  scopeNote: string;
  rfqVendor: string;
  rfqDueDate: string;
  rfiQuestion: string;
  submittalRequirement: string;
  snippetTitle: string;
  snippetPurpose: string;
  snippetImage: string;
  productionDays: string;
  crewSize: string;
  leadTime: string;
  onSectionChange: (value: string) => void;
  onSelectedDescriptionChange: (value: string) => void;
  onCustomDescriptionChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSelectedUnitChange: (value: string) => void;
  onCustomUnitChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onTaxPctChange: (value: string) => void;
  onUnitCostChange: (value: string) => void;
  onRequestRfqChange: (value: boolean) => void;
  onRequestRfiChange: (value: boolean) => void;
  onRequestSubmittalChange: (value: boolean) => void;
  onAttachSnippetChange: (value: boolean) => void;
  onScopeNoteChange: (value: string) => void;
  onRfqVendorChange: (value: string) => void;
  onRfqDueDateChange: (value: string) => void;
  onRfiQuestionChange: (value: string) => void;
  onSubmittalRequirementChange: (value: string) => void;
  onSnippetTitleChange: (value: string) => void;
  onSnippetPurposeChange: (value: string) => void;
  onSnippetImageChange: (value: string) => void;
  onProductionDaysChange: (value: string) => void;
  onCrewSizeChange: (value: string) => void;
  onLeadTimeChange: (value: string) => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const quantityNumber = Number(quantity || 0) || 0;
  const unitCostNumber = Number(unitCost || 0) || 0;
  const taxNumber = Number(taxPct || 0) || 0;
  const lineTotal = quantityNumber * unitCostNumber;
  const extended = lineTotal * (1 + taxNumber / 100);
  const isCustomDescription = selectedDescription === "Other";
  const isCustomUnit = selectedUnit === "Other";
  const handleSnippetFile = (file?: File) => {
    if (!file) {
      onSnippetImageChange("");
      return;
    }
    if (file.size > 750_000) {
      if (typeof window !== "undefined") window.alert("Snippet image is too large for this quick line-note tool. Use a smaller screenshot for now.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onSnippetImageChange(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
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
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Item Description</label>
            <select
              value={selectedDescription}
              onChange={(event) => {
                const nextValue = event.target.value;
                onSelectedDescriptionChange(nextValue);
                onDescriptionChange(nextValue === "Other" ? customDescription : nextValue);
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Select item description...</option>
              {descriptionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {isCustomDescription ? (
              <input
                value={customDescription}
                onChange={(event) => {
                  onCustomDescriptionChange(event.target.value);
                  onDescriptionChange(event.target.value);
                }}
                className="mt-2 w-full rounded-md border border-orange-500/35 bg-background px-3 py-2 text-sm text-white"
                placeholder="Type custom item description..."
              />
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Quantity</label>
            <input value={quantity} onChange={(event) => onQuantityChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Unit of Measure</label>
            <select
              value={selectedUnit}
              onChange={(event) => {
                const nextValue = event.target.value;
                onSelectedUnitChange(nextValue);
                onUnitChange(nextValue === "Other" ? customUnit : nextValue);
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Select unit...</option>
              {unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {isCustomUnit ? (
              <input
                value={customUnit}
                onChange={(event) => {
                  onCustomUnitChange(event.target.value);
                  onUnitChange(event.target.value);
                }}
                className="mt-2 w-full rounded-md border border-orange-500/35 bg-background px-3 py-2 text-sm text-white"
                placeholder="Type custom unit..."
              />
            ) : null}
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
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          <label className="flex items-start gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            <input
              type="checkbox"
              checked={requestRfi}
              onChange={(event) => onRequestRfiChange(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-bold text-white">RFI required</span>
              Capture the question now so scope gaps do not get buried in the estimate rows.
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
          <label className="flex items-start gap-3 rounded-lg border border-purple-500/25 bg-purple-500/10 p-3 text-sm text-purple-100">
            <input
              type="checkbox"
              checked={attachSnippet}
              onChange={(event) => onAttachSnippetChange(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-bold text-white">Attach snippet</span>
              Add screenshot, plan crop, photo, or markup backup while the line item is being built.
            </span>
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Scope / Proof Notes</label>
            <textarea
              value={scopeNote}
              onChange={(event) => onScopeNoteChange(event.target.value)}
              className="mt-1 h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              placeholder="What makes this line real? Takeoff basis, spec note, drawing reference, assumption, exclusion..."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Production Days</label>
              <input value={productionDays} onChange={(event) => onProductionDaysChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="e.g. 2.5" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Crew Size</label>
              <input value={crewSize} onChange={(event) => onCrewSizeChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="e.g. 3" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Lead Time / Constraint</label>
              <input value={leadTime} onChange={(event) => onLeadTimeChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="e.g. 2 weeks, after submittal approval, weather sensitive..." />
            </div>
          </div>
        </div>
        {(requestRfq || requestRfi || requestSubmittal || attachSnippet) && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {requestRfq ? (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">RFQ Vendor / Supplier</label>
                  <input value={rfqVendor} onChange={(event) => onRfqVendorChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="TBD supplier or preferred vendor" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">RFQ Due Date</label>
                  <input type="date" value={rfqDueDate} onChange={(event) => onRfqDueDateChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
                </div>
              </>
            ) : null}
            {requestRfi ? (
              <div className={requestRfq ? "" : "md:col-span-3"}>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">RFI Question</label>
                <textarea
                  value={rfiQuestion}
                  onChange={(event) => onRfiQuestionChange(event.target.value)}
                  className="mt-1 h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
                  placeholder="What needs to be confirmed by the owner, engineer, supplier, or PM?"
                />
              </div>
            ) : null}
            {requestSubmittal ? (
              <div className={requestRfq ? "" : "md:col-span-3"}>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Submittal Requirement</label>
                <input value={submittalRequirement} onChange={(event) => onSubmittalRequirementChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Product data, shop drawing, mix design, sample, certification..." />
              </div>
            ) : null}
            {attachSnippet ? (
              <div className="md:col-span-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Snippet title</label>
                    <input value={snippetTitle} onChange={(event) => onSnippetTitleChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Plan crop, RFI backup, RFQ backup..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Snippet purpose</label>
                    <select value={snippetPurpose} onChange={(event) => onSnippetPurposeChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white">
                      <option>RFQ Backup</option>
                      <option>RFI Question</option>
                      <option>Submittal Backup</option>
                      <option>Scope Proof</option>
                      <option>PM Handoff</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Snippet image</label>
                    <input type="file" accept="image/*" onChange={(event) => handleSnippetFile(event.target.files?.[0])} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" />
                  </div>
                </div>
                {snippetImage ? <img src={snippetImage} alt="Snippet preview" className="mt-3 max-h-44 w-full rounded-md border border-border object-contain" /> : null}
              </div>
            ) : null}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onContinue} disabled={!selectedSection || !description.trim()}>{submitLabel}</Button>
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
  const snippets = snippetsForItem(item);
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

        <section className="mt-4 rounded-lg border border-border bg-background/40 p-4">
          <h3 className="font-bold text-white">Snippets</h3>
          {snippets.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {snippets.map((snippet) => (
                <div key={String(snippet.id || snippet.title)} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-sm font-bold text-white">{String(snippet.title || "Snippet")}</div>
                  <div className="text-xs text-muted-foreground">{String(snippet.purpose || "Proof")}</div>
                  {snippet.image ? <img src={String(snippet.image)} alt={String(snippet.title || "Snippet")} className="mt-3 max-h-48 w-full rounded-md border border-border object-contain" /> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No snippets attached yet. Add one from the line item actions.</p>
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

function SnippetModal({
  item,
  snippetTitle,
  snippetPurpose,
  snippetImage,
  onTitleChange,
  onPurposeChange,
  onImageChange,
  onCancel,
  onSave,
}: {
  item: Record<string, unknown> | null;
  snippetTitle: string;
  snippetPurpose: string;
  snippetImage: string;
  onTitleChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onImageChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <Badge className="mb-3 bg-purple-500/15 text-purple-200">Snippet Tool</Badge>
        <h2 className="text-2xl font-black text-white">Attach Field / Plan Snippet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Attach a quick image to {String(item.description || "this line")} for RFQ, RFI, proof, or PM handoff context.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Snippet title</label>
              <input
                value={snippetTitle}
                onChange={(event) => onTitleChange(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
                placeholder="Example: Bollard detail, feeder route conflict, asphalt note"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Use for</label>
              <select
                value={snippetPurpose}
                onChange={(event) => onPurposeChange(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              >
                <option>RFQ Backup</option>
                <option>RFI Question</option>
                <option>Plan Proof</option>
                <option>PM Handoff</option>
                <option>Scheduler Constraint</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Image</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-blue-100"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 450000) {
                    window.alert("Snippet image is too large for this quick line-note tool. Use a smaller screenshot for now.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => onImageChange(String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">Small screenshots are saved on the line item so they can travel with RFQs, RFIs, and handoff review.</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Preview</div>
            {snippetImage ? (
              <img src={snippetImage} alt="Snippet preview" className="mt-3 max-h-56 w-full rounded-md border border-border object-contain" />
            ) : (
              <div className="mt-3 grid h-56 place-items-center rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
                Upload a plan, field, or spec screenshot.
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!snippetTitle.trim() || !snippetImage} onClick={onSave}>Save Snippet</Button>
        </div>
      </div>
    </div>
  );
}

function CiceroCommandPanel({
  estimate,
  items,
  rfqSummary,
  scheduleScore,
  productionRows,
  historicalEstimates,
  historicalItems,
  onGoToRfq,
  onGoToProduction,
  onCreateAction,
}: {
  estimate?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  rfqSummary: ReturnType<typeof rfqCounts>;
  scheduleScore: number;
  productionRows: ReturnType<typeof productionRowsForItems>;
  historicalEstimates: Array<Record<string, unknown>>;
  historicalItems: Array<Record<string, unknown>>;
  onGoToRfq: () => void;
  onGoToProduction: () => void;
  onCreateAction: (action: string) => void;
}) {
  const metrics = estimatorCoverageMetrics({ estimate, items, rfqSummary });
  const predictiveModel = buildPredictiveEstimatorModel({
    estimate,
    items,
    rfqSummary,
    productionRows,
    historicalEstimates,
    historicalItems,
  });
  const zeroCost = metrics.pricedItems.filter((item) => Number(item.unitCost || 0) <= 0).length;
  const noMilestone = metrics.pricedItems.length - metrics.withMilestone;
  const actions = [
    zeroCost ? { label: "Price placeholders", detail: `${zeroCost} item${zeroCost === 1 ? "" : "s"} need real cost or RFQ coverage.`, cta: "Create pricing action", run: () => onCreateAction("Review zero-cost placeholders and either price them or send RFQs.") } : null,
    rfqSummary.open ? { label: "RFQs open", detail: `${rfqSummary.open} RFQ package${rfqSummary.open === 1 ? "" : "s"} need follow-up or quote logging.`, cta: "Open RFQ desk", run: onGoToRfq } : null,
    noMilestone ? { label: "Loose schedule handoff", detail: `${noMilestone} item${noMilestone === 1 ? "" : "s"} are not tied to a milestone.`, cta: "Create schedule action", run: () => onCreateAction("Tie loose estimate items to milestones before scheduler handoff.") } : null,
    scheduleScore < 80 ? { label: "Production assumptions", detail: "Production days need review before this estimate goes downstream.", cta: "Open production", run: onGoToProduction } : null,
    ...predictiveModel.recommendedDraftActions.slice(0, 3).map((action) => ({
      label: "Cicero recommendation",
      detail: action,
      cta: "Create draft action",
      run: () => onCreateAction(action),
    })),
  ].filter(Boolean) as Array<{ label: string; detail: string; cta: string; run: () => void }>;

  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge className="mb-2 bg-cyan-500/15 text-cyan-200">Cicero Estimator</Badge>
          <h2 className="text-xl font-black text-white">Master estimate command</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Cicero is watching price coverage, milestone structure, RFQs, snippets, and handoff readiness before this bid leaves estimating.</p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bid Survival Score</div>
          <div className="text-2xl font-black text-green-400">{predictiveModel.bidSurvivalScore}%</div>
          <div className="text-xs text-blue-100">{predictiveModel.predictedOutcome}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ["Priced", `${metrics.pricedCount}/${metrics.pricedItems.length}`],
          ["Milestoned", `${metrics.withMilestone}/${metrics.pricedItems.length}`],
          ["Snippets", metrics.snippetCount],
          ["Handoffs", metrics.handoffs.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border border-border bg-background/50 p-3">
            <div className="text-lg font-black text-white">{String(value)}</div>
            <div className="text-xs text-blue-100">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Margin Risk", `${predictiveModel.marginRisk}%`, riskBand(predictiveModel.marginRisk)],
          ["Scope Gap Risk", `${predictiveModel.scopeGapRisk}%`, riskBand(predictiveModel.scopeGapRisk)],
          ["RFQ Exposure", `${predictiveModel.rfqExposure}%`, riskBand(predictiveModel.rfqExposure)],
          ["Production Confidence", `${predictiveModel.productionConfidence}%`, confidenceBand(predictiveModel.productionConfidence)],
          ["Historical Similarity", `${predictiveModel.historicalSimilarity}%`, predictiveModel.similarEstimateMatches.length ? "Learned" : "Thin Data"],
        ].map(([label, value, detail]) => (
          <div key={String(label)} className="rounded-md border border-border bg-background/50 p-3">
            <div className="text-lg font-black text-white">{String(value)}</div>
            <div className="text-xs font-bold text-blue-100">{label}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-orange-500/25 bg-orange-500/10 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-black text-white">Recommended Draft Actions</div>
            <p className="mt-1 text-xs text-orange-100">{predictiveModel.modelVersion} learned from {predictiveModel.learnedFrom}. Historical win rate: {predictiveModel.historicalWinRate}%.</p>
          </div>
          <Badge className="w-fit bg-orange-500/20 text-orange-100">{predictiveModel.similarEstimateMatches.length} similar bids</Badge>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {predictiveModel.recommendedDraftActions.length ? predictiveModel.recommendedDraftActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onCreateAction(action)}
              className="rounded-md border border-orange-500/20 bg-background/50 px-3 py-2 text-left text-xs font-bold text-blue-100 hover:border-orange-400 hover:text-white"
            >
              {action}
            </button>
          )) : (
            <div className="rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-200">No predictive cleanup action is required yet.</div>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {actions.length ? actions.map((action) => (
          <div key={action.label} className="flex flex-col gap-3 rounded-lg border border-border bg-background/55 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold text-white">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.detail}</div>
            </div>
            <Button size="sm" variant="outline" onClick={action.run}>{action.cta}</Button>
          </div>
        )) : (
          <div className="rounded-lg border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-200">No critical estimator actions right now. Keep building the bid, then run production and RFQ review before submission.</div>
        )}
      </div>
    </section>
  );
}

function HandoffPipelinePanel({
  estimate,
  items,
  rfqSummary,
  onSendToPm,
  onSendToScheduler,
}: {
  estimate?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  rfqSummary: ReturnType<typeof rfqCounts>;
  onSendToPm: () => void;
  onSendToScheduler: () => void;
}) {
  const metrics = estimatorCoverageMetrics({ estimate, items, rfqSummary });
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Estimating Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">Move the bid intelligence forward only when the estimating evidence is ready.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onSendToPm}>Send to PM</Button>
          <Button variant="outline" onClick={onSendToScheduler}>Send to Scheduler</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className={`rounded-lg border p-3 ${metrics.pmReady ? "border-green-500/30 bg-green-500/10" : "border-orange-500/30 bg-orange-500/10"}`}>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">PM handoff</div>
          <div className="mt-1 font-bold text-white">{metrics.pmReady ? "Ready to brief PM" : "Needs price/project context"}</div>
        </div>
        <div className={`rounded-lg border p-3 ${metrics.schedulerReady ? "border-green-500/30 bg-green-500/10" : "border-orange-500/30 bg-orange-500/10"}`}>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Scheduler handoff</div>
          <div className="mt-1 font-bold text-white">{metrics.schedulerReady ? "Milestones aligned" : "Tie items to milestones"}</div>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Last handoff</div>
          <div className="mt-1 font-bold text-white">{String(metrics.handoffs.at(-1)?.destination || "None yet")}</div>
        </div>
      </div>
    </section>
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

function SectionGlyph() {
  return (
    <span className="relative inline-block h-4 w-5 shrink-0 rounded-[3px] border border-orange-400/50 bg-orange-400/20 align-middle">
      <span className="absolute -top-1 left-0.5 h-1.5 w-2.5 rounded-t-[3px] border border-orange-400/50 border-b-0 bg-orange-400/25" />
    </span>
  );
}

function ItemOutcomeModal({
  item,
  actualQuantity,
  actualUnitCost,
  actualTotalCost,
  actualProductionDays,
  actualManHours,
  actualEquipmentHours,
  linkedTaskId,
  linkedDailyLogId,
  linkedCostRecordId,
  notes,
  saving,
  onActualQuantityChange,
  onActualUnitCostChange,
  onActualTotalCostChange,
  onActualProductionDaysChange,
  onActualManHoursChange,
  onActualEquipmentHoursChange,
  onLinkedTaskIdChange,
  onLinkedDailyLogIdChange,
  onLinkedCostRecordIdChange,
  onNotesChange,
  onCancel,
  onSave,
}: {
  item: Record<string, unknown> | null;
  actualQuantity: string;
  actualUnitCost: string;
  actualTotalCost: string;
  actualProductionDays: string;
  actualManHours: string;
  actualEquipmentHours: string;
  linkedTaskId: string;
  linkedDailyLogId: string;
  linkedCostRecordId: string;
  notes: string;
  saving: boolean;
  onActualQuantityChange: (value: string) => void;
  onActualUnitCostChange: (value: string) => void;
  onActualTotalCostChange: (value: string) => void;
  onActualProductionDaysChange: (value: string) => void;
  onActualManHoursChange: (value: string) => void;
  onActualEquipmentHoursChange: (value: string) => void;
  onLinkedTaskIdChange: (value: string) => void;
  onLinkedDailyLogIdChange: (value: string) => void;
  onLinkedCostRecordIdChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!item) return null;
  const estimatedQuantity = Number(item.quantity || 0) || 0;
  const estimatedUnitCost = Number(item.unitCost || 0) || 0;
  const estimatedTotalCost = itemLineTotal(item);
  const actualQuantityNumber = Number(actualQuantity || 0) || 0;
  const actualUnitCostNumber = Number(actualUnitCost || 0) || 0;
  const displayedActualTotal = Number(actualTotalCost || 0) || actualQuantityNumber * actualUnitCostNumber;
  const costVariance = displayedActualTotal - estimatedTotalCost;
  const varianceTone = costVariance > 0 ? "text-red-300" : costVariance < 0 ? "text-green-300" : "text-blue-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="bg-cyan-500/15 text-cyan-200">Actual Outcome Link</Badge>
            <h2 className="mt-2 text-2xl font-black text-white">{String(item.description || "Estimate item")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Link actual cost and production results back to this estimate line so Cicero can learn bid-to-field performance.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Estimated</div>
              <div className="mt-1 font-black text-white">{money(estimatedTotalCost)}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Actual</div>
              <div className="mt-1 font-black text-green-400">{money(displayedActualTotal)}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Variance</div>
              <div className={`mt-1 font-black ${varianceTone}`}>{money(costVariance)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Actual Quantity</label>
            <input value={actualQuantity} onChange={(event) => onActualQuantityChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder={String(estimatedQuantity || 0)} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Actual Unit Cost</label>
            <input value={actualUnitCost} onChange={(event) => onActualUnitCostChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder={String(estimatedUnitCost || 0)} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Actual Total Cost</label>
            <input value={actualTotalCost} onChange={(event) => onActualTotalCostChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder={String(estimatedTotalCost || 0)} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Actual Production Days</label>
            <input value={actualProductionDays} onChange={(event) => onActualProductionDaysChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="e.g. 2.5" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Actual Man-Hours</label>
            <input value={actualManHours} onChange={(event) => onActualManHoursChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="e.g. 48" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Actual Equipment Hours</label>
            <input value={actualEquipmentHours} onChange={(event) => onActualEquipmentHoursChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="e.g. 16" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Linked Schedule Task</label>
            <input value={linkedTaskId} onChange={(event) => onLinkedTaskIdChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Task id or name" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Linked Cost Record</label>
            <input value={linkedCostRecordId} onChange={(event) => onLinkedCostRecordIdChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Cost record id" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Linked Daily Log</label>
            <input value={linkedDailyLogId} onChange={(event) => onLinkedDailyLogIdChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="Daily log id or date" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Outcome Notes</label>
            <input value={notes} onChange={(event) => onNotesChange(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white" placeholder="What changed in the field, what Cicero should learn..." />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Outcome"}</Button>
        </div>
      </div>
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
  productionRows,
  historicalEstimates,
  historicalItems,
  rfqHistory,
  onToggleItem,
  onRequestQuote,
  onOpenProof,
  onEditItem,
  onDeleteItem,
  onAttachSnippet,
  onCreateRfi,
  onCreateSubmittal,
  onPushToSchedule,
  onRecordOutcome,
  onEditDetails,
  onGoToRfq,
  onGoToProduction,
  onCreateCiceroAction,
  onSendToPm,
  onSendToScheduler,
  onEditSection,
  onDeleteSection,
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
  productionRows: ReturnType<typeof productionRowsForItems>;
  historicalEstimates: Array<Record<string, unknown>>;
  historicalItems: Array<Record<string, unknown>>;
  rfqHistory: Array<Record<string, unknown>>;
  onToggleItem: (id: string, checked: boolean) => void;
  onRequestQuote: (item: Record<string, unknown>) => void;
  onOpenProof: (item: Record<string, unknown>) => void;
  onEditItem: (item: Record<string, unknown>) => void;
  onDeleteItem: (item: Record<string, unknown>) => void;
  onAttachSnippet: (item: Record<string, unknown>) => void;
  onCreateRfi: (item: Record<string, unknown>) => void;
  onCreateSubmittal: (item: Record<string, unknown>) => void;
  onPushToSchedule: (item: Record<string, unknown>) => void;
  onRecordOutcome: (item: Record<string, unknown>) => void;
  onEditDetails: () => void;
  onGoToRfq: () => void;
  onGoToProduction: () => void;
  onCreateCiceroAction: (action: string) => void;
  onSendToPm: () => void;
  onSendToScheduler: () => void;
  onEditSection: (section: string, sectionItems: Array<Record<string, unknown>>) => void;
  onDeleteSection: (section: string, sectionItems: Array<Record<string, unknown>>) => void;
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
  const [clockNow, setClockNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const estimateName = String(estimate?.name || projectDisplayName(project, estimate));
  const projectMeta = [
    portfolioClientLabel(project, estimate) !== "No client" ? `Client: ${portfolioClientLabel(project, estimate)}` : "",
    projectAddressLine(project, estimate),
  ].filter(Boolean).join(" | ");
  const selectableItems = items.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item));
  const engineerEstimate = engineerEstimateValue(estimate, project);
  const bidDelta = engineerEstimate ? selectedEstimateTotal - engineerEstimate : 0;
  const bidDeltaClass = bidDelta > 0 ? "text-red-300" : bidDelta < 0 ? "text-green-300" : "text-blue-100";
  const bidDate = bidDateValue(estimate, project);
  const bidCountdown = bidCountdownLabel(bidDate, clockNow);

  return (
    <div data-print-document="estimate" className="space-y-5">
      <div className="rounded-xl border border-border bg-card/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-orange-500/30 bg-orange-500/15 text-[10px] font-semibold tracking-[0.18em] text-orange-200">EST</Badge>
              <Badge variant="outline">{statusLabel(String(estimate?.status || "draft"))}</Badge>
            </div>
            <h1 className="mt-2 max-w-4xl text-2xl font-extrabold leading-tight tracking-normal text-white md:text-3xl">{estimateName}</h1>
            <p className="mt-2 max-w-4xl text-sm text-blue-100">{projectMeta}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-5">
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-100">Bid Clock</div>
              <div className="mt-1 text-xl font-black text-white">{bidCountdown}</div>
              <div className="text-[11px] text-muted-foreground">{bidDate ? String(bidDate) : "Set bid date"}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/55 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Engineer Est.</div>
              <div className="mt-1 text-xl font-black text-blue-100">{engineerEstimate ? money(engineerEstimate) : "Not set"}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/55 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Current Bid</div>
              <div className="mt-1 text-xl font-black text-green-400">{money(selectedEstimateTotal)}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/55 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Bid Delta</div>
              <div className={`mt-1 text-xl font-black ${bidDeltaClass}`}>{engineerEstimate ? money(bidDelta) : "--"}</div>
            </div>
            <Button variant="outline" className="h-full min-h-14" onClick={onEditDetails}>Edit Details</Button>
          </div>
        </div>
      </div>

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
                const pricedItems = sortByEstimateOrder(sectionItems.filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item)));
                const sectionTotal = estimateTotal(pricedItems);
                return (
                  <Fragment key={`group-${section}`}>
                    <tr key={`section-${section}`} className="border-t border-border bg-secondary/55">
                      <td className="p-3" />
                      <td className="p-3 font-black text-white">
                        <div className="flex items-center gap-2">
                          <SectionGlyph />
                          <span>{section}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-xs text-muted-foreground" colSpan={5}>{pricedItems.length ? `${pricedItems.length} bid item${pricedItems.length === 1 ? "" : "s"}` : ""}</td>
                      <td className="p-3 text-right font-black text-white">{money(sectionTotal)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {sectionParent ? (
                            <MoveControls
                              label="section"
                              onMoveUp={() => onMoveLine(sectionParent, sectionParentItems, "up")}
                              onMoveDown={() => onMoveLine(sectionParent, sectionParentItems, "down")}
                            />
                          ) : null}
                          <button type="button" className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-bold text-white hover:border-orange-500/45" onClick={() => onEditSection(section, sectionItems)}>Edit</button>
                          <button type="button" className="rounded-md border border-red-500/35 bg-red-500/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500" onClick={() => onDeleteSection(section, sectionItems)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                    {!pricedItems.length && (
                      <tr className="border-t border-border">
                        <td className="p-3" />
                        <td colSpan={8} className="p-4 pl-16 text-sm text-muted-foreground">
                          <span className="rounded-md border border-dashed border-border bg-background/40 px-3 py-2">No bid items yet</span>
                        </td>
                      </tr>
                    )}
                    {pricedItems.map((item) => {
                      const itemId = String(item._id);
                      const rfqStatus = rfqStatusForItem(item);
                      const buyoutLink = buyoutLinksForItem(item, rfqHistory);
                      return (
                        <tr key={itemId} className="border-t border-border" data-estimate-child-row="true">
                          <td className="p-3">
                            <input type="checkbox" checked={selectedItemIds.includes(itemId)} onChange={(event) => onToggleItem(itemId, event.target.checked)} />
                          </td>
                          <td className="p-3 pl-12">
                            <div className="relative">
                              <span className="absolute -left-6 top-2 h-px w-4 bg-border" aria-hidden="true" />
                              <div className="font-bold text-white">{String(item.description || "Estimate item")}</div>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge variant="outline">Spec: {String(item.sourceSpecSection || item.specSection || "No book")}</Badge>
                              <Badge className="bg-blue-500/15 text-blue-200">RFQ Status: {rfqStatus === "No RFQ" ? "Not Requested" : rfqStatus}</Badge>
                              {buyoutLink.quoteCount ? <Badge className="bg-teal-500/15 text-teal-200">Quote History: {buyoutLink.quoteCount}</Badge> : null}
                              {buyoutLink.selectedQuote ? <Badge className="bg-green-500/15 text-green-200">Buyout Award: {buyoutLink.selectedQuote.vendorName} {money(buyoutLink.selectedQuote.totalPrice)}</Badge> : null}
                              {itemHasIntent(item, RFQ_INTENT_NOTE) ? <Badge className="bg-cyan-500/15 text-cyan-200">RFQ Intent</Badge> : null}
                              {itemHasIntent(item, RFI_INTENT_NOTE) ? <Badge className="bg-sky-500/15 text-sky-200">RFI Intent</Badge> : null}
                              {itemHasIntent(item, SUBMITTAL_INTENT_NOTE) ? <Badge className="bg-purple-500/15 text-purple-200">Submittal Intent</Badge> : null}
                              {snippetsForItem(item).length ? <Badge className="bg-fuchsia-500/15 text-fuchsia-200">Snippet Attached</Badge> : null}
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
                                onMoveUp={() => onMoveLine(item, pricedItems, "up")}
                                onMoveDown={() => onMoveLine(item, pricedItems, "down")}
                              />
                              <Button size="sm" variant="outline" onClick={() => onPushToSchedule(item)}>Schedule</Button>
                              <Button size="sm" variant="outline" onClick={() => onRecordOutcome(item)}>Outcome</Button>
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
  selectedEstimateId,
  selectedEstimateTotal,
  selectedEstimateItemCount,
  onOpenEstimate,
  onDuplicateEstimate,
  onDeleteEstimate,
  onNewEstimate,
  onAutoBid,
  onQuickTemplates,
}: {
  rows: BidPortfolioRow[];
  selectedEstimateId: string;
  selectedEstimateTotal: number;
  selectedEstimateItemCount: number;
  onOpenEstimate: (row: BidPortfolioRow) => void;
  onDuplicateEstimate: (estimate: Record<string, unknown>) => void;
  onDeleteEstimate: (estimate: Record<string, unknown>) => void;
  onNewEstimate: () => void;
  onAutoBid: () => void;
  onQuickTemplates: () => void;
}) {
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
                const rowBidDate = bidDateValue(estimate, project);
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
                    <td className="p-3 text-muted-foreground">{rowBidDate ? String(rowBidDate) : "No date"}</td>
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
    <div data-print-document="production-rate-breakdown" className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge className="mb-2 bg-orange-500/15 text-orange-300">Production Rate Breakdown</Badge>
          <h1 className="text-3xl font-black tracking-tight text-white">Production Rate Breakdown</h1>
          <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
            Estimate: {String(estimate?.name || "Selected estimate")} — Converts quantity bid into manhours, equipment hours, production days, and contractor review dollars.
          </p>
        </div>
        <div data-print-hide="true" className="flex flex-wrap gap-2">
          <Button onClick={() => window.alert("Prevailing rate editor is next in the production buildout. Current production math stays tied to the estimate rows shown below.")}>Prevailing Rates</Button>
          <Button variant="outline" onClick={onBack}>Back to Estimate</Button>
          <Button variant="outline" onClick={onEditDetails}>Edit Details</Button>
          <Button onClick={() => openPrintHtml("Production Rate Breakdown", buildProductionPrintBody({ estimate, rows, summary }))}>Print / PDF</Button>
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
                <h2 className="flex items-center gap-2 text-lg font-black text-white"><SectionGlyph /> {section}</h2>
                <p className="text-xs text-muted-foreground">
                  {sectionRows.length} task{sectionRows.length === 1 ? "" : "s"} | {sectionSummary.productionDays.toFixed(1)} production days | {Math.round(sectionSummary.manHours)} man-hours
                </p>
              </div>
              <div data-print-hide="true" className="flex gap-2">
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
  const [dataCenterTab, setDataCenterTab] = useState<DataCenterTab>("overview");
  const [productionMenuOpen, setProductionMenuOpen] = useState(false);
  const [sectionPhaseModalOpen, setSectionPhaseModalOpen] = useState(false);
  const [bidItemModalOpen, setBidItemModalOpen] = useState(false);
  const [customPhaseOptions, setCustomPhaseOptions] = useState<string[]>([]);
  const [customItemDescriptionOptions, setCustomItemDescriptionOptions] = useState<string[]>([]);
  const [customUnitOptions, setCustomUnitOptions] = useState<string[]>([]);
  const [selectedPhaseType, setSelectedPhaseType] = useState(COMMON_CONSTRUCTION_PHASES[0]);
  const [customPhaseName, setCustomPhaseName] = useState("");
  const [editingSectionGroup, setEditingSectionGroup] = useState<{ section: string; items: Array<Record<string, unknown>> } | null>(null);
  const [hierarchyRenameValue, setHierarchyRenameValue] = useState("");
  const [selectedItemSection, setSelectedItemSection] = useState("");
  const [selectedItemDescriptionType, setSelectedItemDescriptionType] = useState(COMMON_ESTIMATE_ITEM_DESCRIPTIONS[0]);
  const [customItemDescription, setCustomItemDescription] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [selectedItemUnitType, setSelectedItemUnitType] = useState("LF");
  const [customItemUnit, setCustomItemUnit] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("LF");
  const [newItemTaxPct, setNewItemTaxPct] = useState("0");
  const [newItemUnitCost, setNewItemUnitCost] = useState("0");
  const [newItemRequestRfq, setNewItemRequestRfq] = useState(false);
  const [newItemRequestRfi, setNewItemRequestRfi] = useState(false);
  const [newItemRequestSubmittal, setNewItemRequestSubmittal] = useState(false);
  const [newItemAttachSnippet, setNewItemAttachSnippet] = useState(false);
  const [newItemScopeNote, setNewItemScopeNote] = useState("");
  const [newItemRfqVendor, setNewItemRfqVendor] = useState("");
  const [newItemRfqDueDate, setNewItemRfqDueDate] = useState("");
  const [newItemRfiQuestion, setNewItemRfiQuestion] = useState("");
  const [newItemSubmittalRequirement, setNewItemSubmittalRequirement] = useState("");
  const [newItemSnippetTitle, setNewItemSnippetTitle] = useState("");
  const [newItemSnippetPurpose, setNewItemSnippetPurpose] = useState("RFQ Backup");
  const [newItemSnippetImage, setNewItemSnippetImage] = useState("");
  const [newItemProductionDays, setNewItemProductionDays] = useState("");
  const [newItemCrewSize, setNewItemCrewSize] = useState("");
  const [newItemLeadTime, setNewItemLeadTime] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [historicalItemsByEstimate, setHistoricalItemsByEstimate] = useState<Record<string, Array<Record<string, unknown>>>>({});
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
  const createRfi = useMutation(api.rfis.create);
  const createSubmittal = useMutation(api.submittals.create);
  const createTask = useMutation(api.tasks.create);
  const createBuyoutItem = useMutation(api.buyout.createItem);
  const updateBuyoutItem = useMutation(api.buyout.updateItem);
  const createBuyoutQuote = useMutation(api.buyout.createQuote);
  const createPredictionRun = useMutation(api.estimatePredictionMemory.createPredictionRun);
  const recordEstimateOutcome = useMutation(api.estimatePredictionMemory.recordEstimateOutcome);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const predictionRunSignatureRef = useRef("");
  const [proofItem, setProofItem] = useState<Record<string, unknown> | null>(null);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [outcomeItem, setOutcomeItem] = useState<Record<string, unknown> | null>(null);
  const [outcomeActualQuantity, setOutcomeActualQuantity] = useState("");
  const [outcomeActualUnitCost, setOutcomeActualUnitCost] = useState("");
  const [outcomeActualTotalCost, setOutcomeActualTotalCost] = useState("");
  const [outcomeActualProductionDays, setOutcomeActualProductionDays] = useState("");
  const [outcomeActualManHours, setOutcomeActualManHours] = useState("");
  const [outcomeActualEquipmentHours, setOutcomeActualEquipmentHours] = useState("");
  const [outcomeLinkedTaskId, setOutcomeLinkedTaskId] = useState("");
  const [outcomeLinkedDailyLogId, setOutcomeLinkedDailyLogId] = useState("");
  const [outcomeLinkedCostRecordId, setOutcomeLinkedCostRecordId] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [editItemSection, setEditItemSection] = useState("");
  const [editItemDescriptionType, setEditItemDescriptionType] = useState(COMMON_ESTIMATE_ITEM_DESCRIPTIONS[0]);
  const [editItemCustomDescription, setEditItemCustomDescription] = useState("");
  const [editItemDescription, setEditItemDescription] = useState("");
  const [editItemUnitType, setEditItemUnitType] = useState("LF");
  const [editItemCustomUnit, setEditItemCustomUnit] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState("1");
  const [editItemUnit, setEditItemUnit] = useState("LS");
  const [editItemTaxPct, setEditItemTaxPct] = useState("0");
  const [editItemUnitCost, setEditItemUnitCost] = useState("0");
  const [editItemRequestRfq, setEditItemRequestRfq] = useState(false);
  const [editItemRequestRfi, setEditItemRequestRfi] = useState(false);
  const [editItemRequestSubmittal, setEditItemRequestSubmittal] = useState(false);
  const [editItemAttachSnippet, setEditItemAttachSnippet] = useState(false);
  const [editItemScopeNote, setEditItemScopeNote] = useState("");
  const [editItemRfqVendor, setEditItemRfqVendor] = useState("");
  const [editItemRfqDueDate, setEditItemRfqDueDate] = useState("");
  const [editItemRfiQuestion, setEditItemRfiQuestion] = useState("");
  const [editItemSubmittalRequirement, setEditItemSubmittalRequirement] = useState("");
  const [editItemSnippetTitle, setEditItemSnippetTitle] = useState("");
  const [editItemSnippetPurpose, setEditItemSnippetPurpose] = useState("RFQ Backup");
  const [editItemSnippetImage, setEditItemSnippetImage] = useState("");
  const [editItemProductionDays, setEditItemProductionDays] = useState("");
  const [editItemCrewSize, setEditItemCrewSize] = useState("");
  const [editItemLeadTime, setEditItemLeadTime] = useState("");
  const [snippetItem, setSnippetItem] = useState<Record<string, unknown> | null>(null);
  const [snippetTitle, setSnippetTitle] = useState("");
  const [snippetPurpose, setSnippetPurpose] = useState("RFQ Backup");
  const [snippetImage, setSnippetImage] = useState("");
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
  const rememberHistoricalEstimateItems = useCallback((nextEstimateId: string, items: Array<Record<string, unknown>>) => {
    const signatureFor = (records: Array<Record<string, unknown>>) => records
      .map((item) => `${String(item._id || "")}:${String(item._creationTime || "")}:${String(item.description || "")}:${String(item.unitCost || "")}`)
      .join("|");
    setHistoricalItemsByEstimate((current) => {
      if (signatureFor(current[nextEstimateId] || []) === signatureFor(items)) return current;
      return { ...current, [nextEstimateId]: items };
    });
  }, []);
  useEffect(() => {
    const liveEstimateIds = new Set((estimates || []).map((estimate) => String(estimate._id || "")).filter(Boolean));
    setHistoricalItemsByEstimate((current) => {
      const entries = Object.entries(current).filter(([key]) => liveEstimateIds.has(key));
      if (entries.length === Object.keys(current).length) return current;
      return Object.fromEntries(entries);
    });
  }, [estimates]);
  const historicalEstimateItems = useMemo(() => Object.values(historicalItemsByEstimate).flat(), [historicalItemsByEstimate]);

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
    project: selectedProject,
    items: estimateItems || [],
    rfqSummary,
    costItems: costItems || [],
  }), [selectedEstimate, selectedProject, estimateItems, rfqSummary, costItems]);
  const productionRows = useMemo(() => productionRowsForItems(estimateItems || []), [estimateItems]);
  const productionSummary = useMemo(() => productionSummaryForRows(productionRows), [productionRows]);
  const predictiveEstimatorModel = useMemo(() => buildPredictiveEstimatorModel({
    estimate: selectedEstimate,
    items: estimateItems || [],
    rfqSummary,
    productionRows,
    historicalEstimates: estimates || [],
    historicalItems: historicalEstimateItems || [],
  }), [selectedEstimate, estimateItems, rfqSummary, productionRows, estimates, historicalEstimateItems]);
  const dataCenterRecords = useMemo(() => buildEstimatorMemoryRecords({
    estimate: selectedEstimate,
    items: estimateItems || [],
    rfqs: rfqsWithNotes,
    predictiveSignals,
    predictiveEstimatorModel,
    productionRows,
    historicalItems: historicalEstimateItems || [],
  }), [selectedEstimate, estimateItems, rfqsWithNotes, predictiveSignals, predictiveEstimatorModel, productionRows, historicalEstimateItems]);
  const predictionOutputSnapshot = useMemo(() => ({
    modelVersion: predictiveEstimatorModel.modelVersion,
    bidSurvivalScore: predictiveEstimatorModel.bidSurvivalScore,
    survivalScore: predictiveEstimatorModel.survivalScore,
    predictedOutcome: predictiveEstimatorModel.predictedOutcome,
    scopeGapRisk: predictiveEstimatorModel.scopeGapRisk,
    marginRisk: predictiveEstimatorModel.marginRisk,
    rfqExposure: predictiveEstimatorModel.rfqExposure,
    productionConfidence: predictiveEstimatorModel.productionConfidence,
    historicalSimilarity: predictiveEstimatorModel.historicalSimilarity,
    historicalWinRate: predictiveEstimatorModel.historicalWinRate,
    similarEstimateMatches: predictiveEstimatorModel.similarEstimateMatches,
    recommendedDraftActions: predictiveEstimatorModel.recommendedDraftActions,
    learnedFrom: predictiveEstimatorModel.learnedFrom,
  }), [predictiveEstimatorModel]);
  useEffect(() => {
    if (!user || !selectedEstimate?._id || !estimateItems || !estimates) return;
    const pricedItems = (estimateItems || []).filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item));
    const inputSnapshot = {
      estimateId: String(selectedEstimate._id),
      projectId: selectedEstimate.projectId ? String(selectedEstimate.projectId) : selectedProject?._id ? String(selectedProject._id) : "",
      estimateName: String(selectedEstimate.name || ""),
      itemCount: pricedItems.length,
      historicalItemCount: historicalEstimateItems.length,
      historicalEstimateCount: estimates.length,
      estimateTotal: selectedEstimateTotal,
      rfqSummary,
      productionRowCount: productionRows.length,
      scheduleScore,
      bidDate: bidDateValue(selectedEstimate, selectedProject),
      itemSignature: pricedItems.map((item) => `${recordId(item)}:${String(item.section || "")}:${String(item.description || "")}:${Number(item.quantity || 0)}:${String(item.unit || "")}:${Number(item.unitCost || 0)}`).join("|"),
    };
    const signature = JSON.stringify({
      estimateId: inputSnapshot.estimateId,
      itemSignature: inputSnapshot.itemSignature,
      historicalItemCount: inputSnapshot.historicalItemCount,
      rfqOpen: rfqSummary.open,
      score: predictiveEstimatorModel.survivalScore,
    });
    if (predictionRunSignatureRef.current === signature) return;
    predictionRunSignatureRef.current = signature;
    void createPredictionRun({
      companyId: user.companyId,
      estimateId: selectedEstimate._id as Id<"estimates">,
      projectId: selectedEstimate.projectId as Id<"projects"> | undefined,
      modelVersion: predictiveEstimatorModel.modelVersion,
      predictionType: "estimating",
      predictionKey: "bid-survival",
      predictionValue: {
        inputSnapshot,
        outputSnapshot: predictionOutputSnapshot,
        outcomeSnapshot: null,
      },
      confidence: predictiveEstimatorModel.survivalScore,
      status: "awaiting-outcome",
      explanation: predictiveEstimatorModel.predictedOutcome,
      sourceDataSummary: predictiveEstimatorModel.learnedFrom,
      createdBy: user._id as Id<"users">,
    }).catch((error) => {
      console.warn("Could not record prediction run", error);
      predictionRunSignatureRef.current = "";
    });
  }, [user, selectedEstimate, selectedProject, estimateItems, estimates, historicalEstimateItems, selectedEstimateTotal, rfqSummary, productionRows, scheduleScore, predictiveEstimatorModel, predictionOutputSnapshot, createPredictionRun]);
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
  const itemDescriptionOptions = useMemo(() => {
    const existingDescriptions = (estimateItems || [])
      .filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item))
      .map((item) => String(item.description || "").trim())
      .filter(Boolean);
    const nonOther = [...new Set([
      ...COMMON_ESTIMATE_ITEM_DESCRIPTIONS.filter((description) => description !== "Other"),
      ...customItemDescriptionOptions,
      ...existingDescriptions,
    ])].sort((a, b) => a.localeCompare(b));
    return [...nonOther, "Other"];
  }, [customItemDescriptionOptions, estimateItems]);
  const unitOfMeasureOptions = useMemo(() => {
    const existingUnits = (estimateItems || [])
      .filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item))
      .map((item) => String(item.unit || "").trim())
      .filter(Boolean);
    const nonOther = [...new Set([
      ...COMMON_UNIT_OF_MEASURE_OPTIONS.filter((unit) => unit !== "Other"),
      ...customUnitOptions,
      ...existingUnits,
    ])].sort((a, b) => a.localeCompare(b));
    return [...nonOther, "Other"];
  }, [customUnitOptions, estimateItems]);
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
    try {
      const saved = JSON.parse(localStorage.getItem("opsslate_estimate_custom_item_descriptions") || "[]");
      if (Array.isArray(saved)) setCustomItemDescriptionOptions(saved.filter((description) => typeof description === "string" && description.trim()));
    } catch {
      setCustomItemDescriptionOptions([]);
    }
    try {
      const saved = JSON.parse(localStorage.getItem("opsslate_estimate_custom_units") || "[]");
      if (Array.isArray(saved)) setCustomUnitOptions(saved.filter((unit) => typeof unit === "string" && unit.trim()));
    } catch {
      setCustomUnitOptions([]);
    }
  }, []);

  function toggleItem(id: string, checked: boolean) {
    setSelectedItemIds((current) => checked ? [...new Set([...current, id])] : current.filter((itemId) => itemId !== id));
  }

  function toggleVendor(id: string, checked: boolean) {
    setSelectedVendorIds((current) => checked ? [...new Set([...current, id])] : current.filter((vendorId) => vendorId !== id));
  }

  function rememberCustomItemDescription(description: string) {
    const clean = description.trim();
    if (!clean || COMMON_ESTIMATE_ITEM_DESCRIPTIONS.includes(clean)) return;
    const nextOptions = [...new Set([...customItemDescriptionOptions, clean])].sort((a, b) => a.localeCompare(b));
    setCustomItemDescriptionOptions(nextOptions);
    if (typeof window !== "undefined") localStorage.setItem("opsslate_estimate_custom_item_descriptions", JSON.stringify(nextOptions));
  }

  function rememberCustomUnit(unit: string) {
    const clean = unit.trim();
    if (!clean || COMMON_UNIT_OF_MEASURE_OPTIONS.includes(clean)) return;
    const nextOptions = [...new Set([...customUnitOptions, clean])].sort((a, b) => a.localeCompare(b));
    setCustomUnitOptions(nextOptions);
    if (typeof window !== "undefined") localStorage.setItem("opsslate_estimate_custom_units", JSON.stringify(nextOptions));
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
    const description = String(item.description || "");
    setEditingItem(item);
    setEditItemSection(section || estimateSectionOptions[0] || "");
    setEditItemDescription(description);
    if (itemDescriptionOptions.includes(description)) {
      setEditItemDescriptionType(description);
      setEditItemCustomDescription("");
    } else {
      setEditItemDescriptionType("Other");
      setEditItemCustomDescription(description);
    }
    setEditItemQuantity(String(item.quantity ?? "1"));
    const unit = String(item.unit || "LF");
    setEditItemUnit(unit);
    if (unitOfMeasureOptions.includes(unit)) {
      setEditItemUnitType(unit);
      setEditItemCustomUnit("");
    } else {
      setEditItemUnitType("Other");
      setEditItemCustomUnit(unit);
    }
    setEditItemTaxPct(String(item.taxPct ?? "0"));
    setEditItemUnitCost(String(item.unitCost ?? "0"));
    setEditItemRequestRfq(itemHasIntent(item, RFQ_INTENT_NOTE));
    setEditItemRequestRfi(itemHasIntent(item, RFI_INTENT_NOTE));
    setEditItemRequestSubmittal(itemHasIntent(item, SUBMITTAL_INTENT_NOTE));
    setEditItemAttachSnippet(false);
    setEditItemScopeNote(noteValue(item.notes, ITEM_SCOPE_NOTE_PREFIX));
    setEditItemRfqVendor(noteValue(item.notes, ITEM_RFQ_DETAIL_PREFIX).replace(/^vendor\s+/i, "").split(";")[0]?.trim() || "");
    setEditItemRfqDueDate(noteValue(item.notes, ITEM_RFQ_DETAIL_PREFIX).match(/due\s+([^;]+)/i)?.[1]?.trim() || "");
    setEditItemRfiQuestion(noteValue(item.notes, ITEM_RFI_DETAIL_PREFIX));
    setEditItemSubmittalRequirement(noteValue(item.notes, ITEM_SUBMITTAL_DETAIL_PREFIX));
    setEditItemSnippetTitle(String(item.description || "Estimate item snippet"));
    setEditItemSnippetPurpose("Scope Proof");
    setEditItemSnippetImage("");
    const scheduleDetail = noteValue(item.notes, ITEM_SCHEDULE_DETAIL_PREFIX);
    setEditItemProductionDays(scheduleDetail.match(/production days\s+([^;]+)/i)?.[1]?.trim() || "");
    setEditItemCrewSize(scheduleDetail.match(/crew\s+([^;]+)/i)?.[1]?.trim() || "");
    setEditItemLeadTime(scheduleDetail.match(/lead time\s+([^;]+)/i)?.[1]?.trim() || "");
  }

  function cleanItemNotesForEdit(item: Record<string, unknown>) {
    return String(item.notes || "")
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return trimmed &&
          !trimmed.startsWith(MILESTONE_ITEM_NOTE_PREFIX) &&
          !trimmed.startsWith(RFQ_INTENT_NOTE) &&
          !trimmed.startsWith(RFI_INTENT_NOTE) &&
          !trimmed.startsWith(SUBMITTAL_INTENT_NOTE);
      });
  }

  async function saveEditedItemLine() {
    if (!editingItem?._id) return;
    const sectionName = editItemSection.trim();
    const description = (editItemDescriptionType === "Other" ? editItemCustomDescription : editItemDescription).trim();
    const unit = (editItemUnitType === "Other" ? editItemCustomUnit : editItemUnit).trim() || "LF";
    if (!sectionName || !description) return;
    if (editItemDescriptionType === "Other") rememberCustomItemDescription(description);
    if (editItemUnitType === "Other") rememberCustomUnit(unit);
    const notes = [
      ...removeManagedItemDetailNotes(cleanItemNotesForEdit(editingItem).join("\n")),
      editItemRequestRfq ? `${RFQ_INTENT_NOTE}: Draft RFQ requested during item edit.` : "",
      editItemRequestRfi ? `${RFI_INTENT_NOTE}: Draft RFI requested during item edit.` : "",
      editItemRequestSubmittal ? `${SUBMITTAL_INTENT_NOTE}: Submittal draft requested during item edit.` : "",
      ...itemDetailNoteLines({
        scopeNote: editItemScopeNote,
        rfqVendor: editItemRfqVendor,
        rfqDueDate: editItemRfqDueDate,
        rfiQuestion: editItemRfiQuestion,
        submittalRequirement: editItemSubmittalRequirement,
        productionDays: editItemProductionDays,
        crewSize: editItemCrewSize,
        leadTime: editItemLeadTime,
      }),
      editItemAttachSnippet ? snippetNoteLine({
        title: editItemSnippetTitle,
        purpose: editItemSnippetPurpose,
        image: editItemSnippetImage,
      }) : "",
    ].filter(Boolean).join("\n");
    await updateEstimateItem({
      id: editingItem._id as Id<"estimateItems">,
      section: sectionName,
      description,
      quantity: Number(editItemQuantity || 0) || 0,
      unit,
      unitCost: Number(editItemUnitCost || 0) || 0,
      taxPct: Number(editItemTaxPct || 0) || 0,
      notes,
    });
    if (editItemRequestRfq && selectedEstimate?._id && user && rfqStatusForItem(editingItem) === "No RFQ") {
      await createRfq({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        vendorName: editItemRfqVendor.trim() || "TBD supplier",
        status: "draft",
        dueDate: editItemRfqDueDate || undefined,
        notes: JSON.stringify({
          specNotes: [editItemScopeNote || `RFQ requested during item edit for ${description}.`, editItemLeadTime ? `Lead time/constraint: ${editItemLeadTime}` : ""].filter(Boolean).join("\n"),
          itemIds: [String(editingItem._id)],
          itemSnapshots: [{
            id: String(editingItem._id),
            description,
            quantity: Number(editItemQuantity || 0) || 0,
            unit,
            unitCost: Number(editItemUnitCost || 0) || 0,
            section: sectionName,
            scopeNote: editItemScopeNote,
            leadTime: editItemLeadTime,
          }],
          packageText: `REQUEST FOR QUOTE\nItem: ${description}\nSection: ${sectionName}\nQty: ${editItemQuantity || 0} ${unit}\nPlease provide unit price, total price, lead time, freight, tax, exclusions, and quote expiration.`,
        }),
      });
    }
    if (editItemRequestRfi && user && !itemHasIntent(editingItem, RFI_INTENT_NOTE)) {
      if (selectedProject?._id) {
        await createRfi({
          companyId: user.companyId,
          projectId: selectedProject._id as Id<"projects">,
          subject: `Estimate clarification - ${description}`,
          question: [
            editItemRfiQuestion.trim() || `Please confirm scope, material requirements, and installation responsibility for estimate item: ${description}.`,
            `Section: ${sectionName}`,
            editItemScopeNote ? `Estimator note: ${editItemScopeNote}` : "",
          ].filter(Boolean).join("\n"),
          priority: "Medium",
          requestedBy: user.name || user.email,
          costImpact: true,
          scheduleImpact: Boolean(editItemLeadTime),
          notes: JSON.stringify({
            sourceType: "estimate_item",
            sourceItemId: String(editingItem._id),
            estimateId,
            estimateName: selectedEstimate?.name,
            section: sectionName,
          }),
        });
      } else {
        await createCiceroAction(`Create RFI from estimate item: ${description}. Link this estimate to a PM project first.`);
      }
    }
    if (editItemRequestSubmittal && user && !itemHasIntent(editingItem, SUBMITTAL_INTENT_NOTE)) {
      if (selectedProject?._id) {
        await createSubmittal({
          companyId: user.companyId,
          projectId: selectedProject._id as Id<"projects">,
          title: `Submittal - ${description}`,
          specSection: sectionName,
          description: [
            editItemSubmittalRequirement.trim() || `Submittal draft requested for estimate item: ${description}`,
            `Quantity: ${editItemQuantity || 0} ${unit}`,
          ].filter(Boolean).join("\n"),
          submittedBy: user.name || user.email,
          priority: "High",
          trade: sectionName,
          sourceType: "estimate_item",
          notes: JSON.stringify({
            sourceType: "estimate_item",
            sourceItemId: String(editingItem._id),
            estimateId,
            estimateName: selectedEstimate?.name,
          }),
        });
      } else {
        await createCiceroAction(`Create submittal from estimate item: ${description}. Link this estimate to a PM project first.`);
      }
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

  function openSectionEditor(section: string, sectionItems: Array<Record<string, unknown>>) {
    setEditingSectionGroup({ section, items: sectionItems });
    setHierarchyRenameValue(section);
  }

  async function saveSectionRename() {
    const nextSection = hierarchyRenameValue.trim();
    if (!editingSectionGroup || !nextSection) return;
    await Promise.all(editingSectionGroup.items
      .filter((item) => item._id)
      .map((item) => updateEstimateItem({
        id: item._id as Id<"estimateItems">,
        section: nextSection,
        description: isSectionParentItem(item) ? nextSection : String(item.description || "Estimate item"),
      })));
    setEditingSectionGroup(null);
    setHierarchyRenameValue("");
  }

  async function deleteSectionGroup(section: string, sectionItems: Array<Record<string, unknown>>) {
    const deletable = sectionItems.filter((item) => item._id);
    if (!deletable.length) return;
    const childCount = deletable.filter((item) => !isSectionParentItem(item)).length;
    if (typeof window !== "undefined" && !window.confirm(`Delete ${section}${childCount ? ` and ${childCount} child line${childCount === 1 ? "" : "s"}` : ""}?`)) return;
    await Promise.all(deletable.map((item) => deleteEstimateItem({ id: item._id as Id<"estimateItems"> })));
    setSelectedItemIds((current) => current.filter((itemId) => !deletable.some((item) => String(item._id) === itemId)));
  }

  function openSnippetTool(item: Record<string, unknown>) {
    setSnippetItem(item);
    setSnippetTitle(String(item.description || "Estimate snippet"));
    setSnippetPurpose("RFQ Backup");
    setSnippetImage("");
  }

  async function saveSnippetToItem() {
    if (!snippetItem?._id || !snippetTitle.trim() || !snippetImage) return;
    const snippet = {
      id: `snippet-${Date.now()}`,
      title: snippetTitle.trim(),
      purpose: snippetPurpose,
      image: snippetImage,
      createdAt: new Date().toISOString(),
    };
    await updateEstimateItem({
      id: snippetItem._id as Id<"estimateItems">,
      notes: appendNoteLine(snippetItem.notes, `${SNIPPET_NOTE_PREFIX} ${JSON.stringify(snippet)}`),
    });
    setSnippetItem(null);
    setSnippetTitle("");
    setSnippetImage("");
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
    setActiveTool("estimates");
  }

  function openAutoBidQueue() {
    if (typeof window !== "undefined") window.alert("AI Auto-Bid is staged as a review-first tool. Use AI Tools from an open estimate to review scope, RFQs, submittals, and risks before creating draft actions.");
    setActiveTool("war-room");
  }

  function openQuickTemplates() {
    if (typeof window !== "undefined") window.alert("Quick Templates are being tied to the cost database and historical bid database. For now, use + Section and + Add Item to keep this estimate structured.");
  }

  async function createCiceroAction(action: string) {
    if (!selectedEstimate?._id) return;
    const actionNote = {
      id: `cicero-${Date.now()}`,
      action,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    await updateEstimate({
      id: selectedEstimate._id as Id<"estimates">,
      notes: appendNoteLine(selectedEstimate.notes, `${ESTIMATOR_ACTION_PREFIX} ${JSON.stringify(actionNote)}`),
    });
    if (typeof window !== "undefined") window.alert("Cicero action saved to this estimate.");
  }

  async function createRfiFromEstimateItem(item: Record<string, unknown>) {
    if (!selectedProject?._id || !user) {
      await createCiceroAction(`Create RFI from estimate item: ${String(item.description || "Estimate item")}. Link this estimate to a PM project first.`);
      return;
    }
    const subject = `Estimate clarification - ${String(item.description || "Bid item")}`;
    await createRfi({
      companyId: user.companyId,
      projectId: selectedProject._id as Id<"projects">,
      subject,
      question: [
        `Please confirm scope, material requirements, and installation responsibility for estimate item: ${String(item.description || "Bid item")}.`,
        `Section: ${String(item.section || item.sourceSpecSection || "Unassigned")}`,
        milestoneNameForItem(item) ? `Milestone: ${milestoneNameForItem(item)}` : "",
        String(item.sourceSpecSection || item.specSection || "") ? `Spec/source: ${String(item.sourceSpecSection || item.specSection)}` : "",
      ].filter(Boolean).join("\n"),
      priority: "Medium",
      requestedBy: user.name || user.email,
      costImpact: true,
      scheduleImpact: true,
      notes: JSON.stringify({
        sourceType: "estimate_item",
        sourceItemId: String(item._id),
        estimateId,
        estimateName: selectedEstimate?.name,
        section: item.section,
        snippets: snippetsForItem(item).map((snippet) => ({ id: snippet.id, title: snippet.title, purpose: snippet.purpose })),
      }),
    });
    if (typeof window !== "undefined") window.alert("RFI draft created from this estimate line.");
  }

  async function createSubmittalFromEstimateItem(item: Record<string, unknown>) {
    if (!selectedProject?._id || !user) {
      await createCiceroAction(`Create submittal from estimate item: ${String(item.description || "Estimate item")}. Link this estimate to a PM project first.`);
      return;
    }
    await createSubmittal({
      companyId: user.companyId,
      projectId: selectedProject._id as Id<"projects">,
      title: `Submittal - ${String(item.description || "Bid item")}`,
      specSection: String(item.sourceSpecSection || item.specSection || item.section || ""),
      description: [
        `Created from estimate item: ${String(item.description || "Bid item")}`,
        `Quantity: ${String(item.quantity || 0)} ${String(item.unit || "LS")}`,
        milestoneNameForItem(item) ? `Milestone: ${milestoneNameForItem(item)}` : "",
      ].filter(Boolean).join("\n"),
      submittedBy: user.name || user.email,
      priority: itemHasIntent(item, SUBMITTAL_INTENT_NOTE) ? "High" : "Normal",
      trade: productionCategoryForItem(item),
      sourceType: "estimate_item",
      notes: JSON.stringify({
        sourceType: "estimate_item",
        sourceItemId: String(item._id),
        estimateId,
        estimateName: selectedEstimate?.name,
        snippets: snippetsForItem(item).map((snippet) => ({ id: snippet.id, title: snippet.title, purpose: snippet.purpose })),
      }),
    });
    if (typeof window !== "undefined") window.alert("Submittal draft created from this estimate line.");
  }

  function openItemOutcomeRecorder(item: Record<string, unknown>) {
    const estimatedQuantity = Number(item.quantity || 0) || 0;
    const estimatedUnitCost = Number(item.unitCost || 0) || 0;
    setOutcomeItem(item);
    setOutcomeActualQuantity(String(estimatedQuantity || ""));
    setOutcomeActualUnitCost(String(estimatedUnitCost || ""));
    setOutcomeActualTotalCost(String(itemLineTotal(item) || ""));
    setOutcomeActualProductionDays(String(item.productionDays || ""));
    setOutcomeActualManHours("");
    setOutcomeActualEquipmentHours("");
    setOutcomeLinkedTaskId("");
    setOutcomeLinkedDailyLogId("");
    setOutcomeLinkedCostRecordId("");
    setOutcomeNotes("");
  }

  async function saveItemOutcome() {
    if (!user || !selectedEstimate?._id || !outcomeItem?._id) return;
    const estimatedQuantity = Number(outcomeItem.quantity || 0) || 0;
    const estimatedUnitCost = Number(outcomeItem.unitCost || 0) || 0;
    const estimatedTotalCost = itemLineTotal(outcomeItem);
    const estimatedProductionDays = Number(outcomeItem.productionDays || 0) || 0;
    const estimatedManHours = Number(outcomeItem.manHours || 0) || 0;
    const estimatedEquipmentHours = Number(outcomeItem.equipmentHours || 0) || 0;
    const actualQuantity = Number(outcomeActualQuantity || 0) || 0;
    const actualUnitCost = Number(outcomeActualUnitCost || 0) || 0;
    const actualTotalCost = Number(outcomeActualTotalCost || 0) || actualQuantity * actualUnitCost;
    const actualProductionDays = Number(outcomeActualProductionDays || 0) || 0;
    const actualManHours = Number(outcomeActualManHours || 0) || 0;
    const actualEquipmentHours = Number(outcomeActualEquipmentHours || 0) || 0;
    const variance = actualTotalCost - estimatedTotalCost;
    setOutcomeSaving(true);
    try {
      await recordEstimateOutcome({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        projectId: selectedProject?._id as Id<"projects"> | undefined,
        outcomeType: "estimate_item_actual",
        outcomeKey: String(outcomeItem._id),
        expectedValue: {
          estimateItemId: String(outcomeItem._id),
          description: outcomeItem.description,
          section: outcomeItem.section,
          estimatedQuantity: estimatedQuantity,
          estimatedUnitCost: estimatedUnitCost,
          estimatedTotalCost: estimatedTotalCost,
          estimatedProductionDays: estimatedProductionDays,
          estimatedManHours: estimatedManHours,
          estimatedEquipmentHours: estimatedEquipmentHours,
        },
        actualValue: {
          estimateItemId: String(outcomeItem._id),
          actualQuantity: actualQuantity,
          actualUnitCost: actualUnitCost,
          actualTotalCost: actualTotalCost,
          actualProductionDays: actualProductionDays,
          actualManHours: actualManHours,
          actualEquipmentHours: actualEquipmentHours,
          linkedTaskId: outcomeLinkedTaskId.trim() || undefined,
          linkedDailyLogId: outcomeLinkedDailyLogId.trim() || undefined,
          linkedCostRecordId: outcomeLinkedCostRecordId.trim() || undefined,
        },
        variance,
        actualCost: actualTotalCost,
        notes: JSON.stringify({
          estimateItemId: String(outcomeItem._id),
          itemDescription: outcomeItem.description,
          linkedTaskId: outcomeLinkedTaskId.trim() || undefined,
          linkedDailyLogId: outcomeLinkedDailyLogId.trim() || undefined,
          linkedCostRecordId: outcomeLinkedCostRecordId.trim() || undefined,
          note: outcomeNotes.trim() || undefined,
        }),
      });
      setOutcomeItem(null);
      if (typeof window !== "undefined") window.alert("Actual cost and production outcome saved to estimating memory.");
    } catch (error) {
      if (typeof window !== "undefined") window.alert(`Could not save item outcome: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setOutcomeSaving(false);
    }
  }

  async function pushEstimateItemToSchedule(item: Record<string, unknown>) {
    if (!selectedProject?._id) {
      await createCiceroAction(`Push estimate item to schedule: ${String(item.description || "Estimate item")}. Link this estimate to a PM project first.`);
      return;
    }
    const category = productionCategoryForItem(item);
    const rate = productionRateForItem(item);
    const quantity = Number(item.quantity || 0) || 0;
    const durationDays = rate.rate > 0 ? Math.max(1, Math.ceil(quantity / rate.rate)) : 1;
    await createTask({
      projectId: selectedProject._id as Id<"projects">,
      task: String(item.description || "Estimate task"),
      customTask: String(item.description || "Estimate task"),
      priority: "Medium",
      status: "Not Started",
      impact: `Created from estimating. Suggested duration: ${durationDays} day${durationDays === 1 ? "" : "s"}.`,
      trade: category,
      phase: String(item.section || category),
      sourceType: "estimate_item",
      sourceItemId: String(item._id),
      sourceSpecSection: String(item.sourceSpecSection || item.specSection || ""),
      sourceQuote: String(item.description || ""),
      sourceConfidence: 80,
      sourceCategory: "estimating_handoff",
      blocker: itemHasIntent(item, RFQ_INTENT_NOTE) && rfqStatusForItem(item) === "No RFQ" ? "RFQ pricing not complete" : undefined,
    });
    if (typeof window !== "undefined") window.alert("Scheduler task created from this estimate line.");
  }

  async function sendEstimateHandoff(destination: "PM" | "Scheduler") {
    if (!selectedEstimate?._id) return;
    const metrics = estimatorCoverageMetrics({ estimate: selectedEstimate, items: estimateItems || [], rfqSummary });
    const handoff = {
      destination,
      createdAt: new Date().toISOString(),
      estimateId,
      estimateName: selectedEstimate.name || "Estimate",
      total: selectedEstimateTotal,
      itemCount: metrics.pricedItems.length,
      pricedCount: metrics.pricedCount,
      milestoneCount: metrics.withMilestone,
      snippetCount: metrics.snippetCount,
      rfqOpen: metrics.rfqOpen,
      coverageScore: metrics.coverageScore,
    };
    await updateEstimate({
      id: selectedEstimate._id as Id<"estimates">,
      notes: appendNoteLine(selectedEstimate.notes, `${ESTIMATE_HANDOFF_PREFIX} ${JSON.stringify(handoff)}`),
    });
    const target = destination === "PM"
      ? `/project-management${selectedProject?._id ? `?projectId=${String(selectedProject._id)}` : ""}`
      : `/scheduler${selectedProject?._id ? `?projectId=${String(selectedProject._id)}&estimateId=${estimateId}` : ""}`;
    if (typeof window !== "undefined") window.location.href = target;
  }

  async function openPortfolioRow(row: BidPortfolioRow) {
    const project = row.project;
    if (project?._id) setSelectedProjectId(String(project._id));
    if (!row.estimate?._id && project?._id && user?.companyId) {
      const projectName = projectDisplayName(project);
      const estimateIdCreated = await createEstimate({
        companyId: user.companyId,
        name: `${projectName} EST`,
        client: portfolioClientLabel(project),
        location: projectAddressLine(project),
        status: "draft",
        bidType: portfolioTypeLabel(project),
        description: `Estimate started from project ${projectName}.`,
      });
      await updateEstimate({
        id: estimateIdCreated as Id<"estimates">,
        projectId: project._id as Id<"projects">,
      });
      setSelectedEstimateId(String(estimateIdCreated));
      setSelectedItemIds([]);
      setActiveTool("estimate-detail");
      return;
    }
    setSelectedEstimateId(row.estimate?._id ? String(row.estimate._id) : "");
    setSelectedItemIds([]);
    setActiveTool(row.estimate?._id ? "estimate-detail" : "estimates");
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
    const awardedAmount = Number(response.totalPrice || 0);
    const budgetAmount = itemLineTotal(item);
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
    let buyoutQuoteId: unknown = undefined;
    try {
      if (user?.companyId && selectedProject?._id && selectedEstimate?._id) {
        const buyoutItemId = await createBuyoutItem({
          companyId: user.companyId,
          projectId: selectedProject._id as Id<"projects">,
          estimateId: selectedEstimate._id as Id<"estimates">,
          estimateItemId: item._id as Id<"estimateItems">,
          sourceRfqId: String(rfq._id),
          sourceQuoteId: undefined,
          sourceType: "estimating_rfq_award",
          category: String(item.section || "Buyout"),
          description: String(item.description || "Estimate item"),
          budgetAmount,
          quantity,
          unit: String(item.unit || "LS"),
          status: "awarded",
          awardedVendor: String(rfq.vendorName || "Selected vendor"),
          awardedAmount,
          awardedDate: new Date().toISOString().slice(0, 10),
          quotesReceived: 1,
          leadTime: response.leadTime,
          savings: budgetAmount - awardedAmount,
          savingsPercent: budgetAmount > 0 ? ((budgetAmount - awardedAmount) / budgetAmount) * 100 : 0,
          notes: JSON.stringify({
            estimateItemId: itemId,
            sourceRfqId: String(rfq._id),
            exclusions: response.exclusions,
            alternates: response.alternates,
          }),
        });
        buyoutQuoteId = await createBuyoutQuote({
          companyId: user.companyId,
          buyoutItemId: buyoutItemId as Id<"buyoutItems">,
          estimateId: selectedEstimate._id as Id<"estimates">,
          estimateItemId: item._id as Id<"estimateItems">,
          sourceRfqId: String(rfq._id),
          sourceQuoteId: undefined,
          sourceType: "estimating_rfq_award",
          vendorName: String(rfq.vendorName || "Selected vendor"),
          amount: awardedAmount,
          unitPrice,
          leadTime: response.leadTime,
          notes: JSON.stringify({
            estimateItemId: itemId,
            sourceRfqId: String(rfq._id),
            exclusions: response.exclusions,
            alternates: response.alternates,
          }),
          quoteDate: new Date().toISOString().slice(0, 10),
          expiresDate: response.expiration,
          status: "selected",
        });
        await updateBuyoutItem({
          id: buyoutItemId as Id<"buyoutItems">,
          sourceQuoteId: buyoutQuoteId ? String(buyoutQuoteId) : undefined,
        });
      }
    } catch (error) {
      console.warn("Could not create buyout link for selected RFQ quote", error);
    }
    try {
      if (user?.companyId && selectedEstimate?._id) {
        await recordEstimateOutcome({
          companyId: user.companyId,
          estimateId: selectedEstimate._id as Id<"estimates">,
          projectId: selectedProject?._id as Id<"projects"> | undefined,
          outcomeType: "estimate_item_buyout_award",
          outcomeKey: itemId,
          expectedValue: {
            estimateItemId: itemId,
            description: item.description,
            section: item.section,
            budgetAmount,
            estimatedQuantity: quantity,
            estimatedUnitCost: Number(item.unitCost || 0),
          },
          actualValue: {
            estimateItemId: itemId,
            awardedVendor: String(rfq.vendorName || "Selected vendor"),
            awardedAmount,
            unitPrice,
            leadTime: response.leadTime,
            sourceRfqId: String(rfq._id),
            sourceQuoteId: buyoutQuoteId ? String(buyoutQuoteId) : undefined,
          },
          variance: awardedAmount - budgetAmount,
          actualCost: awardedAmount,
          awardedAmount,
          notes: JSON.stringify({
            estimateItemId: itemId,
            sourceRfqId: String(rfq._id),
            sourceQuoteId: buyoutQuoteId ? String(buyoutQuoteId) : undefined,
            vendorName: String(rfq.vendorName || "Selected vendor"),
            exclusions: response.exclusions,
            alternates: response.alternates,
          }),
        });
      }
    } catch (error) {
      console.warn("Could not record buyout award outcome memory", error);
    }
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

  async function saveBidItemLine() {
    const sectionName = selectedItemSection.trim();
    const description = (selectedItemDescriptionType === "Other" ? customItemDescription : newItemDescription).trim();
    const unit = (selectedItemUnitType === "Other" ? customItemUnit : newItemUnit).trim() || "LF";
    if (!user || !selectedEstimate?._id || !sectionName || !description) return;
    if (selectedItemDescriptionType === "Other") rememberCustomItemDescription(description);
    if (selectedItemUnitType === "Other") rememberCustomUnit(unit);
    const itemIdCreated = await createEstimateItem({
      companyId: user.companyId,
      estimateId: selectedEstimate._id as Id<"estimates">,
      section: sectionName,
      description,
      quantity: Number(newItemQuantity || 0) || 0,
      unit,
      unitCost: Number(newItemUnitCost || 0) || 0,
      taxPct: Number(newItemTaxPct || 0) || 0,
      notes: [
        `${ORDER_NOTE_PREFIX} ${(estimateItems || []).filter((item) => !isSectionParentItem(item) && !isMilestoneParentItem(item) && String(item.section || "") === sectionName).length + 1}`,
        newItemRequestRfq ? `${RFQ_INTENT_NOTE}: Draft RFQ requested at item creation.` : "",
        newItemRequestRfi ? `${RFI_INTENT_NOTE}: Draft RFI requested at item creation.` : "",
        newItemRequestSubmittal ? `${SUBMITTAL_INTENT_NOTE}: Submittal draft requested at item creation.` : "",
        ...itemDetailNoteLines({
          scopeNote: newItemScopeNote,
          rfqVendor: newItemRfqVendor,
          rfqDueDate: newItemRfqDueDate,
          rfiQuestion: newItemRfiQuestion,
          submittalRequirement: newItemSubmittalRequirement,
          productionDays: newItemProductionDays,
          crewSize: newItemCrewSize,
          leadTime: newItemLeadTime,
        }),
        newItemAttachSnippet ? snippetNoteLine({
          title: newItemSnippetTitle || description,
          purpose: newItemSnippetPurpose,
          image: newItemSnippetImage,
        }) : "",
      ].filter(Boolean).join("\n"),
    });
    if (newItemRequestRfq) {
      await createRfq({
        companyId: user.companyId,
        estimateId: selectedEstimate._id as Id<"estimates">,
        vendorName: newItemRfqVendor.trim() || "TBD supplier",
        status: "draft",
        dueDate: newItemRfqDueDate || undefined,
        notes: JSON.stringify({
          specNotes: [newItemScopeNote || `RFQ requested at item creation for ${description}.`, newItemLeadTime ? `Lead time/constraint: ${newItemLeadTime}` : ""].filter(Boolean).join("\n"),
          itemIds: [String(itemIdCreated)],
          itemSnapshots: [{
            id: String(itemIdCreated),
            description,
            quantity: Number(newItemQuantity || 0) || 0,
            unit,
            unitCost: Number(newItemUnitCost || 0) || 0,
            section: sectionName,
            scopeNote: newItemScopeNote,
            leadTime: newItemLeadTime,
          }],
          packageText: `REQUEST FOR QUOTE\nItem: ${description}\nSection: ${sectionName}\nQty: ${newItemQuantity || 0} ${unit}\nPlease provide unit price, total price, lead time, freight, tax, exclusions, and quote expiration.`,
        }),
      });
    }
    if (newItemRequestRfi) {
      if (selectedProject?._id) {
        await createRfi({
          companyId: user.companyId,
          projectId: selectedProject._id as Id<"projects">,
          subject: `Estimate clarification - ${description}`,
          question: [
            newItemRfiQuestion.trim() || `Please confirm scope, material requirements, and installation responsibility for estimate item: ${description}.`,
            `Section: ${sectionName}`,
            newItemScopeNote ? `Estimator note: ${newItemScopeNote}` : "",
          ].filter(Boolean).join("\n"),
          priority: "Medium",
          requestedBy: user.name || user.email,
          costImpact: true,
          scheduleImpact: Boolean(newItemLeadTime),
          notes: JSON.stringify({
            sourceType: "estimate_item",
            sourceItemId: String(itemIdCreated),
            estimateId,
            estimateName: selectedEstimate.name,
            section: sectionName,
          }),
        });
      } else {
        await createCiceroAction(`Create RFI from estimate item: ${description}. Link this estimate to a PM project first.`);
      }
    }
    if (newItemRequestSubmittal) {
      if (selectedProject?._id) {
        await createSubmittal({
          companyId: user.companyId,
          projectId: selectedProject._id as Id<"projects">,
          title: `Submittal - ${description}`,
          specSection: sectionName,
          description: [
            newItemSubmittalRequirement.trim() || `Submittal draft requested for estimate item: ${description}`,
            `Quantity: ${newItemQuantity || 0} ${unit}`,
          ].filter(Boolean).join("\n"),
          submittedBy: user.name || user.email,
          priority: "High",
          trade: sectionName,
          sourceType: "estimate_item",
          notes: JSON.stringify({
            sourceType: "estimate_item",
            sourceItemId: String(itemIdCreated),
            estimateId,
            estimateName: selectedEstimate.name,
          }),
        });
      } else {
        await createCiceroAction(`Create submittal from estimate item: ${description}. Link this estimate to a PM project first.`);
      }
    }
    setBidItemModalOpen(false);
    setSelectedItemDescriptionType(COMMON_ESTIMATE_ITEM_DESCRIPTIONS[0]);
    setCustomItemDescription("");
    setNewItemDescription("");
    setNewItemQuantity("1");
    setSelectedItemUnitType("LF");
    setCustomItemUnit("");
    setNewItemUnit("LF");
    setNewItemTaxPct("0");
    setNewItemUnitCost("0");
    setNewItemRequestRfq(false);
    setNewItemRequestRfi(false);
    setNewItemRequestSubmittal(false);
    setNewItemAttachSnippet(false);
    setNewItemScopeNote("");
    setNewItemRfqVendor("");
    setNewItemRfqDueDate("");
    setNewItemRfiQuestion("");
    setNewItemSubmittalRequirement("");
    setNewItemSnippetTitle("");
    setNewItemSnippetPurpose("RFQ Backup");
    setNewItemSnippetImage("");
    setNewItemProductionDays("");
    setNewItemCrewSize("");
    setNewItemLeadTime("");
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
  const showBidActionToolbar = activeTool !== "cockpit" && activeTool !== "estimates";
  const bidActionButtonClass = "inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-xs font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-colors hover:border-orange-500/45 hover:bg-secondary";
  const bidActionToolbar = (
    <div data-print-hide="true" className="fixed left-4 right-4 top-[76px] z-[90] flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur supports-[backdrop-filter]:bg-background/85 xl:left-[calc(16rem+1.25rem)]">
      <button type="button" className={bidActionButtonClass} onClick={() => setActiveTool("cockpit")}>← Back</button>
      <button type="button" className={`${bidActionButtonClass} border-yellow-500/35 bg-yellow-500/85 text-black hover:bg-yellow-400`} onClick={() => setSectionPhaseModalOpen(true)}>+ Section</button>
      <button
        type="button"
        className={`${bidActionButtonClass} border-green-500/35 bg-green-500/85 text-white hover:bg-green-500`}
        onClick={() => {
          setSelectedItemSection(selectedItemSection || estimateSectionOptions[0] || "");
          setSelectedItemDescriptionType(selectedItemDescriptionType || COMMON_ESTIMATE_ITEM_DESCRIPTIONS[0]);
          setNewItemDescription(newItemDescription || selectedItemDescriptionType || COMMON_ESTIMATE_ITEM_DESCRIPTIONS[0]);
          setBidItemModalOpen(true);
        }}
      >
        + Add Item
      </button>
      <button type="button" className={bidActionButtonClass} onClick={() => setActiveTool("cost")}>+ From Cost DB</button>
      <button
        type="button"
        className={bidActionButtonClass}
        onClick={() => openPrintHtml("OpsSlate Bid Estimate", buildEstimatePrintBody({
          estimate: selectedEstimate,
          project: selectedProject,
          items: estimateItems || [],
          total: selectedEstimateTotal,
        }))}
      >
        Print Bid
      </button>
      <button type="button" className={`${bidActionButtonClass} border-green-500/30`} onClick={() => setActiveTool("war-room")}>AI Tools</button>
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
      <button type="button" className={`${bidActionButtonClass} border-cyan-500/35`} onClick={() => void sendEstimateHandoff("PM")}>PM Handoff</button>
      <button type="button" className={`${bidActionButtonClass} border-blue-500/35`} onClick={() => void sendEstimateHandoff("Scheduler")}>Scheduler Handoff</button>
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
  const aiToolsWorkspace = (
    <div className="space-y-5">
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
      <CiceroCommandPanel
        estimate={selectedEstimate}
        items={estimateItems || []}
        rfqSummary={rfqSummary}
        scheduleScore={scheduleScore}
        productionRows={productionRows}
        historicalEstimates={estimates || []}
        historicalItems={historicalEstimateItems || []}
        onGoToRfq={() => setActiveTool("rfq")}
        onGoToProduction={() => setActiveTool("production-breakdown")}
        onCreateAction={(action) => void createCiceroAction(action)}
      />
      <HandoffPipelinePanel
        estimate={selectedEstimate}
        items={estimateItems || []}
        rfqSummary={rfqSummary}
        onSendToPm={() => void sendEstimateHandoff("PM")}
        onSendToScheduler={() => void sendEstimateHandoff("Scheduler")}
      />
    </div>
  );

  return (
    <div className="flex gap-5">
      <EstimatorCommandCenter activeTool={activeTool} onSelect={setActiveTool} />
      <main className="min-w-0 flex-1 space-y-5">
        <HistoricalEstimateItemsCollector
          estimates={estimates || []}
          onItemsChange={rememberHistoricalEstimateItems}
        />
        {showBidActionToolbar ? (
          <>
            {bidActionToolbar}
            <div data-print-hide="true" className="h-[72px] shrink-0" aria-hidden="true" />
          </>
        ) : null}
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
        <HierarchyRenameModal
          open={Boolean(editingSectionGroup)}
          title="Edit Section"
          label="Section Name"
          value={hierarchyRenameValue}
          helper="Renaming a section updates its child estimate lines so the bid stays organized."
          onChange={setHierarchyRenameValue}
          onCancel={() => {
            setEditingSectionGroup(null);
            setHierarchyRenameValue("");
          }}
          onSave={() => void saveSectionRename()}
        />
        <BidItemModal
          open={bidItemModalOpen}
          sectionOptions={estimateSectionOptions}
          descriptionOptions={itemDescriptionOptions}
          unitOptions={unitOfMeasureOptions}
          selectedSection={selectedItemSection}
          selectedDescription={selectedItemDescriptionType}
          customDescription={customItemDescription}
          description={newItemDescription}
          selectedUnit={selectedItemUnitType}
          customUnit={customItemUnit}
          quantity={newItemQuantity}
          unit={newItemUnit}
          taxPct={newItemTaxPct}
          unitCost={newItemUnitCost}
          requestRfq={newItemRequestRfq}
          requestRfi={newItemRequestRfi}
          requestSubmittal={newItemRequestSubmittal}
          attachSnippet={newItemAttachSnippet}
          scopeNote={newItemScopeNote}
          rfqVendor={newItemRfqVendor}
          rfqDueDate={newItemRfqDueDate}
          rfiQuestion={newItemRfiQuestion}
          submittalRequirement={newItemSubmittalRequirement}
          snippetTitle={newItemSnippetTitle}
          snippetPurpose={newItemSnippetPurpose}
          snippetImage={newItemSnippetImage}
          productionDays={newItemProductionDays}
          crewSize={newItemCrewSize}
          leadTime={newItemLeadTime}
          onSectionChange={setSelectedItemSection}
          onSelectedDescriptionChange={setSelectedItemDescriptionType}
          onCustomDescriptionChange={setCustomItemDescription}
          onDescriptionChange={setNewItemDescription}
          onSelectedUnitChange={setSelectedItemUnitType}
          onCustomUnitChange={setCustomItemUnit}
          onQuantityChange={setNewItemQuantity}
          onUnitChange={setNewItemUnit}
          onTaxPctChange={setNewItemTaxPct}
          onUnitCostChange={setNewItemUnitCost}
          onRequestRfqChange={setNewItemRequestRfq}
          onRequestRfiChange={setNewItemRequestRfi}
          onRequestSubmittalChange={setNewItemRequestSubmittal}
          onAttachSnippetChange={setNewItemAttachSnippet}
          onScopeNoteChange={setNewItemScopeNote}
          onRfqVendorChange={setNewItemRfqVendor}
          onRfqDueDateChange={setNewItemRfqDueDate}
          onRfiQuestionChange={setNewItemRfiQuestion}
          onSubmittalRequirementChange={setNewItemSubmittalRequirement}
          onSnippetTitleChange={setNewItemSnippetTitle}
          onSnippetPurposeChange={setNewItemSnippetPurpose}
          onSnippetImageChange={setNewItemSnippetImage}
          onProductionDaysChange={setNewItemProductionDays}
          onCrewSizeChange={setNewItemCrewSize}
          onLeadTimeChange={setNewItemLeadTime}
          onCancel={() => setBidItemModalOpen(false)}
          onContinue={() => void saveBidItemLine()}
        />
        <BidItemModal
          open={Boolean(editingItem)}
          title="Edit Estimate Item"
          intro="Keep the bid item tied to a section while updating quantity, unit, cost, RFQ intent, and submittal intent."
          submitLabel="Save Item Changes"
          sectionOptions={estimateSectionOptions}
          descriptionOptions={itemDescriptionOptions}
          unitOptions={unitOfMeasureOptions}
          selectedSection={editItemSection}
          selectedDescription={editItemDescriptionType}
          customDescription={editItemCustomDescription}
          description={editItemDescription}
          selectedUnit={editItemUnitType}
          customUnit={editItemCustomUnit}
          quantity={editItemQuantity}
          unit={editItemUnit}
          taxPct={editItemTaxPct}
          unitCost={editItemUnitCost}
          requestRfq={editItemRequestRfq}
          requestRfi={editItemRequestRfi}
          requestSubmittal={editItemRequestSubmittal}
          attachSnippet={editItemAttachSnippet}
          scopeNote={editItemScopeNote}
          rfqVendor={editItemRfqVendor}
          rfqDueDate={editItemRfqDueDate}
          rfiQuestion={editItemRfiQuestion}
          submittalRequirement={editItemSubmittalRequirement}
          snippetTitle={editItemSnippetTitle}
          snippetPurpose={editItemSnippetPurpose}
          snippetImage={editItemSnippetImage}
          productionDays={editItemProductionDays}
          crewSize={editItemCrewSize}
          leadTime={editItemLeadTime}
          onSectionChange={setEditItemSection}
          onSelectedDescriptionChange={setEditItemDescriptionType}
          onCustomDescriptionChange={setEditItemCustomDescription}
          onDescriptionChange={setEditItemDescription}
          onSelectedUnitChange={setEditItemUnitType}
          onCustomUnitChange={setEditItemCustomUnit}
          onQuantityChange={setEditItemQuantity}
          onUnitChange={setEditItemUnit}
          onTaxPctChange={setEditItemTaxPct}
          onUnitCostChange={setEditItemUnitCost}
          onRequestRfqChange={setEditItemRequestRfq}
          onRequestRfiChange={setEditItemRequestRfi}
          onRequestSubmittalChange={setEditItemRequestSubmittal}
          onAttachSnippetChange={setEditItemAttachSnippet}
          onScopeNoteChange={setEditItemScopeNote}
          onRfqVendorChange={setEditItemRfqVendor}
          onRfqDueDateChange={setEditItemRfqDueDate}
          onRfiQuestionChange={setEditItemRfiQuestion}
          onSubmittalRequirementChange={setEditItemSubmittalRequirement}
          onSnippetTitleChange={setEditItemSnippetTitle}
          onSnippetPurposeChange={setEditItemSnippetPurpose}
          onSnippetImageChange={setEditItemSnippetImage}
          onProductionDaysChange={setEditItemProductionDays}
          onCrewSizeChange={setEditItemCrewSize}
          onLeadTimeChange={setEditItemLeadTime}
          onCancel={() => setEditingItem(null)}
          onContinue={() => void saveEditedItemLine()}
        />
        <ItemOutcomeModal
          item={outcomeItem}
          actualQuantity={outcomeActualQuantity}
          actualUnitCost={outcomeActualUnitCost}
          actualTotalCost={outcomeActualTotalCost}
          actualProductionDays={outcomeActualProductionDays}
          actualManHours={outcomeActualManHours}
          actualEquipmentHours={outcomeActualEquipmentHours}
          linkedTaskId={outcomeLinkedTaskId}
          linkedDailyLogId={outcomeLinkedDailyLogId}
          linkedCostRecordId={outcomeLinkedCostRecordId}
          notes={outcomeNotes}
          saving={outcomeSaving}
          onActualQuantityChange={setOutcomeActualQuantity}
          onActualUnitCostChange={setOutcomeActualUnitCost}
          onActualTotalCostChange={setOutcomeActualTotalCost}
          onActualProductionDaysChange={setOutcomeActualProductionDays}
          onActualManHoursChange={setOutcomeActualManHours}
          onActualEquipmentHoursChange={setOutcomeActualEquipmentHours}
          onLinkedTaskIdChange={setOutcomeLinkedTaskId}
          onLinkedDailyLogIdChange={setOutcomeLinkedDailyLogId}
          onLinkedCostRecordIdChange={setOutcomeLinkedCostRecordId}
          onNotesChange={setOutcomeNotes}
          onCancel={() => setOutcomeItem(null)}
          onSave={() => void saveItemOutcome()}
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
        <SnippetModal
          item={snippetItem}
          snippetTitle={snippetTitle}
          snippetPurpose={snippetPurpose}
          snippetImage={snippetImage}
          onTitleChange={setSnippetTitle}
          onPurposeChange={setSnippetPurpose}
          onImageChange={setSnippetImage}
          onCancel={() => setSnippetItem(null)}
          onSave={() => void saveSnippetToItem()}
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
                  <p className="mt-1 text-xs text-muted-foreground">Company-history model for survival, margin, scope, RFQ, production, and historical fit.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["Bid Survival Score", predictiveEstimatorModel.bidSurvivalScore, "text-green-300"],
                      ["Margin Risk", predictiveEstimatorModel.marginRisk, predictiveEstimatorModel.marginRisk > 60 ? "text-red-300" : "text-orange-300"],
                      ["Scope Gap Risk", predictiveEstimatorModel.scopeGapRisk, predictiveEstimatorModel.scopeGapRisk > 60 ? "text-red-300" : "text-orange-300"],
                      ["RFQ Exposure", predictiveEstimatorModel.rfqExposure, predictiveEstimatorModel.rfqExposure > 60 ? "text-red-300" : "text-blue-200"],
                      ["Production Confidence", predictiveEstimatorModel.productionConfidence, "text-blue-200"],
                      ["Historical Similarity", predictiveEstimatorModel.historicalSimilarity, "text-purple-200"],
                    ].map(([label, value, color]) => (
                      <div key={String(label)} className="rounded-md border border-border bg-background/50 p-3">
                        <div className={`text-lg font-black ${color}`}>{String(value)}%</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-background/50 p-3">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Learning Inputs</div>
                    <div className="mt-1 text-xs text-blue-100">{predictiveEstimatorModel.learnedFrom}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Historical win rate baseline: {predictiveEstimatorModel.historicalWinRate}%</div>
                  </div>
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
                  <div className="mt-3 rounded-md border border-orange-500/25 bg-orange-500/5 p-3">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-orange-200">Recommended Draft Actions</div>
                    <div className="mt-2 space-y-1">
                      {predictiveEstimatorModel.recommendedDraftActions.map((action) => (
                        <button key={action} type="button" className="block w-full rounded-md border border-border bg-background/50 px-3 py-2 text-left text-xs font-semibold text-blue-100 hover:border-orange-500/40" onClick={() => setActiveTool(action.includes("RFQ") ? "rfq" : action.includes("schedule") || action.includes("production") ? "production-breakdown" : "estimate-detail")}>
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-background/50 p-3">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Historical Similarity Matches</div>
                    <div className="mt-2 space-y-1">
                      {predictiveEstimatorModel.similarEstimateMatches.map((match) => (
                        <div key={String(match.id || match.name)} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-blue-100">{String(match.name || "Historical estimate")}</span>
                          <span className="font-bold text-white">{match.score}%</span>
                        </div>
                      ))}
                      {!predictiveEstimatorModel.similarEstimateMatches.length && (
                        <div className="text-xs text-muted-foreground">No prior company estimates are available for similarity scoring yet.</div>
                      )}
                    </div>
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
            productionRows={productionRows}
            historicalEstimates={estimates || []}
            historicalItems={historicalEstimateItems || []}
            rfqHistory={rfqsWithNotes}
            onToggleItem={toggleItem}
            onRequestQuote={requestQuoteForItem}
            onOpenProof={setProofItem}
            onEditItem={openItemEditor}
            onDeleteItem={(item) => void deleteBidItem(item)}
            onAttachSnippet={openSnippetTool}
            onCreateRfi={(item) => void createRfiFromEstimateItem(item)}
            onCreateSubmittal={(item) => void createSubmittalFromEstimateItem(item)}
            onPushToSchedule={(item) => void pushEstimateItemToSchedule(item)}
            onRecordOutcome={openItemOutcomeRecorder}
            onEditDetails={() => setActiveTool("estimates")}
            onGoToRfq={() => setActiveTool("rfq")}
            onGoToProduction={() => setActiveTool("production-breakdown")}
            onCreateCiceroAction={(action) => void createCiceroAction(action)}
            onSendToPm={() => void sendEstimateHandoff("PM")}
            onSendToScheduler={() => void sendEstimateHandoff("Scheduler")}
            onEditSection={openSectionEditor}
            onDeleteSection={(section, sectionItems) => void deleteSectionGroup(section, sectionItems)}
            onMoveLine={(item, siblings, direction) => void moveEstimateLine(item, siblings, direction)}
            rfqStatusForItem={rfqStatusForItem}
          />
        ) : activeTool === "estimates" ? (
          <EstimatesListView
            rows={portfolioRows}
            selectedEstimateId={estimateId}
            selectedEstimateTotal={selectedEstimateTotal}
            selectedEstimateItemCount={(estimateItems || []).length}
            onOpenEstimate={(row) => void openPortfolioRow(row)}
            onDuplicateEstimate={(estimate) => void duplicateEstimateRow(estimate)}
            onDeleteEstimate={(estimate) => void deleteEstimateRow(estimate)}
            onNewEstimate={startNewEstimateFlow}
            onAutoBid={openAutoBidQueue}
            onQuickTemplates={openQuickTemplates}
          />
        ) : activeTool === "data-center" ? (
          <DataCenterView
            activeTab={dataCenterTab}
            onTabChange={setDataCenterTab}
            records={dataCenterRecords}
            predictiveEstimatorModel={predictiveEstimatorModel as Record<string, unknown>}
          />
        ) : activeTool === "war-room" ? aiToolsWorkspace : activeTool !== "rfq" ? stagedTool : (
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
