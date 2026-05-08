
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const CATEGORIES = [
  "Concrete", "Steel/Rebar", "Pipe & Fittings", "Aggregate/Stone", "Asphalt",
  "Lumber/Forms", "Electrical", "Plumbing", "HVAC", "Equipment Rental",
  "Trucking/Hauling", "Earthwork Sub", "Paving Sub", "Utilities Sub",
  "Landscaping", "Fencing", "Signage/Striping", "Testing/Inspection",
  "Fuel", "Misc Materials", "Other",
];

const STATUSES = ["open", "quoted", "awarded", "ordered", "delivered", "complete", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-gray-500", quoted: "bg-blue-500", awarded: "bg-green-600",
  ordered: "bg-blue-700", delivered: "bg-green-500", complete: "bg-green-800",
  cancelled: "bg-red-600",
};

function fmt(n: number) { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function BuyoutContent() {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as any[];
  const [selectedProject, setSelectedProject] = useState<string>("");
  const projectId = selectedProject || undefined;

  const items = useQuery(
    api.buyout.listItems,
    user && projectId ? { companyId: user.companyId, projectId: projectId as Id<"projects"> } : "skip"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any[] | undefined;

  const allQuotes = useQuery(
    api.buyout.listAllQuotes,
    user ? { companyId: user.companyId } : "skip"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any[] | undefined;

  const createItem = useMutation(api.buyout.createItem);
  const updateItem = useMutation(api.buyout.updateItem);
  const removeItem = useMutation(api.buyout.removeItem);
  const createQuote = useMutation(api.buyout.createQuote);
  const awardQuote = useMutation(api.buyout.awardQuote);
  const removeQuote = useMutation(api.buyout.removeQuote);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [quoteModal, setQuoteModal] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category: "Concrete", description: "", budgetAmount: 0, quantity: 0, unit: "LS", scope: "", notes: "", status: "open",
  });
  const [quoteData, setQuoteData] = useState({
    vendorName: "", contactName: "", phone: "", email: "", amount: 0, unitPrice: 0, leadTime: "", notes: "", quoteDate: new Date().toISOString().slice(0, 10), expiresDate: "", status: "pending",
  });

  const filtered = useMemo(() => {
    if (!items) return [];
    let r = items;
    if (search) { const q = search.toLowerCase(); r = r.filter((x: Record<string, unknown>) => JSON.stringify(x).toLowerCase().includes(q)); }
    if (filterStatus) r = r.filter((x: Record<string, unknown>) => x.status === filterStatus);
    if (filterCategory) r = r.filter((x: Record<string, unknown>) => x.category === filterCategory);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, filterStatus, filterCategory]);

  // KPIs
  const totalBudget = (items || []).reduce((s: number, i: Record<string, unknown>) => s + ((i.budgetAmount as number) || 0), 0);
  const totalAwarded = (items || []).reduce((s: number, i: Record<string, unknown>) => s + ((i.awardedAmount as number) || 0), 0);
  const totalSavings = (items || []).reduce((s: number, i: Record<string, unknown>) => s + ((i.savings as number) || 0), 0);
  const openCount = (items || []).filter((i: Record<string, unknown>) => i.status === "open" || i.status === "quoted").length;
  const awardedCount = (items || []).filter((i: Record<string, unknown>) => i.status === "awarded" || i.status === "ordered" || i.status === "delivered" || i.status === "complete").length;
  const completePct = items?.length ? Math.round((awardedCount / items.length) * 100) : 0;

  const getQuotesForItem = (itemId: string) => {
    return (allQuotes || []).filter((q: Record<string, unknown>) => q.buyoutItemId === itemId);
  };

  async function handleCreateItem() {
    if (!user || !projectId) return;
    await createItem({ companyId: user.companyId, projectId: projectId as Id<"projects">, ...formData });
    setFormData({ category: "Concrete", description: "", budgetAmount: 0, quantity: 0, unit: "LS", scope: "", notes: "", status: "open" });
    setShowForm(false);
  }

  async function handleAddQuote() {
    if (!user || !quoteModal) return;
    await createQuote({ companyId: user.companyId, buyoutItemId: quoteModal as Id<"buyoutItems">, ...quoteData });
    setQuoteData({ vendorName: "", contactName: "", phone: "", email: "", amount: 0, unitPrice: 0, leadTime: "", notes: "", quoteDate: new Date().toISOString().slice(0, 10), expiresDate: "", status: "pending" });
    setShowQuoteForm(false);
  }

  async function handleAward(quoteId: string, itemId: string) {
    if (!confirm("Award this quote? Other quotes will be marked as rejected.")) return;
    await awardQuote({ quoteId: quoteId as Id<"buyoutQuotes">, buyoutItemId: itemId as Id<"buyoutItems"> });
  }

  async function handleStatusChange(itemId: string, status: string) {
    await updateItem({ id: itemId as Id<"buyoutItems">, status });
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Delete this buyout item and all its quotes?")) return;
    await removeItem({ id: itemId as Id<"buyoutItems"> });
  }

  if (!user) return <div className="flex items-center justify-center h-screen text-gray-400">Please log in</div>;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800/80 p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">← Back to Dashboard</Link>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className="bg-blue-500/15 text-blue-300">Buyout Command Center</Badge>
                <Badge variant="outline">{items?.length || 0} items</Badge>
                <Badge variant="outline">{openCount} open</Badge>
                <Badge variant="outline">{completePct}% bought out</Badge>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">🛒 Buyout / Procurement</h1>
              <p className="text-gray-400 text-sm mt-2 max-w-3xl">Track material and subcontract buyouts, compare quotes, award vendors, monitor savings, and move purchasing into execution.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-[280px]">
              <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold">+ Add Item</button>
              <Link href="/subcontractors"><button className="w-full border border-gray-600 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm">🏗️ Subs</button></Link>
              <Link href="/documents"><button className="w-full border border-gray-600 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm">📄 Documents</button></Link>
              <Link href="/emails"><button className="w-full border border-gray-600 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm">📧 Emails</button></Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4"><div className="text-sm font-bold text-white mb-3">Procurement Actions</div><div className="grid grid-cols-2 gap-2"><button onClick={() => setShowForm(true)} className="border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">+ Item</button><Link href="/subcontractors"><button className="w-full border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">🏗️ Subs</button></Link><Link href="/documents"><button className="w-full border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">📄 Docs</button></Link><Link href="/rfis"><button className="w-full border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">❓ RFIs</button></Link></div></div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4"><div className="text-sm font-bold text-white mb-3">Visual Status</div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-gray-900 p-3"><div className="text-2xl font-bold text-white">{items?.length || 0}</div><div className="text-xs text-gray-400">Items</div></div><div className="rounded-xl bg-blue-500/10 p-3"><div className="text-2xl font-bold text-blue-400">{fmt(totalBudget)}</div><div className="text-xs text-gray-400">Budget</div></div><div className="rounded-xl bg-green-500/10 p-3"><div className="text-2xl font-bold text-green-400">{completePct}%</div><div className="text-xs text-gray-400">Bought Out</div></div></div></div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4"><div className="text-sm font-bold text-white mb-3">Workflow Links</div><div className="grid grid-cols-2 gap-2"><Link href="/documents"><button className="w-full border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">📁 Files</button></Link><Link href="/subcontractors"><button className="w-full border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">👷 Vendors</button></Link><Link href="/rfis"><button className="w-full border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">❓ RFIs</button></Link><Link href="/submittals"><button className="w-full border border-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">📋 Submittals</button></Link></div></div>
        </div>

      {/* Project Selector */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
        <label className="text-sm font-semibold text-gray-300 block mb-2">Select Project</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white w-full max-w-md"
        >
          <option value="">-- Choose a project --</option>
          {(projects || []).map((p: Record<string, unknown>) => (
            <option key={p._id as string} value={p._id as string}>{p.name as string}</option>
          ))}
        </select>
      </div>

      {!projectId && (
        <div className="text-center py-20 text-gray-500">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-lg">Select a project above to manage buyouts</p>
        </div>
      )}

      {projectId && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <div className="text-2xl font-bold text-white">{items?.length || 0}</div>
              <div className="text-xs text-gray-400 uppercase">Items</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <div className="text-2xl font-bold text-blue-400">{fmt(totalBudget)}</div>
              <div className="text-xs text-gray-400 uppercase">Total Budget</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <div className="text-2xl font-bold text-blue-400">{fmt(totalAwarded)}</div>
              <div className="text-xs text-gray-400 uppercase">Awarded</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <div className={`text-2xl font-bold ${totalSavings >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(totalSavings)}</div>
              <div className="text-xs text-gray-400 uppercase">Savings</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <div className="text-2xl font-bold text-amber-400">{openCount}</div>
              <div className="text-xs text-gray-400 uppercase">Open</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <div className="text-2xl font-bold text-green-400">{completePct}%</div>
              <div className="text-xs text-gray-400 uppercase">Bought Out</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-800 rounded-lg p-3 mb-6 border border-gray-700">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Buyout Progress</span>
              <span>{awardedCount} of {items?.length || 0} items</span>
            </div>
            <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-400 h-full transition-all rounded-full" style={{ width: `${completePct}%` }} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <input
              type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-48"
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowForm(true)} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold">
              + Add Buyout Item
            </button>
          </div>

          {/* Items Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right">Budget</th>
                  <th className="p-3 text-right">Awarded</th>
                  <th className="p-3 text-right">Savings</th>
                  <th className="p-3 text-center">Quotes</th>
                  <th className="p-3 text-left">Vendor</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-left">Lead Time</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-500">
                    {items?.length ? "No items match filters" : "No buyout items yet — click \"+ Add Buyout Item\" to start"}
                  </td></tr>
                )}
                {filtered.map((item: Record<string, unknown>) => {
                  const id = item._id as string;
                  const savings = (item.savings as number) || 0;
                  const qCount = getQuotesForItem(id).length;
                  return (
                    <tr key={id} className="border-b border-gray-700/50 hover:bg-gray-750 hover:bg-opacity-50 transition">
                      <td className="p-3"><Badge variant="outline" className="text-xs">{item.category as string}</Badge></td>
                      <td className="p-3 font-medium text-white">
                        <button onClick={() => { setQuoteModal(id); setEditItem(id); }} className="hover:text-blue-400 text-left">
                          {item.description as string}
                        </button>
                        {item.scope ? <div className="text-xs text-gray-500 mt-0.5">{(item.scope as string).slice(0, 60)}...</div> : null}
                      </td>
                      <td className="p-3 text-right font-mono text-blue-300">{fmt((item.budgetAmount as number) || 0)}</td>
                      <td className="p-3 text-right font-mono text-blue-300">{item.awardedAmount ? fmt(item.awardedAmount as number) : "—"}</td>
                      <td className={`p-3 text-right font-mono font-bold ${savings > 0 ? "text-green-400" : savings < 0 ? "text-red-400" : "text-gray-500"}`}>
                        {item.awardedAmount ? fmt(savings) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => { setQuoteModal(id); setEditItem(id); }} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs">
                          {qCount} quote{qCount !== 1 ? "s" : ""} →
                        </button>
                      </td>
                      <td className="p-3 text-sm text-gray-300">{(item.awardedVendor as string) || "—"}</td>
                      <td className="p-3 text-center">
                        <select value={item.status as string} onChange={(e) => handleStatusChange(id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded text-white border-0 cursor-pointer ${STATUS_COLORS[(item.status as string)] || "bg-gray-600"}`}>
                          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </td>
                      <td className="p-3 text-sm text-gray-400">{(item.leadTime as string) || "—"}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleDelete(id)} className="text-red-400 hover:text-red-300 text-xs">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Item Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-600">
                <h3 className="text-lg font-bold text-white mb-4">Add Buyout Item</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Budget Amount</label>
                    <input type="number" value={formData.budgetAmount} onChange={(e) => setFormData({ ...formData, budgetAmount: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Description *</label>
                    <input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" placeholder="e.g., 4000 PSI Ready-Mix Concrete" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                    <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Unit</label>
                    <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full">
                      {["LS", "CY", "LF", "SF", "SY", "TON", "EA", "GAL", "HR", "DAY", "WK", "MO"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Scope of Work</label>
                    <textarea value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" rows={2} placeholder="Brief scope description..." />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Notes</label>
                    <input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" placeholder="Optional notes" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 text-sm">Cancel</button>
                  <button onClick={handleCreateItem} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm font-semibold">Add Item</button>
                </div>
              </div>
            </div>
          )}

          {/* Quote Detail Modal */}
          {quoteModal && editItem && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setQuoteModal(null); setEditItem(null); setShowQuoteForm(false); } }}>
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl border border-gray-600 max-h-[85vh] overflow-y-auto">
                {(() => {
                  const item = (items || []).find((i: Record<string, unknown>) => i._id === editItem);
                  if (!item) return <p className="text-gray-400">Item not found</p>;
                  const quotes = getQuotesForItem(editItem);
                  const lowestQuote = quotes.length ? Math.min(...quotes.map((q: Record<string, unknown>) => q.amount as number)) : 0;
                  return (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{item.description as string}</h3>
                          <p className="text-sm text-gray-400">{item.category as string} • Budget: <span className="text-blue-300 font-mono">{fmt((item.budgetAmount as number) || 0)}</span></p>
                          {item.scope && <p className="text-xs text-gray-500 mt-1">{item.scope as string}</p>}
                        </div>
                        <button onClick={() => { setQuoteModal(null); setEditItem(null); setShowQuoteForm(false); }} className="text-gray-400 hover:text-white text-xl">✕</button>
                      </div>

                      {/* Quotes Table */}
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-300">Vendor Quotes ({quotes.length})</h4>
                        <button onClick={() => setShowQuoteForm(!showQuoteForm)} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-xs text-white font-semibold">
                          + Add Quote
                        </button>
                      </div>

                      {showQuoteForm && (
                        <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-600">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Vendor Name *</label>
                              <input value={quoteData.vendorName} onChange={(e) => setQuoteData({ ...quoteData, vendorName: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Quote Amount *</label>
                              <input type="number" value={quoteData.amount} onChange={(e) => setQuoteData({ ...quoteData, amount: parseFloat(e.target.value) || 0 })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Contact</label>
                              <input value={quoteData.contactName} onChange={(e) => setQuoteData({ ...quoteData, contactName: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Phone</label>
                              <input value={quoteData.phone} onChange={(e) => setQuoteData({ ...quoteData, phone: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Email</label>
                              <input value={quoteData.email} onChange={(e) => setQuoteData({ ...quoteData, email: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Lead Time</label>
                              <input value={quoteData.leadTime} onChange={(e) => setQuoteData({ ...quoteData, leadTime: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" placeholder="e.g., 2-3 weeks" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Quote Date</label>
                              <input type="date" value={quoteData.quoteDate} onChange={(e) => setQuoteData({ ...quoteData, quoteDate: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Expires</label>
                              <input type="date" value={quoteData.expiresDate} onChange={(e) => setQuoteData({ ...quoteData, expiresDate: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-400 block mb-1">Notes</label>
                              <input value={quoteData.notes} onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <button onClick={() => setShowQuoteForm(false)} className="text-gray-400 text-sm px-3 py-1.5">Cancel</button>
                            <button onClick={handleAddQuote} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-white text-sm font-semibold">Save Quote</button>
                          </div>
                        </div>
                      )}

                      {quotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No quotes yet — add vendor quotes to compare pricing</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                              <th className="p-2 text-left">Vendor</th>
                              <th className="p-2 text-left">Contact</th>
                              <th className="p-2 text-right">Amount</th>
                              <th className="p-2 text-right">vs Budget</th>
                              <th className="p-2 text-left">Lead Time</th>
                              <th className="p-2 text-center">Status</th>
                              <th className="p-2 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotes.map((q: Record<string, unknown>) => {
                              const qid = q._id as string;
                              const amt = (q.amount as number) || 0;
                              const budget = (item.budgetAmount as number) || 0;
                              const diff = budget - amt;
                              const isLowest = amt === lowestQuote && quotes.length > 1;
                              return (
                                <tr key={qid} className={`border-b border-gray-700/50 ${(q.status as string) === "selected" ? "bg-green-900/20" : ""}`}>
                                  <td className="p-2 font-medium text-white">
                                    {q.vendorName as string}
                                    {isLowest && <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">LOWEST</span>}
                                  </td>
                                  <td className="p-2 text-gray-300 text-xs">
                                    {q.contactName ? <div>{q.contactName as string}</div> : null}
                                    {q.phone ? <div>{q.phone as string}</div> : null}
                                    {q.email ? <div className="text-blue-400">{q.email as string}</div> : null}
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-white">{fmt(amt)}</td>
                                  <td className={`p-2 text-right font-mono ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {diff >= 0 ? "+" : ""}{fmt(diff)}
                                  </td>
                                  <td className="p-2 text-gray-400">{(q.leadTime as string) || "—"}</td>
                                  <td className="p-2 text-center">
                                    <Badge className={`text-xs ${(q.status as string) === "selected" ? "bg-green-600" : (q.status as string) === "rejected" ? "bg-red-600" : "bg-gray-600"}`}>
                                      {q.status as string}
                                    </Badge>
                                  </td>
                                  <td className="p-2 text-center space-x-2">
                                    {(q.status as string) !== "selected" && (
                                      <button onClick={() => handleAward(qid, editItem)} className="text-green-400 hover:text-green-300 text-xs font-semibold">
                                        ✅ Award
                                      </button>
                                    )}
                                    <button onClick={() => { if (confirm("Delete this quote?")) removeQuote({ id: qid as Id<"buyoutQuotes">, buyoutItemId: editItem as Id<"buyoutItems"> }); }}
                                      className="text-red-400 hover:text-red-300 text-xs">🗑️</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

export default function BuyoutPage() {
  return <AppShell><BuyoutContent /></AppShell>;
}
