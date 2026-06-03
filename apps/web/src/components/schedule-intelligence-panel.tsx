"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Id } from "../../convex/_generated/dataModel";

function typeLabel(value?: string) {
  return (value || "constraint").replace(/_/g, " ");
}

export function ScheduleIntelligencePanel({ projectId }: { projectId: Id<"projects"> }) {
  const constraints = useQuery((api as any).scheduleConstraints.list, { projectId }) as any[] | undefined;
  const dependencyGraph = useQuery((api as any).scheduleConstraints.getDependencyGraph, { projectId }) as any | undefined;
  const applyConstraintDependencies = useMutation((api as any).scheduleConstraints.applyConstraintDependencies);
  const [applying, setApplying] = useState(false);
  const items = constraints || [];
  const active = items.filter((item) => item.status !== "resolved").length;
  const leadTime = items.filter((item) => item.constraintType === "lead_time").length;
  const reviewPeriods = items.filter((item) => item.constraintType === "review_period").length;
  const edges = dependencyGraph?.edges || [];
  const cycleWarnings = dependencyGraph?.cycleWarnings || [];
  const criticalPathCandidates = dependencyGraph?.criticalPathCandidates || [];
  const unresolvedConstraints = dependencyGraph?.unresolvedConstraints || [];

  async function handleApplyDependencyLogic() {
    setApplying(true);
    try {
      await applyConstraintDependencies({ projectId });
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="bg-gradient-to-r from-cyan-500/5 to-background border-cyan-500/30 border-l-4 border-l-cyan-500 mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="size-5 text-cyan-300" />
              <h3 className="font-bold">Schedule Intelligence</h3>
              <Badge variant="outline" className="text-[10px]">{active} active</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Spec-driven milestones, lead times, review periods, inspections, and sequencing rules ready for the schedule builder.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-foreground">{items.length}</div>
              Total
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-amber-300">{leadTime}</div>
              Lead
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-cyan-300">{reviewPeriods}</div>
              Reviews
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold">Dependency Graph</h4>
                <Badge variant="outline">{edges.length} links</Badge>
                {unresolvedConstraints.length > 0 && <Badge variant="outline">{unresolvedConstraints.length} need review</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Converts spec schedule constraints into predecessor and successor logic that the schedule builder can use.
              </p>
            </div>
            <Button type="button" size="sm" disabled={applying || items.length === 0} onClick={handleApplyDependencyLogic}>
              {applying ? "Applying..." : "Apply Dependency Logic"}
            </Button>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2">
              {edges.length === 0 ? (
                <div className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                  No predecessor/successor links have been inferred yet. Add related task links to schedule constraints, then apply dependency logic.
                </div>
              ) : (
                edges.slice(0, 6).map((edge: any) => (
                  <div key={edge.id} className="rounded-md border border-border bg-background/65 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{edge.dependencyLabel}</Badge>
                      <Badge variant="secondary">{edge.status}</Badge>
                      {edge.lagDays ? <Badge variant="outline">{edge.lagDays} day lag</Badge> : null}
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div className="rounded-md border border-border bg-background/60 p-2">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Predecessor</div>
                        <div className="font-semibold">{edge.predecessorTitle}</div>
                      </div>
                      <div className="text-center text-xs text-muted-foreground">then</div>
                      <div className="rounded-md border border-border bg-background/60 p-2">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Successor</div>
                        <div className="font-semibold">{edge.successorTitle}</div>
                      </div>
                    </div>
                    {edge.blockingRule && <div className="mt-2 text-xs text-muted-foreground">{edge.blockingRule}</div>}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-border bg-background/60 p-3">
                <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Critical path candidates</div>
                {criticalPathCandidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No linked task chains yet.</p>
                ) : (
                  <div className="space-y-2">
                    {criticalPathCandidates.slice(0, 5).map((node: any) => (
                      <div key={node.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-semibold">{node.title}</span>
                        <span className="text-muted-foreground">{node.predecessorCount} in / {node.successorCount} out</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border bg-background/60 p-3">
                <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Cycle warnings</div>
                {cycleWarnings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No circular schedule logic detected.</p>
                ) : (
                  <div className="space-y-1">
                    {cycleWarnings.map((warning: string) => <p key={warning} className="text-xs text-red-300">{warning}</p>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            No schedule intelligence has been committed yet. Review Schedule items in the Spec Intelligence Intake Matrix to create constraints.
          </div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 6).map((item) => (
              <div key={item._id} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{typeLabel(item.constraintType)}</Badge>
                      {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                      {item.status && <Badge variant="secondary">{item.status}</Badge>}
                    </div>
                    <h4 className="mt-2 font-semibold">{item.title}</h4>
                    {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {item.trade && <span>Trade: {item.trade}</span>}
                      {item.phase && <span>Phase: {item.phase}</span>}
                      {item.startDate && <span>Start: {item.startDate}</span>}
                      {item.dueDate && <span>Due: {item.dueDate}</span>}
                      {typeof item.leadTimeDays === "number" && <span>Lead: {item.leadTimeDays} days</span>}
                      {typeof item.reviewPeriodDays === "number" && <span>Review: {item.reviewPeriodDays} days</span>}
                      {item.projectRole && <span>Role: {item.projectRole}</span>}
                    </div>
                    {(item.sourceSpecSection || item.sourceQuote) && (
                      <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                        <div className="font-bold uppercase text-foreground">Source evidence</div>
                        {item.sourceSpecSection && <div>Spec: {item.sourceSpecSection}</div>}
                        {item.sourceQuote && <div className="mt-1 line-clamp-2">"{item.sourceQuote}"</div>}
                      </div>
                    )}
                  </div>
                  {item.blockingRule && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 lg:max-w-xs">
                      <div className="font-bold uppercase">Blocking rule</div>
                      <div>{item.blockingRule}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
