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
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";

function EmailRepoContent() {
  const { user } = useAuth();
  const allEmails = useQuery(api.emails.list, user ? { companyId: user.companyId as string } : "skip") as any[] | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const allPms = useQuery(api.aiPm.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const updateEmail = useMutation(api.emails.update);

  const [pipelineFilter, setPipelineFilter] = useState<"inbox" | "processing" | "filed" | "all">("inbox");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [assignProject, setAssignProject] = useState("");

  // Pipeline counts
  const counts = useMemo(() => {
    if (!allEmails) return { inbox: 0, processing: 0, filed: 0, all: 0 };
    return {
      inbox: allEmails.filter((e) => !e.pipelineStatus || e.pipelineStatus === "inbox").length,
      processing: allEmails.filter((e) => e.pipelineStatus === "processing").length,
      filed: allEmails.filter((e) => e.pipelineStatus === "filed" || e.pipelineStatus === "assigned").length,
      all: allEmails.length,
    };
  }, [allEmails]);

  // Filter emails
  const filtered = useMemo(() => {
    if (!allEmails) return [];
    let list = allEmails;
    if (pipelineFilter === "inbox") list = list.filter((e) => !e.pipelineStatus || e.pipelineStatus === "inbox");
    else if (pipelineFilter === "processing") list = list.filter((e) => e.pipelineStatus === "processing");
    else if (pipelineFilter === "filed") list = list.filter((e) => e.pipelineStatus === "filed" || e.pipelineStatus === "assigned");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((e) => (e.subject || "").toLowerCase().includes(s) || (e.from || "").toLowerCase().includes(s) || (e.body || "").toLowerCase().includes(s));
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [allEmails, pipelineFilter, search]);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    (projects || []).forEach((p: any) => map.set(p._id, p.name));
    return map;
  }, [projects]);

  const handleAssign = async (emailId: string, projectId: string) => {
    await updateEmail({
      id: emailId as Id<"emails">,
      projectId,
      pipelineStatus: "assigned",
    });
    setSelectedEmail(null);
    setAssignProject("");
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">📬 Email Repository</h1>
        <p className="text-sm text-muted-foreground">Central inbox — all emails flow here first</p>
      </div>

      {/* Pipeline Status Bar */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { key: "inbox", label: "📥 Inbox", count: counts.inbox, color: "border-blue-500/30 bg-blue-500/10", active: "bg-blue-500" },
          { key: "processing", label: "⚙️ Processing", count: counts.processing, color: "border-yellow-500/30 bg-yellow-500/10", active: "bg-yellow-500" },
          { key: "filed", label: "📁 Filed", count: counts.filed, color: "border-green-500/30 bg-green-500/10", active: "bg-green-500" },
          { key: "all", label: "📋 All", count: counts.all, color: "border-border bg-secondary/30", active: "bg-orange-500" },
        ] as const).map(({ key, label, count, color, active }) => (
          <button key={key}
            onClick={() => setPipelineFilter(key)}
            className={`rounded-xl border p-3 text-center transition-all ${pipelineFilter === key ? `${active} text-white border-transparent` : color}`}>
            <p className="text-lg font-bold">{count}</p>
            <p className="text-[10px]">{label}</p>
          </button>
        ))}
      </div>

      {/* Workflow Explainer */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground overflow-x-auto pb-1">
        <span className="bg-blue-500/20 px-2 py-0.5 rounded">📥 Email arrives</span>
        <span>→</span>
        <span className="bg-yellow-500/20 px-2 py-0.5 rounded">⚙️ PM scans & reads</span>
        <span>→</span>
        <span className="bg-green-500/20 px-2 py-0.5 rounded">📁 Assigned to project</span>
        <span>→</span>
        <span className="bg-purple-500/20 px-2 py-0.5 rounded">✅ Filed in correspondence</span>
      </div>

      {/* Search */}
      <Input placeholder="Search emails..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary" />

      {/* Email List */}
      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">{pipelineFilter === "inbox" ? "📭" : "📬"}</p>
            <p className="text-sm">{pipelineFilter === "inbox" ? "Inbox is empty — all emails have been processed!" : "No emails match your filter"}</p>
          </div>
        )}
        {filtered.map((email: any) => {
          const status = email.pipelineStatus || "inbox";
          const statusIcon = status === "inbox" ? "📥" : status === "processing" ? "⚙️" : status === "filed" || status === "assigned" ? "📁" : "📧";
          const projName = email.projectId ? projectMap.get(email.projectId) : null;
          const isSelected = selectedEmail?._id === email._id;

          return (
            <div key={email._id}>
              <div
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "bg-orange-500/10 border-orange-500/30" :
                  status === "inbox" ? "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10" :
                  status === "processing" ? "bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10" :
                  "bg-secondary/30 border-border hover:bg-secondary/50"
                }`}
                onClick={() => setSelectedEmail(isSelected ? null : email)}
              >
                <span className="text-base mt-0.5">{statusIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{email.subject || "(No subject)"}</span>
                    {email.hasAttachments && <span className="text-[10px]">📎</span>}
                    {email.importance === "high" && <Badge variant="destructive" className="text-[9px]">Urgent</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{email.from || "?"}</span>
                    <span>•</span>
                    <span>{email.date || "?"}</span>
                  </div>
                  {email.bodyPreview && <p className="text-xs text-muted-foreground mt-0.5 truncate">{email.bodyPreview}</p>}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[9px]">{status}</Badge>
                    {projName && <Badge className="text-[9px] bg-green-500/20 text-green-400">📁 {projName}</Badge>}
                    {email.processedByPm && <Badge variant="secondary" className="text-[9px]">🤖 {email.processedByPm}</Badge>}
                    {email.extractedTasks > 0 && <Badge variant="secondary" className="text-[9px]">✅ {email.extractedTasks} tasks</Badge>}
                    {email.extractedDates > 0 && <Badge variant="secondary" className="text-[9px]">📅 {email.extractedDates} dates</Badge>}
                    {email.source && <Badge variant="secondary" className="text-[9px]">{email.source}</Badge>}
                  </div>
                </div>
              </div>

              {/* Expanded Email Detail */}
              {isSelected && (
                <div className="ml-8 mt-1 mb-2 bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{email.from}</span></div>
                    <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{email.to || "—"}</span></div>
                    <div><span className="text-muted-foreground">Date:</span> <span>{email.date}</span></div>
                    <div><span className="text-muted-foreground">CC:</span> <span>{email.cc || "—"}</span></div>
                  </div>

                  {email.body && (
                    <div className="bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {email.body}
                    </div>
                  )}

                  {email.aiSummary && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold text-purple-400 uppercase mb-1">🧠 AI Summary</p>
                      <p className="text-xs">{email.aiSummary}</p>
                    </div>
                  )}

                  {email.aiActionItems?.length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">✅ Action Items</p>
                      {email.aiActionItems.map((item: string, i: number) => (
                        <p key={i} className="text-xs">• {item}</p>
                      ))}
                    </div>
                  )}

                  {/* Assign to Project */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Assign to Project</label>
                      <select
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                        value={assignProject || email.projectId || ""}
                        onChange={(e) => setAssignProject(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {(projects || []).filter((p: any) => p.status === "Active" || !p.status).map((p: any) => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!assignProject}
                      onClick={() => handleAssign(email._id, assignProject)}
                    >
                      📁 Assign & File
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {email.projectId && (
                      <Link href={`/job/${email.projectId}`}>
                        <Button variant="outline" size="sm" className="text-xs">📂 Go to Project</Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" className="text-xs" onClick={async () => {
                      await updateEmail({ id: email._id, pipelineStatus: "inbox" });
                      setSelectedEmail(null);
                    }}>
                      📥 Move to Inbox
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                      navigator.clipboard.writeText(`From: ${email.from}\nTo: ${email.to}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body || ""}`);
                      alert("Copied!");
                    }}>
                      📋 Copy
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

export default function EmailsPage() { return <AppShell><EmailRepoContent /></AppShell>; }
