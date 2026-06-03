"use client";

import { useState } from "react";
import type React from "react";
import { AlertTriangle, BellRing, BrainCircuit, CheckCircle2, Gauge, ListChecks } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Id } from "../../convex/_generated/dataModel";

function scoreTone(score: number) {
  if (score >= 85) return "text-green-300";
  if (score >= 60) return "text-amber-300";
  return "text-red-300";
}

function statusTone(status?: string) {
  if (status === "ready") return "border-green-500/30 bg-green-500/10 text-green-200";
  if (status === "needs review") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-red-500/30 bg-red-500/10 text-red-100";
}

const publishDestinations = ["RFIs", "Tasks", "Submittals", "Estimate Items", "Billing Rules", "Schedule Logic"];
const agentWatchDomains = ["RFIs", "Submittals", "Tasks", "Schedule", "Billing", "Estimating"];

function CollapsibleCommandSection({
  title,
  summary,
  description,
  className,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  description?: React.ReactNode;
  className: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const sectionDescription = description;
  return (
    <div className={`mb-4 rounded-lg p-3 ${className}`}>
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={onToggle}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="font-bold">{title}</div>
          {summary}
        </div>
        <Badge variant="outline">{collapsed ? "Show" : "Hide"}</Badge>
      </button>
      {sectionDescription && <div className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{sectionDescription}</div>}
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

export function SpecIntelligenceCommandCenter({ projectId }: { projectId: Id<"projects"> }) {
  const commandCenter = useQuery((api as any).specDNA.getCommandCenter, { projectId }) as any | undefined;
  const markReminderSent = useMutation((api as any).specDNA.markReminderSent);
  const sendReminderNotification = useAction((api as any).specDNA.sendReminderNotification);
  const [markingReminderId, setMarkingReminderId] = useState("");
  const [sendingReminderId, setSendingReminderId] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const readiness = commandCenter?.readiness || [];
  const attentionFlags = commandCenter?.attentionFlags || {};
  const actionQueue = commandCenter?.actionQueue || [];
  const reminderQueue = commandCenter?.reminderQueue || [];
  const reminderSummary = commandCenter?.reminderSummary || {};
  const conflictSignals = commandCenter?.conflictSignals || [];
  const duplicateSignals = commandCenter?.duplicateSignals || [];
  const handoffPacket = commandCenter?.handoffPacket;
  const addendaDelta = commandCenter?.addendaDelta;
  const publishControlCenter = commandCenter?.publishControlCenter;
  const auditTrail = commandCenter?.auditTrail || [];
  const exceptionDashboard = commandCenter?.exceptionDashboard;
  const confidenceScoringV2 = commandCenter?.confidenceScoringV2;
  const autonomousSpecAgent = commandCenter?.autonomousSpecAgent;
  const bidPackageIntelligence = commandCenter?.bidPackageIntelligence;
  const specChangeImpactEngine = commandCenter?.specChangeImpactEngine;
  const autonomousWatchRows = agentWatchDomains.map((label) => (
    autonomousSpecAgent?.watchDomains?.find((domain: any) => domain.label === label) || { label, key: label, count: 0 }
  ));
  const publishDestinationRows = publishDestinations.map((label) => (
    publishControlCenter?.byDestination?.find((destination: any) => destination.label === label) || { label, ready: 0, published: 0 }
  ));
  const coverageScore = commandCenter?.coverageScore ?? 0;
  const handoffReadiness = commandCenter?.handoffReadiness ?? 0;
  const moreIntelligenceCount = (exceptionDashboard?.total || 0) + auditTrail.length + (publishControlCenter?.readyToCommit || 0) + (reminderSummary.total || 0) + actionQueue.length;

  function isCollapsed(id: string, defaultCollapsed: boolean) {
    return collapsedSections[id] ?? defaultCollapsed;
  }

  function toggleSection(id: string, defaultCollapsed: boolean) {
    setCollapsedSections((current) => ({ ...current, [id]: !(current[id] ?? defaultCollapsed) }));
  }

  async function handleMarkReminder(item: any) {
    setMarkingReminderId(item.recordId);
    try {
      await markReminderSent({ recordType: item.recordType, recordId: item.recordId });
    } finally {
      setMarkingReminderId("");
    }
  }

  async function handleSendReminder(item: any, channel: "email" | "sms") {
    setSendingReminderId(`${channel}-${item.recordId}`);
    try {
      const result = await sendReminderNotification({ recordType: item.recordType, recordId: item.recordId, channel });
      if (!result?.sent && result?.error) window.alert(result.error);
    } finally {
      setSendingReminderId("");
    }
  }

  return (
    <Card className="mb-6 overflow-hidden border-orange-500/35 bg-[linear-gradient(135deg,rgba(249,115,22,0.14),rgba(6,182,212,0.08),rgba(2,6,23,0.75))]">
      <CardContent className="p-0">
        <div className="border-b border-border/70 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <BrainCircuit className="size-5 text-orange-300" />
                <h3 className="text-lg font-bold">Spec Intelligence Command Center</h3>
                <Badge variant="outline" className="text-[10px]">Phase 2</Badge>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Designed for scan-first review. The board shows the few things that need attention first, while detailed evidence stays hidden unless opened.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-border bg-background/70 px-4 py-3">
                <div className={`text-3xl font-bold ${scoreTone(coverageScore)}`}>{coverageScore}%</div>
                <div className="text-xs uppercase text-muted-foreground">Coverage Score</div>
              </div>
              <div className="rounded-lg border border-border bg-background/70 px-4 py-3">
                <div className={`text-3xl font-bold ${scoreTone(handoffReadiness)}`}>{handoffReadiness}%</div>
                <div className="text-xs uppercase text-muted-foreground">Handoff Readiness</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              {autonomousSpecAgent && (
                <CollapsibleCommandSection
                  title="Autonomous Spec Agent"
                  summary={<Badge variant="outline">Project Watch: {String(autonomousSpecAgent.projectWatchStatus || "clear").replace(/_/g, " ")}</Badge>}
                  description="Shows spec-driven problems across RFIs, submittals, tasks, schedule, billing, and estimating, then recommends the next best action before users have to go looking."
                  className="border border-orange-500/30 bg-orange-500/10"
                  collapsed={isCollapsed("autonomousSpecAgent", autonomousSpecAgent.projectWatchStatus !== "attention_needed")}
                  onToggle={() => toggleSection("autonomousSpecAgent", autonomousSpecAgent.projectWatchStatus !== "attention_needed")}
                >
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-orange-300">{autonomousSpecAgent.recommendedActions?.length || 0}</div>
                      <div className="text-muted-foreground">Recommended Actions</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-cyan-300">{autonomousSpecAgent.automationCandidates || 0}</div>
                      <div className="text-muted-foreground">Automation Candidate</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-amber-300">{autonomousSpecAgent.confidenceWatchItems || 0}</div>
                      <div className="text-muted-foreground">Watch Items</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
                    {autonomousWatchRows.map((domain: any) => (
                      <div key={domain.key} className="rounded-md border border-border bg-background/60 p-2">
                        <div className="font-semibold">{domain.label}</div>
                        <div className="mt-1 text-muted-foreground">{domain.count || 0} watched</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-background/60 p-2 text-xs">
                    <div className="font-bold uppercase text-muted-foreground">Next Best Action</div>
                    <div className="mt-1 text-foreground">{autonomousSpecAgent.nextBestAction}</div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(autonomousSpecAgent.recommendedActions || []).slice(0, 4).map((item: any, index: number) => (
                      <div key={`${item.domain}-${item.sourceRecordId || index}`} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline">{item.type}</Badge>
                          <Badge variant="secondary">{item.riskLevel}</Badge>
                          {item.automationCandidate && <Badge variant="outline">Automation Candidate</Badge>}
                        </div>
                        <div className="mt-1 font-semibold text-foreground">{item.title}</div>
                        <div className="mt-1 text-muted-foreground">{item.reason}</div>
                        <div className="mt-1 text-foreground">Next Best Action: {item.nextBestAction}</div>
                      </div>
                    ))}
                  </div>
                </CollapsibleCommandSection>
              )}

              {specChangeImpactEngine && (
                <CollapsibleCommandSection
                  title="Spec Change Impact Engine"
                  summary={<Badge variant="outline">{specChangeImpactEngine.highImpact || 0} high impact</Badge>}
                  description="Compares addenda and revised specs against downstream work so PMs can see pricing, schedule, submittal, billing, RFI, and subcontractor impacts before they become problems."
                  className="border border-red-500/30 bg-red-500/10"
                  collapsed={isCollapsed("specChangeImpactEngine", (specChangeImpactEngine.highImpact || 0) === 0)}
                  onToggle={() => toggleSection("specChangeImpactEngine", (specChangeImpactEngine.highImpact || 0) === 0)}
                >
                  <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-red-300">{specChangeImpactEngine.totalChanges || 0}</div>
                      <div className="text-muted-foreground">Spec Changes</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-orange-300">{specChangeImpactEngine.highImpact || 0}</div>
                      <div className="text-muted-foreground">High Impact</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-amber-300">{specChangeImpactEngine.downstreamRecordsAffected || 0}</div>
                      <div className="text-muted-foreground">Downstream Records Affected</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-cyan-300">{specChangeImpactEngine.modulesAffected?.length || 0}</div>
                      <div className="text-muted-foreground">Modules Affected</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(specChangeImpactEngine.impacts || []).slice(0, 5).map((impact: any, index: number) => (
                      <div key={`${impact.changeType}-${impact.title}-${index}`} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline">{impact.changeType?.replace(/_/g, " ")}</Badge>
                          <Badge variant="secondary">{impact.severity}</Badge>
                          <Badge variant="outline">{impact.severityScore}%</Badge>
                        </div>
                        <div className="mt-1 font-semibold text-foreground">{impact.title}</div>
                        <div className="mt-1 text-muted-foreground">
                          {(impact.affectedModules || []).join(", ") || "Review"} - {(impact.impactedRecords || []).length} record{(impact.impactedRecords || []).length === 1 ? "" : "s"} affected
                        </div>
                        <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2">
                          <div className="font-bold uppercase text-foreground">Recommended Action</div>
                          <div className="mt-1 text-muted-foreground">{impact.recommendedAction}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleCommandSection>
              )}

              {bidPackageIntelligence && (
                <CollapsibleCommandSection
                  title="Bid Package / Subcontractor Intelligence"
                  summary={<Badge variant="outline">{String(bidPackageIntelligence.status || "waiting").replace(/_/g, " ")}</Badge>}
                  description="Builds subcontractor-facing bid packages, scope sheets, invitation drafts, submittal requirements, and follow-up paths from approved spec intelligence."
                  className="border border-cyan-500/30 bg-cyan-500/10"
                  collapsed={isCollapsed("bidPackageIntelligence", true)}
                  onToggle={() => toggleSection("bidPackageIntelligence", true)}
                >
                  <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-5">
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-cyan-300">{bidPackageIntelligence.totals?.tradePackages || 0}</div>
                      <div className="text-muted-foreground">Trade Packages</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-orange-300">{bidPackageIntelligence.totals?.bidInvitations || 0}</div>
                      <div className="text-muted-foreground">Bid Invitations</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-green-300">{bidPackageIntelligence.totals?.scopeSheets || 0}</div>
                      <div className="text-muted-foreground">Scope Sheets</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-amber-300">{bidPackageIntelligence.totals?.submittalRequirements || 0}</div>
                      <div className="text-muted-foreground">Submittal Requirements</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-violet-300">{bidPackageIntelligence.totals?.reminderPaths || 0}</div>
                      <div className="text-muted-foreground">Reminder Paths</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(bidPackageIntelligence.tradePackages || []).slice(0, 4).map((pkg: any) => (
                      <div key={pkg.packageName} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline">{pkg.trade}</Badge>
                          <Badge variant="secondary">{pkg.status}</Badge>
                          <Badge variant="outline">Recommended Subs: {pkg.recommendedSubcontractors?.length || 0}</Badge>
                        </div>
                        <div className="mt-1 font-semibold text-foreground">{pkg.packageName}</div>
                        <div className="mt-1 text-muted-foreground">
                          {(pkg.scopeInclusions || []).slice(0, 2).join(" / ") || "Scope sheet ready for review"}
                        </div>
                        {(pkg.submittalRequirements || []).length > 0 && (
                          <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2">
                            <div className="font-bold uppercase text-foreground">Submittal Requirements</div>
                            <div className="mt-1 text-muted-foreground">{pkg.submittalRequirements.slice(0, 2).map((item: any) => item.title).join(" / ")}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(bidPackageIntelligence.bidInvitations || []).length > 0 && (
                    <div className="mt-3 rounded-md border border-border bg-background/60 p-2 text-xs">
                      <div className="font-bold uppercase text-muted-foreground">Bid Invitations</div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {bidPackageIntelligence.bidInvitations.slice(0, 4).map((invite: any, index: number) => (
                          <div key={`${invite.trade}-${invite.company}-${index}`} className="rounded-md border border-border bg-background/70 p-2">
                            <div className="font-semibold text-foreground">{invite.company}</div>
                            <div className="text-muted-foreground">{invite.trade} - {invite.inviteStatus}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleCommandSection>
              )}

              {confidenceScoringV2 && (
                <CollapsibleCommandSection
                  title="Confidence Scoring v2"
                  summary={<Badge variant="outline">Confidence Band</Badge>}
                  description="Shows which extracted obligations are reliable, which need review, and why the confidence score moved up or down."
                  className="border border-violet-500/30 bg-violet-500/10"
                  collapsed={isCollapsed("confidenceScoringV2", (confidenceScoringV2.watchItems || 0) === 0)}
                  onToggle={() => toggleSection("confidenceScoringV2", (confidenceScoringV2.watchItems || 0) === 0)}
                >
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className={`text-lg font-bold ${scoreTone(confidenceScoringV2.averageScore || 0)}`}>{confidenceScoringV2.averageScore || 0}%</div>
                      <div className="text-muted-foreground">Average</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-green-300">{confidenceScoringV2.highConfidence || 0}</div>
                      <div className="text-muted-foreground">High</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-amber-300">{confidenceScoringV2.watchItems || 0}</div>
                      <div className="text-muted-foreground">Watch</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(confidenceScoringV2.rows || []).slice(0, 4).map((item: any) => (
                      <div key={item.itemId} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline">{item.confidenceBand}</Badge>
                          <Badge variant="secondary">{item.score}%</Badge>
                        </div>
                        <div className="mt-1 font-semibold text-foreground">{item.title}</div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-muted-foreground">
                          <div>Source Quality: {item.sourceQuality}%</div>
                          <div>Duplicate Evidence: {item.duplicateEvidence}%</div>
                          <div>Contradiction Risk: {item.contradictionRisk}%</div>
                          <div>Downstream Readiness: {item.downstreamReadiness}%</div>
                        </div>
                        <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2">
                          <div className="font-bold uppercase text-foreground">Score Drivers</div>
                          <div className="mt-1 text-muted-foreground">{(item.scoreDrivers || []).join(" / ")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleCommandSection>
              )}

              {addendaDelta && (
                <CollapsibleCommandSection
                  title="Addenda Delta"
                  summary={<Badge variant="outline">{addendaDelta.hasComparison ? "Compared" : "Waiting"}</Badge>}
                  description="Summarizes what changed between the latest intake and the prior spec/addenda run."
                  className="border border-cyan-500/30 bg-cyan-500/10"
                  collapsed={isCollapsed("addendaDelta", !addendaDelta.hasComparison)}
                  onToggle={() => toggleSection("addendaDelta", !addendaDelta.hasComparison)}
                >
                  <p className="text-sm text-muted-foreground">{addendaDelta.changeSummary}</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-green-300">{addendaDelta.addedItems?.length || 0}</div>
                      <div className="text-muted-foreground">New Obligations</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-red-300">{addendaDelta.removedItems?.length || 0}</div>
                      <div className="text-muted-foreground">Removed</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-amber-300">{addendaDelta.changedItems?.length || 0}</div>
                      <div className="text-muted-foreground">Changed</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="text-lg font-bold text-orange-300">{addendaDelta.newRiskItems?.length || 0}</div>
                      <div className="text-muted-foreground">New Risks</div>
                    </div>
                  </div>
                  {addendaDelta.addedItems?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {addendaDelta.addedItems.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="rounded-md border border-border bg-background/60 p-2 text-xs">
                          <span className="font-semibold text-foreground">{item.title}</span>
                          <span className="text-muted-foreground"> - {item.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleCommandSection>
              )}

              <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Gauge className="size-4 text-cyan-300" />
                Needs Attention
              </div>
              <p className="mb-3 text-xs leading-5 text-muted-foreground">
                The quick health view: readiness, blockers, and visible risk counts without opening every intelligence panel.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {readiness.map((lane: any) => (
                  <div key={lane.label} className="rounded-lg border border-border bg-background/65 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{lane.label}</div>
                      <Badge variant="outline" className={statusTone(lane.status)}>{lane.status}</Badge>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(0, Math.min(100, lane.score || 0))}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{lane.score}% complete</div>
                    {lane.blockers?.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Blockers:</span> {lane.blockers.slice(0, 2).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                <AlertTriangle className="size-4 text-amber-300" />
                Attention Flags
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {[
                  ["Low confidence", attentionFlags.lowConfidence || 0],
                  ["Conflicts", attentionFlags.conflicts || 0],
                  ["Duplicates", attentionFlags.duplicates || 0],
                  ["Open RFIs", attentionFlags.openRfis || 0],
                  ["Pending submittals", attentionFlags.pendingSubmittals || 0],
                  ["Missing owner/date", attentionFlags.missingOwnersOrDates || 0],
                  ["Estimate inputs", attentionFlags.activeEstimateRequirements || 0],
                  ["Billing rules", attentionFlags.activePaymentRules || 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-background/65 p-3">
                    <div className="text-2xl font-bold text-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                <AlertTriangle className="size-4 text-red-300" />
                Conflict Watch
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-background/65 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">Conflicts</div>
                    <Badge variant="outline">{conflictSignals.length}</Badge>
                  </div>
                  {conflictSignals.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">No obvious contradictory spec clauses detected.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {conflictSignals.slice(0, 3).map((item: any, index: number) => (
                        <div key={`${item.title}-${index}`} className="rounded-md border border-red-500/25 bg-red-500/10 p-2 text-xs">
                          <div className="font-semibold text-red-100">{item.title}</div>
                          <div className="mt-1 text-muted-foreground">{item.reason}</div>
                          {item.rfiRecommended && <Badge variant="outline" className="mt-2 border-amber-500/30 bg-amber-500/10 text-amber-100">RFI recommended</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-background/65 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">Duplicates</div>
                    <Badge variant="outline">{duplicateSignals.length}</Badge>
                  </div>
                  {duplicateSignals.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">No repeated obligations detected in the current matrix.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {duplicateSignals.slice(0, 3).map((item: any, index: number) => (
                        <div key={`${item.title}-${index}`} className="rounded-md border border-amber-500/25 bg-amber-500/10 p-2 text-xs">
                          <div className="font-semibold text-amber-100">{item.title}</div>
                          <div className="mt-1 text-muted-foreground">{item.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <CollapsibleCommandSection
              title="More Intelligence"
              summary={<Badge variant="outline">{moreIntelligenceCount} detail signal{moreIntelligenceCount === 1 ? "" : "s"}</Badge>}
              description="Keeps the detailed evidence, audit history, confidence scoring, and follow-up queues available without crowding the board."
              className="border border-slate-500/30 bg-slate-500/10"
              collapsed={isCollapsed("moreIntelligence", moreIntelligenceCount === 0)}
              onToggle={() => toggleSection("moreIntelligence", moreIntelligenceCount === 0)}
            >
            {exceptionDashboard && (
              <CollapsibleCommandSection
                title="Exception Dashboard"
                summary={<Badge variant="outline">{exceptionDashboard.total || 0} open</Badge>}
                description="Highlights failed runs, missing downstream links, low-confidence items, and approved work that still needs action."
                className="border border-red-500/30 bg-red-500/10"
                collapsed={isCollapsed("exceptionDashboard", (exceptionDashboard.total || 0) === 0)}
                onToggle={() => toggleSection("exceptionDashboard", (exceptionDashboard.total || 0) === 0)}
              >
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <div className="text-lg font-bold text-red-300">{exceptionDashboard.byType?.failed_run || 0}</div>
                    <div className="text-muted-foreground">Failed Runs</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <div className="text-lg font-bold text-amber-300">{exceptionDashboard.byType?.low_confidence || 0}</div>
                    <div className="text-muted-foreground">Low Confidence</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <div className="text-lg font-bold text-orange-300">{exceptionDashboard.byType?.missing_destination || 0}</div>
                    <div className="text-muted-foreground">Missing Destination</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <div className="text-lg font-bold text-cyan-300">{exceptionDashboard.byType?.approved_not_committed || 0}</div>
                    <div className="text-muted-foreground">Approved Not Committed</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(exceptionDashboard.rows || []).slice(0, 4).map((item: any, index: number) => (
                    <div key={`${item.type}-${item.itemId || index}`} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline">{item.type.replace(/_/g, " ")}</Badge>
                        <Badge variant="secondary">{item.severity}</Badge>
                        <Badge variant="outline">{item.ownerHint}</Badge>
                      </div>
                      <div className="mt-1 font-semibold text-foreground">{item.title}</div>
                      {item.note && <div className="mt-1 text-muted-foreground">{item.note}</div>}
                      {(item.sourceSpecSection || item.sourceQuote) && (
                        <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                          <div className="font-bold uppercase text-foreground">Source Evidence</div>
                          {item.sourceSpecSection && <div>Spec: {item.sourceSpecSection}</div>}
                          {item.sourceQuote && <div className="mt-1 line-clamp-2">"{item.sourceQuote}"</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleCommandSection>
            )}

            <CollapsibleCommandSection
              title="Spec Intelligence Audit Trail"
              summary={<Badge variant="outline">{auditTrail.length} Audit Event{auditTrail.length === 1 ? "" : "s"}</Badge>}
              description="Shows the audit history behind extraction, review, publish, and closed-loop sync events."
              className="border border-sky-500/30 bg-sky-500/10"
              collapsed={isCollapsed("auditTrail", true)}
              onToggle={() => toggleSection("auditTrail", true)}
            >
              <div className="space-y-2">
                {auditTrail.length === 0 ? (
                  <p className="rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                    No audit events yet. Run the Spec Intelligence Intake Matrix to start the trail.
                  </p>
                ) : (
                  auditTrail.slice(0, 5).map((event: any, index: number) => (
                    <div key={`${event.type}-${event.itemId || event.runId || index}`} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline">Audit Event</Badge>
                        <Badge variant="secondary">{event.type === "closed_loop_sync" ? "Closed Loop Sync" : event.type.replace(/_/g, " ")}</Badge>
                        {event.destination && <Badge variant="outline">{event.destination}</Badge>}
                      </div>
                      <div className="mt-1 font-semibold text-foreground">{event.title}</div>
                      <div className="mt-1 text-muted-foreground">
                        {event.actor} {event.status ? `- ${event.status}` : ""} {event.recordId ? `- record ${event.recordId}` : ""}
                      </div>
                      {event.resolvedByRecordType && <div className="mt-1 text-muted-foreground">Resolved by: {event.resolvedByRecordType}</div>}
                      {(event.sourceSpecSection || event.sourceQuote) && (
                        <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                          <div className="font-bold uppercase text-foreground">Source Evidence</div>
                          {event.sourceSpecSection && <div>Spec: {event.sourceSpecSection}</div>}
                          {event.sourceQuote && <div className="mt-1 line-clamp-2">"{event.sourceQuote}"</div>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CollapsibleCommandSection>

            {publishControlCenter && (
              <CollapsibleCommandSection
                title="Commit / Publish Control Center"
                summary={<Badge variant="outline">{publishControlCenter.reviewNeeded || 0} need review</Badge>}
                description="Shows what has been reviewed, approved, and pushed downstream to RFIs, tasks, submittals, estimating, billing, and schedule logic."
                className="border border-green-500/30 bg-green-500/10"
                collapsed={isCollapsed("publishControlCenter", (publishControlCenter.readyToCommit || 0) === 0)}
                onToggle={() => toggleSection("publishControlCenter", (publishControlCenter.readyToCommit || 0) === 0)}
              >
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <div className="text-lg font-bold text-amber-300">{publishControlCenter.readyToCommit || 0}</div>
                    <div className="text-muted-foreground">Ready to Commit</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <div className="text-lg font-bold text-green-300">{publishControlCenter.publishedRecords || 0}</div>
                    <div className="text-muted-foreground">Published Downstream</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {publishDestinationRows.map((destination: any) => (
                    <div key={destination.label} className="rounded-md border border-border bg-background/60 p-2">
                      <div className="font-semibold">{destination.label}</div>
                      <div className="mt-1 text-muted-foreground">
                        {destination.ready || 0} ready / {destination.published || 0} published
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Downstream Ledger</div>
                  {(publishControlCenter.downstreamLedger || []).length === 0 ? (
                    <p className="rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      No published downstream records yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(publishControlCenter.downstreamLedger || []).slice(0, 5).map((entry: any) => (
                        <div key={`${entry.itemId}-${entry.recordId || entry.recordType}`} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline">{entry.destination}</Badge>
                            <Badge variant="secondary">{entry.recordType}</Badge>
                          </div>
                          <div className="mt-1 font-semibold text-foreground">{entry.title}</div>
                          <div className="mt-1 text-muted-foreground">Record: {entry.recordId || "pending link"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleCommandSection>
            )}

            <CollapsibleCommandSection
              title="Reminder / Follow-up Automation"
              summary={<Badge variant="outline">{reminderSummary.total || 0} queued</Badge>}
              description="Tracks due-date reminders for RFIs, submittals, subcontractor requests, and task owners."
              className="border border-cyan-500/30 bg-cyan-500/10"
              collapsed={isCollapsed("reminderAutomation", (reminderSummary.overdue || 0) === 0 && (reminderSummary.dueToday || 0) === 0)}
              onToggle={() => toggleSection("reminderAutomation", (reminderSummary.overdue || 0) === 0 && (reminderSummary.dueToday || 0) === 0)}
            >
              <div className="mb-2 flex items-center gap-2 font-bold">
                <BellRing className="size-4 text-cyan-200" />
                Reminder / Follow-up Automation
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-md border border-border bg-background/60 p-2">
                  <div className="text-lg font-bold text-red-300">{reminderSummary.overdue || 0}</div>
                  <div className="text-muted-foreground">Overdue</div>
                </div>
                <div className="rounded-md border border-border bg-background/60 p-2">
                  <div className="text-lg font-bold text-amber-300">{reminderSummary.dueSoon || 0}</div>
                  <div className="text-muted-foreground">Due soon</div>
                </div>
                <div className="rounded-md border border-border bg-background/60 p-2">
                  <div className="text-lg font-bold text-cyan-300">{reminderSummary.dueToday || 0}</div>
                  <div className="text-muted-foreground">Due today</div>
                </div>
                <div className="rounded-md border border-border bg-background/60 p-2">
                  <div className="text-lg font-bold text-orange-300">{reminderSummary.subcontractorRequests || 0}</div>
                  <div className="text-muted-foreground">Subcontractor requests</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {reminderQueue.length === 0 ? (
                  <p className="rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                    No due-date reminders are waiting right now.
                  </p>
                ) : (
                  reminderQueue.slice(0, 5).map((item: any) => (
                    <div key={`${item.recordType}-${item.recordId}`} className="rounded-md border border-border bg-background/65 p-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline">{item.recordType.replace(/_/g, " ")}</Badge>
                            <Badge variant="secondary">{item.status.replace(/_/g, " ")}</Badge>
                          </div>
                          <div className="mt-1 font-semibold text-foreground">{item.title}</div>
                          <div className="mt-1 text-muted-foreground">
                            {item.reason} {item.dueDate ? `- due ${item.dueDate}` : ""} {item.owner ? `- ${item.owner}` : ""}
                          </div>
                          {item.email && <div className="mt-1 text-cyan-200">{item.email}</div>}
                          {item.lastReminderStatus && (
                            <div className="mt-1 text-muted-foreground">
                              Last reminder: {item.lastReminderStatus}
                              {item.lastReminderChannel ? ` by ${item.lastReminderChannel}` : ""}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            disabled={sendingReminderId === `email-${item.recordId}`}
                            onClick={() => handleSendReminder(item, "email")}
                          >
                            {sendingReminderId === `email-${item.recordId}` ? "Sending..." : "Send email"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            disabled={sendingReminderId === `sms-${item.recordId}`}
                            onClick={() => handleSendReminder(item, "sms")}
                          >
                            {sendingReminderId === `sms-${item.recordId}` ? "Sending..." : "Send text"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            disabled={markingReminderId === item.recordId}
                            onClick={() => handleMarkReminder(item)}
                          >
                            {markingReminderId === item.recordId ? "Marking..." : "Mark reminded"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleCommandSection>

            {handoffPacket && (
              <CollapsibleCommandSection
                title="Bid-to-Build Handoff Packet"
                summary={<Badge variant="outline">PM Readiness</Badge>}
                description="Summarizes what estimating and PM need to know when the project moves from bid to build."
                className="border border-orange-500/30 bg-orange-500/10"
                collapsed={isCollapsed("handoffPacket", true)}
                onToggle={() => toggleSection("handoffPacket", true)}
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">Executive Summary</div>
                    <p className="mt-1 text-muted-foreground">{handoffPacket.executiveSummary}</p>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">PM Readiness</div>
                    <p className="mt-1 text-muted-foreground">{handoffPacket.pmReadinessNarrative}</p>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">Downstream Summary</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      {Object.entries(handoffPacket.downstreamSummary || {}).map(([label, value]) => (
                        <div key={label} className="rounded-md border border-border bg-background/60 p-2">
                          <div className="text-lg font-bold text-foreground">{String(value)}</div>
                          <div className="capitalize text-muted-foreground">{label.replace(/([A-Z])/g, " $1")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">Open Risks</div>
                    {handoffPacket.openRisks?.length ? (
                      <div className="mt-2 space-y-1">
                        {handoffPacket.openRisks.slice(0, 3).map((risk: any, index: number) => (
                          <div key={`${risk.title}-${index}`} className="rounded-md border border-border bg-background/60 p-2 text-xs">
                            <span className="font-semibold text-foreground">{risk.title}</span>
                            <span className="text-muted-foreground"> - {risk.reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">No open risk signals in the current handoff packet.</p>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">Next Steps</div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(handoffPacket.nextSteps || []).slice(0, 5).map((step: string) => <li key={step}>- {step}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">Source Documents</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(handoffPacket.sourceDocuments || []).map((doc: any) => (
                        <Badge key={`${doc.name}-${doc.status}`} variant="outline">{doc.name || "Spec source"}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleCommandSection>
            )}
            <CollapsibleCommandSection
              title="Action Queue"
              summary={<Badge variant="outline">{actionQueue.length} open</Badge>}
              description="Lists the most immediate operational actions generated by the spec intelligence system."
              className="border border-green-500/30 bg-green-500/10"
              collapsed={isCollapsed("actionQueue", actionQueue.length === 0)}
              onToggle={() => toggleSection("actionQueue", actionQueue.length === 0)}
            >
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <ListChecks className="size-4 text-green-300" />
              Action Queue
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {actionQueue.length === 0 ? (
                <div className="rounded-lg border border-border bg-background/65 p-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="mb-2 size-5 text-green-300" />
                  No urgent spec intelligence actions. This project is in good handoff shape.
                </div>
              ) : (
                actionQueue.map((item: any, index: number) => (
                  <div key={`${item.type}-${index}`} className="rounded-lg border border-border bg-background/70 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.type}</Badge>
                      <Badge variant="secondary">{item.priority}</Badge>
                    </div>
                    <div className="mt-2 font-semibold">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.reason}</div>
                    {(item.sourceSpecSection || item.sourceQuote) && (
                      <div className="mt-2 rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                        <div className="font-bold uppercase text-foreground">Source Evidence</div>
                        {item.sourceSpecSection && <div>Spec: {item.sourceSpecSection}</div>}
                        {item.sourceQuote && <div className="mt-1 line-clamp-2">"{item.sourceQuote}"</div>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            </CollapsibleCommandSection>
            </CollapsibleCommandSection>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
