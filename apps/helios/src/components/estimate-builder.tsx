"use client";

import {
  calculateEstimateTotals,
  calculateEstimateReviewSummary,
  type HeliosEstimateBuildInput,
  type HeliosEstimateWorkspace,
  type HeliosProjectSummary,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@opsslate/suite-ui/tabs";
import { useToast } from "@opsslate/suite-ui/toast";
import { AlertTriangle, ArrowLeft, Bot, Check, ChevronDown, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EstimateImportReview } from "./estimate-import-review";
import { EstimateCostCodeWorkspace } from "./estimate-cost-code-workspace";

function money(value?: number) {
  if (value === undefined) return "Unpriced";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function quantity(value: number | undefined, unit: string) {
  return value === undefined ? `Takeoff required · ${unit}` : `${value.toLocaleString()} ${unit}`;
}

function EvidenceList({ ids, workspace }: { ids: string[]; workspace: HeliosEstimateWorkspace }) {
  const evidence = ids
    .map((id) => workspace.evidence.find((row) => row.id === id))
    .filter((row) => row !== undefined);
  return (
    <div className="space-y-2">
      {evidence.map((row) => (
        <div key={row.id} className="rounded-md border border-border bg-background/45 p-3 text-xs">
          <div className="font-medium text-foreground">
            {row.documentName}{row.pageNumber ? ` · PDF page ${row.pageNumber}` : ""}
          </div>
          <div className="mt-1 text-muted-foreground">{row.locator}</div>
          <blockquote className="mt-2 border-l-2 border-orange-500/60 pl-3 text-muted-foreground">
            {row.excerpt}
          </blockquote>
        </div>
      ))}
    </div>
  );
}

export function EstimateBuilder({
  project,
  workspace,
}: {
  project: HeliosProjectSummary;
  workspace: HeliosEstimateWorkspace | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);
  const [savingBuild, setSavingBuild] = useState<string | null>(null);
  const isProcessing = workspace?.status === "proposal_processing";

  useEffect(() => {
    if (!isProcessing) return;
    const timer = window.setInterval(() => router.refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [isProcessing, router]);

  const directCostCents = useMemo(() => {
    if (!workspace) return undefined;
    const costs = workspace.sections.flatMap((section) =>
      section.payItems.map((item) => item.directCostCents),
    );
    if (!costs.length || costs.some((cost) => cost === undefined)) return undefined;
    return costs.reduce<number>((sum, cost) => sum + (cost || 0), 0);
  }, [workspace]);
  const totals = workspace && directCostCents !== undefined
    ? calculateEstimateTotals({
        directCostCents,
        overheadBasisPoints: workspace.overheadBasisPoints,
        profitBasisPoints: workspace.profitBasisPoints,
        bondBasisPoints: workspace.bondBasisPoints,
      })
    : undefined;
  const reviewSummary = workspace?.reviewSummary ?? calculateEstimateReviewSummary(
    workspace
      ? [
          ...workspace.sections.map((section) => ({ reviewStatus: section.reviewStatus })),
          ...workspace.sections.flatMap((section) => section.payItems.map((item) => ({ reviewStatus: item.reviewStatus }))),
        ]
      : [],
  );
  const activeSections = useMemo(
    () => workspace?.sections.filter((section) => section.reviewStatus !== "rejected") || [],
    [workspace],
  );
  const officialItems = useMemo(
    () => activeSections
      .flatMap((section) => section.payItems)
      .filter((item) => item.reviewStatus !== "rejected")
      .sort((left, right) => left.officialSequence - right.officialSequence),
    [activeSections],
  );

  async function generateProposal() {
    setRequesting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/estimate/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Estimate proposal could not be started.");
      toast("Estimate proposal queued. Helios is building the owner-pay-item breakdown.");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Estimate proposal could not be started.");
    } finally {
      setRequesting(false);
    }
  }

  async function saveBuild(input: HeliosEstimateBuildInput, success: string) {
    if (!workspace) return;
    setSavingBuild(input.costCodeId || input.resourceId || input.action);
    try {
      const response = await fetch(`/api/projects/${project.id}/estimate/${workspace.id}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Estimate build change could not be saved.");
      toast(success);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Estimate build change could not be saved.");
    } finally {
      setSavingBuild(null);
    }
  }

  const statusLabel = workspace?.status.replaceAll("_", " ") || "Not generated";
  return (
    <div className="space-y-4">
      <header className="flex flex-col justify-between gap-4 rounded-xl border bg-card px-5 py-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-orange-500/35 text-orange-300">Foundation 3E.2</Badge>
            <Badge variant={workspace?.status === "failed" ? "destructive" : "secondary"} className="capitalize">
              {statusLabel}
            </Badge>
            {workspace && <Badge variant="outline">Version {workspace.version}</Badge>}
          </div>
          <h1 className="truncate text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.projectNumber || "No project number"} · {project.ownerClient || "Owner not established"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href={`/projects/${project.id}`}><ArrowLeft aria-hidden="true" />Project intelligence</Link></Button>
          <Button onClick={generateProposal} disabled={requesting || isProcessing}>
            <RefreshCw className={requesting || isProcessing ? "animate-spin" : ""} aria-hidden="true" />
            {workspace ? "Create new proposal version" : "Generate estimate breakdown"}
          </Button>
        </div>
      </header>

      {!workspace ? (
        <Card>
          <CardContent className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
            <Bot className="mb-4 size-12 text-orange-300" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Ready to build the estimate breakdown</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Helios will organize the approved project evidence into operational sections, owner pay items,
              NYSDOT-aligned cost codes, resources, takeoff requirements, and a separate risk register.
              Prices are never invented.
            </p>
            <Button className="mt-5" onClick={generateProposal} disabled={requesting}>
              <Bot aria-hidden="true" />Generate evidence-backed proposal
            </Button>
          </CardContent>
        </Card>
      ) : isProcessing ? (
        <Card>
          <CardContent className="flex min-h-80 flex-col items-center justify-center text-center">
            <RefreshCw className="mb-4 size-10 animate-spin text-orange-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Building estimate version {workspace.version}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Helios is mapping owner pay items to operational cost codes and validating every citation.
              This page refreshes automatically.
            </p>
          </CardContent>
        </Card>
      ) : workspace.status === "failed" ? (
        <Card className="border-destructive/50">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <AlertTriangle className="mb-3 size-10 text-destructive" aria-hidden="true" />
            <h2 className="font-semibold">Estimate proposal needs attention</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{workspace.error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="gap-2 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner pay items</div><div className="mt-1 text-2xl font-bold">{workspace.sections.reduce((sum, section) => sum + section.payItems.length, 0)}</div></CardContent></Card>
            <Card className="gap-2 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operational sections</div><div className="mt-1 text-2xl font-bold">{workspace.sections.length}</div></CardContent></Card>
            <Card className="gap-2 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open risks</div><div className="mt-1 text-2xl font-bold">{workspace.risks.filter((risk) => risk.disposition === "open").length}</div></CardContent></Card>
            <Card className="gap-2 py-4"><CardContent><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimate total</div><div className="mt-1 text-2xl font-bold">{money(totals?.grandTotalCents)}</div></CardContent></Card>
          </div>

          <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 px-4 py-3 text-sm text-muted-foreground">
            <ShieldCheck className="mr-2 inline size-4 text-orange-300" aria-hidden="true" />
            AI-generated proposal · Human review required · Unpriced resources remain visibly unpriced · Accepted versions are never overwritten.
          </div>

          <Tabs defaultValue={workspace.status === "accepted" ? "build" : "import"} className="gap-4">
            <TabsList variant="line">
              <TabsTrigger value="import">Import review ({reviewSummary.proposed + reviewSummary.deferred})</TabsTrigger>
              <TabsTrigger value="build">Build view</TabsTrigger>
              <TabsTrigger value="bid">Bid schedule view</TabsTrigger>
              <TabsTrigger value="risk">Risk register ({workspace.risks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="import">
              <EstimateImportReview
                project={project}
                workspace={{
                  ...workspace,
                  reviewSummary,
                  decisionHistory: workspace.decisionHistory || [],
                }}
              />
            </TabsContent>
            <TabsContent value="build" className="space-y-4">
              {activeSections.map((section) => (
                <Card key={section.id} className="gap-0 overflow-hidden py-0">
                  <CardHeader className="border-b py-4">
                    <div>
                      <CardTitle>{section.name}</CardTitle>
                      <CardDescription>{section.payItems.length} owner pay item{section.payItems.length === 1 ? "" : "s"} · {section.evidenceIds.length} citations</CardDescription>
                    </div>
                    <Badge variant="outline" className="capitalize">{section.reviewStatus}</Badge>
                  </CardHeader>
                  <CardContent className="px-0">
                    {section.payItems.filter((item) => item.reviewStatus !== "rejected").map((item) => (
                      <details key={item.id} className="group border-b last:border-b-0">
                        <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 hover:bg-muted/40 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="font-mono">{item.officialItemNumber}</Badge>
                              <span className="font-semibold">{item.description}</span>
                              <Badge variant="outline" className="capitalize">{item.reviewStatus}</Badge>
                              <Badge variant="secondary" className="capitalize">{item.quantityStatus.replaceAll("_", " ")}</Badge>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {quantity(item.bidQuantity, item.bidUnit)} · {item.costCodes.length} cost codes · {item.evidenceIds.length} citations
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-4">
                            <div className="text-right"><div className="text-xs text-muted-foreground">Direct cost</div><div className="font-semibold">{money(item.directCostCents)}</div></div>
                            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                          </div>
                        </summary>
                        <div className="border-t bg-background/35 p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm text-muted-foreground">Internal operations under owner item {item.officialItemNumber}</div>
                            {(["accepted", "corrected"] as string[]).includes(item.reviewStatus) ? (
                              <EstimateCostCodeWorkspace projectId={project.id} estimateId={workspace.id} payItemId={item.id} payItemNumber={item.officialItemNumber} />
                            ) : (
                              <span className="text-xs text-muted-foreground">Accept this owner item before adding cost codes.</span>
                            )}
                          </div>
                          <Table>
                            <TableHeader><TableRow><TableHead>Cost code</TableHead><TableHead>Production basis</TableHead><TableHead>Ownership</TableHead><TableHead>Pricing</TableHead><TableHead className="text-right">Direct cost</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {item.costCodes.map((code) => (
                                <TableRow key={code.id}>
                                  <TableCell className="min-w-64 whitespace-normal"><div className="font-mono text-xs text-orange-300">{code.code}</div><div className="font-medium">{code.description}</div><div className="mt-1 text-xs text-muted-foreground">{code.evidenceIds.length} citations · {code.confidence}% confidence</div></TableCell>
                                  <TableCell>{quantity(code.productionQuantity, code.productionUnit)}</TableCell>
                                  <TableCell className="capitalize">{code.scopeOwnership.replaceAll("_", " ")}</TableCell>
                                  <TableCell><Badge variant={code.pricingStatus === "priced" ? "secondary" : "outline"} className="capitalize">{code.pricingStatus}</Badge><div className="mt-1 text-xs text-muted-foreground">{code.resources.length} resource{code.resources.length === 1 ? "" : "s"}</div></TableCell>
                                  <TableCell className="text-right font-medium">{money(code.directCostCents)}</TableCell>
                                  <TableCell><div className="flex justify-end gap-2">{code.reviewStatus === "proposed" && (["accepted", "corrected"] as string[]).includes(item.reviewStatus) && <Button size="sm" disabled={savingBuild !== null} onClick={() => saveBuild({ action: "accept_cost_code", costCodeId: code.id }, "Cost code accepted.")}><Check aria-hidden="true" />Accept</Button>}<EstimateCostCodeWorkspace projectId={project.id} estimateId={workspace.id} payItemId={item.id} payItemNumber={item.officialItemNumber} code={code} /></div></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <details className="mt-4 rounded-md border p-3">
                            <summary className="cursor-pointer text-sm font-medium"><FileCheck2 className="mr-2 inline size-4 text-orange-300" aria-hidden="true" />View owner-item evidence</summary>
                            <div className="mt-3"><EvidenceList ids={item.evidenceIds} workspace={workspace} /></div>
                          </details>
                        </div>
                      </details>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="bid">
              <Card className="gap-0 overflow-hidden py-0">
                <CardHeader className="border-b py-4"><CardTitle>Owner bid schedule</CardTitle><CardDescription>The bid view is generated from the same owner-pay-item records as the build view.</CardDescription></CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Seq.</TableHead><TableHead>Item</TableHead><TableHead>Description</TableHead><TableHead>Bid quantity</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Unit cost / fixed</TableHead><TableHead className="text-right">Extended</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {officialItems.map((item) => (
                        <TableRow key={item.id}><TableCell>{item.officialSequence}</TableCell><TableCell className="font-mono text-orange-300">{item.officialItemNumber}</TableCell><TableCell className="min-w-72 whitespace-normal font-medium">{item.description}</TableCell><TableCell>{item.bidQuantity ?? "Takeoff required"}</TableCell><TableCell>{item.bidUnit}</TableCell><TableCell className="text-right">{money(item.fixedAmountCents ?? item.derivedUnitCostCents)}</TableCell><TableCell className="text-right font-semibold">{money(item.fixedAmountCents ?? item.directCostCents)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="risk" className="space-y-3">
              {workspace.risks.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No evidence-backed risks were proposed.</CardContent></Card>
              ) : workspace.risks.map((risk) => (
                <Card key={risk.id} className="gap-3 py-4">
                  <CardHeader><div><CardTitle>{risk.title}</CardTitle><CardDescription>{risk.probabilityPercent}% probability · {risk.scheduleDays === undefined ? "Schedule exposure not established" : `${risk.scheduleDays} days exposure`}</CardDescription></div><Badge variant="outline" className="capitalize">{risk.disposition}</Badge></CardHeader>
                  <CardContent className="space-y-3 text-sm"><p>{risk.detail}</p><div className="grid gap-3 rounded-md border p-3 md:grid-cols-2"><div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mitigation</div><div className="mt-1">{risk.mitigation}</div></div><div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner</div><div className="mt-1">{risk.owner}</div></div></div><details><summary className="cursor-pointer font-medium">View {risk.evidenceIds.length} risk citations</summary><div className="mt-3"><EvidenceList ids={risk.evidenceIds} workspace={workspace} /></div></details></CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
