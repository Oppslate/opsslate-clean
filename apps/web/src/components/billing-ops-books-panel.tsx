"use client";

import { BookOpenCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@opsslate/suite-ui/badge";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import type { Id } from "../../convex/_generated/dataModel";

function ruleTypeLabel(value?: string) {
  return (value || "payment").replace(/_/g, " ");
}

export function BillingOpsBooksPanel({ projectId }: { projectId: Id<"projects"> }) {
  const checklistPacket = useQuery((api as any).paymentRules.payAppChecklist, { projectId }) as any | undefined;
  const items = checklistPacket?.rows || [];
  const backupRules = items.filter((item: any) => item.backupDocumentation).length;
  const certifiedPayroll = checklistPacket?.certifiedPayrollRequired || 0;
  const retainage = checklistPacket?.retainageRules || 0;

  return (
    <Card className="bg-gradient-to-r from-emerald-500/5 to-background border-emerald-500/30 border-l-4 border-l-emerald-500 mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <BookOpenCheck className="size-5 text-emerald-300" />
              <h3 className="font-bold">Billing / Ops Books Inputs</h3>
              <Badge variant="outline" className="text-[10px]">{items.length} rules</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Pay-App Checklist for backup docs, measurement method, certified payroll, stored materials, retainage, unit price notes, and pay item support.</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-emerald-300">{checklistPacket?.payAppReady || 0}</div>
              Pay App Ready
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-foreground">{backupRules}</div>
              Backup
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-amber-300">{retainage}</div>
              Retainage
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="text-lg font-bold text-emerald-300">{certifiedPayroll}</div>
              Payroll
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            No Ops Books billing inputs have been committed yet. Review Billing items in the Spec Intelligence Intake Matrix to create payment rules.
          </div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 6).map((item: any) => (
              <div key={item._id} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{ruleTypeLabel(item.ruleType)}</Badge>
                      {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                      {item.certifiedPayrollRequired && <Badge variant="secondary">Certified payroll</Badge>}
                      {item.payAppReady ? <Badge className="bg-emerald-600 text-white">Pay App Ready</Badge> : <Badge variant="outline">Missing for Pay App</Badge>}
                    </div>
                    <h4 className="mt-2 font-semibold">{item.title}</h4>
                    {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {item.trade && <span>Trade: {item.trade}</span>}
                      {item.phase && <span>Phase: {item.phase}</span>}
                      {item.projectRole && <span>Role: {item.projectRole}</span>}
                      {item.status && <span>Status: {item.status}</span>}
                    </div>
                    {item.missingItems?.length > 0 && (
                      <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-100">
                        <span className="font-bold">Missing for Pay App:</span> {item.missingItems.join(", ")}
                      </div>
                    )}
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {[
                        ["Measurement Method", item.checklist?.measurementMethod],
                        ["Backup Docs", item.checklist?.backupDocs],
                        ["Certified Payroll", item.checklist?.certifiedPayroll],
                        ["Stored Materials", item.checklist?.storedMaterials],
                        ["Retainage", item.checklist?.retainage],
                        ["Unit Price Notes", item.checklist?.unitPriceNotes],
                      ].map(([label, field]: any) => (
                        <div key={label} className="rounded-md border border-border bg-secondary/20 p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold uppercase text-muted-foreground">{label}</div>
                            <Badge variant={field?.status === "ready" ? "secondary" : "outline"} className="text-[10px]">
                              {field?.status === "not_applicable" ? "N/A" : field?.status || "missing"}
                            </Badge>
                          </div>
                          <div className="mt-1 line-clamp-3 text-foreground">{field?.value || "Needs review"}</div>
                        </div>
                      ))}
                    </div>
                    {(item.sourceSpecSection || item.sourceQuote) && (
                      <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                        <div className="font-bold uppercase text-foreground">Source evidence</div>
                        {item.sourceSpecSection && <div>Spec: {item.sourceSpecSection}</div>}
                        {item.sourceQuote && <div className="mt-1 line-clamp-2">"{item.sourceQuote}"</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
