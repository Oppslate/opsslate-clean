"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Input } from "@opsslate/suite-ui/input";
import { useAuth } from "@/lib/auth-context";
import type { Id } from "../../../convex/_generated/dataModel";

function EmailRepoContent() {
  const { user } = useAuth();
  const allEmails = useQuery(api.emails.list, user ? { companyId: user.companyId as string } : "skip") as any[] | undefined;
  const rescueInbox = useQuery((api as any).emails.rescueInbox, user ? { companyId: user.companyId as string, companyName: (user as any).companyName || (user as any).company || user.name } : "skip") as any | undefined;
  const communicationIntakeMatrix = useQuery((api as any).emails.communicationIntakeMatrix, user ? { companyId: user.companyId as string } : "skip") as any | undefined;
  const communicationRiskIntelligence = useQuery((api as any).emails.communicationRiskIntelligence, user ? { companyId: user.companyId as string } : "skip") as any | undefined;
  const inboundAddresses = useQuery((api as any).inboundEmailAddresses.list, user ? { companyId: String(user.companyId) } : "skip") as any[] | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const updateEmail = useMutation(api.emails.update);
  const createContact = useMutation(api.contacts.create);

  const [pipelineFilter, setPipelineFilter] = useState<"inbox" | "processing" | "filed" | "all">("inbox");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [assignProject, setAssignProject] = useState("");

  const counts = useMemo(() => {
    if (!allEmails) return { inbox: 0, processing: 0, filed: 0, all: 0 };
    return {
      inbox: allEmails.filter((email) => !email.pipelineStatus || email.pipelineStatus === "inbox").length,
      processing: allEmails.filter((email) => email.pipelineStatus === "processing").length,
      filed: allEmails.filter((email) => email.pipelineStatus === "filed" || email.pipelineStatus === "assigned").length,
      all: allEmails.length,
    };
  }, [allEmails]);

  const rescueCards = [
    { key: "needs_response", label: "Needs Response", count: rescueInbox?.summary?.needsResponse || 0, description: "Emails that look like they need a reply, clarification, or leadership attention.", color: "border-red-500/30 bg-red-500/10 text-red-100" },
    { key: "needs_action", label: "Needs Action", count: rescueInbox?.summary?.needsAction || 0, description: "Requests, due dates, submittals, RFIs, or tasks that should become project action.", color: "border-orange-500/30 bg-orange-500/10 text-orange-100" },
    { key: "filed_to_project", label: "Filed Automatically", count: rescueInbox?.summary?.filedAutomatically || 0, description: "Emails OpsSlate confidently routed to the right project with no immediate action needed.", color: "border-green-500/30 bg-green-500/10 text-green-100" },
    { key: "needs_help_sorting", label: "Needs Help Sorting", count: rescueInbox?.summary?.needsHelpSorting || 0, description: "Low-confidence emails where one click teaches the router what to do next time.", color: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100" },
  ];

  const activeForwardingAddresses = useMemo(
    () => (inboundAddresses || []).filter((address) => address.status !== "paused"),
    [inboundAddresses]
  );
  const primaryForwardingAddress = activeForwardingAddresses[0]?.fullAddress || "project@inbound.opsslate.app";

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    (projects || []).forEach((project: any) => map.set(project._id, project.name));
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!allEmails) return [];
    let list = allEmails;
    if (pipelineFilter === "inbox") list = list.filter((email) => !email.pipelineStatus || email.pipelineStatus === "inbox");
    if (pipelineFilter === "processing") list = list.filter((email) => email.pipelineStatus === "processing");
    if (pipelineFilter === "filed") list = list.filter((email) => email.pipelineStatus === "filed" || email.pipelineStatus === "assigned");
    if (search.trim()) {
      const needle = search.toLowerCase();
      list = list.filter((email) => [email.subject, email.from, email.body, email.bodyPreview].filter(Boolean).join(" ").toLowerCase().includes(needle));
    }
    return [...list].sort((first, second) => (second.createdAt || 0) - (first.createdAt || 0));
  }, [allEmails, pipelineFilter, search]);

  async function handleAssign(emailId: string, projectId: string) {
    await updateEmail({
      id: emailId as Id<"emails">,
      projectId,
      pipelineStatus: "assigned",
      routingConfidence: 100,
      communicationBucket: "filed_to_project",
      suggestedNextAction: "Filed to the selected project by user review.",
    } as any);
    setSelectedEmail(null);
    setAssignProject("");
  }

  async function handleAddContactCandidate(candidate: any) {
    if (!candidate.projectId) return;
    const parts = String(candidate.name || candidate.email || "Project Contact").trim().split(/\s+/);
    const firstName = parts.shift() || "Project";
    const lastName = parts.join(" ");
    await createContact({
      projectId: candidate.projectId as Id<"projects">,
      firstName,
      lastName: lastName || undefined,
      company: candidate.company || undefined,
      title: candidate.title || undefined,
      role: candidate.title || "Project Contact",
      phone: candidate.phone || undefined,
      email: candidate.email || undefined,
      notes: `Added from Communication Risk & Relationship Intelligence. Source: ${candidate.sourceEvidence || "email"}`,
      status: "Active",
    });
  }

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Communication Rescue Inbox</h1>
        <p className="text-sm text-muted-foreground">Today’s save-your-sanity list: what needs a reply, what needs action, what filed itself, and what needs one quick routing decision.</p>
      </div>

      <Card className="border-cyan-500/25 bg-[linear-gradient(135deg,rgba(6,182,212,0.12),rgba(249,115,22,0.08),rgba(2,6,23,0.72))]">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-cyan-200">Forward everything here</div>
              <div className="mt-1 text-2xl font-bold">{primaryForwardingAddress}</div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Use a company or project address like project@inbound.opsslate.app. Create any address you want, then Gmail, Outlook, Exchange, or any server can forward project email into OpsSlate.
              </p>
              {activeForwardingAddresses.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeForwardingAddresses.slice(0, 4).map((address) => (
                    <button
                      key={address._id}
                      type="button"
                      className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                      onClick={() => navigator.clipboard.writeText(address.fullAddress)}
                    >
                      {address.fullAddress}
                    </button>
                  ))}
                </div>
              )}
              {activeForwardingAddresses.length === 0 && (
                <p className="mt-2 text-xs text-orange-200">
                  No custom inbound address exists yet. Create address in Settings, then use project@inbound.opsslate.app or any company address you choose.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(primaryForwardingAddress)}>
                Copy address
              </Button>
              <Link href="/settings">
                <Button>Create address</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            {rescueCards.map((card) => (
              <div key={card.key} className={`rounded-lg border p-3 ${card.color}`}>
                <div className="text-3xl font-bold">{card.count}</div>
                <div className="mt-1 font-semibold">{card.label}</div>
                <p className="mt-1 text-xs leading-5 opacity-85">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-background/65 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-bold">Today’s save-your-sanity list</div>
              <Badge variant="outline">{rescueInbox?.topItems?.length || 0} priority item{(rescueInbox?.topItems?.length || 0) === 1 ? "" : "s"}</Badge>
            </div>
            {(rescueInbox?.topItems || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing urgent is waiting. OpsSlate will keep filing the background noise and surface the next real issue here.</p>
            ) : (
              <div className="space-y-2">
                {(rescueInbox?.topItems || []).slice(0, 6).map((item: any) => (
                  <div key={item.id} className="rounded-md border border-border bg-secondary/30 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{String(item.bucket || "").replace(/_/g, " ")}</Badge>
                      <Badge variant="secondary">{String(item.category || "").replace(/_/g, " ")}</Badge>
                      <Badge variant="outline">routeConfidence {item.routeConfidence || 0}%</Badge>
                      <Badge variant="outline">{item.priorityScore || 0} priority</Badge>
                    </div>
                    <div className="mt-2 font-semibold">{item.subject || "(No subject)"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.from || "Unknown sender"} {item.projectName ? `- ${item.projectName}` : "- unassigned"}</div>
                    {item.bodyPreview && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.bodyPreview}</p>}
                    <div className="mt-2 rounded-md border border-border bg-background/50 p-2 text-xs">
                      <span className="font-bold text-foreground">Suggested next action: </span>
                      <span className="text-muted-foreground">{item.suggestedNextAction}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-500/25 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(6,182,212,0.07),rgba(2,6,23,0.72))]">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">AI Communication Intake Matrix</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Reads important emails and extracts reviewable project intelligence: tasks, RFIs, submittals, due dates, cost impacts, schedule impacts, contract notices, responsible parties, source quote, and confidence.
              </p>
            </div>
            <Badge variant="outline">{communicationIntakeMatrix?.summary?.items || 0} review items</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-7">
            {[
              ["Tasks", communicationIntakeMatrix?.summary?.tasks || 0],
              ["RFIs", communicationIntakeMatrix?.summary?.rfis || 0],
              ["Submittals", communicationIntakeMatrix?.summary?.submittals || 0],
              ["Due Dates", communicationIntakeMatrix?.summary?.dueDates || 0],
              ["Cost Impacts", communicationIntakeMatrix?.summary?.costImpacts || 0],
              ["Schedule Impacts", communicationIntakeMatrix?.summary?.scheduleImpacts || 0],
              ["Contract Notices", communicationIntakeMatrix?.summary?.contractNotices || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-background/60 p-2">
                <div className="text-lg font-bold text-orange-300">{value}</div>
                <div className="text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {(communicationIntakeMatrix?.items || []).length === 0 ? (
              <p className="rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                No communication intake items are waiting for review. Important emails will appear here as OpsSlate extracts them.
              </p>
            ) : (
              (communicationIntakeMatrix?.items || []).slice(0, 6).map((item: any) => (
                <div key={item.id} className="rounded-md border border-border bg-background/65 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{String(item.type || "").replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary">Confidence {item.confidence || 0}%</Badge>
                    <Badge variant="outline">{item.reviewStatus?.replace(/_/g, " ") || "needs review"}</Badge>
                  </div>
                  <div className="mt-2 font-semibold text-foreground">{item.title}</div>
                  <div className="mt-1 text-muted-foreground">
                    Responsible Party: {item.responsibleParty || "Unassigned"}
                    {item.dueDate ? ` - Due: ${item.dueDate}` : ""}
                  </div>
                  <div className="mt-2 rounded-md border border-border bg-secondary/25 p-2">
                    <div className="font-bold uppercase text-foreground">Source Quote</div>
                    <div className="mt-1 text-muted-foreground">"{item.sourceQuote}"</div>
                  </div>
                  <div className="mt-2 text-muted-foreground">{item.suggestedAction}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan-500/25 bg-[linear-gradient(135deg,rgba(6,182,212,0.10),rgba(15,23,42,0.84))]">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Communication Risk & Relationship Intelligence</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Evidence-based readout from project email language: contact candidates, tone, priority, relationship trend, conversation direction, recommended response posture, and communication profile.
              </p>
            </div>
            <Badge variant="outline">{communicationRiskIntelligence?.summary?.emails || 0} emails reviewed</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-6">
            {[
              ["Contact Candidates", communicationRiskIntelligence?.summary?.contactCandidates || 0],
              ["Tone & Priority", (communicationRiskIntelligence?.summary?.highPriority || 0) + (communicationRiskIntelligence?.summary?.critical || 0)],
              ["Relationship Trend", communicationRiskIntelligence?.summary?.deteriorating || 0],
              ["Conversation Direction", communicationRiskIntelligence?.summary?.legalNotice || 0],
              ["Recommended Response Posture", communicationRiskIntelligence?.summary?.argumentative || 0],
              ["Communication Profile", communicationRiskIntelligence?.summary?.profiles || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-background/60 p-2">
                <div className="text-lg font-bold text-cyan-300">{value}</div>
                <div className="text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-bold">Contact Candidates</div>
                <Badge variant="outline">{communicationRiskIntelligence?.contactCandidates?.length || 0}</Badge>
              </div>
              <div className="space-y-2">
                {(communicationRiskIntelligence?.contactCandidates || []).slice(0, 5).map((candidate: any) => (
                  <div key={candidate.id} className="rounded-md border border-border bg-secondary/25 p-2 text-xs">
                    <div className="font-semibold text-foreground">{candidate.name || "Unknown contact"}</div>
                    <div className="mt-1 text-muted-foreground">{candidate.title || "Title unknown"} {candidate.company ? `- ${candidate.company}` : ""}</div>
                    <div className="mt-1 text-muted-foreground">{candidate.email || "No email"} {candidate.phone ? `- ${candidate.phone}` : ""}</div>
                    <div className="mt-2 rounded border border-border bg-background/60 p-2 text-muted-foreground">{candidate.sourceEvidence}</div>
                    <Button
                      className="mt-2 h-8 w-full"
                      size="sm"
                      variant="outline"
                      disabled={!candidate.projectId}
                      onClick={() => handleAddContactCandidate(candidate)}
                    >
                      Add to Project Contacts
                    </Button>
                  </div>
                ))}
                {(communicationRiskIntelligence?.contactCandidates || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No new contact candidates found yet.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {(communicationRiskIntelligence?.rows || []).slice(0, 5).map((row: any) => (
                <div key={row.id} className="rounded-lg border border-border bg-background/60 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={row.priority === "Critical" ? "destructive" : "outline"}>{row.priority}</Badge>
                    <Badge variant="secondary">{String(row.tone || "").replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">escalationRisk {row.escalationRisk || 0}%</Badge>
                    <Badge variant="outline">toneTrajectory {row.toneTrajectory}</Badge>
                    <Badge variant="outline">{String(row.relationshipTrend || "").replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="mt-2 font-semibold text-foreground">{row.subject || "(No subject)"}</div>
                  <div className="mt-1 text-muted-foreground">{row.from}</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-border bg-secondary/25 p-2">
                      <div className="font-bold text-foreground">Conversation Direction</div>
                      <div className="mt-1 text-muted-foreground">{String(row.conversationDirection || "").replace(/_/g, " ")}</div>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/25 p-2">
                      <div className="font-bold text-foreground">Recommended Response Posture</div>
                      <div className="mt-1 text-muted-foreground">{String(row.recommendedResponsePosture || "").replace(/_/g, " ")}</div>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/25 p-2">
                      <div className="font-bold text-foreground">Communication Profile</div>
                      <div className="mt-1 text-muted-foreground">{String(row.communicationProfile || "").replace(/_/g, " ")} - {row.relationshipHealth}</div>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/25 p-2">
                      <div className="font-bold text-foreground">phrasingSignals</div>
                      <div className="mt-1 text-muted-foreground">{(row.phrasingSignals || []).join(", ") || "none"}</div>
                    </div>
                  </div>
                  <div className="mt-2 rounded-md border border-border bg-secondary/25 p-2">
                    <div className="font-bold text-foreground">Source Evidence</div>
                    <div className="mt-1 text-muted-foreground">"{row.sourceEvidence}"</div>
                  </div>
                  <div className="mt-2 text-muted-foreground">{row.responseGuidance}</div>
                </div>
              ))}
              {(communicationRiskIntelligence?.rows || []).length === 0 && (
                <p className="rounded-lg border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                  Communication intelligence will appear here after project emails are received or imported.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {([
          { key: "inbox", label: "Inbox", count: counts.inbox, color: "border-blue-500/30 bg-blue-500/10", active: "bg-blue-500" },
          { key: "processing", label: "Processing", count: counts.processing, color: "border-yellow-500/30 bg-yellow-500/10", active: "bg-yellow-500" },
          { key: "filed", label: "Filed", count: counts.filed, color: "border-green-500/30 bg-green-500/10", active: "bg-green-500" },
          { key: "all", label: "All", count: counts.all, color: "border-border bg-secondary/30", active: "bg-orange-500" },
        ] as const).map(({ key, label, count, color, active }) => (
          <button
            key={key}
            onClick={() => setPipelineFilter(key)}
            className={`rounded-lg border p-3 text-center transition-all ${pipelineFilter === key ? `${active} border-transparent text-white` : color}`}
          >
            <p className="text-lg font-bold">{count}</p>
            <p className="text-[10px]">{label}</p>
          </button>
        ))}
      </div>

      <Input placeholder="Search emails..." value={search} onChange={(event) => setSearch(event.target.value)} className="bg-secondary" />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
            <p className="text-sm">{pipelineFilter === "inbox" ? "Inbox is empty. The good kind of quiet." : "No emails match this view."}</p>
          </div>
        )}

        {filtered.map((email: any) => {
          const status = email.pipelineStatus || "inbox";
          const projName = email.projectId ? projectMap.get(email.projectId) : null;
          const isSelected = selectedEmail?._id === email._id;

          return (
            <div key={email._id}>
              <div
                className={`cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
                  isSelected ? "border-orange-500/30 bg-orange-500/10" :
                  status === "inbox" ? "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10" :
                  status === "processing" ? "border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10" :
                  "border-border bg-secondary/30 hover:bg-secondary/50"
                }`}
                onClick={() => setSelectedEmail(isSelected ? null : email)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{email.subject || "(No subject)"}</span>
                      {email.hasAttachments && <Badge variant="outline" className="text-[9px]">Attachment</Badge>}
                      {email.importance === "high" && <Badge variant="destructive" className="text-[9px]">Urgent</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{email.from || "Unknown sender"}</span>
                      <span>-</span>
                      <span>{email.date || "No date"}</span>
                    </div>
                    {email.bodyPreview && <p className="mt-0.5 truncate text-xs text-muted-foreground">{email.bodyPreview}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[9px]">{status}</Badge>
                      {email.communicationBucket && <Badge variant="secondary" className="text-[9px]">{email.communicationBucket.replace(/_/g, " ")}</Badge>}
                      {email.communicationCategory && <Badge variant="outline" className="text-[9px]">{email.communicationCategory.replace(/_/g, " ")}</Badge>}
                      {typeof email.routingConfidence === "number" && <Badge variant="outline" className="text-[9px]">{email.routingConfidence}% route</Badge>}
                      {projName && <Badge className="bg-green-500/20 text-[9px] text-green-400">{projName}</Badge>}
                      {email.extractedTasks > 0 && <Badge variant="secondary" className="text-[9px]">{email.extractedTasks} tasks</Badge>}
                      {email.extractedDates > 0 && <Badge variant="secondary" className="text-[9px]">{email.extractedDates} dates</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="mb-2 ml-4 mt-1 space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="grid gap-2 text-xs md:grid-cols-2">
                    <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{email.from}</span></div>
                    <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{email.to || "-"}</span></div>
                    <div><span className="text-muted-foreground">Date:</span> <span>{email.date}</span></div>
                    <div><span className="text-muted-foreground">CC:</span> <span>{email.cc || "-"}</span></div>
                  </div>

                  {email.suggestedNextAction && (
                    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-xs">
                      <span className="font-bold text-cyan-100">Suggested next action: </span>
                      <span className="text-muted-foreground">{email.suggestedNextAction}</span>
                    </div>
                  )}

                  {email.body && <div className="max-h-[300px] overflow-y-auto rounded-lg bg-secondary/30 p-3 text-sm whitespace-pre-wrap">{email.body}</div>}

                  {email.aiSummary && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-2.5">
                      <p className="mb-1 text-[10px] font-bold uppercase text-purple-300">AI Summary</p>
                      <p className="text-xs">{email.aiSummary}</p>
                    </div>
                  )}

                  {email.aiActionItems?.length > 0 && (
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2.5">
                      <p className="mb-1 text-[10px] font-bold uppercase text-orange-300">Action Items</p>
                      {email.aiActionItems.map((item: string) => <p key={item} className="text-xs">- {item}</p>)}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Assign to Project</label>
                      <select
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                        value={assignProject || email.projectId || ""}
                        onChange={(event) => setAssignProject(event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {(projects || []).filter((project: any) => project.status === "Active" || !project.status).map((project: any) => (
                          <option key={project._id} value={project._id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button disabled={!assignProject} onClick={() => handleAssign(email._id, assignProject)}>Assign & File</Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {email.projectId && <Link href={`/job/${email.projectId}`}><Button variant="outline" size="sm">Go to Project</Button></Link>}
                    <Button variant="outline" size="sm" onClick={async () => { await updateEmail({ id: email._id, pipelineStatus: "inbox" }); setSelectedEmail(null); }}>Move to Inbox</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`From: ${email.from}\nTo: ${email.to}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body || ""}`);
                        alert("Copied");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmailsPage() {
  return <AppShell><EmailRepoContent /></AppShell>;
}
