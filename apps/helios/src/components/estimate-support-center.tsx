"use client";

import {
  HELIOS_RFQ_STATUSES,
  HELIOS_RISK_CARRY_DECISIONS,
  HELIOS_RISK_CATEGORIES,
  HELIOS_RISK_DISPOSITIONS,
  HELIOS_RISK_SEVERITIES,
  HELIOS_SUBMITTAL_STATUSES,
  HELIOS_SUBMITTAL_TYPES,
  type HeliosEstimateEvidenceLink,
  type HeliosEstimateRfq,
  type HeliosEstimateRisk,
  type HeliosEstimateSubmittal,
  type HeliosEstimateSupportInput,
  type HeliosEstimateWorkspace,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@opsslate/suite-ui/dialog";
import { Input } from "@opsslate/suite-ui/input";
import { Label } from "@opsslate/suite-ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@opsslate/suite-ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { useToast } from "@opsslate/suite-ui/toast";
import { Check, FileCheck2, Pencil, Send, ShieldAlert, ShieldCheck, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function money(value?: number) {
  if (value === undefined) return "Not established";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Number(value);
}

function dollarsToCents(value: FormDataEntryValue | null) {
  const result = optionalNumber(value);
  return result === undefined ? undefined : Math.round(result * 100);
}

function lines(value: FormDataEntryValue | null) {
  return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function nextRfqStatus(status: HeliosEstimateRfq["status"]) {
  const order = HELIOS_RFQ_STATUSES;
  const index = order.indexOf(status);
  return index >= 0 && index < order.length - 1 ? order[index + 1] : undefined;
}

function nextSubmittalStatus(status: HeliosEstimateSubmittal["status"]) {
  const order = HELIOS_SUBMITTAL_STATUSES;
  const index = order.indexOf(status);
  return index >= 0 && index < order.length - 1 ? order[index + 1] : undefined;
}

function useSupportMutation(projectId: string, estimateId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  async function mutate(input: HeliosEstimateSupportInput, success: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/projects/" + projectId + "/estimate/" + estimateId + "/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Supporting record could not be saved.");
      toast(success);
      router.refresh();
      return true;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Supporting record could not be saved.");
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { mutate, saving };
}

export function EstimateSupportQuickActions({
  projectId,
  estimateId,
  costCodeId,
  hasRfq,
  hasSubmittal,
}: {
  projectId: string;
  estimateId: string;
  costCodeId: string;
  hasRfq: boolean;
  hasSubmittal: boolean;
}) {
  const { mutate, saving } = useSupportMutation(projectId, estimateId);
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size="sm" variant="outline" disabled={saving || hasRfq} onClick={() => mutate({ action: "generate_rfq", costCodeId }, "Evidence-backed RFQ draft created.")}>
        <ShoppingCart aria-hidden="true" />{hasRfq ? "RFQ drafted" : "Draft RFQ"}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={saving || hasSubmittal} onClick={() => mutate({ action: "generate_submittal", costCodeId }, "Linked submittal requirement created.")}>
        <FileCheck2 aria-hidden="true" />{hasSubmittal ? "Submittal added" : "Add submittal"}
      </Button>
    </div>
  );
}

export function EstimateSupportCenter({
  projectId,
  workspace,
  mode,
}: {
  projectId: string;
  workspace: HeliosEstimateWorkspace;
  mode: "evidence" | "procurement" | "risk";
}) {
  const { mutate, saving } = useSupportMutation(projectId, workspace.id);
  if (mode === "evidence") return <EvidenceMatrix workspace={workspace} mutate={mutate} saving={saving} />;
  if (mode === "procurement") return <ProcurementDesk workspace={workspace} mutate={mutate} saving={saving} />;
  return <RiskDesk workspace={workspace} mutate={mutate} saving={saving} />;
}

function EvidenceMatrix({
  workspace,
  mutate,
  saving,
}: {
  workspace: HeliosEstimateWorkspace;
  mutate: (input: HeliosEstimateSupportInput, success: string) => Promise<boolean>;
  saving: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [disputing, setDisputing] = useState<HeliosEstimateEvidenceLink | null>(null);
  const rows = useMemo(() => workspace.evidenceLinks.filter((link) => {
    const evidence = workspace.evidence.find((row) => row.id === link.evidenceId);
    const haystack = (link.recordLabel + " " + link.relationship + " " + (evidence?.documentName || "") + " " + (evidence?.excerpt || "")).toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (status === "all" || link.verificationStatus === status);
  }), [search, status, workspace.evidence, workspace.evidenceLinks]);
  const verified = workspace.evidenceLinks.filter((link) => link.verificationStatus === "verified").length;
  const disputed = workspace.evidenceLinks.filter((link) => link.verificationStatus === "disputed").length;
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <div><CardTitle>Evidence Matrix</CardTitle><CardDescription>Every citation remains linked to the exact estimate record it supports.</CardDescription></div>
        <div className="flex gap-2"><Badge variant="secondary">{verified} verified</Badge><Badge variant={disputed ? "destructive" : "outline"}>{disputed} disputed</Badge></div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input aria-label="Search evidence matrix" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search record, document, or evidence" />
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All verification states</SelectItem><SelectItem value="proposed">Needs verification</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="disputed">Disputed</SelectItem><SelectItem value="superseded">Superseded</SelectItem></SelectContent></Select>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Estimate record</TableHead><TableHead>Source evidence</TableHead><TableHead>Relationship</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Decision</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No evidence links match this review.</TableCell></TableRow> : rows.map((link) => {
                const evidence = workspace.evidence.find((row) => row.id === link.evidenceId);
                return (
                  <TableRow key={link.id}>
                    <TableCell className="min-w-64 whitespace-normal"><div className="font-medium">{link.recordLabel}</div><div className="text-xs capitalize text-muted-foreground">{link.recordType.replaceAll("_", " ")} · {link.origin}</div></TableCell>
                    <TableCell className="min-w-80 whitespace-normal"><div className="font-medium">{evidence?.documentName || "Project document"}{evidence?.pageNumber ? " · PDF page " + evidence.pageNumber : ""}</div><div className="mt-1 text-xs text-muted-foreground">{evidence?.locator}</div><div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{evidence?.excerpt}</div></TableCell>
                    <TableCell className="capitalize">{link.relationship}</TableCell>
                    <TableCell><Badge variant={link.verificationStatus === "disputed" ? "destructive" : link.verificationStatus === "verified" ? "secondary" : "outline"} className="capitalize">{link.verificationStatus}</Badge>{link.verifierName && <div className="mt-1 text-xs text-muted-foreground">{link.verifierName}</div>}</TableCell>
                    <TableCell><div className="flex justify-end gap-2"><Button size="sm" disabled={saving || link.verificationStatus === "verified"} onClick={() => mutate({ action: "verify_evidence", evidenceId: link.evidenceId, recordType: link.recordType, recordId: link.recordId }, "Evidence verified and recorded in history.")}><Check aria-hidden="true" />Verify</Button><Button size="sm" variant="outline" disabled={saving} onClick={() => setDisputing(link)}><ShieldAlert aria-hidden="true" />Dispute</Button></div></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={Boolean(disputing)} onOpenChange={(open) => { if (!open) setDisputing(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Dispute evidence link</DialogTitle><DialogDescription>The original citation is retained. Explain why it does not support this estimate record.</DialogDescription></DialogHeader>
          {disputing && <form action={async (form) => {
            const saved = await mutate({ action: "dispute_evidence", evidenceId: disputing.evidenceId, recordType: disputing.recordType, recordId: disputing.recordId, comment: String(form.get("comment") || "") }, "Evidence dispute recorded.");
            if (saved) setDisputing(null);
          }} className="space-y-3"><Label htmlFor="evidence-dispute">Reason</Label><Textarea id="evidence-dispute" name="comment" required /><DialogFooter><Button type="button" variant="outline" onClick={() => setDisputing(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={saving}>Record dispute</Button></DialogFooter></form>}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ProcurementDesk({
  workspace,
  mutate,
  saving,
}: {
  workspace: HeliosEstimateWorkspace;
  mutate: (input: HeliosEstimateSupportInput, success: string) => Promise<boolean>;
  saving: boolean;
}) {
  const [editingRfq, setEditingRfq] = useState<HeliosEstimateRfq | null>(null);
  const [editingSubmittal, setEditingSubmittal] = useState<HeliosEstimateSubmittal | null>(null);
  const [rejecting, setRejecting] = useState<{ type: "rfq" | "submittal"; id: string; label: string } | null>(null);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-1 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RFQ packages</div><div className="mt-1 text-2xl font-bold">{workspace.rfqs.length}</div></CardContent></Card>
        <Card className="gap-1 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quotes received</div><div className="mt-1 text-2xl font-bold">{workspace.rfqs.filter((rfq) => ["quote_received", "quote_accepted"].includes(rfq.status)).length}</div></CardContent></Card>
        <Card className="gap-1 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submittals</div><div className="mt-1 text-2xl font-bold">{workspace.submittals.length}</div></CardContent></Card>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-4"><div><CardTitle>RFQ register</CardTitle><CardDescription>Packages are generated from accepted cost-code scope and remain evidence-linked.</CardDescription></div></CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Package</TableHead><TableHead>Linked scope</TableHead><TableHead>Quote due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
            {workspace.rfqs.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No RFQ packages yet. Use Draft RFQ on an accepted cost code.</TableCell></TableRow> : workspace.rfqs.map((rfq) => {
              const next = nextRfqStatus(rfq.status);
              return <TableRow key={rfq.id}><TableCell className="min-w-64 whitespace-normal"><div className="font-medium">{rfq.title}</div><div className="text-xs text-muted-foreground">{rfq.packageNumber || "Package number not set"} · {rfq.evidenceIds.length} citations</div></TableCell><TableCell>{rfq.linkedCostCodeIds.length} cost code{rfq.linkedCostCodeIds.length === 1 ? "" : "s"}</TableCell><TableCell>{rfq.requiredQuoteDate || "Not set"}</TableCell><TableCell><Badge variant={rfq.status === "quote_accepted" ? "secondary" : "outline"} className="capitalize">{rfq.status.replaceAll("_", " ")}</Badge></TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingRfq(rfq)}><Pencil aria-hidden="true" />Edit</Button>{next && <Button size="sm" disabled={saving} onClick={() => mutate({ action: "set_rfq_status", rfqId: rfq.id, rfqStatus: next }, "RFQ advanced to " + next.replaceAll("_", " ") + ".")}><Send aria-hidden="true" />{next.replaceAll("_", " ")}</Button>}<Button size="sm" variant="destructive" onClick={() => setRejecting({ type: "rfq", id: rfq.id, label: rfq.title })}>Reject</Button></div></TableCell></TableRow>;
            })}
          </TableBody></Table></div>
        </CardContent>
      </Card>
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-4"><div><CardTitle>Submittal register</CardTitle><CardDescription>Requirements are authoritative linked records, not checkboxes.</CardDescription></div></CardHeader>
        <CardContent className="px-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Requirement</TableHead><TableHead>Specification</TableHead><TableHead>Responsibility</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
          {workspace.submittals.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No submittal requirements yet. Add one from an accepted cost code.</TableCell></TableRow> : workspace.submittals.map((submittal) => {
            const next = nextSubmittalStatus(submittal.status);
            return <TableRow key={submittal.id}><TableCell className="min-w-64 whitespace-normal"><div className="font-medium">{submittal.description}</div><div className="text-xs capitalize text-muted-foreground">{submittal.type.replaceAll("_", " ")} · {submittal.evidenceIds.length} citations</div></TableCell><TableCell>{submittal.specification || "Not established"}</TableCell><TableCell>{submittal.responsibility || "Unassigned"}</TableCell><TableCell><Badge variant={submittal.status === "accepted" ? "secondary" : "outline"} className="capitalize">{submittal.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingSubmittal(submittal)}><Pencil aria-hidden="true" />Edit</Button>{next && <Button size="sm" disabled={saving} onClick={() => mutate({ action: "set_submittal_status", submittalId: submittal.id, submittalStatus: next }, "Submittal advanced to " + next + ".")}><Check aria-hidden="true" />{next}</Button>}<Button size="sm" variant="destructive" onClick={() => setRejecting({ type: "submittal", id: submittal.id, label: submittal.description })}>Reject</Button></div></TableCell></TableRow>;
          })}
        </TableBody></Table></div></CardContent>
      </Card>
      <RfqDialog rfq={editingRfq} open={Boolean(editingRfq)} onOpenChange={(open) => { if (!open) setEditingRfq(null); }} saving={saving} onSave={async (input) => { const saved = await mutate(input, "RFQ package updated."); if (saved) setEditingRfq(null); }} />
      <SubmittalDialog submittal={editingSubmittal} open={Boolean(editingSubmittal)} onOpenChange={(open) => { if (!open) setEditingSubmittal(null); }} saving={saving} onSave={async (input) => { const saved = await mutate(input, "Submittal requirement updated."); if (saved) setEditingSubmittal(null); }} />
      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => { if (!open) setRejecting(null); }}><DialogContent><DialogHeader><DialogTitle>Reject {rejecting?.label}</DialogTitle><DialogDescription>The record remains in append-only history.</DialogDescription></DialogHeader>{rejecting && <form action={async (form) => { const input: HeliosEstimateSupportInput = rejecting.type === "rfq" ? { action: "reject_rfq", rfqId: rejecting.id, comment: String(form.get("comment") || "") } : { action: "reject_submittal", submittalId: rejecting.id, comment: String(form.get("comment") || "") }; const saved = await mutate(input, "Supporting record rejected."); if (saved) setRejecting(null); }} className="space-y-3"><Label htmlFor="support-rejection">Reason</Label><Textarea id="support-rejection" name="comment" required /><DialogFooter><Button type="button" variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={saving}>Confirm rejection</Button></DialogFooter></form>}</DialogContent></Dialog>
    </div>
  );
}

function RfqDialog({ rfq, open, onOpenChange, saving, onSave }: { rfq: HeliosEstimateRfq | null; open: boolean; onOpenChange: (open: boolean) => void; saving: boolean; onSave: (input: HeliosEstimateSupportInput) => Promise<void> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Edit RFQ package</DialogTitle><DialogDescription>Complete the scope before advancing it to Ready to Send.</DialogDescription></DialogHeader>{rfq && <form action={(form) => onSave({ action: "update_rfq", rfqId: rfq.id, rfq: { title: String(form.get("title") || ""), packageNumber: String(form.get("packageNumber") || "") || undefined, requiredQuoteDate: String(form.get("requiredQuoteDate") || "") || undefined, deliveryLocation: String(form.get("deliveryLocation") || "") || undefined, inclusions: lines(form.get("inclusions")), exclusions: lines(form.get("exclusions")), scheduleConstraints: lines(form.get("scheduleConstraints")), vendors: lines(form.get("vendors")) } })} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="rfq-title">Title</Label><Input id="rfq-title" name="title" defaultValue={rfq.title} required /></div><div className="space-y-2"><Label htmlFor="rfq-number">Package number</Label><Input id="rfq-number" name="packageNumber" defaultValue={rfq.packageNumber} /></div><div className="space-y-2"><Label htmlFor="rfq-date">Required quote date</Label><Input id="rfq-date" name="requiredQuoteDate" type="date" defaultValue={rfq.requiredQuoteDate} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="rfq-delivery">Delivery location</Label><Input id="rfq-delivery" name="deliveryLocation" defaultValue={rfq.deliveryLocation} /></div><div className="space-y-2"><Label htmlFor="rfq-inclusions">Inclusions, one per line</Label><Textarea id="rfq-inclusions" name="inclusions" defaultValue={rfq.inclusions.join("\n")} required /></div><div className="space-y-2"><Label htmlFor="rfq-exclusions">Exclusions, one per line</Label><Textarea id="rfq-exclusions" name="exclusions" defaultValue={rfq.exclusions.join("\n")} /></div><div className="space-y-2"><Label htmlFor="rfq-schedule">Schedule constraints</Label><Textarea id="rfq-schedule" name="scheduleConstraints" defaultValue={rfq.scheduleConstraints.join("\n")} /></div><div className="space-y-2"><Label htmlFor="rfq-vendors">Vendors, one per line</Label><Textarea id="rfq-vendors" name="vendors" defaultValue={rfq.vendors.join("\n")} /></div><DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>Save RFQ</Button></DialogFooter></form>}</DialogContent></Dialog>;
}

function SubmittalDialog({ submittal, open, onOpenChange, saving, onSave }: { submittal: HeliosEstimateSubmittal | null; open: boolean; onOpenChange: (open: boolean) => void; saving: boolean; onSave: (input: HeliosEstimateSupportInput) => Promise<void> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Edit submittal requirement</DialogTitle><DialogDescription>Timing, responsibility, predecessor, and evidence remain linked to accepted scope.</DialogDescription></DialogHeader>{submittal && <form action={(form) => onSave({ action: "update_submittal", submittalId: submittal.id, submittal: { type: String(form.get("type")) as HeliosEstimateSubmittal["type"], description: String(form.get("description") || ""), specification: String(form.get("specification") || "") || undefined, timing: String(form.get("timing") || "") || undefined, responsibility: String(form.get("responsibility") || "") || undefined, predecessor: String(form.get("predecessor") || "") || undefined, dueDate: String(form.get("dueDate") || "") || undefined } })} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Type</Label><Select name="type" defaultValue={submittal.type}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_SUBMITTAL_TYPES.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="submittal-spec">Specification</Label><Input id="submittal-spec" name="specification" defaultValue={submittal.specification} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="submittal-description">Description</Label><Input id="submittal-description" name="description" defaultValue={submittal.description} required /></div><div className="space-y-2"><Label htmlFor="submittal-timing">Timing</Label><Input id="submittal-timing" name="timing" defaultValue={submittal.timing} /></div><div className="space-y-2"><Label htmlFor="submittal-responsibility">Responsibility</Label><Input id="submittal-responsibility" name="responsibility" defaultValue={submittal.responsibility} /></div><div className="space-y-2"><Label htmlFor="submittal-predecessor">Predecessor</Label><Input id="submittal-predecessor" name="predecessor" defaultValue={submittal.predecessor} /></div><div className="space-y-2"><Label htmlFor="submittal-due">Due date</Label><Input id="submittal-due" name="dueDate" type="date" defaultValue={submittal.dueDate} /></div><DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>Save submittal</Button></DialogFooter></form>}</DialogContent></Dialog>;
}

function RiskDesk({
  workspace,
  mutate,
  saving,
}: {
  workspace: HeliosEstimateWorkspace;
  mutate: (input: HeliosEstimateSupportInput, success: string) => Promise<boolean>;
  saving: boolean;
}) {
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState("all");
  const [editing, setEditing] = useState<HeliosEstimateRisk | null>(null);
  const [rejecting, setRejecting] = useState<HeliosEstimateRisk | null>(null);
  const risks = workspace.risks.filter((risk) => risk.reviewStatus !== "rejected" && (!search || (risk.title + " " + risk.detail + " " + risk.owner).toLowerCase().includes(search.toLowerCase())) && (decision === "all" || risk.carryDecision === decision));
  const pending = workspace.risks.filter((risk) => risk.reviewStatus !== "rejected" && risk.carryDecision === "pending").length;
  const expected = workspace.risks.reduce((sum, risk) => sum + (risk.expectedExposureCents || 0), 0);
  const hasExpectedExposure = workspace.risks.some((risk) => risk.expectedExposureCents !== undefined);
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><Card className="gap-1 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open risks</div><div className="mt-1 text-2xl font-bold">{workspace.risks.filter((risk) => risk.disposition === "open").length}</div></CardContent></Card><Card className="gap-1 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Carry decision needed</div><div className="mt-1 text-2xl font-bold">{pending}</div></CardContent></Card><Card className="gap-1 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected exposure</div><div className="mt-1 text-2xl font-bold">{money(hasExpectedExposure ? expected : undefined)}</div></CardContent></Card></div>
    <div className="grid gap-3 md:grid-cols-[1fr_220px]"><Input aria-label="Search risks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search risk, owner, or detail" /><Select value={decision} onValueChange={setDecision}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All carry decisions</SelectItem>{HELIOS_RISK_CARRY_DECISIONS.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
    {risks.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">No risks match this review.</CardContent></Card> : risks.map((risk) => <Card key={risk.id} className="gap-3 py-4"><CardHeader><div className="min-w-0"><div className="mb-2 flex flex-wrap gap-2"><Badge variant={risk.severity === "critical" ? "destructive" : "outline"} className="capitalize">{risk.severity}</Badge><Badge variant={risk.carryDecision === "pending" ? "outline" : "secondary"} className="capitalize">{risk.carryDecision.replaceAll("_", " ")}</Badge><Badge variant="outline" className="capitalize">{risk.reviewStatus}</Badge></div><CardTitle>{risk.title}</CardTitle><CardDescription>{risk.probabilityPercent}% probability · Expected {money(risk.expectedExposureCents)} · {risk.mostLikelyScheduleDays === undefined ? "Schedule not established" : risk.mostLikelyScheduleDays + " likely days"}</CardDescription></div><Button variant="outline" size="sm" onClick={() => setEditing(risk)}><Pencil aria-hidden="true" />Edit</Button></CardHeader><CardContent className="space-y-3 text-sm"><p>{risk.detail}</p><div className="grid gap-3 rounded-md border p-3 md:grid-cols-3"><div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost exposure</div><div className="mt-1">{money(risk.lowCostCents)} / {money(risk.mostLikelyCostCents)} / {money(risk.highCostCents)}</div></div><div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mitigation / owner</div><div className="mt-1">{risk.mitigation}</div><div className="text-xs text-muted-foreground">{risk.owner}</div></div><div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked scope</div><div className="mt-1">{risk.linkedPayItemIds.length} owner items · {risk.linkedCostCodeIds.length} cost codes · {risk.evidenceIds.length} citations</div></div></div><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">One-click decision</span>{(["base_estimate", "contingency", "qualification", "transfer", "no_carry"] as const).map((value) => <Button key={value} size="sm" variant={risk.carryDecision === value ? "secondary" : "outline"} disabled={saving} onClick={() => mutate({ action: "set_risk_decision", riskId: risk.id, riskCarryDecision: value }, "Risk decision recorded: " + value.replaceAll("_", " ") + ".")}>{value.replaceAll("_", " ")}</Button>)}<Button size="sm" variant="destructive" onClick={() => setRejecting(risk)}>Reject</Button></div></CardContent></Card>)}
    <RiskDialog risk={editing} open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }} saving={saving} onSave={async (input) => { const saved = await mutate(input, "Risk exposure and response updated."); if (saved) setEditing(null); }} />
    <Dialog open={Boolean(rejecting)} onOpenChange={(open) => { if (!open) setRejecting(null); }}><DialogContent><DialogHeader><DialogTitle>Reject risk</DialogTitle><DialogDescription>The proposed risk and evidence remain in append-only history.</DialogDescription></DialogHeader>{rejecting && <form action={async (form) => { const saved = await mutate({ action: "reject_risk", riskId: rejecting.id, comment: String(form.get("comment") || "") }, "Risk rejected and retained in history."); if (saved) setRejecting(null); }} className="space-y-3"><Label htmlFor="risk-rejection">Reason</Label><Textarea id="risk-rejection" name="comment" required /><DialogFooter><Button type="button" variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={saving}>Confirm rejection</Button></DialogFooter></form>}</DialogContent></Dialog>
  </div>;
}

function RiskDialog({ risk, open, onOpenChange, saving, onSave }: { risk: HeliosEstimateRisk | null; open: boolean; onOpenChange: (open: boolean) => void; saving: boolean; onSave: (input: HeliosEstimateSupportInput) => Promise<void> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[calc(100%-2rem)] xl:max-w-5xl"><DialogHeader><DialogTitle>Edit risk exposure and response</DialogTitle><DialogDescription>Risk remains separate from base cost until an estimator records the carry decision.</DialogDescription></DialogHeader>{risk && <form action={(form) => onSave({ action: "update_risk", riskId: risk.id, risk: { category: String(form.get("category")) as HeliosEstimateRisk["category"], severity: String(form.get("severity")) as HeliosEstimateRisk["severity"], title: String(form.get("title") || ""), detail: String(form.get("detail") || ""), probabilityPercent: Number(form.get("probabilityPercent") || 0), lowCostCents: dollarsToCents(form.get("lowCost")), mostLikelyCostCents: dollarsToCents(form.get("likelyCost")), highCostCents: dollarsToCents(form.get("highCost")), lowScheduleDays: optionalNumber(form.get("lowDays")), mostLikelyScheduleDays: optionalNumber(form.get("likelyDays")), highScheduleDays: optionalNumber(form.get("highDays")), mitigationCostCents: dollarsToCents(form.get("mitigationCost")), mitigation: String(form.get("mitigation") || ""), contingencyResponse: String(form.get("contingencyResponse") || "") || undefined, owner: String(form.get("owner") || ""), responseDueDate: String(form.get("responseDueDate") || "") || undefined, disposition: String(form.get("disposition")) as HeliosEstimateRisk["disposition"], linkedPayItemIds: risk.linkedPayItemIds, linkedCostCodeIds: risk.linkedCostCodeIds, linkedQuantityIds: risk.linkedQuantityIds } })} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-2"><Label>Category</Label><Select name="category" defaultValue={risk.category}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_RISK_CATEGORIES.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Severity</Label><Select name="severity" defaultValue={risk.severity}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_RISK_SEVERITIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Disposition</Label><Select name="disposition" defaultValue={risk.disposition}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{HELIOS_RISK_DISPOSITIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="risk-probability">Probability %</Label><Input id="risk-probability" name="probabilityPercent" type="number" min="0" max="100" defaultValue={risk.probabilityPercent} required /></div><div className="space-y-2 sm:col-span-2 lg:col-span-4"><Label htmlFor="risk-title">Title</Label><Input id="risk-title" name="title" defaultValue={risk.title} required /></div><div className="space-y-2 sm:col-span-2 lg:col-span-4"><Label htmlFor="risk-detail">Description</Label><Textarea id="risk-detail" name="detail" defaultValue={risk.detail} required /></div>{[["lowCost", "Low cost ($)", risk.lowCostCents], ["likelyCost", "Most-likely cost ($)", risk.mostLikelyCostCents], ["highCost", "High cost ($)", risk.highCostCents], ["mitigationCost", "Mitigation cost ($)", risk.mitigationCostCents]].map(([name, label, value]) => <div key={String(name)} className="space-y-2"><Label htmlFor={String(name)}>{String(label)}</Label><Input id={String(name)} name={String(name)} type="number" min="0" step="0.01" defaultValue={typeof value === "number" ? value / 100 : undefined} /></div>)}{[["lowDays", "Low schedule days", risk.lowScheduleDays], ["likelyDays", "Most-likely days", risk.mostLikelyScheduleDays], ["highDays", "High schedule days", risk.highScheduleDays]].map(([name, label, value]) => <div key={String(name)} className="space-y-2"><Label htmlFor={String(name)}>{String(label)}</Label><Input id={String(name)} name={String(name)} type="number" min="0" step="0.1" defaultValue={typeof value === "number" ? value : undefined} /></div>)}<div className="space-y-2"><Label htmlFor="risk-due">Response due</Label><Input id="risk-due" name="responseDueDate" type="date" defaultValue={risk.responseDueDate} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="risk-owner">Response owner</Label><Input id="risk-owner" name="owner" defaultValue={risk.owner} required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="risk-mitigation">Mitigation</Label><Textarea id="risk-mitigation" name="mitigation" defaultValue={risk.mitigation} required /></div><div className="space-y-2 sm:col-span-2 lg:col-span-4"><Label htmlFor="risk-contingency">Contingency response</Label><Textarea id="risk-contingency" name="contingencyResponse" defaultValue={risk.contingencyResponse} /></div><div className="rounded-md border bg-background/50 p-3 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4"><ShieldCheck className="mr-2 inline size-4 text-orange-300" aria-hidden="true" />Linked scope is retained from the evidence relationship model: {risk.linkedPayItemIds.length} owner items, {risk.linkedCostCodeIds.length} cost codes, and {risk.linkedQuantityIds.length} quantities.</div><DialogFooter className="sm:col-span-2 lg:col-span-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>Save risk</Button></DialogFooter></form>}</DialogContent></Dialog>;
}
