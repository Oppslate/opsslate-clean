
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { Badge } from "@opsslate/suite-ui/badge";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import Link from "next/link";

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

const DOC_TEMPLATES = [
  { value: "notice_delay", label: "📅 Notice of Delay", desc: "Formally notify of a delay event" },
  { value: "change_order_dispute", label: "🔄 Change Order Dispute", desc: "Dispute a rejected/undervalued CO" },
  { value: "lien_notice", label: "🔗 Preliminary Lien Notice", desc: "Protect your lien rights" },
  { value: "backcharge_notice", label: "💸 Backcharge Notice", desc: "Notify sub of defective work" },
  { value: "stop_work", label: "🛑 Stop Work Notice", desc: "Formal work stoppage notification" },
  { value: "demand_payment", label: "💰 Demand for Payment", desc: "Demand letter for unpaid invoices" },
  { value: "cure_notice", label: "⚠️ Notice to Cure", desc: "Demand correction of breach" },
  { value: "claim_letter", label: "📋 Claim Letter", desc: "Formal claim for compensation/time" },
  { value: "rfi_escalation", label: "❓ RFI Escalation", desc: "Escalate unanswered RFIs" },
  { value: "substantial_completion", label: "✅ Substantial Completion", desc: "Notify of substantial completion" },
];

const CODE_TYPES = [
  { value: "ibc", label: "🏗️ IBC — Building Code" },
  { value: "irc", label: "🏠 IRC — Residential Code" },
  { value: "nec", label: "⚡ NEC — Electrical Code" },
  { value: "nfpa", label: "🔥 NFPA — Fire Code" },
  { value: "ipc", label: "🚰 IPC — Plumbing Code" },
  { value: "imc", label: "🌀 IMC — Mechanical Code" },
  { value: "ada", label: "♿ ADA — Accessibility" },
  { value: "osha", label: "🦺 OSHA — Safety" },
  { value: "iecc", label: "🌱 IECC — Energy Code" },
];

function Content() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as any[] | undefined;

  const askLegal = useAction(api.legalAI.askLegal as any);
  const generateDocument = useAction(api.legalAI.generateDocument as any);
  const checkCode = useAction(api.legalAI.checkCode as any);

  const [tab, setTab] = useState<"lawyer" | "documents" | "codes">("lawyer");
  const [state, setState] = useState("New York");
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(false);

  // Lawyer state
  const [question, setQuestion] = useState("");
  const [legalResult, setLegalResult] = useState<any>(null);
  const [legalHistory, setLegalHistory] = useState<Array<{ q: string; r: any }>>([]);

  // Document state
  const [docTemplate, setDocTemplate] = useState("notice_delay");
  const [docDetails, setDocDetails] = useState("");
  const [docParties, setDocParties] = useState("");
  const [docResult, setDocResult] = useState<any>(null);

  // Code state
  const [codeQuery, setCodeQuery] = useState("");
  const [codeType, setCodeType] = useState("ibc");
  const [occupancy, setOccupancy] = useState("");
  const [codeResult, setCodeResult] = useState<any>(null);

  const handleAskLegal = async () => {
    if (!question.trim() || !user) return;
    setLoading(true);
    setLegalResult(null);
    try {
      const result = await askLegal({
        companyId: user.companyId,
        projectId: selectedProject || undefined,
        question,
        state,
      });
      setLegalResult(result);
      setLegalHistory(prev => [{ q: question, r: result }, ...prev]);
    } catch (e: any) {
      setLegalResult({ summary: "Error: " + (e.message || "Something went wrong"), analysis: "", relevantLaws: [], recommendedActions: [], risks: [] });
    }
    setLoading(false);
  };

  const handleGenerateDoc = async () => {
    if (!docDetails.trim()) return;
    setLoading(true);
    setDocResult(null);
    try {
      const projectName = selectedProject ? (projects ?? []).find((p: any) => String(p._id) === selectedProject)?.name : undefined;
      const result = await generateDocument({
        templateType: docTemplate,
        details: docDetails,
        state,
        projectName: projectName ? String(projectName) : undefined,
        parties: docParties || undefined,
      });
      setDocResult(result);
    } catch (e: any) {
      setDocResult({ title: "Error", document: e.message || "Something went wrong", instructions: [], warnings: [] });
    }
    setLoading(false);
  };

  const handleCheckCode = async () => {
    if (!codeQuery.trim()) return;
    setLoading(true);
    setCodeResult(null);
    try {
      const result = await checkCode({
        query: codeQuery,
        codeType,
        state,
        occupancyType: occupancy || undefined,
      });
      setCodeResult(result);
    } catch (e: any) {
      setCodeResult({ summary: "Error: " + (e.message || "Something went wrong"), relevantCodes: [], requirements: [] });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold">⚖️ Legal & Compliance</h1>
        <p className="text-sm text-muted-foreground">AI construction lawyer, document generator, and building code checker</p>
      </div>

      {/* Global Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={state} onChange={e => setState(e.target.value)}>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
          <option value="">No Project</option>
          {(projects ?? []).map((p: any) => <option key={String(p._id)} value={String(p._id)}>{String(p.name)}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={tab === "lawyer" ? "default" : "outline"} onClick={() => setTab("lawyer")}>🤖 AI Lawyer</Button>
        <Button variant={tab === "documents" ? "default" : "outline"} onClick={() => setTab("documents")}>📄 Documents</Button>
        <Button variant={tab === "codes" ? "default" : "outline"} onClick={() => setTab("codes")}>📋 Code Checker</Button>
      </div>

      {/* ═══ AI LAWYER TAB ═══ */}
      {tab === "lawyer" && (
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">🤖 Ask the AI Construction Lawyer</h3>
              <Textarea
                rows={4}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Describe your situation... e.g., 'The GC is withholding $45,000 in retainage past the contract deadline. We completed all punch list items 30 days ago. What are our options?'"
                className="mb-3"
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">⚖️ AI guidance, not legal advice. Consult a licensed attorney for legal decisions.</p>
                <Button disabled={!question.trim() || loading} className="bg-gradient-to-r from-purple-600 to-blue-600" onClick={handleAskLegal}>
                  {loading ? "🔄 Analyzing..." : "⚖️ Get Legal Analysis"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && tab === "lawyer" && (
            <div className="text-center py-8">
              <div className="text-4xl animate-pulse mb-2">⚖️</div>
              <p className="text-sm text-muted-foreground">Analyzing your situation against construction law...</p>
            </div>
          )}

          {legalResult && !loading && (
            <>
              {/* Summary */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-bold mb-2">📋 Summary</h3>
                  <p className="text-sm">{legalResult.summary}</p>
                </CardContent>
              </Card>

              {/* Analysis */}
              {legalResult.analysis && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-2">🔍 Detailed Analysis</h3>
                    <p className="text-sm whitespace-pre-wrap">{legalResult.analysis}</p>
                  </CardContent>
                </Card>
              )}

              {/* Relevant Laws */}
              {legalResult.relevantLaws?.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-3">📚 Relevant Laws & Statutes</h3>
                    <div className="space-y-2">
                      {legalResult.relevantLaws.map((law: any, i: number) => (
                        <div key={i} className="p-3 bg-secondary/30 rounded-lg border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{law.name}</span>
                            {law.reference && <Badge variant="outline" className="text-[10px]">{law.reference}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{law.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommended Actions */}
              {legalResult.recommendedActions?.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-3">🎯 Recommended Actions</h3>
                    <div className="space-y-2">
                      {legalResult.recommendedActions.map((a: any, i: number) => (
                        <div key={i} className="flex gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                          <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">{a.priority || i + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{a.action}</p>
                            {a.reason && <p className="text-xs text-muted-foreground">{a.reason}</p>}
                            {a.deadline && <Badge variant="destructive" className="text-[10px] mt-1">⏰ {a.deadline}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Documents Needed */}
                {legalResult.documentsNeeded?.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-2">📄 Documents You Need</h3>
                      <ul className="space-y-1">
                        {legalResult.documentsNeeded.map((d: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2"><span>📎</span>{d}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Risks */}
                {legalResult.risks?.length > 0 && (
                  <Card className="bg-red-500/5 border-red-500/30">
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-2 text-red-400">⚠️ Risks to Consider</h3>
                      <ul className="space-y-1">
                        {legalResult.risks.map((r: string, i: number) => (
                          <li key={i} className="text-sm text-red-300 flex gap-2"><span>•</span>{r}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Exposure & Attorney */}
              <div className="flex gap-4 flex-wrap">
                {legalResult.estimatedExposure && (
                  <Card className="bg-card border-border flex-1 min-w-[200px]">
                    <CardContent className="p-4 text-center">
                      <div className="text-xs text-muted-foreground">Estimated Exposure</div>
                      <div className="text-xl font-bold text-yellow-400">{legalResult.estimatedExposure}</div>
                    </CardContent>
                  </Card>
                )}
                {legalResult.needsAttorney && (
                  <Card className="bg-orange-500/10 border-orange-500/30 flex-1 min-w-[200px]">
                    <CardContent className="p-4">
                      <div className="font-bold text-orange-400 mb-1">👨‍⚖️ Attorney Recommended</div>
                      <p className="text-xs">{legalResult.attorneyReason}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* History */}
          {legalHistory.length > 1 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold mb-2">📜 Previous Questions</h3>
                <div className="space-y-2">
                  {legalHistory.slice(1).map((h, i) => (
                    <div key={i} className="p-2 bg-secondary/20 rounded-lg cursor-pointer hover:bg-secondary/40" onClick={() => { setLegalResult(h.r); setQuestion(h.q); }}>
                      <p className="text-sm truncate">{h.q}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══ DOCUMENT GENERATOR TAB ═══ */}
      {tab === "documents" && (
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">📄 Construction Document Generator</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Document Template</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={docTemplate} onChange={e => setDocTemplate(e.target.value)}>
                    {DOC_TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Parties Involved</label>
                  <Input value={docParties} onChange={e => setDocParties(e.target.value)} placeholder="e.g., ABC Construction (GC) → XYZ Electric (Sub)" />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-xs font-medium mb-1 block">Situation Details</label>
                <Textarea rows={4} value={docDetails} onChange={e => setDocDetails(e.target.value)}
                  placeholder="Describe the situation in detail... e.g., 'Subcontractor has not been paid for Invoice #1234 dated January 15, totaling $87,500. Payment was due within 30 days per contract Section 9.3. We have sent two follow-up emails with no response.'"
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">📄 Have all documents reviewed by legal counsel before sending.</p>
                <Button disabled={!docDetails.trim() || loading} className="bg-gradient-to-r from-green-600 to-blue-600" onClick={handleGenerateDoc}>
                  {loading ? "🔄 Drafting..." : "📄 Generate Document"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && tab === "documents" && (
            <div className="text-center py-8">
              <div className="text-4xl animate-pulse mb-2">📄</div>
              <p className="text-sm text-muted-foreground">Drafting your document...</p>
            </div>
          )}

          {docResult && !loading && (
            <>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">{docResult.title || "Generated Document"}</h3>
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(docResult.document || "");
                      alert("Document copied to clipboard!");
                    }}>📋 Copy</Button>
                  </div>
                  <pre className="whitespace-pre-wrap bg-secondary/30 rounded-lg border border-border p-4 text-sm max-h-[60vh] overflow-auto font-mono">{docResult.document}</pre>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docResult.instructions?.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-2">📋 Instructions</h3>
                      <ul className="space-y-1">
                        {docResult.instructions.map((inst: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2"><span className="text-blue-400">•</span>{inst}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {docResult.warnings?.length > 0 && (
                  <Card className="bg-yellow-500/5 border-yellow-500/30">
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-2 text-yellow-400">⚠️ Warnings</h3>
                      <ul className="space-y-1">
                        {docResult.warnings.map((w: string, i: number) => (
                          <li key={i} className="text-sm text-yellow-300 flex gap-2"><span>•</span>{w}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
              {docResult.sendVia && (
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <span className="text-sm">📬 Recommended delivery: <strong>{docResult.sendVia}</strong></span>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Template Quick Reference */}
          {!docResult && !loading && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {DOC_TEMPLATES.map(t => (
                <Card key={t.value} className={`bg-card border-border cursor-pointer hover:border-primary/50 transition-all ${docTemplate === t.value ? "border-primary/50 bg-primary/5" : ""}`} onClick={() => setDocTemplate(t.value)}>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg mb-1">{t.label.split(" ")[0]}</div>
                    <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ CODE CHECKER TAB ═══ */}
      {tab === "codes" && (
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">📋 Building Code Checker</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Code Type</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={codeType} onChange={e => setCodeType(e.target.value)}>
                    {CODE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Occupancy Type (optional)</label>
                  <Input value={occupancy} onChange={e => setOccupancy(e.target.value)} placeholder="e.g., Assembly, Business, Residential" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">State</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={state} onChange={e => setState(e.target.value)}>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="text-xs font-medium mb-1 block">What do you need to check?</label>
                <Textarea rows={3} value={codeQuery} onChange={e => setCodeQuery(e.target.value)}
                  placeholder="e.g., 'What are the egress requirements for a 5,000 sq ft commercial office space?' or 'Installing a commercial kitchen exhaust — what codes apply?'"
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">📋 Always verify with your local building department.</p>
                <Button disabled={!codeQuery.trim() || loading} className="bg-gradient-to-r from-orange-600 to-red-600" onClick={handleCheckCode}>
                  {loading ? "🔄 Checking..." : "📋 Check Codes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && tab === "codes" && (
            <div className="text-center py-8">
              <div className="text-4xl animate-pulse mb-2">📋</div>
              <p className="text-sm text-muted-foreground">Searching building codes...</p>
            </div>
          )}

          {codeResult && !loading && (
            <>
              {/* Summary */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-bold mb-2">📋 Summary</h3>
                  <p className="text-sm">{codeResult.summary}</p>
                </CardContent>
              </Card>

              {/* Relevant Codes */}
              {codeResult.relevantCodes?.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-3">📚 Relevant Code Sections</h3>
                    <div className="space-y-3">
                      {codeResult.relevantCodes.map((code: any, i: number) => (
                        <div key={i} className="p-3 bg-secondary/30 rounded-lg border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs text-blue-400">{code.code}</Badge>
                            <span className="font-medium text-sm">§{code.section}</span>
                          </div>
                          <p className="text-sm font-medium mb-1">{code.requirement}</p>
                          {code.details && <p className="text-xs text-muted-foreground">{code.details}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Requirements */}
              {codeResult.requirements?.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-3">✅ Requirements</h3>
                    <div className="space-y-2">
                      {codeResult.requirements.map((req: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-2 bg-secondary/20 rounded-lg">
                          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{req.category}</Badge>
                          <div className="flex-1">
                            <p className="text-sm">{req.requirement}</p>
                            {req.reference && <p className="text-[10px] text-muted-foreground">{req.reference}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inspection Checklist */}
                {codeResult.inspectionChecklist?.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-2">🔍 Inspection Checklist</h3>
                      <ul className="space-y-1">
                        {codeResult.inspectionChecklist.map((item: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2"><span>☐</span>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Common Violations */}
                {codeResult.commonViolations?.length > 0 && (
                  <Card className="bg-red-500/5 border-red-500/30">
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-2 text-red-400">🚫 Common Violations</h3>
                      <ul className="space-y-1">
                        {codeResult.commonViolations.map((v: string, i: number) => (
                          <li key={i} className="text-sm text-red-300 flex gap-2"><span>•</span>{v}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tips */}
              {codeResult.tips?.length > 0 && (
                <Card className="bg-green-500/5 border-green-500/30">
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-2 text-green-400">💡 Pro Tips</h3>
                    <ul className="space-y-1">
                      {codeResult.tips.map((tip: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2"><span>✅</span>{tip}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Quick Code Reference */}
          {!codeResult && !loading && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {CODE_TYPES.map(c => (
                <Card key={c.value} className={`bg-card border-border cursor-pointer hover:border-primary/50 transition-all ${codeType === c.value ? "border-primary/50 bg-primary/5" : ""}`} onClick={() => setCodeType(c.value)}>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg mb-1">{c.label.split(" ")[0]}</div>
                    <div className="text-[10px] text-muted-foreground">{c.label.split("—")[1]?.trim()}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LegalPage() {
  return <AppShell><Content /></AppShell>;
}
