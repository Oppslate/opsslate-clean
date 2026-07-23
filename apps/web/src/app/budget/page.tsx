
"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

function fmt(n?: number) { return n !== undefined && n !== null ? "$" + n.toLocaleString() : "—"; }

function BudgetContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const [selectedProject, setSelectedProject] = useState("");
  const data = useQuery(api.budgetTracker.getBudget, selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip") as any;
  const upsertBudget = useMutation(api.budgetTracker.upsertBudget);
  const addLine = useMutation(api.budgetTracker.addLineItem);
  const updateLine = useMutation(api.budgetTracker.updateLineItem);
  const removeLine = useMutation(api.budgetTracker.removeLineItem);
  const { toast } = useToast();

  const [origContract, setOrigContract] = useState("");
  const [contingency, setContingency] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState(""); const [newDesc, setNewDesc] = useState(""); const [newCat, setNewCat] = useState("");
  const [newBudgeted, setNewBudgeted] = useState(""); const [newCommitted, setNewCommitted] = useState(""); const [newActual, setNewActual] = useState("");

  const handleSaveBudget = async () => {
    if (!selectedProject) return;
    await upsertBudget({ companyId: user!.companyId, projectId: selectedProject as Id<"projects">, originalContract: origContract ? Number(origContract) : undefined, contingency: contingency ? Number(contingency) : undefined });
    toast("Budget saved", "success");
  };

  const handleAddLine = async () => {
    if (!newCode || !newDesc || !newBudgeted) { toast("Code, description, and budget required", "error"); return; }
    await addLine({ companyId: user!.companyId, projectId: selectedProject as Id<"projects">, costCode: newCode, description: newDesc, category: newCat || undefined, budgeted: Number(newBudgeted), committed: newCommitted ? Number(newCommitted) : undefined, actual: newActual ? Number(newActual) : undefined });
    setNewCode(""); setNewDesc(""); setNewCat(""); setNewBudgeted(""); setNewCommitted(""); setNewActual("");
    setShowAdd(false); toast("Line added", "success");
  };

  if (!user) return null;
  const currentContract = (data?.budget?.originalContract ?? 0) + (data?.approvedCOCost ?? 0);
  const budgetRemaining = (data?.totalBudgeted ?? 0) - (data?.totalActual ?? 0);

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">💰 Budget Tracker</h1>
      <p className="text-muted-foreground text-sm mb-4">Track costs, change order impact, and budget variance</p>

      <div className="flex gap-4 mb-4">
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm flex-1" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">Select project...</option>
          {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProject && data && (<>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="bg-card border-border"><CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{fmt(data.budget?.originalContract)}</div><div className="text-xs text-muted-foreground">Original Contract</div>
          </CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-400">+{fmt(data.approvedCOCost)}</div><div className="text-xs text-muted-foreground">{data.coCount} Approved COs</div>
          </CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-primary">{fmt(currentContract)}</div><div className="text-xs text-muted-foreground">Current Contract</div>
          </CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">{fmt(data.totalActual)}</div><div className="text-xs text-muted-foreground">Actual Spent</div>
          </CardContent></Card>
          <Card className={`border-border ${budgetRemaining < 0 ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}`}><CardContent className="p-3 text-center">
            <div className={`text-xl font-bold ${budgetRemaining < 0 ? "text-red-400" : "text-green-400"}`}>{fmt(budgetRemaining)}</div><div className="text-xs text-muted-foreground">Remaining</div>
          </CardContent></Card>
        </div>

        {/* Contract setup */}
        <Card className="bg-card border-border mb-4"><CardContent className="p-4">
          <h3 className="font-bold text-sm mb-3">Contract Setup</h3>
          <div className="flex gap-3 items-end">
            <div><label className="text-xs text-muted-foreground">Original Contract ($)</label><Input value={origContract || String(data.budget?.originalContract ?? "")} onChange={(e) => setOrigContract(e.target.value)} type="number" /></div>
            <div><label className="text-xs text-muted-foreground">Contingency ($)</label><Input value={contingency || String(data.budget?.contingency ?? "")} onChange={(e) => setContingency(e.target.value)} type="number" /></div>
            <Button onClick={handleSaveBudget}>Save</Button>
          </div>
        </CardContent></Card>

        {/* Line items */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">Cost Breakdown</h3>
          <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Line Item</Button>
        </div>

        {showAdd && (
          <Card className="bg-secondary/30 border-border mb-3"><CardContent className="p-3">
            <div className="grid grid-cols-6 gap-2">
              <Input placeholder="Cost Code" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
              <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <Input placeholder="Category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
              <Input placeholder="Budgeted ($)" type="number" value={newBudgeted} onChange={(e) => setNewBudgeted(e.target.value)} />
              <Input placeholder="Committed ($)" type="number" value={newCommitted} onChange={(e) => setNewCommitted(e.target.value)} />
              <div className="flex gap-1"><Input placeholder="Actual ($)" type="number" value={newActual} onChange={(e) => setNewActual(e.target.value)} />
                <Button size="sm" onClick={handleAddLine}>Add</Button><Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>✕</Button></div>
            </div>
          </CardContent></Card>
        )}

        <Card className="bg-card border-border"><Table><TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead>
          <TableHead className="text-right">Budgeted</TableHead><TableHead className="text-right">Committed</TableHead>
          <TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead>Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {(data.lineItems ?? []).map((item: any) => (
            <TableRow key={item._id}>
              <TableCell className="font-mono text-xs">{item.costCode}</TableCell>
              <TableCell className="text-sm">{item.description}</TableCell>
              <TableCell><Badge variant="outline">{item.category || "—"}</Badge></TableCell>
              <TableCell className="text-right text-sm">{fmt(item.budgeted)}</TableCell>
              <TableCell className="text-right text-sm">{fmt(item.committed)}</TableCell>
              <TableCell className="text-right text-sm">{fmt(item.actual)}</TableCell>
              <TableCell className={`text-right text-sm font-semibold ${(item.variance ?? 0) < 0 ? "text-red-400" : "text-green-400"}`}>{fmt(item.variance)}</TableCell>
              <TableCell><Button size="sm" variant="destructive" onClick={() => removeLine({ id: item._id }).then(() => toast("Removed", "success"))}>✕</Button></TableCell>
            </TableRow>
          ))}
          {(data.lineItems ?? []).length > 0 && (
            <TableRow className="font-bold border-t-2">
              <TableCell colSpan={3}>TOTALS</TableCell>
              <TableCell className="text-right">{fmt(data.totalBudgeted)}</TableCell>
              <TableCell className="text-right">{fmt(data.totalCommitted)}</TableCell>
              <TableCell className="text-right">{fmt(data.totalActual)}</TableCell>
              <TableCell className={`text-right ${budgetRemaining < 0 ? "text-red-400" : "text-green-400"}`}>{fmt(budgetRemaining)}</TableCell>
              <TableCell />
            </TableRow>
          )}
        </TableBody></Table>
        {(data.lineItems ?? []).length === 0 && <EmptyState icon="💰" title="No line items" description="Add cost codes to track your budget" actionLabel="+ Add Line" onAction={() => setShowAdd(true)} />}
        </Card>
      </>)}
      {!selectedProject && <EmptyState icon="💰" title="Budget Tracker" description="Select a project to manage its budget" />}
    </div>
  );
}

export default function BudgetPage() { return <AppShell><BudgetContent /></AppShell>; }
