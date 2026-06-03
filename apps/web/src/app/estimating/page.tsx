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

export default function EstimatingPage() {
  return (
    <AppShell>
      <EstimatingRfqWorkspace />
    </AppShell>
  );
}

function EstimatingRfqWorkspace() {
  const { user } = useAuth();
  const estimates = useQuery(api.estimating.listEstimates, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const vendors = useQuery(api.vendors.list, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const branding = useQuery(api.companyBranding.get, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any;

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

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
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
  );
}
