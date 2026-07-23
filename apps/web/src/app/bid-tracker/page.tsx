
"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const DOC_TYPES = [
  { value: "bid_proposal", label: "📄 Bid Proposal", desc: "Your submitted bid/estimate" },
  { value: "bid_breakdown", label: "📊 Bid Breakdown", desc: "Detailed cost breakdown / schedule of values" },
  { value: "contract", label: "📝 Contract", desc: "Signed contract with owner/GC" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function pct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`; }

function BidTrackerContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const { toast } = useToast();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ committed: string; actual: string; notes: string }>({ committed: "", actual: "", notes: "" });
  const [viewMode, setViewMode] = useState<"overview" | "details" | "documents">("overview");
  const projectsWithDocs = useQuery(api.bidManagerHelpers.projectsWithBidDocs, user ? { companyId: user.companyId } : "skip") as string[] | undefined;

  const documents = useQuery(
    api.bidManagerHelpers.listDocuments,
    selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip"
  );
  const bidVsActual = useQuery(
    api.bidManagerHelpers.getBidVsActual,
    selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip"
  );

  const generateUploadUrl = useAction(api.bidManager.generateUploadUrl as any);
  const saveDocument = useAction(api.bidManager.saveDocument as any);
  const extractBidData = useAction(api.bidManager.extractBidData as any);
  const updateBidLineItem = useMutation(api.bidManagerHelpers.updateBidLineItem);
  const deleteDocument = useMutation(api.bidManagerHelpers.deleteDocument);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedProject) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();

      const docId = await saveDocument({
        companyId: user.companyId,
        projectId: selectedProject as Id<"projects">,
        type: docType,
        fileName: file.name,
        fileId: storageId,
      });

      toast(`✅ ${file.name} uploaded! Extracting data...`, "success");

      // Auto-extract
      setExtracting(docId);
      const result = await extractBidData({ documentId: docId });
      toast(`🧠 AI extracted ${result.itemCount} line items from ${file.name}`, "success");
      setExtracting(null);
    } catch (err: any) {
      toast("Upload failed: " + err.message, "error");
      setExtracting(null);
    }
    setUploading(false);
    e.target.value = "";
  }, [user, selectedProject, generateUploadUrl, saveDocument, extractBidData, toast]);

  const handleSaveEdit = async (itemId: string) => {
    await updateBidLineItem({
      id: itemId as Id<"bidLineItems">,
      committed: editValues.committed ? parseFloat(editValues.committed) : undefined,
      actual: editValues.actual ? parseFloat(editValues.actual) : undefined,
      notes: editValues.notes || undefined,
    });
    setEditingItem(null);
    toast("Updated!", "success");
  };

  const selectedProj = (projects ?? []).find(p => p._id === selectedProject);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">💰 Bid & Contract Tracker</h1>
          <p className="text-muted-foreground text-sm">Upload bids & contracts → AI extracts line items → track bid vs actual in real-time</p>
        </div>
        <select
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Select Project...</option>
          {(projects ?? []).map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!selectedProject && (() => {
        const docSet = new Set(projectsWithDocs ?? []);
        const needsDocs = (projects ?? []).filter(p => (p as any).contractDate && !docSet.has(p._id));
        return (
          <div className="space-y-4">
            {needsDocs.length > 0 && (
              <Card className="bg-yellow-500/5 border-yellow-500/30">
                <CardContent className="p-4">
                  <h3 className="font-bold text-sm text-yellow-400 mb-2">⚠️ Projects Missing Bid Documents</h3>
                  <p className="text-xs text-muted-foreground mb-3">These projects have a contract date but no bid breakdown or contract uploaded yet.</p>
                  <div className="space-y-2">
                    {needsDocs.map(p => (
                      <button key={p._id} className="w-full text-left bg-secondary/50 hover:bg-secondary rounded-lg p-3 transition-colors" onClick={() => { setSelectedProject(p._id); setViewMode("documents"); }}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{p.name}</span>
                          <Badge variant="outline" className="text-[10px] text-yellow-400">Contract: {(p as any).contractDate}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Click to upload bid breakdown & contract →</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-lg font-bold mb-1">Select a Project</h3>
                <p className="text-muted-foreground text-sm">Choose a project to upload bid documents and track costs against your bid.</p>
                <p className="text-xs text-muted-foreground mt-2">📱 Tip: You can snap a photo of a bid sheet from your phone and upload it — AI will extract all the numbers.</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {selectedProject && (
        <>
          {/* View tabs */}
          <div className="flex gap-2">
            {(["overview", "details", "documents"] as const).map(v => (
              <Button key={v} variant={viewMode === v ? "default" : "outline"} size="sm" onClick={() => setViewMode(v)}>
                {v === "overview" ? "📊 Overview" : v === "details" ? "📋 Line Items" : "📄 Documents"}
              </Button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {viewMode === "overview" && bidVsActual && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Total Bid</div>
                    <div className="text-xl font-bold text-blue-400">{fmt(bidVsActual.totalBid)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Committed</div>
                    <div className="text-xl font-bold text-yellow-400">{fmt(bidVsActual.totalCommitted)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Actual Spent</div>
                    <div className="text-xl font-bold text-orange-400">{fmt(bidVsActual.totalActual)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Variance</div>
                    <div className={`text-xl font-bold ${bidVsActual.totalVariance >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fmt(bidVsActual.totalVariance)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Profit Margin</div>
                    <div className={`text-xl font-bold ${bidVsActual.profitMargin >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pct(bidVsActual.profitMargin)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Budget burn bar */}
              {bidVsActual.totalBid > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold">Budget Burn</span>
                      <span className="text-muted-foreground">{fmt(bidVsActual.totalActual)} of {fmt(bidVsActual.totalBid)} ({((bidVsActual.totalActual / bidVsActual.totalBid) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (bidVsActual.totalActual / bidVsActual.totalBid) > 0.9 ? "bg-red-500" :
                          (bidVsActual.totalActual / bidVsActual.totalBid) > 0.75 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min((bidVsActual.totalActual / bidVsActual.totalBid) * 100, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category breakdown */}
              {Object.keys(bidVsActual.byCategory).length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-sm mb-3">📊 Bid vs Actual by Category</h3>
                    <div className="space-y-3">
                      {Object.entries(bidVsActual.byCategory)
                        .filter(([cat]) => cat !== "Subtotal" && cat !== "Total")
                        .sort(([, a], [, b]) => (b as any).bid - (a as any).bid)
                        .map(([cat, data]: [string, any]) => {
                          const pctUsed = data.bid > 0 ? (data.actual / data.bid) * 100 : 0;
                          const variance = data.bid - data.actual;
                          return (
                            <div key={cat}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{cat}</span>
                                <span className="text-muted-foreground">
                                  {fmt(data.actual)} / {fmt(data.bid)}
                                  <span className={`ml-2 ${variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    ({variance >= 0 ? "+" : ""}{fmt(variance)})
                                  </span>
                                </span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pctUsed > 100 ? "bg-red-500" : pctUsed > 80 ? "bg-yellow-500" : "bg-blue-500"}`}
                                  style={{ width: `${Math.min(pctUsed, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {bidVsActual.lineItems.length === 0 && (
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="p-8 text-center">
                    <div className="text-3xl mb-2">📄</div>
                    <h3 className="font-bold mb-1">No Bid Data Yet</h3>
                    <p className="text-muted-foreground text-sm mb-3">Upload your bid proposal, breakdown, or contract to get started.</p>
                    <Button variant="outline" onClick={() => setViewMode("documents")}>📄 Go to Documents</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── LINE ITEMS ── */}
          {viewMode === "details" && bidVsActual && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">📋 Bid Line Items ({bidVsActual.lineItems.length})</h3>
                {bidVsActual.lineItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No line items yet. Upload bid documents to extract.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs">
                          <th className="text-left py-2 px-2">Code</th>
                          <th className="text-left py-2 px-2">Description</th>
                          <th className="text-left py-2 px-2">Category</th>
                          <th className="text-right py-2 px-2">Qty</th>
                          <th className="text-right py-2 px-2">Bid Amount</th>
                          <th className="text-right py-2 px-2">Committed</th>
                          <th className="text-right py-2 px-2">Actual</th>
                          <th className="text-right py-2 px-2">Variance</th>
                          <th className="text-center py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidVsActual.lineItems.map((item: any) => {
                          const variance = (item.bidAmount || 0) - (item.actual || 0);
                          const isEditing = editingItem === item._id;
                          return (
                            <tr key={item._id} className="border-b border-border/50 hover:bg-secondary/30">
                              <td className="py-2 px-2 text-xs text-muted-foreground font-mono">{item.costCode || "—"}</td>
                              <td className="py-2 px-2 font-medium max-w-[200px] truncate">{item.description}</td>
                              <td className="py-2 px-2">
                                <Badge variant="outline" className="text-[10px]">{item.category || "—"}</Badge>
                              </td>
                              <td className="py-2 px-2 text-right text-muted-foreground">
                                {item.quantity ? `${item.quantity} ${item.unit || ""}` : "LS"}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-blue-400">{fmt(item.bidAmount)}</td>
                              <td className="py-2 px-2 text-right">
                                {isEditing ? (
                                  <input className="w-20 bg-secondary border border-border rounded px-1 py-0.5 text-right text-xs" value={editValues.committed} onChange={e => setEditValues(v => ({ ...v, committed: e.target.value }))} />
                                ) : (
                                  <span className="text-yellow-400">{item.committed ? fmt(item.committed) : "—"}</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right">
                                {isEditing ? (
                                  <input className="w-20 bg-secondary border border-border rounded px-1 py-0.5 text-right text-xs" value={editValues.actual} onChange={e => setEditValues(v => ({ ...v, actual: e.target.value }))} />
                                ) : (
                                  <span className="text-orange-400">{item.actual ? fmt(item.actual) : "—"}</span>
                                )}
                              </td>
                              <td className={`py-2 px-2 text-right font-medium ${variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {item.actual ? fmt(variance) : "—"}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {isEditing ? (
                                  <div className="flex gap-1 justify-center">
                                    <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => handleSaveEdit(item._id)}>Save</Button>
                                    <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => setEditingItem(null)}>✕</Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => {
                                    setEditingItem(item._id);
                                    setEditValues({ committed: item.committed?.toString() || "", actual: item.actual?.toString() || "", notes: item.notes || "" });
                                  }}>✏️</Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-bold">
                          <td colSpan={4} className="py-2 px-2">TOTALS</td>
                          <td className="py-2 px-2 text-right text-blue-400">{fmt(bidVsActual.totalBid)}</td>
                          <td className="py-2 px-2 text-right text-yellow-400">{fmt(bidVsActual.totalCommitted)}</td>
                          <td className="py-2 px-2 text-right text-orange-400">{fmt(bidVsActual.totalActual)}</td>
                          <td className={`py-2 px-2 text-right ${bidVsActual.totalVariance >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {fmt(bidVsActual.totalVariance)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── DOCUMENTS ── */}
          {viewMode === "documents" && (
            <div className="space-y-4">
              {/* Upload cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DOC_TYPES.map(dt => {
                  const existing = (documents ?? []).filter(d => d.type === dt.value);
                  return (
                    <Card key={dt.value} className="bg-card border-border">
                      <CardContent className="p-4">
                        <h3 className="font-bold text-sm mb-1">{dt.label}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{dt.desc}</p>

                        {existing.map(doc => (
                          <div key={doc._id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-2 mb-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{doc.fileName}</div>
                              <Badge variant={doc.status === "extracted" ? "default" : doc.status === "failed" ? "destructive" : "outline"} className="text-[10px] mt-1">
                                {doc.status === "extracted" ? "✅ Extracted" : doc.status === "processing" ? "🔄 Processing..." : doc.status === "failed" ? "❌ Failed" : "📤 Uploaded"}
                              </Badge>
                            </div>
                            <div className="flex gap-1 ml-2">
                              {doc.status === "uploaded" || doc.status === "failed" ? (
                                <Button size="sm" variant="outline" className="text-[10px] h-6 px-2"
                                  disabled={extracting === doc._id}
                                  onClick={async () => {
                                    setExtracting(doc._id);
                                    try {
                                      const r = await extractBidData({ documentId: doc._id });
                                      toast(`Extracted ${r.itemCount} items`, "success");
                                    } catch (e: any) { toast(e.message, "error"); }
                                    setExtracting(null);
                                  }}
                                >
                                  {extracting === doc._id ? "..." : "🧠 Extract"}
                                </Button>
                              ) : null}
                              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 text-red-400"
                                onClick={() => { deleteDocument({ id: doc._id }); toast("Deleted", "success"); }}
                              >🗑️</Button>
                            </div>
                          </div>
                        ))}

                        <label className={`block w-full text-center py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors ${uploading ? "opacity-50" : ""}`}>
                          <span className="text-sm">{uploading ? "Uploading..." : "📎 Drop or click to upload"}</span>
                          <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.doc,.docx" disabled={uploading}
                            onChange={(e) => handleUpload(e, dt.value)}
                          />
                        </label>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Extraction results */}
              {(documents ?? []).some(d => d.status === "extracted" && d.extractedData) && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-sm mb-3">🧠 AI Extraction Summary</h3>
                    {(documents ?? []).filter(d => d.status === "extracted" && d.extractedData).map(doc => {
                      const data = doc.extractedData as any;
                      return (
                        <div key={doc._id} className="bg-secondary/30 rounded-lg p-3 mb-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{doc.type.replace(/_/g, " ")}</Badge>
                            <span className="text-sm font-medium">{doc.fileName}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {data.contractValue && <div><span className="text-muted-foreground">Contract Value:</span> <span className="font-bold text-green-400">{fmt(data.contractValue)}</span></div>}
                            {data.projectName && <div><span className="text-muted-foreground">Project:</span> {data.projectName}</div>}
                            {data.contractor && <div><span className="text-muted-foreground">Contractor:</span> {data.contractor}</div>}
                            {data.duration && <div><span className="text-muted-foreground">Duration:</span> {data.duration}</div>}
                            {data.retainage && <div><span className="text-muted-foreground">Retainage:</span> {data.retainage}</div>}
                            {data.lineItems && <div><span className="text-muted-foreground">Line Items:</span> <span className="font-bold">{data.lineItems.length}</span></div>}
                          </div>
                          {data.scope && <p className="text-xs text-muted-foreground mt-2 italic">{data.scope}</p>}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BidTrackerPage() {
  return <AppShell><BidTrackerContent /></AppShell>;
}
