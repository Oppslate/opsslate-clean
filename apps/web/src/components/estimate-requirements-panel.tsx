"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import type { Id } from "../../convex/_generated/dataModel";

function requirementLabel(value?: string) {
  return (value || "requirement").replace(/_/g, " ");
}

export function EstimateRequirementsPanel({ projectId }: { projectId: Id<"projects"> }) {
  const requirements = useQuery((api as any).estimating.listEstimateRequirements, { projectId }) as any[] | undefined;
  const project = useQuery((api as any).projects.getById, { id: projectId }) as any | undefined;
  const estimates = useQuery((api as any).estimating.listProjectEstimates, { projectId }) as any[] | undefined;
  const activeEstimate = (estimates || [])[0];
  const suggestions = useQuery((api as any).estimating.listEstimateItemSuggestions, activeEstimate?._id ? { projectId, estimateId: activeEstimate._id } : { projectId }) as any[] | undefined;
  const createSuggestedEstimateItems = useMutation((api as any).estimating.createSuggestedEstimateItems);
  const [addingSuggestions, setAddingSuggestions] = useState(false);
  const items = requirements || [];
  const suggestedItems = suggestions || [];
  const allowances = items.filter((item) => item.allowance || item.requirementType === "allowance").length;
  const scope = items.filter((item) => item.scopeAssumption || item.requirementType === "scope_assumption").length;
  const riskRules = items.filter((item) => item.wageRule || item.bondRule || item.taxRule || item.dbeRule || item.liquidatedDamagesRule).length;

  async function handleAddSuggestions() {
    if (!activeEstimate?._id || !project?.companyId) return;
    setAddingSuggestions(true);
    try {
      await createSuggestedEstimateItems({
        companyId: project.companyId,
        projectId,
        estimateId: activeEstimate._id,
        limit: 12,
      });
    } finally {
      setAddingSuggestions(false);
    }
  }

  return (
    <Card className="bg-gradient-to-r from-orange-500/5 to-background border-orange-500/30 border-l-4 border-l-orange-500 mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardList className="size-5 text-orange-300" />
              <h3 className="font-bold">Bid / Estimate Requirements</h3>
              <Badge variant="outline" className="text-[10px]">{items.length} inputs</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Spec-driven estimating inputs for allowances, alternates, exclusions, wage, bond, tax, DBE, liquidated damages, and scope assumptions.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-foreground">{allowances}</div>
              Allow.
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-orange-300">{scope}</div>
              Scope
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-amber-300">{riskRules}</div>
              Rules
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold">Estimate Item Suggestions</h4>
                <Badge variant="outline">{suggestedItems.length} Suggested line item{suggestedItems.length === 1 ? "" : "s"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Uses scope assumptions and measurement clauses to propose estimate line items with units, sections, cost codes, assemblies, catalog matches, and duplicate checks.
              </p>
            </div>
            <Button type="button" size="sm" disabled={!activeEstimate?._id || suggestedItems.length === 0 || addingSuggestions} onClick={handleAddSuggestions}>
              {addingSuggestions ? "Adding..." : "Add Suggestions"}
            </Button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {suggestedItems.length === 0 ? (
              <div className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground md:col-span-2">
                No estimate item suggestions yet. Commit scope items, bid requirements, or billing measurement rules from the Spec Intelligence Intake Matrix.
              </div>
            ) : (
              suggestedItems.slice(0, 6).map((item: any, index: number) => (
                <div key={`${item.sourceType}-${item.sourceRequirementId || item.sourcePaymentRuleId || index}`} className="rounded-md border border-border bg-background/65 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.section || "Spec Scope"}</Badge>
                    {item.costCode && <Badge variant="outline">Cost Code: {item.costCode}</Badge>}
                    <Badge variant="secondary">{item.unit || "LS"}</Badge>
                    <Badge variant="outline">{Math.round((item.suggestionConfidence || 0.6) * 100)}%</Badge>
                  </div>
                  <div className="mt-2 font-semibold">{item.description}</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs">
                      <div className="font-bold uppercase text-muted-foreground">Catalog Match</div>
                      <div className="mt-1 text-foreground">{item.catalogMatchName || "No cost item match yet"}</div>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs">
                      <div className="font-bold uppercase text-muted-foreground">Assembly</div>
                      <div className="mt-1 text-foreground">{item.assemblyName || "No assembly match yet"}</div>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs md:col-span-2">
                      <div className="font-bold uppercase text-muted-foreground">Duplicate Check</div>
                      <div className="mt-1 text-foreground">{item.duplicateReason || "No matching estimate item found"}</div>
                    </div>
                  </div>
                  {item.measurementBasis && (
                    <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs">
                      <div className="font-bold uppercase text-muted-foreground">Measurement basis</div>
                      <div className="mt-1 line-clamp-2 text-foreground">{item.measurementBasis}</div>
                    </div>
                  )}
                  {(item.sourceSpecSection || item.sourceQuote) && (
                    <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                      <div className="font-bold uppercase text-foreground">Source evidence</div>
                      {item.sourceSpecSection && <div>Spec: {item.sourceSpecSection}</div>}
                      {item.sourceQuote && <div className="mt-1 line-clamp-2">"{item.sourceQuote}"</div>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {!activeEstimate?._id && suggestedItems.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Link this project to an estimate before adding suggested line items.</p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            No estimate requirements have been committed yet. Review Bid Requirements or Scope items in the Spec Intelligence Intake Matrix to push them into estimating.
          </div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 6).map((item) => (
              <div key={item._id} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{requirementLabel(item.requirementType)}</Badge>
                  {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                  {item.status && <Badge variant="secondary">{item.status}</Badge>}
                </div>
                <h4 className="mt-2 font-semibold">{item.title}</h4>
                {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {item.trade && <span>Trade: {item.trade}</span>}
                  {item.phase && <span>Phase: {item.phase}</span>}
                  {item.projectRole && <span>Role: {item.projectRole}</span>}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {item.allowance && <Detail label="Allowance" value={item.allowance} />}
                  {item.alternate && <Detail label="Alternate" value={item.alternate} />}
                  {item.exclusion && <Detail label="Exclusion" value={item.exclusion} />}
                  {item.scopeAssumption && <Detail label="Scope assumption" value={item.scopeAssumption} />}
                  {item.wageRule && <Detail label="Wage rule" value={item.wageRule} />}
                  {item.bondRule && <Detail label="Bond rule" value={item.bondRule} />}
                  {item.taxRule && <Detail label="Tax rule" value={item.taxRule} />}
                  {item.dbeRule && <Detail label="DBE rule" value={item.dbeRule} />}
                  {item.liquidatedDamagesRule && <Detail label="Liquidated damages" value={item.liquidatedDamagesRule} />}
                </div>
                {(item.sourceSpecSection || item.sourceQuote) && (
                  <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                    <div className="font-bold uppercase text-foreground">Source evidence</div>
                    {item.sourceSpecSection && <div>Spec: {item.sourceSpecSection}</div>}
                    {item.sourceQuote && <div className="mt-1 line-clamp-2">"{item.sourceQuote}"</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs">
      <div className="font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}
