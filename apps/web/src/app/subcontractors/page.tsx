
"use client";
import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import { TableToolbar, exportCSV } from "@opsslate/suite-ui/table-toolbar";
import { useToast } from "@opsslate/suite-ui/toast";
import Link from "next/link";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { Id } from "../../../convex/_generated/dataModel";

const TRADES = ["General", "Electrical", "Plumbing", "HVAC", "Drywall", "Painting", "Flooring", "Roofing", "Framing", "Masonry", "Fire Protection", "Concrete", "Steel", "Landscaping", "Excavation", "Demolition", "Insulation", "Glazing", "Other"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SubForm({ onClose, existing, projects, mergedTrades, onAddCustomTrade }: { onClose: () => void; existing?: any; projects: any[]; mergedTrades: string[]; onAddCustomTrade: (name: string) => void }) {
  const { user } = useAuth();
  const createSub = useMutation(api.subcontractors.create);
  const updateSub = useMutation(api.subcontractors.update);
  const { toast } = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [trade, setTrade] = useState(existing?.trade ?? "");
  const [customTradeInput, setCustomTradeInput] = useState("");
  const [contact, setContact] = useState(existing?.contactName ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [license, setLicense] = useState(existing?.license ?? "");
  const [licenseExp, setLicenseExp] = useState(existing?.licenseExpiry ?? "");
  const [insExp, setInsExp] = useState(existing?.insuranceExpiry ?? "");
  const [insProvider, setInsProvider] = useState(existing?.insuranceProvider ?? "");
  const [rating, setRating] = useState(String(existing?.rating ?? ""));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(existing?.projectIds ?? []);
  const [saving, setSaving] = useState(false);

  const toggleProject = (pid: string) => {
    setSelectedProjects((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const handleSave = async () => {
    if (!name) { toast("Name required", "error"); return; }
    setSaving(true);
    const finalTrade = trade === "Other" ? customTradeInput.trim() : trade;
    if (trade === "Other" && customTradeInput.trim()) {
      onAddCustomTrade(customTradeInput.trim());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      name, trade: finalTrade || undefined, contactName: contact || undefined,
      phone: phone || undefined, email: email || undefined, address: address || undefined,
      license: license || undefined, licenseExpiry: licenseExp || undefined,
      insuranceExpiry: insExp || undefined, insuranceProvider: insProvider || undefined,
      rating: rating ? Number(rating) : undefined, notes: notes || undefined,
      projectIds: selectedProjects.length > 0 ? selectedProjects : undefined,
    };
    if (existing) {
      await updateSub({ id: existing._id, ...data });
      toast("Updated", "success");
    } else {
      await createSub({ companyId: user!.companyId as Id<"companies">, ...data });
      toast("Sub added", "success");
    }
    setSaving(false); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-lg">{existing ? "Edit Sub" : "Add Subcontractor"}</h3>
          <button onClick={onClose} className="text-xl text-muted-foreground">x</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold block mb-1">Company Name *</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="text-sm font-semibold block mb-1">Trade</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={trade} onChange={(e) => setTrade(e.target.value)}>
                <option value="">Select...</option>{mergedTrades.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {trade === "Other" && (
                <Input className="mt-2" placeholder="Enter custom trade..." value={customTradeInput} onChange={(e) => setCustomTradeInput(e.target.value)} />
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-sm font-semibold block mb-1">Contact</label><Input value={contact} onChange={(e) => setContact(e.target.value)} /></div>
            <div><label className="text-sm font-semibold block mb-1">Phone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><label className="text-sm font-semibold block mb-1">Email</label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-semibold block mb-1">Address</label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold block mb-1">License #</label><Input value={license} onChange={(e) => setLicense(e.target.value)} /></div>
            <div><label className="text-sm font-semibold block mb-1">License Expiry</label><Input type="date" value={licenseExp} onChange={(e) => setLicenseExp(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold block mb-1">Insurance Provider</label><Input value={insProvider} onChange={(e) => setInsProvider(e.target.value)} /></div>
            <div><label className="text-sm font-semibold block mb-1">Insurance Expiry</label><Input type="date" value={insExp} onChange={(e) => setInsExp(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" /></div>
          </div>
          <div><label className="text-sm font-semibold block mb-1">Rating (1-5)</label><Input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} className="w-24" /></div>

          {/* Project Associations */}
          <div>
            <label className="text-sm font-semibold block mb-2">📁 Associated Projects</label>
            <p className="text-xs text-muted-foreground mb-2">Select all projects this sub is working on</p>
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
              {projects.length > 0 ? projects.map((proj) => {
                const isSelected = selectedProjects.includes(proj._id);
                return (
                  <label
                    key={proj._id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/50 border-b border-border last:border-b-0 ${isSelected ? "bg-orange-500/10" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProject(proj._id)}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{proj.name}</span>
                      {proj.location && <span className="text-xs text-muted-foreground ml-2">📍 {proj.location}</span>}
                    </div>
                    <Badge variant="outline" className="text-xs">{proj.status || "Active"}</Badge>
                  </label>
                );
              }) : (
                <p className="text-sm text-muted-foreground p-3">No projects found</p>
              )}
            </div>
            {selectedProjects.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ✅ {selectedProjects.length} project{selectedProjects.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div><label className="text-sm font-semibold block mb-1">Notes</label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <div className="p-4 border-t border-border flex justify-between"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={saving} onClick={handleSave}>{saving ? "Saving..." : "Save"}</Button></div>
      </div>
    </div>
  );
}

function SubsContent() {
  const { user } = useAuth();
  const subs = useQuery(api.subcontractors.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip");
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip");
  const customTradesData = useQuery(api.customTrades.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip");
  const addCustomTradeMut = useMutation(api.customTrades.add);
  const removeSub = useMutation(api.subcontractors.remove);

  const mergedTrades = useMemo(() => {
    const custom = (customTradesData ?? []).map((t) => t.name);
    const base = TRADES.filter((t) => t !== "Other");
    const all = [...base, ...custom.filter((c) => !base.some((b) => b.toLowerCase() === c.toLowerCase()))];
    all.sort((a, b) => a.localeCompare(b));
    all.push("Other");
    return all;
  }, [customTradesData]);

  const handleAddCustomTrade = useCallback(async (name: string) => {
    if (!user) return;
    try { await addCustomTradeMut({ companyId: user.companyId as Id<"companies">, name }); } catch { /* ignore */ }
  }, [user, addCustomTradeMut]);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editItem, setEditItem] = useState<any>(null);
  const [filterTrade, setFilterTrade] = useState("");
  const [filterProject, setFilterProject] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  // Build project name lookup
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    (projects ?? []).forEach((p) => { map[p._id] = p.name; });
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!subs) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let list = subs as any[];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => JSON.stringify(s).toLowerCase().includes(q));
    }
    if (filterTrade) {
      list = list.filter((s) => s.trade === filterTrade);
    }
    if (filterProject) {
      list = list.filter((s) => s.projectIds?.includes(filterProject));
    }
    return list;
  }, [subs, search, filterTrade, filterProject]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSubs = (subs ?? []) as any[];
  const expiringSoon = allSubs.filter((s) => (s.insuranceExpiry && s.insuranceExpiry <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)) || (s.licenseExpiry && s.licenseExpiry <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)));

  // Trade summary
  const tradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allSubs.forEach((s) => { const t = s.trade || "Other"; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).sort(([,a], [,b]) => b - a);
  }, [allSubs]);

  if (!user) return null;
  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-r from-background to-secondary/20">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0">
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">← Back to Dashboard</Link>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className="bg-orange-500/15 text-orange-300">Buyout Command Center</Badge>
                <Badge variant="outline">{allSubs.length} subcontractors</Badge>
                <Badge variant="outline">{[...new Set(allSubs.map((s) => s.trade).filter(Boolean))].length} trades</Badge>
                {expiringSoon.length > 0 && <Badge className="bg-yellow-500/20 text-yellow-300">{expiringSoon.length} expiring soon</Badge>}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">🏗️ Subcontractors & Vendors</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">Run buyout, qualification, project assignment, insurance tracking, and subcontractor relationships from one page.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-[280px]">
              <Button variant="outline" onClick={() => { setEditItem(null); setShowForm(true); }}>+ Add Sub</Button>
              <Link href="/buyout"><Button variant="outline" className="w-full">🛒 Buyout</Button></Link>
              <Button variant="outline" onClick={() => setFilterTrade("")}>🏷️ All Trades</Button>
              <Button variant="outline" onClick={() => exportCSV(["Name","Trade","Contact","Phone","Email","License","License Exp","Insurance Exp","Rating","Status","Projects"], filtered.map((s) => [s.name,s.trade??"",s.contactName??"",s.phone??"",s.email??"",s.license??"",s.licenseExpiry??"",s.insuranceExpiry??"",String(s.rating??""),s.status??"",(s.projectIds??[]).map((id: string) => projectMap[id] || id).join("; ")]), "subcontractors.csv")}>📤 Export</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Buyout Actions</div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => { setEditItem(null); setShowForm(true); }}>+ Add</Button><Link href="/buyout"><Button variant="outline" className="w-full">🛒 Quotes</Button></Link><Link href="/documents"><Button variant="outline" className="w-full">📄 Docs</Button></Link><Link href="/emails"><Button variant="outline" className="w-full">📧 Emails</Button></Link></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Qualification</div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setFilterTrade("Electrical")}>⚡ Electrical</Button><Button variant="outline" onClick={() => setFilterTrade("Concrete")}>🧱 Concrete</Button><Button variant="outline" onClick={() => setFilterTrade("Excavation")}>🚧 Excavation</Button><Button variant="outline" onClick={() => setFilterTrade("HVAC")}>🌬️ HVAC</Button></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm font-bold mb-3">Workflow Links</div><div className="grid grid-cols-2 gap-2"><Link href="/rfis"><Button variant="outline" className="w-full">📋 RFIs</Button></Link><Link href="/submittals"><Button variant="outline" className="w-full">📨 Submittals</Button></Link><Link href="/insurance"><Button variant="outline" className="w-full">🛡️ Insurance</Button></Link><Link href="/documents"><Button variant="outline" className="w-full">🗂️ Files</Button></Link></div></CardContent></Card>
      </div>

      {expiringSoon.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30 mb-4"><CardContent className="p-3">
          <div className="font-bold text-yellow-400 text-sm">⚠️ {expiringSoon.length} sub(s) with expiring insurance or license</div>
          <div className="text-xs text-muted-foreground">{expiringSoon.map((s) => s.name).join(", ")}</div>
        </CardContent></Card>
      )}

      {/* Trade Filter Chips */}
      {tradeCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge
            variant={filterTrade === "" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setFilterTrade("")}
          >All ({allSubs.length})</Badge>
          {tradeCounts.map(([trade, count]) => (
            <Badge
              key={trade}
              variant={filterTrade === trade ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFilterTrade(filterTrade === trade ? "" : trade)}
            >{trade} ({count})</Badge>
          ))}
        </div>
      )}

      {/* Project Filter */}
      {(projects ?? []).length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Filter by project:</span>
          <select
            className="bg-secondary border border-border rounded-lg px-2 py-1 text-sm"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {(projects ?? [])
              .filter((p) => p.status !== "Inactive" && p.status !== "Archived")
              .map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
          </select>
          {filterProject && (
            <Button size="sm" variant="ghost" onClick={() => setFilterProject("")} className="text-xs">Clear</Button>
          )}
        </div>
      )}

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => { setEditItem(null); setShowForm(true); }} addLabel="Add Sub" onExport={() => {
        exportCSV(["Name","Trade","Contact","Phone","Email","License","License Exp","Insurance Exp","Rating","Status","Projects"], filtered.map((s) => [s.name,s.trade??"",s.contactName??"",s.phone??"",s.email??"",s.license??"",s.licenseExpiry??"",s.insuranceExpiry??"",String(s.rating??""),s.status??"",(s.projectIds??[]).map((id: string) => projectMap[id] || id).join("; ")]), "subcontractors.csv");
      }} />

      <Card className="bg-card border-border"><Table><TableHeader><TableRow>
        <TableHead>Company</TableHead>
        <TableHead>Trade</TableHead>
        <TableHead>Contact</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Projects</TableHead>
        <TableHead>License</TableHead>
        <TableHead>Insurance</TableHead>
        <TableHead>Rating</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow></TableHeader><TableBody>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {filtered.map((sub: any) => {
          const insExpired = sub.insuranceExpiry && sub.insuranceExpiry < today;
          const licExpired = sub.licenseExpiry && sub.licenseExpiry < today;
          const subProjects: string[] = sub.projectIds ?? [];
          return (
            <TableRow key={sub._id} className="cursor-pointer hover:bg-secondary/50" onClick={() => { setEditItem(sub); setShowForm(true); }}>
              <TableCell>
                <div>
                  <span className="font-medium">{sub.name}</span>
                  {sub.address && <span className="block text-xs text-muted-foreground">📍 {sub.address}</span>}
                </div>
              </TableCell>
              <TableCell><Badge variant="outline">{sub.trade || "—"}</Badge></TableCell>
              <TableCell>
                <div className="text-sm">
                  <span>{sub.contactName || "—"}</span>
                  {sub.email && <span className="block text-xs text-muted-foreground">{sub.email}</span>}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {sub.phone ? (
                  <a href={`tel:${sub.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>📞 {sub.phone}</a>
                ) : "—"}
              </TableCell>
              <TableCell>
                {subProjects.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {subProjects.slice(0, 3).map((pid: string) => (
                      <Badge key={pid} variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                        {projectMap[pid] || "Unknown"}
                      </Badge>
                    ))}
                    {subProjects.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{subProjects.length - 3} more</Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No projects</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                <span className={licExpired ? "text-red-400" : ""}>{sub.license || "—"}{sub.licenseExpiry ? ` (${sub.licenseExpiry})` : ""}</span>
                {licExpired && <Badge variant="destructive" className="ml-1 text-xs">EXPIRED</Badge>}
              </TableCell>
              <TableCell className="text-sm">
                <span className={insExpired ? "text-red-400" : ""}>{sub.insuranceExpiry || "—"}</span>
                {insExpired && <Badge variant="destructive" className="ml-1 text-xs">EXPIRED</Badge>}
              </TableCell>
              <TableCell>{sub.rating ? "⭐".repeat(sub.rating) : "—"}</TableCell>
              <TableCell><Badge variant={sub.status === "Active" ? "default" : "secondary"}>{sub.status || "Active"}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => { setEditItem(sub); setShowForm(true); }}>✎</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeSub({ id: sub._id }).then(() => toast("Removed", "success"))}>✕</Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody></Table>
      {filtered.length === 0 && <EmptyState icon="🏗️" title="No subcontractors" description="Add your subs to track insurance, licenses, and performance" actionLabel="+ Add Sub" onAction={() => setShowForm(true)} />}
      </Card>

      {showForm && <SubForm onClose={() => { setShowForm(false); setEditItem(null); }} existing={editItem} projects={(projects ?? []).filter((p) => p.status !== "Inactive" && p.status !== "Archived")} mergedTrades={mergedTrades} onAddCustomTrade={handleAddCustomTrade} />}
    </div>
  );
}

export default function SubcontractorsPage() { return <AppShell><SubsContent /></AppShell>; }
