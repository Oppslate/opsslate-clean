"use client";

import { useState, useMemo } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Id } from "../../convex/_generated/dataModel";

interface Contractor {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  rating: number;
  specialty: string;
  trade: string;
  whyRecommended: string;
  companySize: string;
  yearsInBusiness: number;
  serviceRadius: string;
  verified: boolean;
  distanceMiles?: number;
}

interface SearchResult {
  contractors: Contractor[];
  searchTips: string[];
  licensingNotes: string;
  budgetRange: string;
  redFlags: string[];
}

const TRADES = [
  "Electrical", "Plumbing", "HVAC", "Concrete", "Steel Erection",
  "Masonry", "Roofing", "Framing / Carpentry", "Drywall", "Painting",
  "Flooring", "Excavation / Sitework", "Landscaping", "Fire Protection",
  "Elevator / Lift", "Demolition", "Waterproofing", "Insulation",
  "Glass / Glazing", "Fencing", "Paving / Asphalt", "Utilities",
  "Environmental / Abatement", "Surveying", "Testing / Inspection",
  "Mechanical", "Sheet Metal", "Welding", "Scaffolding",
  "Trucking / Hauling", "Material Supplier", "Equipment Rental",
  "General Contractor", "Other",
];

const EQUIPMENT_TYPES = [
  "Skid Steer",
  "Mini Excavator",
  "Excavator",
  "Dozer",
  "Wheel Loader",
  "Backhoe",
  "Asphalt Planer",
  "Paver",
  "Roller",
  "Dump Truck",
  "Water Truck",
  "Boom Lift",
  "Scissor Lift",
  "Telehandler",
  "Crane",
  "Trencher",
  "Compactor",
  "Generator",
  "Light Tower",
  "Attachments / Buckets",
  "Other",
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "text-yellow-400" : "text-zinc-600"}>★</span>
      ))}
    </span>
  );
}

export function ContractorSearchModal({
  projectId,
  projectName,
  projectLocation,
  companyId,
  onClose,
  initialTrade,
  title = "AI Contractor Finder",
  subtitle = "Search for qualified subcontractors & suppliers near your project",
  mode = "contractor",
}: {
  projectId: string;
  projectName: string;
  projectLocation: string;
  companyId: string;
  onClose: () => void;
  initialTrade?: string;
  title?: string;
  subtitle?: string;
  mode?: "contractor" | "equipment";
}) {
  const searchAction = useAction(api.aiContractorSearch.searchContractors);
  const createSub = useMutation(api.subcontractors.create);
  const customTradesData = useQuery(api.customTrades.list, { companyId: companyId as Id<"companies"> });
  const addCustomTrade = useMutation(api.customTrades.add);

  const mergedTrades = useMemo(() => {
    const custom = (customTradesData ?? []).map((t) => t.name);
    const all = [...TRADES.filter((t) => t !== "Other"), ...custom.filter((c) => !TRADES.includes(c))];
    all.sort((a, b) => a.localeCompare(b));
    all.push("Other");
    return all;
  }, [customTradesData]);

  const [trade, setTrade] = useState(initialTrade || "");
  const [customTrade, setCustomTrade] = useState("");
  const [scope, setScope] = useState("");
  const [equipmentType, setEquipmentType] = useState("Skid Steer");
  const [location, setLocation] = useState(projectLocation || "");
  const [count, setCount] = useState(5);
  const [searchRadius, setSearchRadius] = useState("50");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [showInsights, setShowInsights] = useState(false);

  const activeTrade = trade === "Other" ? customTrade : trade;
  const effectiveTrade = mode === "equipment" ? "Equipment Rental" : activeTrade;
  const effectiveScope = mode === "equipment"
    ? `${equipmentType}${scope ? `, ${scope}` : ""}`
    : scope;

  const handleSearch = async () => {
    if ((!effectiveTrade && mode !== "equipment") || !location) {
      setError(mode === "equipment" ? "Please select equipment and enter a location" : "Please select a trade and enter a location");
      return;
    }
    setError("");
    setLoading(true);
    setResults(null);
    setSelected(new Set());
    setAdded(new Set());
    // Save custom trade if "Other" was used
    if (trade === "Other" && customTrade.trim()) {
      try {
        await addCustomTrade({ companyId: companyId as Id<"companies">, name: customTrade.trim() });
      } catch { /* ignore dupe */ }
    }
    try {
      const res = await searchAction({
        location: `${location} (within ${searchRadius} miles)`,
        trade: effectiveTrade,
        scope: effectiveScope || undefined,
        count,
        projectName,
      });
      setResults(res as SearchResult);
      // Auto-select all by default
      const all = new Set<number>();
      ((res as SearchResult).contractors || []).forEach((_: Contractor, i: number) => all.add(i));
      setSelected(all);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const selectTopN = (n: number) => {
    const sorted = [...(results?.contractors || [])]
      .map((c, i) => ({ c, i }))
      .sort((a, b) => b.c.rating - a.c.rating)
      .slice(0, n);
    setSelected(new Set(sorted.map((s) => s.i)));
  };

  const handleAddSelected = async () => {
    if (!results) return;
    setLoading(true);
    let addedCount = 0;
    for (const i of selected) {
      if (added.has(i)) continue;
      const c = results.contractors[i];
      try {
        await createSub({
          companyId: companyId as Id<"companies">,
          name: c.name,
          trade: c.trade,
          contactName: c.contactName,
          phone: c.phone,
          email: c.email,
          address: c.address,
          rating: c.rating,
          status: "Active",
          notes: `${c.whyRecommended}\n\nSpecialty: ${c.specialty}\nSize: ${c.companySize}\nYears: ${c.yearsInBusiness}\nRadius: ${c.serviceRadius}${c.website ? `\nWebsite: ${c.website}` : ""}\n\n⚠️ AI-sourced — verify before contracting`,
          projectIds: [projectId],
        });
        addedCount++;
        setAdded((prev) => new Set([...prev, i]));
      } catch {
        // Skip duplicates silently
      }
    }
    setLoading(false);
    if (addedCount > 0) {
      setError("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">🔍 {title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Form */}
          {!results && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">{mode === "equipment" ? "Equipment Type *" : "Trade / Service *"}</label>
                  {mode === "equipment" ? (
                    <select
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                      value={equipmentType}
                      onChange={(e) => setEquipmentType(e.target.value)}
                    >
                      {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <>
                      <select
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                        value={trade}
                        onChange={(e) => setTrade(e.target.value)}
                      >
                        <option value="">Select a trade...</option>
                        {mergedTrades.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {trade === "Other" && (
                        <Input className="mt-2" placeholder="Enter trade or service..." value={customTrade} onChange={(e) => setCustomTrade(e.target.value)} />
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Location *</label>
                  <Input placeholder="City, State" value={location} onChange={(e) => setLocation(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Auto-filled from project</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">{mode === "equipment" ? "Equipment Notes (optional)" : "Scope of Work (optional — be specific for better results)"}</label>
                <Textarea
                  placeholder={mode === "equipment" ? "e.g., tracked preferred, 84-inch bucket, 1 week rental, delivery to site, operator needed..." : "e.g., 200 amp 3-phase service upgrade, panel installation, conduit runs for 50,000 sq ft warehouse..."}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">How many contractors?</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                    <option value={3}>Top 3</option>
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={15}>Top 15</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Search Radius</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={searchRadius} onChange={(e) => setSearchRadius(e.target.value)}>
                    <option value="25">25 miles</option>
                    <option value="50">50 miles</option>
                    <option value="100">100 miles</option>
                    <option value="200">200 miles</option>
                    <option value="nationwide">Nationwide</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

              <Button
                onClick={handleSearch}
                disabled={loading || !activeTrade || !location}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-lg py-6"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">🔍</span> Searching for {activeTrade} contractors...
                  </span>
                ) : (
                  `🔍 Find ${activeTrade || "Contractors"} near ${location || "..."}`
                )}
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && !results && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-bounce">🔍</div>
              <p className="text-lg font-medium">Searching for qualified contractors...</p>
              <p className="text-sm text-muted-foreground mt-2">Analyzing {activeTrade} companies near {location}</p>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold">Found {results.contractors.length} {activeTrade} Contractors</h3>
                  <p className="text-xs text-muted-foreground">Near {location} · {selected.size} selected · {added.size} added</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => selectTopN(3)}>Top 3</Button>
                  <Button size="sm" variant="outline" onClick={() => selectTopN(5)}>Top 5</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const all = new Set<number>();
                    results.contractors.forEach((_, i) => all.add(i));
                    setSelected(all);
                  }}>Select All</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
                  <Button size="sm" variant="outline" onClick={() => { setResults(null); setError(""); }}>🔍 New Search</Button>
                </div>
              </div>

              {/* Contractor Cards */}
              <div className="space-y-3">
                {results.contractors.map((c, i) => {
                  const isSelected = selected.has(i);
                  const isAdded = added.has(i);
                  return (
                    <Card
                      key={i}
                      className={`border cursor-pointer transition-all ${
                        isAdded ? "border-green-500/50 bg-green-500/5" :
                        isSelected ? "border-orange-500/50 bg-orange-500/5" :
                        "border-border bg-card hover:border-border/80"
                      }`}
                      onClick={() => !isAdded && toggleSelect(i)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-1">
                            {isAdded ? (
                              <span className="text-green-400 text-lg">✅</span>
                            ) : (
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "border-orange-500 bg-orange-500" : "border-zinc-600"}`}>
                                {isSelected && <span className="text-white text-xs">✓</span>}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <h4 className="font-bold text-base">{c.name}</h4>
                                <p className="text-sm text-muted-foreground">{c.specialty}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Stars rating={c.rating} />
                                {c.distanceMiles != null && (
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                    📍 {c.distanceMiles} mi
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">{c.companySize}</Badge>
                                {c.verified && <Badge className="bg-blue-500/20 text-blue-400 text-xs">Verified</Badge>}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-xs text-muted-foreground block">Contact</span>
                                <span>{c.contactName}</span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block">Phone</span>
                                <a href={`tel:${c.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{c.phone}</a>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block">Email</span>
                                <a href={`mailto:${c.email}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{c.email}</a>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block">Location</span>
                                <span>{c.address}</span>
                              </div>
                            </div>

                            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                              {c.distanceMiles != null && <span className="font-medium text-blue-400">📍 ~{c.distanceMiles} miles from project</span>}
                              {c.yearsInBusiness > 0 && <span>📅 {c.yearsInBusiness} yrs in business</span>}
                              <span>🌐 {c.serviceRadius}</span>
                              {c.website && (
                                <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                  🌐 Website
                                </a>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg p-2">{c.whyRecommended}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* AI Insights Panel */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <button className="flex items-center gap-2 text-sm font-bold w-full text-left" onClick={() => setShowInsights(!showInsights)}>
                    <span>🧠 AI Insights & Tips</span>
                    <span className="text-xs text-muted-foreground ml-auto">{showInsights ? "▼" : "▶"}</span>
                  </button>
                  {showInsights && (
                    <div className="mt-4 space-y-4">
                      {results.budgetRange && (
                        <div>
                          <h4 className="text-sm font-bold text-muted-foreground">💰 Budget Range</h4>
                          <p className="text-sm mt-1">{results.budgetRange}</p>
                        </div>
                      )}
                      {results.licensingNotes && (
                        <div>
                          <h4 className="text-sm font-bold text-muted-foreground">📋 Licensing Requirements</h4>
                          <p className="text-sm mt-1">{results.licensingNotes}</p>
                        </div>
                      )}
                      {results.searchTips?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-muted-foreground">💡 Tips for Finding More</h4>
                          <ul className="mt-1 space-y-1">
                            {results.searchTips.map((tip, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-orange-400">•</span> {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {results.redFlags?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-muted-foreground">🚩 Red Flags to Watch For</h4>
                          <ul className="mt-1 space-y-1">
                            {results.redFlags.map((flag, i) => (
                              <li key={i} className="text-sm text-red-400/80 flex gap-2">
                                <span>⚠️</span> {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Selected Button */}
              <div className="sticky bottom-0 bg-card border-t border-border p-4 -mx-6 -mb-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selected.size - added.size > 0
                    ? `${selected.size - added.size} contractor${selected.size - added.size > 1 ? "s" : ""} ready to add`
                    : added.size > 0
                      ? `✅ ${added.size} added to your vendor directory`
                      : "Select contractors to add"}
                </p>
                <div className="flex gap-2">
                  {added.size > 0 && added.size === selected.size && (
                    <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                      ✅ Done — View Vendors
                    </Button>
                  )}
                  {selected.size - added.size > 0 && (
                    <Button
                      onClick={handleAddSelected}
                      disabled={loading}
                      className="bg-gradient-to-r from-orange-500 to-amber-600"
                    >
                      {loading ? "Adding..." : `➕ Add ${selected.size - added.size} to Vendor Directory`}
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                ⚠️ AI-sourced recommendations. Always verify contractor credentials, licenses, insurance, and references before contracting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
