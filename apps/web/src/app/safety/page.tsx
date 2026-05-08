"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const INCIDENT_TYPES = ["Injury", "Near Miss", "Property Damage", "Environmental", "Fire", "Electrical", "Fall", "Struck By", "Caught In/Between", "Vehicle", "Chemical Exposure", "Other"];
const SEVERITIES = ["Fatal", "Critical", "Serious", "Minor", "Near Miss"];
const INJURY_TYPES = ["Laceration", "Fracture", "Burn", "Sprain/Strain", "Contusion", "Amputation", "Eye Injury", "Inhalation", "Electric Shock", "Heat Stroke", "Concussion", "Other"];
const BODY_PARTS = ["Head", "Face", "Eyes", "Neck", "Shoulder", "Arm", "Hand/Fingers", "Back", "Chest", "Abdomen", "Hip", "Leg", "Knee", "Foot/Toes", "Multiple"];
const ROOT_CAUSES = ["Unsafe Act", "Unsafe Condition", "Lack of Training", "Equipment Failure", "Housekeeping", "PPE Not Used", "PPE Inadequate", "Fatigue", "Weather", "Improper Procedure", "Lack of Supervision", "Communication Failure"];
const RISK_LEVELS = ["Extreme", "High", "Medium", "Low"];
const LIKELIHOODS = ["Almost Certain", "Likely", "Possible", "Unlikely", "Rare"];
const CONSEQUENCES = ["Catastrophic", "Major", "Moderate", "Minor", "Insignificant"];

interface ActionItem { action: string; assignedTo?: string; dueDate?: string; status: string; completedDate?: string }
interface Witness { name: string; company?: string; statement?: string }

function sevColor(s: string): "destructive" | "default" | "secondary" | "outline" {
  if (s === "Fatal" || s === "Critical") return "destructive";
  if (s === "Serious") return "default";
  if (s === "Minor") return "secondary";
  return "outline";
}

function riskColor(r?: string) {
  if (r === "Extreme") return "bg-red-500/20 border-red-500 text-red-400";
  if (r === "High") return "bg-orange-500/20 border-orange-500 text-orange-400";
  if (r === "Medium") return "bg-yellow-500/20 border-yellow-500 text-yellow-400";
  return "bg-green-500/20 border-green-500 text-green-400";
}

// ── Action Items Editor ──
function ActionEditor({ label, items, onChange, showDueDate }: {
  label: string; items: ActionItem[]; onChange: (items: ActionItem[]) => void; showDueDate?: boolean;
}) {
  const add = () => onChange([...items, { action: "", status: "Open" }]);
  const update = (i: number, field: string, val: string) => {
    const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n);
  };
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const toggle = (i: number) => {
    const n = [...items];
    n[i] = { ...n[i], status: n[i].status === "Complete" ? "Open" : "Complete", completedDate: n[i].status !== "Complete" ? new Date().toISOString().slice(0, 10) : undefined };
    onChange(n);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold">{label}</h4>
        <Button size="sm" variant="outline" onClick={add}>+ Add</Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-2 items-start">
          <button className={`mt-1 w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 ${item.status === "Complete" ? "bg-green-500 border-green-500 text-white" : "border-border"}`} onClick={() => toggle(i)}>
            {item.status === "Complete" ? "✓" : ""}
          </button>
          <Input className="flex-1" placeholder="Action required..." value={item.action} onChange={(e) => update(i, "action", e.target.value)} />
          <Input className="w-32" placeholder="Assigned to" value={item.assignedTo ?? ""} onChange={(e) => update(i, "assignedTo", e.target.value)} />
          {showDueDate && (
            <Input type="date" className="w-36 cursor-pointer" value={item.dueDate ?? ""} onChange={(e) => update(i, "dueDate", e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
          )}
          <Button size="sm" variant="destructive" onClick={() => remove(i)}>✕</Button>
        </div>
      ))}
    </div>
  );
}

// ── Comment Thread ──
function CommentThread({ incidentId, userName }: { incidentId: Id<"incidents">; userName: string }) {
  const comments = useQuery(api.incidents.listComments, { incidentId });
  const addComment = useMutation(api.incidents.addComment);
  const [text, setText] = useState("");
  const handleSend = async () => {
    if (!text.trim()) return;
    await addComment({ incidentId, author: userName, text: text.trim() });
    setText("");
  };
  return (
    <div>
      <h4 className="text-xs font-bold text-primary mb-2">INVESTIGATION LOG ({String(comments?.length ?? 0)})</h4>
      <div className="space-y-2 max-h-48 overflow-auto mb-3">
        {(comments ?? []).map((c) => (
          <div key={c._id} className={`text-sm rounded-lg px-3 py-2 ${c.type === "system" ? "bg-secondary/30 text-muted-foreground italic" : "bg-secondary/50"}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-xs">{c.author}</span>
              <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap">{c.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add investigation note..." onKeyDown={(e) => e.key === "Enter" && handleSend()} />
        <Button size="sm" disabled={!text.trim()} onClick={handleSend}>Send</Button>
      </div>
    </div>
  );
}

// ── Create/Edit Form ──
function IncidentForm({ onClose, existing, defaultProjectId }: {
  onClose: () => void; existing?: Record<string, unknown>; defaultProjectId?: string;
}) {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const createInc = useMutation(api.incidents.create);
  const updateInc = useMutation(api.incidents.update);
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState((existing?.projectId as string) ?? defaultProjectId ?? "");
  const [title, setTitle] = useState((existing?.title as string) ?? "");
  const [type, setType] = useState((existing?.type as string) ?? "");
  const [severity, setSeverity] = useState((existing?.severity as string) ?? "Minor");
  const [date, setDate] = useState((existing?.date as string) ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState((existing?.time as string) ?? "");
  const [location, setLocation] = useState((existing?.location as string) ?? "");
  const [description, setDescription] = useState((existing?.description as string) ?? "");
  // Person
  const [injuredPerson, setInjuredPerson] = useState((existing?.injuredPerson as string) ?? "");
  const [injuredRole, setInjuredRole] = useState((existing?.injuredPersonRole as string) ?? "");
  const [injuredCompany, setInjuredCompany] = useState((existing?.injuredPersonCompany as string) ?? "");
  const [injuryType, setInjuryType] = useState((existing?.injuryType as string) ?? "");
  const [bodyPart, setBodyPart] = useState((existing?.bodyPart as string) ?? "");
  const [treatment, setTreatment] = useState((existing?.treatmentGiven as string) ?? "");
  const [hospital, setHospital] = useState((existing?.hospitalTransport as boolean) ?? false);
  // Witnesses
  const [witnesses, setWitnesses] = useState<Witness[]>((existing?.witnesses as Witness[]) ?? []);
  // Root cause
  const [rootCause, setRootCause] = useState((existing?.rootCause as string) ?? "");
  const [factors, setFactors] = useState<string[]>((existing?.contributingFactors as string[]) ?? []);
  // Risk
  const [riskLevel, setRiskLevel] = useState((existing?.riskLevel as string) ?? "");
  const [likelihood, setLikelihood] = useState((existing?.likelihoodOfRecurrence as string) ?? "");
  const [consequence, setConsequence] = useState((existing?.potentialConsequence as string) ?? "");
  // Actions
  const [immediateActions, setImmediateActions] = useState<ActionItem[]>((existing?.immediateActions as ActionItem[]) ?? []);
  const [correctiveActions, setCorrectiveActions] = useState<ActionItem[]>((existing?.correctiveActions as ActionItem[]) ?? []);
  const [preventiveActions, setPreventiveActions] = useState<ActionItem[]>((existing?.preventiveActions as ActionItem[]) ?? []);
  // OSHA
  const [oshaReportable, setOshaReportable] = useState((existing?.oshaReportable as boolean) ?? false);
  const [oshaRecord, setOshaRecord] = useState((existing?.oshaRecordNumber as string) ?? "");
  const [daysAway, setDaysAway] = useState<string>(existing?.daysAwayFromWork !== undefined ? String(existing.daysAwayFromWork) : "");
  const [restrictedDays, setRestrictedDays] = useState<string>(existing?.restrictedDutyDays !== undefined ? String(existing.restrictedDutyDays) : "");
  const [notes, setNotes] = useState((existing?.notes as string) ?? "");
  const [saving, setSaving] = useState(false);

  const toggleFactor = (f: string) => setFactors((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const handleSave = async () => {
    if (!title || !projectId || !type || !description) { toast("Fill required fields", "error"); return; }
    setSaving(true);
    try {
      const data: any = {
        title, type, severity, date, time: time || undefined, location: location || undefined, description,
        injuredPerson: injuredPerson || undefined, injuredPersonRole: injuredRole || undefined,
        injuredPersonCompany: injuredCompany || undefined, injuryType: injuryType || undefined,
        bodyPart: bodyPart || undefined, treatmentGiven: treatment || undefined,
        hospitalTransport: hospital || undefined,
        witnesses: witnesses.filter((w) => w.name).length ? witnesses.filter((w) => w.name) : undefined,
        rootCause: rootCause || undefined, contributingFactors: factors.length ? factors : undefined,
        riskLevel: riskLevel || undefined, likelihoodOfRecurrence: likelihood || undefined,
        potentialConsequence: consequence || undefined,
        immediateActions: immediateActions.filter((a) => a.action).length ? immediateActions.filter((a) => a.action) : undefined,
        correctiveActions: correctiveActions.filter((a) => a.action).length ? correctiveActions.filter((a) => a.action) : undefined,
        preventiveActions: preventiveActions.filter((a) => a.action).length ? preventiveActions.filter((a) => a.action) : undefined,
        oshaReportable: oshaReportable || undefined, oshaRecordNumber: oshaRecord || undefined,
        daysAwayFromWork: daysAway ? Number(daysAway) : undefined, restrictedDutyDays: restrictedDays ? Number(restrictedDays) : undefined,
        notes: notes || undefined,
      };
      if (existing) {
        await updateInc({ id: existing._id as Id<"incidents">, ...data });
        toast("Updated", "success");
      } else {
        await createInc({ companyId: user!.companyId, projectId: projectId as Id<"projects">, reportedBy: user!.name, ...data });
        toast("Incident reported", "success");
      }
      onClose();
    } catch (e) { toast("Error: " + (e as Error).message, "error"); }
    setSaving(false);
  };

  const totalSteps = 5;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-bold text-lg">{existing ? "Edit Incident" : "🚨 Report Incident"}</h3>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4,5].map((s) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-secondary"}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Step {step} of {totalSteps}: {["","Incident Details","Person & Injury","Root Cause & Risk","Response Actions","OSHA & Notes"][step]}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">x</button>
        </div>
        <div className="p-4 space-y-4">
          {/* Step 1: Details */}
          {step === 1 && (<>
            {!existing && (
              <div>
                <label className="text-sm font-semibold block mb-1">Project *</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Select project...</option>
                  {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div><label className="text-sm font-semibold block mb-1">Title *</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief incident title" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-semibold block mb-1">Type *</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">Select...</option>{INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1">Severity</label>
                <div className="flex gap-1">{SEVERITIES.map((s) => (
                  <button key={s} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${severity === s ? (s === "Fatal" || s === "Critical" ? "bg-red-500/30 border-red-500 text-red-300" : s === "Serious" ? "bg-orange-500/30 border-orange-500 text-orange-300" : s === "Minor" ? "bg-yellow-500/30 border-yellow-500 text-yellow-300" : "bg-blue-500/30 border-blue-500 text-blue-300") : "bg-secondary border-border"}`} onClick={() => setSeverity(s)}>{s}</button>
                ))}</div></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-semibold block mb-1">Date *</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" /></div>
              <div><label className="text-sm font-semibold block mb-1">Time</label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              <div><label className="text-sm font-semibold block mb-1">Location</label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Floor 3, scaffold" /></div>
            </div>
            <div><label className="text-sm font-semibold block mb-1">Description *</label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe exactly what happened..." /></div>
          </>)}

          {/* Step 2: Person & Injury */}
          {step === 2 && (<>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-sm font-bold text-red-400 mb-3">🏥 Injured Person</h4>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold block mb-1">Name</label><Input value={injuredPerson} onChange={(e) => setInjuredPerson(e.target.value)} /></div>
                <div><label className="text-xs font-semibold block mb-1">Role</label><Input value={injuredRole} onChange={(e) => setInjuredRole(e.target.value)} placeholder="Foreman, laborer..." /></div>
                <div><label className="text-xs font-semibold block mb-1">Company</label><Input value={injuredCompany} onChange={(e) => setInjuredCompany(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><label className="text-xs font-semibold block mb-1">Injury Type</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={injuryType} onChange={(e) => setInjuryType(e.target.value)}>
                    <option value="">Select...</option>{INJURY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-semibold block mb-1">Body Part</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)}>
                    <option value="">Select...</option>{BODY_PARTS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
              </div>
              <div className="mt-3"><label className="text-xs font-semibold block mb-1">Treatment Given</label><Textarea rows={2} value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="First aid, bandage, splint..." /></div>
              <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                <input type="checkbox" checked={hospital} onChange={(e) => setHospital(e.target.checked)} className="rounded" />
                <span className="font-semibold text-red-400">Hospital Transport Required</span>
              </label>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold">👁️ Witnesses</h4>
                <Button size="sm" variant="outline" onClick={() => setWitnesses([...witnesses, { name: "" }])}>+ Add</Button></div>
              {witnesses.map((w, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <Input placeholder="Name" value={w.name} onChange={(e) => { const n = [...witnesses]; n[i] = { ...w, name: e.target.value }; setWitnesses(n); }} />
                  <Input placeholder="Company" value={w.company ?? ""} onChange={(e) => { const n = [...witnesses]; n[i] = { ...w, company: e.target.value }; setWitnesses(n); }} />
                  <div className="flex gap-1"><Input placeholder="Statement" value={w.statement ?? ""} onChange={(e) => { const n = [...witnesses]; n[i] = { ...w, statement: e.target.value }; setWitnesses(n); }} />
                    <Button size="sm" variant="destructive" onClick={() => setWitnesses(witnesses.filter((_, j) => j !== i))}>✕</Button></div>
                </div>
              ))}
            </div>
          </>)}

          {/* Step 3: Root Cause & Risk Assessment */}
          {step === 3 && (<>
            <div><label className="text-sm font-semibold block mb-1">Root Cause</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={rootCause} onChange={(e) => setRootCause(e.target.value)}>
                <option value="">Select...</option>{ROOT_CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-sm font-semibold block mb-2">Contributing Factors</label>
              <div className="flex flex-wrap gap-2">{ROOT_CAUSES.map((f) => (
                <button key={f} className={`px-3 py-1 rounded-full text-xs border transition-colors ${factors.includes(f) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`} onClick={() => toggleFactor(f)}>{f}</button>
              ))}</div></div>
            <div className={`border rounded-lg p-4 ${riskColor(riskLevel)}`}>
              <h4 className="text-sm font-bold mb-3">⚠️ RISK ASSESSMENT MATRIX</h4>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs font-semibold block mb-1">Risk Level</label>
                  <select className="w-full bg-black/30 border border-current rounded-lg px-3 py-2 text-sm" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
                    <option value="">Assess...</option>{RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="text-xs font-semibold block mb-1">Likelihood of Recurrence</label>
                  <select className="w-full bg-black/30 border border-current rounded-lg px-3 py-2 text-sm" value={likelihood} onChange={(e) => setLikelihood(e.target.value)}>
                    <option value="">Assess...</option>{LIKELIHOODS.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
                <div><label className="text-xs font-semibold block mb-1">Potential Consequence</label>
                  <select className="w-full bg-black/30 border border-current rounded-lg px-3 py-2 text-sm" value={consequence} onChange={(e) => setConsequence(e.target.value)}>
                    <option value="">Assess...</option>{CONSEQUENCES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              {riskLevel && (
                <div className="mt-3 text-sm font-bold">
                  {riskLevel === "Extreme" && "🔴 STOP WORK — Immediate executive notification required"}
                  {riskLevel === "High" && "🟠 ESCALATE — Senior management review within 24 hours"}
                  {riskLevel === "Medium" && "🟡 MONITOR — Corrective action within 1 week"}
                  {riskLevel === "Low" && "🟢 TRACK — Standard follow-up procedures"}
                </div>
              )}
            </div>
          </>)}

          {/* Step 4: Response Path */}
          {step === 4 && (<>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <ActionEditor label="🚨 IMMEDIATE ACTIONS (within 1 hour)" items={immediateActions} onChange={setImmediateActions} />
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <ActionEditor label="🔧 CORRECTIVE ACTIONS (fix the problem)" items={correctiveActions} onChange={setCorrectiveActions} showDueDate />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <ActionEditor label="🛡️ PREVENTIVE ACTIONS (prevent recurrence)" items={preventiveActions} onChange={setPreventiveActions} showDueDate />
            </div>
          </>)}

          {/* Step 5: OSHA & Notes */}
          {step === 5 && (<>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-sm font-bold text-yellow-400 mb-3">📋 OSHA REPORTING</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                <input type="checkbox" checked={oshaReportable} onChange={(e) => setOshaReportable(e.target.checked)} className="rounded" />
                <span className="font-semibold">OSHA Reportable Incident</span>
              </label>
              {oshaReportable && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs font-semibold block mb-1">OSHA Record #</label><Input value={oshaRecord} onChange={(e) => setOshaRecord(e.target.value)} /></div>
                  <div><label className="text-xs font-semibold block mb-1">Days Away from Work</label><Input type="number" value={daysAway} onChange={(e) => setDaysAway(e.target.value)} /></div>
                  <div><label className="text-xs font-semibold block mb-1">Restricted Duty Days</label><Input type="number" value={restrictedDays} onChange={(e) => setRestrictedDays(e.target.value)} /></div>
                </div>
              )}
            </div>
            <div><label className="text-sm font-semibold block mb-1">Additional Notes</label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </>)}
        </div>
        <div className="p-4 border-t border-border flex justify-between sticky bottom-0 bg-card">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}>← Back</Button>}
          </div>
          <div className="flex gap-2">
            {step < totalSteps && <Button onClick={() => setStep(step + 1)}>Next →</Button>}
            {step === totalSteps && <Button disabled={saving} onClick={handleSave}>{saving ? "Saving..." : existing ? "Update" : "🚨 Submit Report"}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
function SafetyContent() {
  const { user } = useAuth();
  const [filterProject, setFilterProject] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useQuery(api.incidents.list, user ? {
    companyId: user.companyId, projectId: filterProject || undefined,
    severity: filterSeverity || undefined, status: filterStatus || undefined,
  } : "skip") as Array<Record<string, unknown>> | undefined;

  const stats = useQuery(api.incidents.stats, user ? { companyId: user.companyId, projectId: filterProject || undefined } : "skip");
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const closeInc = useMutation(api.incidents.closeIncident);
  const reopenInc = useMutation(api.incidents.reopenIncident);
  const removeInc = useMutation(api.incidents.remove);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => JSON.stringify(i).toLowerCase().includes(q));
  }, [items, search]);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Safety & Incidents</h1>
          <p className="text-muted-foreground text-sm">Incident reports, risk assessment, and critical response tracking</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditItem(null); setShowForm(true); }}>🚨 Report Incident</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className={`border-border ${stats.critical > 0 ? "bg-red-500/10 border-red-500/30" : "bg-card"}`}>
            <CardContent className="p-3">
              <div className="flex justify-between">
                <div><div className="text-2xl font-bold text-red-400">{stats.open}</div><div className="text-xs text-muted-foreground">Open Incidents</div></div>
                <div className="text-right"><div className="text-2xl font-bold text-red-600">{stats.critical}</div><div className="text-xs text-muted-foreground">Critical/Fatal</div></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.openActions}</div>
              <div className="text-xs text-muted-foreground">Open Actions</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex justify-between">
                <div><div className="text-2xl font-bold text-blue-400">{stats.nearMisses}</div><div className="text-xs text-muted-foreground">Near Misses</div></div>
                <div className="text-right"><div className="text-2xl font-bold text-orange-400">{stats.oshaReportable}</div><div className="text-xs text-muted-foreground">OSHA Reportable</div></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex justify-between">
                <div><div className="text-2xl font-bold text-green-400">{stats.closed}</div><div className="text-xs text-muted-foreground">Closed</div></div>
                <div className="text-right"><div className="text-2xl font-bold">{stats.totalDaysAway}</div><div className="text-xs text-muted-foreground">Days Away</div></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => { setEditItem(null); setShowForm(true); }} addLabel="Report Incident" onExport={() => {}}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>{(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
          <option value="">All Severities</option>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option><option value="Open">Open</option><option value="Under Investigation">Under Investigation</option><option value="Closed">Closed</option></select>
      </TableToolbar>

      {/* Incident cards */}
      <div className="space-y-3">
        {filtered.map((inc) => {
          const isExpanded = expandedId === (inc._id as string);
          return (
            <Card key={inc._id as string} className={`border-border ${(inc.severity as string) === "Fatal" || (inc.severity as string) === "Critical" ? "bg-red-500/5 border-red-500/30" : "bg-card"}`}>
              <div className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => setExpandedId(isExpanded ? null : (inc._id as string))}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-red-400">INC-{String(inc.number ?? "")}</span>
                    <span className="font-medium">{inc.title as string}</span>
                    <Badge variant="outline">{inc.projectName as string}</Badge>
                    <Badge variant={sevColor(inc.severity as string)}>{inc.severity as string}</Badge>
                    <Badge variant="outline">{inc.type as string}</Badge>
                    <Badge variant={(inc.status as string) === "Closed" ? "default" : "secondary"}>{inc.status as string}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{inc.date as string}</span>
                    {(inc.openActions as number) > 0 && <Badge variant="destructive">{String(inc.openActions)} open actions</Badge>}
                    {(inc.commentCount as number) > 0 && <span>💬 {String(inc.commentCount)}</span>}
                    <span>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Description */}
                  <div><h4 className="text-xs font-bold text-primary mb-1">DESCRIPTION</h4><p className="text-sm whitespace-pre-wrap">{inc.description as string}</p></div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><div className="text-xs text-muted-foreground">Time</div><div className="text-sm font-medium">{(inc.time as string) || "—"}</div></div>
                    <div><div className="text-xs text-muted-foreground">Location</div><div className="text-sm font-medium">{(inc.location as string) || "—"}</div></div>
                    <div><div className="text-xs text-muted-foreground">Reported By</div><div className="text-sm font-medium">{(inc.reportedBy as string) || "—"}</div></div>
                    <div><div className="text-xs text-muted-foreground">Root Cause</div><div className="text-sm font-medium">{(inc.rootCause as string) || "—"}</div></div>
                  </div>

                  {/* Injured Person */}
                  {Boolean(inc.injuredPerson) && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-red-400 mb-2">🏥 INJURED PERSON</h4>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> <strong>{inc.injuredPerson as string}</strong></div>
                        {Boolean(inc.injuredPersonRole) && <div><span className="text-muted-foreground">Role:</span> {inc.injuredPersonRole as string}</div>}
                        {Boolean(inc.injuryType) && <div><span className="text-muted-foreground">Injury:</span> {inc.injuryType as string}</div>}
                        {Boolean(inc.bodyPart) && <div><span className="text-muted-foreground">Body Part:</span> {inc.bodyPart as string}</div>}
                        {Boolean(inc.treatmentGiven) && <div className="col-span-2"><span className="text-muted-foreground">Treatment:</span> {inc.treatmentGiven as string}</div>}
                      </div>
                      {Boolean(inc.hospitalTransport) && <Badge variant="destructive" className="mt-2">🚑 HOSPITAL TRANSPORT</Badge>}
                    </div>
                  )}

                  {/* Risk Assessment */}
                  {Boolean(inc.riskLevel) && (
                    <div className={`border rounded-lg p-3 ${riskColor(inc.riskLevel as string)}`}>
                      <h4 className="text-xs font-bold mb-2">⚠️ RISK ASSESSMENT</h4>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><span className="opacity-70">Risk Level:</span> <strong>{inc.riskLevel as string}</strong></div>
                        <div><span className="opacity-70">Recurrence:</span> <strong>{(inc.likelihoodOfRecurrence as string) || "—"}</strong></div>
                        <div><span className="opacity-70">Consequence:</span> <strong>{(inc.potentialConsequence as string) || "—"}</strong></div>
                      </div>
                      <div className="mt-2 text-sm font-bold">
                        {(inc.riskLevel as string) === "Extreme" && "🔴 STOP WORK — Immediate executive notification required"}
                        {(inc.riskLevel as string) === "High" && "🟠 ESCALATE — Senior management review within 24 hours"}
                        {(inc.riskLevel as string) === "Medium" && "🟡 MONITOR — Corrective action within 1 week"}
                        {(inc.riskLevel as string) === "Low" && "🟢 TRACK — Standard follow-up procedures"}
                      </div>
                    </div>
                  )}

                  {/* Contributing Factors */}
                  {(inc.contributingFactors as string[])?.length > 0 && (
                    <div><h4 className="text-xs font-bold text-primary mb-1">CONTRIBUTING FACTORS</h4>
                      <div className="flex flex-wrap gap-1">{(inc.contributingFactors as string[]).map((f) => <Badge key={f} variant="outline">{f}</Badge>)}</div></div>
                  )}

                  {/* Response Actions */}
                  {((inc.immediateActions as ActionItem[])?.length > 0 || (inc.correctiveActions as ActionItem[])?.length > 0 || (inc.preventiveActions as ActionItem[])?.length > 0) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-primary">CRITICAL RESPONSE PATH</h4>
                      {(inc.immediateActions as ActionItem[])?.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <h5 className="text-xs font-bold text-red-400 mb-2">🚨 IMMEDIATE ({(inc.immediateActions as ActionItem[]).filter((a) => a.status === "Complete").length}/{(inc.immediateActions as ActionItem[]).length})</h5>
                          {(inc.immediateActions as ActionItem[]).map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm mb-1">
                              <span className={a.status === "Complete" ? "text-green-400" : "text-red-400"}>{a.status === "Complete" ? "✅" : "⬜"}</span>
                              <span className={a.status === "Complete" ? "line-through opacity-60" : ""}>{a.action}</span>
                              {a.assignedTo && <span className="text-xs text-muted-foreground">→ {a.assignedTo}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {(inc.correctiveActions as ActionItem[])?.length > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                          <h5 className="text-xs font-bold text-orange-400 mb-2">🔧 CORRECTIVE ({(inc.correctiveActions as ActionItem[]).filter((a) => a.status === "Complete").length}/{(inc.correctiveActions as ActionItem[]).length})</h5>
                          {(inc.correctiveActions as ActionItem[]).map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm mb-1">
                              <span className={a.status === "Complete" ? "text-green-400" : "text-orange-400"}>{a.status === "Complete" ? "✅" : "⬜"}</span>
                              <span className={a.status === "Complete" ? "line-through opacity-60" : ""}>{a.action}</span>
                              {a.assignedTo && <span className="text-xs text-muted-foreground">→ {a.assignedTo}</span>}
                              {a.dueDate && <span className="text-xs text-muted-foreground">by {a.dueDate}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {(inc.preventiveActions as ActionItem[])?.length > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <h5 className="text-xs font-bold text-blue-400 mb-2">🛡️ PREVENTIVE ({(inc.preventiveActions as ActionItem[]).filter((a: any) => a.status === "Complete").length}/{(inc.preventiveActions as ActionItem[]).length})</h5>
                          {(inc.preventiveActions as ActionItem[]).map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm mb-1">
                              <span className={a.status === "Complete" ? "text-green-400" : "text-blue-400"}>{a.status === "Complete" ? "✅" : "⬜"}</span>
                              <span className={a.status === "Complete" ? "line-through opacity-60" : ""}>{a.action}</span>
                              {a.assignedTo && <span className="text-xs text-muted-foreground">→ {a.assignedTo}</span>}
                              {a.dueDate && <span className="text-xs text-muted-foreground">by {a.dueDate}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* OSHA */}
                  {Boolean(inc.oshaReportable) && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-yellow-400 mb-2">📋 OSHA</h4>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        {Boolean(inc.oshaRecordNumber) && <div>Record #: <strong>{inc.oshaRecordNumber as string}</strong></div>}
                        <div>Days Away: <strong>{String(inc.daysAwayFromWork ?? 0)}</strong></div>
                        <div>Restricted Days: <strong>{String(inc.restrictedDutyDays ?? 0)}</strong></div>
                      </div>
                    </div>
                  )}

                  {/* Witnesses */}
                  {(inc.witnesses as Witness[])?.length > 0 && (
                    <div><h4 className="text-xs font-bold text-primary mb-1">WITNESSES</h4>
                      {(inc.witnesses as Witness[]).map((w, i) => (
                        <div key={i} className="text-sm mb-1">• <strong>{w.name}</strong>{w.company ? ` (${w.company})` : ""}{w.statement ? ` — "${w.statement}"` : ""}</div>
                      ))}
                    </div>
                  )}

                  {/* Comments */}
                  <CommentThread incidentId={inc._id as Id<"incidents">} userName={user!.name} />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {(inc.status as string) !== "Closed" ? (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => closeInc({ id: inc._id as Id<"incidents">, closedBy: user!.name }).then(() => toast("Incident closed", "success"))}>✅ Close Incident</Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => reopenInc({ id: inc._id as Id<"incidents">, reopenedBy: user!.name }).then(() => toast("Reopened", "success"))}>🔄 Reopen</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setEditItem(inc); setShowForm(true); }}>✎ Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => removeInc({ id: inc._id as Id<"incidents"> }).then(() => toast("Deleted", "success"))}>✕ Delete</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState icon="🦺" title="No incidents reported" description="Track safety incidents, near misses, and corrective actions. Zero incidents is the goal." actionLabel="🚨 Report Incident" onAction={() => { setEditItem(null); setShowForm(true); }} />
        )}
      </div>

      {showForm && (
        <IncidentForm onClose={() => { setShowForm(false); setEditItem(null); }} existing={editItem ?? undefined} defaultProjectId={filterProject || (projects?.[0]?._id ?? "")} />
      )}
    </div>
  );
}

export default function SafetyPage() { return <AppShell><SafetyContent /></AppShell>; }
