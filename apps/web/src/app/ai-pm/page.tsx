"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";

function AIPMContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const selectedProjectId = searchParams.get("project") || "";

  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const allPms = useQuery(api.aiPm.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const warRoom = useQuery(api.aiPm.getWarRoom, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;

  const assignPm = useMutation(api.aiPm.assign);
  const updatePm = useMutation(api.aiPm.update);
  const chatWithPm = useAction(api.aiPmEngine.chat as any);
  const generateReport = useAction(api.aiPmEngine.dailyReport as any);

  const [activeTab, setActiveTab] = useState<"team" | "chat" | "director" | "warroom">("team");
  const [activePmId, setActivePmId] = useState<string>("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState<string>("");
  const [editingPm, setEditingPm] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPersonality, setEditPersonality] = useState("");
  const [editPermissions, setEditPermissions] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const draftEmail = useAction(api.aiPmSendEmail.draft as any);
  const sendPmEmail = useAction(api.aiPmSendEmail.send as any);
  const scanEmails = useAction(api.aiPmEmailIntel.scanProjectEmails as any);
  const [scanningEmails, setScanningEmails] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const chatWithDirector = useAction(api.aiDirector.chat as any);
  const runPortfolioReview = useAction(api.aiDirector.portfolioReview as any);
  const [directorMessages, setDirectorMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [directorInput, setDirectorInput] = useState("");
  const [directorLoading, setDirectorLoading] = useState(false);
  const directorEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice input not supported in this browser. Try Chrome or Safari."); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const full = (finalTranscript + interim).trim();
      setVoiceTranscript(full);
      // Check for send trigger phrases
      const sendTriggers = ["send to project manager", "send to pm", "send it", "send message", "go ahead and send", "that's it send"];
      const lower = full.toLowerCase();
      const matched = sendTriggers.find((t) => lower.endsWith(t) || lower.includes(t));
      if (matched) {
        const cleaned = full.replace(new RegExp(matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "").trim();
        setChatInput(cleaned);
        recognition.stop();
        // Auto-send after a brief delay to let state update
        setTimeout(() => {
          const sendBtn = document.getElementById("pm-send-btn");
          if (sendBtn) sendBtn.click();
        }, 300);
      } else {
        setChatInput(full);
      }
    };
    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceTranscript("");
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const activePm = allPms?.find((pm) => pm._id === activePmId);
  const messages = useQuery(api.aiPm.getMessages, activePmId ? { pmId: activePmId as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;
  const pmTasks = useQuery(api.aiPm.getTasks, activePmId ? { pmId: activePmId as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;

  const activeProjects = (projects || []).filter((p: any) => p.status !== "Inactive" && p.status !== "Archived");

  useEffect(() => {
    // Scroll within the chat container only, not the whole page
    const el = chatEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [messages]);

  // Auto-select PM if coming from project
  useEffect(() => {
    if (selectedProjectId && allPms) {
      const pm = allPms.find((p) => p.projectId === selectedProjectId);
      if (pm) { setActivePmId(pm._id); setActiveTab("chat"); }
    }
  }, [selectedProjectId, allPms]);

  if (!user) return null;
  if (!projects) return <p className="text-muted-foreground p-8">Loading...</p>;

  const pmMap = new Map((allPms || []).map((pm) => [pm.projectId, pm]));

  async function handleAssignPm(projectId: string) {
    await assignPm({ companyId: user!.companyId as Id<"companies">, projectId: projectId as Id<"projects"> });
  }

  async function handleAssignAll() {
    for (const p of activeProjects) {
      if (!pmMap.has(p._id)) {
        await assignPm({ companyId: user!.companyId as Id<"companies">, projectId: p._id as Id<"projects"> });
      }
    }
  }

  async function handleSendMessage() {
    if (!chatInput.trim() || chatLoading || !activePm) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    try {
      await chatWithPm({
        pmId: activePm._id,
        projectId: activePm.projectId,
        companyId: activePm.companyId,
        pmName: activePm.name,
        personality: activePm.personality,
        message: msg,
      });
    } catch (err) { console.error(err); }
    setChatLoading(false);
  }

  async function handleDailyReport(pm: any) {
    setReportLoading(pm._id);
    try {
      await generateReport({
        pmId: pm._id, projectId: pm.projectId, companyId: pm.companyId,
        pmName: pm.name, personality: pm.personality,
      });
      setActivePmId(pm._id);
      setActiveTab("chat");
    } catch (err) { console.error(err); }
    setReportLoading("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href={activePm ? `/job/${activePm.projectId}` : "/"} className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">
            ← {activePm ? "Back to Project" : "Back to Dashboard"}
          </Link>
          <h1 className="text-2xl font-bold">🤖 AI Project Managers</h1>
          <p className="text-muted-foreground text-sm">Your virtual PM team — one AI superintendent per project</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === "team" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("team")}>👥 Team</Button>
          <Button variant={activeTab === "chat" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("chat")}>💬 Chat</Button>
          <Button variant={activeTab === "director" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("director")} className={activeTab === "director" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "border-purple-500/30"}>👔 Director</Button>
          <Button variant={activeTab === "warroom" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("warroom")}>🏛️ War Room</Button>
        </div>
      </div>

      {/* TEAM TAB */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Your AI Team</h2>
            {activeProjects.some((p: any) => !pmMap.has(p._id)) && (
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleAssignAll}>
                🤖 Assign PMs to All Projects
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeProjects.map((project: any) => {
              const pm = pmMap.get(project._id);
              return (
                <Card key={project._id} className={`bg-card border-border ${pm ? "border-l-4 border-l-orange-500" : ""}`}>
                  <CardContent className="pt-4 pb-3">
                    {pm ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{pm.avatar}</span>
                          <div className="flex-1">
                            <div className="font-bold text-base">{pm.name}</div>
                            <div className="text-xs text-muted-foreground">{project.name}</div>
                            <Badge variant="secondary" className="text-[10px] mt-1">
                              {pm.personality === "direct" ? "⚡ Direct" : pm.personality === "detailed" ? "📊 Detailed" : "😊 Friendly"}
                            </Badge>
                          </div>
                          <Badge
                            variant={pm.status === "active" ? "default" : "secondary"}
                            className="text-[10px] cursor-pointer"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await updatePm({ id: pm._id, status: pm.status === "active" ? "paused" : "active" });
                            }}
                          >
                            {pm.status === "active" ? "🟢 Active" : "⏸️ Inactive"}
                          </Badge>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => { setActivePmId(pm._id); setActiveTab("chat"); }}>
                            💬 Chat
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" disabled={reportLoading === pm._id} onClick={() => handleDailyReport(pm)}>
                            {reportLoading === pm._id ? "🔄..." : "📋 Report"}
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-8 px-2" onClick={() => {
                            setEditingPm(pm);
                            setEditName(pm.name);
                            setEditPersonality(pm.personality);
                            const saved = (pm as any).permissions || {};
                            const defaults: Record<string, string> = { contacts: "readwrite", tasks: "readwrite", emails: "read", documents: "readwrite", budget: "read", schedule: "readwrite", changeOrders: "read", rfis: "readwrite", submittals: "readwrite", deliveries: "readwrite", crew: "read", punchList: "readwrite" };
                            setEditPermissions({ ...defaults, ...saved });
                          }}>
                            ⚙️
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 py-2">
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">No PM assigned</p>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs" onClick={() => handleAssignPm(project._id)}>
                          🤖 Assign AI PM
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Edit PM Modal */}
          {editingPm && (
            <div className="fixed inset-0 bg-[#0b0f14] z-50 flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                <Button variant="ghost" size="sm" className="px-2" onClick={() => setEditingPm(null)}>← Back</Button>
                <span className="text-2xl">{editingPm.avatar}</span>
                <h3 className="font-bold text-lg flex-1">⚙️ {editingPm.name} Settings</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Personality</label>
                  <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm mt-1" value={editPersonality} onChange={(e) => setEditPersonality(e.target.value)}>
                    <option value="direct">⚡ Direct — No-nonsense superintendent</option>
                    <option value="detailed">📊 Detailed — Data-driven, methodical</option>
                    <option value="friendly">😊 Friendly — Personable, client-facing</option>
                  </select>
                </div>
                {/* Permissions */}
                <div>
                  <label className="text-sm font-bold mb-1 block">🔐 Permissions</label>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-2.5 py-1.5 mb-2">
                    <p className="text-[10px] text-red-400 font-bold">⛔ GUARDRAILS ACTIVE</p>
                    <p className="text-[9px] text-red-400/70">PMs cannot send emails without admin approval. No direct customer communications. No financial commitments.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {[
                      { key: "contacts", label: "👥 Contacts", desc: "Add/edit project contacts" },
                      { key: "tasks", label: "✅ Tasks", desc: "Create/update tasks" },
                      { key: "emails", label: "📧 Emails", desc: "⚠️ Draft only — sending requires admin approval" },
                      { key: "documents", label: "📄 Documents", desc: "Read/analyze documents" },
                      { key: "budget", label: "💰 Budget", desc: "View/edit budget lines" },
                      { key: "schedule", label: "📅 Schedule", desc: "Modify schedules" },
                      { key: "changeOrders", label: "🔄 Change Orders", desc: "⚠️ View only recommended" },
                      { key: "rfis", label: "❓ RFIs", desc: "Create/update RFIs" },
                      { key: "submittals", label: "📋 Submittals", desc: "Manage submittals" },
                      { key: "deliveries", label: "🚚 Deliveries", desc: "Track deliveries" },
                      { key: "crew", label: "👷 Crew", desc: "Manage crew assignments" },
                      { key: "punchList", label: "✅ Punch List", desc: "Manage punch items" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between bg-secondary/40 rounded px-2 py-1.5">
                        <div className="min-w-0">
                          <span className="text-xs block">{label}</span>
                          <span className="text-[9px] text-muted-foreground">{desc}</span>
                        </div>
                        <select
                          className="bg-secondary border border-border rounded px-1 py-0.5 text-[10px] w-20 shrink-0 ml-2"
                          value={editPermissions[key] || (key === "emails" || key === "budget" || key === "changeOrders" || key === "crew" ? "read" : "readwrite")}
                          onChange={(e) => setEditPermissions({ ...editPermissions, [key]: e.target.value })}
                        >
                          <option value="readwrite">Read/Write</option>
                          <option value="read">Read Only</option>
                          <option value="none">No Access</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600 h-12 text-base" onClick={async () => {
                    await updatePm({ id: editingPm._id, name: editName, personality: editPersonality, permissions: editPermissions });
                    setEditingPm(null);
                  }}>💾 Save</Button>
                  <Button variant="outline" className="h-12" onClick={async () => {
                    await updatePm({ id: editingPm._id, status: editingPm.status === "active" ? "paused" : "active" });
                    setEditingPm(null);
                  }}>{editingPm.status === "active" ? "⏸️ Pause" : "▶️ Activate"}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHAT TAB */}
      {activeTab === "chat" && (
        <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
          {/* PM selector — hidden when PM active on mobile, always visible on desktop */}
          {!activePm && (
            <div className="space-y-1 pb-4">
              <h3 className="font-bold text-sm mb-2 text-muted-foreground">SELECT A PM</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(allPms || []).map((pm) => {
                  const proj = activeProjects.find((p: any) => p._id === pm.projectId);
                  return (
                    <div
                      key={pm._id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors bg-card border border-border hover:bg-orange-500/10 hover:border-orange-500/30"
                      onClick={() => setActivePmId(pm._id)}
                    >
                      <span className="text-2xl">{pm.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{pm.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{proj?.name || "Unknown"}</div>
                      </div>
                      <span className="text-muted-foreground">💬</span>
                    </div>
                  );
                })}
              </div>
              {(!allPms || allPms.length === 0) && (
                <div className="text-center text-muted-foreground text-sm py-12">
                  <p className="text-4xl mb-3">🤖</p>
                  <p>No AI PMs assigned yet</p>
                  <Button size="sm" className="mt-2" onClick={() => setActiveTab("team")}>Go to Team →</Button>
                </div>
              )}
            </div>
          )}

          {/* Fullscreen chat when PM selected */}
          {activePm && (
          <div className="flex flex-col flex-1 bg-card border border-border rounded-xl overflow-hidden">
                {/* Chat header with back button */}
                <div className="p-3 border-b border-border flex items-center gap-2 bg-secondary/30">
                  <Button size="sm" variant="ghost" className="px-2 text-muted-foreground hover:text-white" onClick={() => setActivePmId("")}>
                    ← Back
                  </Button>
                  <span className="text-2xl">{activePm.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{activePm.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {activeProjects.find((p: any) => p._id === activePm.projectId)?.name || "Project"} •
                      {activePm.personality === "direct" ? " ⚡ Direct" : activePm.personality === "detailed" ? " 📊 Detailed" : " 😊 Friendly"}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs px-2" disabled={scanningEmails} onClick={async () => {
                      if (!activePm) return;
                      setScanningEmails(true);
                      try {
                        await scanEmails({ pmId: activePm._id, pmName: activePm.name, projectId: activePm.projectId, companyId: activePm.companyId, personality: activePm.personality });
                      } catch { alert("Email scan failed"); }
                      setScanningEmails(false);
                    }}>
                      {scanningEmails ? "🔄" : "📬"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs px-2" disabled={draftLoading} onClick={async () => {
                      const prompt = window.prompt("What email should I draft? (e.g. 'Follow up on RFI #4 with the architect')");
                      if (!prompt || !activePm) return;
                      setDraftLoading(true);
                      try {
                        const result = await draftEmail({ pmId: activePm._id, projectId: activePm.projectId, companyId: activePm.companyId, pmName: activePm.name, personality: activePm.personality, prompt });
                        setEmailDraft(result as any);
                      } catch { alert("Draft failed"); }
                      setDraftLoading(false);
                    }}>
                      {draftLoading ? "🔄" : "📧"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs px-2" disabled={reportLoading === activePm._id} onClick={() => handleDailyReport(activePm)}>
                      {reportLoading === activePm._id ? "🔄" : "📋"}
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(!messages || messages.length === 0) && (
                    <div className="text-center text-muted-foreground text-sm space-y-3 mt-12">
                      <span className="text-5xl block">{activePm.avatar}</span>
                      <p className="font-medium">Hi, I&apos;m {activePm.name}.</p>
                      <p>I&apos;m your PM for {activeProjects.find((p: any) => p._id === activePm.projectId)?.name || "this project"}. Ask me anything or give me a task.</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {["Give me a status update", "Scan my emails", "What needs my attention?", "Draft an email to the owner", "What are our risks?", "Prepare for tomorrow"].map((q) => (
                          <button key={q} className="text-xs bg-secondary/60 hover:bg-secondary px-3 py-1.5 rounded-full border border-border"
                            onClick={() => setChatInput(q)}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(messages || []).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                      {msg.role === "pm" && <span className="text-lg mt-1">{activePm.avatar}</span>}
                      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-orange-500/20 border border-orange-500/30"
                          : "bg-secondary/60 border border-border"
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.message}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2">
                      <span className="text-lg">{activePm.avatar}</span>
                      <div className="bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground animate-pulse">
                        {activePm.name} is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border">
                  {isListening && (
                    <div className="flex items-center gap-2 mb-2 px-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-red-400 font-medium">Listening...</span>
                      <span className="text-xs text-muted-foreground flex-1 truncate">{voiceTranscript || "Start speaking..."}</span>
                    </div>
                  )}
                  <form onSubmit={(e) => { e.preventDefault(); if (isListening) stopListening(); handleSendMessage(); }} className="flex gap-2">
                    <Input placeholder={isListening ? "Listening... tap 🎙️ to stop" : `Message ${activePm.name}...`} value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1" autoFocus />
                    <Button type="button" variant={isListening ? "destructive" : "outline"} className={`px-3 ${isListening ? "animate-pulse" : ""}`}
                      onClick={() => { if (isListening) { stopListening(); } else { startListening(); } }}>
                      🎙️
                    </Button>
                    <Button id="pm-send-btn" type="submit" disabled={chatLoading || !chatInput.trim()} className="bg-orange-500 hover:bg-orange-600"
                      onClick={() => { if (isListening) stopListening(); }}>
                      Send
                    </Button>
                  </form>
                </div>

                {/* Active Tasks */}
                {pmTasks && pmTasks.filter((t) => t.status !== "done").length > 0 && (
                  <div className="border-t border-border p-3 bg-secondary/20 max-h-[120px] overflow-y-auto">
                    <h4 className="text-xs font-bold text-muted-foreground mb-1.5">📋 ACTIVE TASKS</h4>
                    {pmTasks.filter((t) => t.status !== "done").map((task) => (
                      <div key={task._id} className="flex items-center gap-2 text-xs py-1">
                        <Badge variant={task.status === "waiting_approval" ? "default" : "secondary"} className="text-[9px]">
                          {task.status === "pending" ? "⏳" : task.status === "in_progress" ? "🔄" : task.status === "waiting_approval" ? "👀" : "✅"} {task.status}
                        </Badge>
                        <span className="truncate flex-1">{task.description}</span>
                      </div>
                    ))}
                  </div>
                )}
          </div>
          )}
        </div>
      )}

      {/* Email Draft Approval Modal */}
      {emailDraft && activePm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">📧 Email Draft from {activePm.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setEmailDraft(null)}>✕</Button>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
              <p className="text-xs text-yellow-400 font-bold">⚠️ ADMINISTRATOR APPROVAL REQUIRED</p>
              <p className="text-[10px] text-yellow-400/70 mt-0.5">AI PMs cannot send emails directly. Review, edit if needed, then approve to send.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input value={emailDraft.to} onChange={(e) => setEmailDraft({ ...emailDraft, to: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input value={emailDraft.subject} onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <textarea
                value={emailDraft.body}
                onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-h-[200px] resize-y"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(`To: ${emailDraft.to}\nSubject: ${emailDraft.subject}\n\n${emailDraft.body}`);
                alert("Copied to clipboard!");
              }}>📋 Copy</Button>
              <Button variant="outline" onClick={() => setEmailDraft(null)}>Cancel</Button>
              <Button
                disabled={emailSending || !emailDraft.to || emailDraft.to === "NEED_EMAIL"}
                className="bg-green-600 hover:bg-green-700"
                onClick={async () => {
                  if (!activePm || !emailDraft.to || emailDraft.to === "NEED_EMAIL") return;
                  const confirmed = window.confirm(`⚠️ ADMINISTRATOR APPROVAL\n\nYou are approving this email to be sent:\n\nTo: ${emailDraft.to}\nSubject: ${emailDraft.subject}\n\nThis email will be sent from the configured OpsSlate sender on behalf of ${activePm.name}.\n\nSend this email?`);
                  if (!confirmed) return;
                  setEmailSending(true);
                  try {
                    await sendPmEmail({
                      companyId: activePm.companyId,
                      projectId: activePm.projectId,
                      pmId: activePm._id,
                      pmName: activePm.name,
                      to: emailDraft.to,
                      subject: emailDraft.subject,
                      body: emailDraft.body,
                    });
                    alert(`✅ Email approved and sent to ${emailDraft.to}!`);
                    setEmailDraft(null);
                  } catch (e) { alert("Send failed: " + (e as Error).message); }
                  setEmailSending(false);
                }}
              >
                {emailSending ? "🔄 Sending..." : "✅ Approve & Send"}
              </Button>
            </div>
            {emailDraft.to === "NEED_EMAIL" && (
              <p className="text-xs text-yellow-400">⚠️ No email address found for this contact — enter one above</p>
            )}
          </div>
        </div>
      )}

      {/* DIRECTOR TAB */}
      {activeTab === "director" && (
        <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden" style={{ minHeight: "300px" }}>
          {/* Director header */}
          <div className="p-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
            <div className="flex items-center gap-3">
              <span className="text-4xl">👔</span>
              <div className="flex-1">
                <div className="font-bold text-lg">The Director</div>
                <div className="text-xs text-muted-foreground">Director of AI Project Managers — Oversees all {activeProjects.length} projects &amp; {(allPms || []).length} PMs</div>
              </div>
              <Button size="sm" variant="outline" className="border-purple-500/30" disabled={directorLoading}
                onClick={async () => {
                  if (!user) return;
                  setDirectorLoading(true);
                  setDirectorMessages((prev) => [...prev, { role: "user", text: "📊 Full Portfolio Review" }]);
                  try {
                    const result = await runPortfolioReview({ companyId: user.companyId as any });
                    setDirectorMessages((prev) => [...prev, { role: "director", text: (result as any).reply }]);
                  } catch { setDirectorMessages((prev) => [...prev, { role: "director", text: "Failed to generate review." }]); }
                  setDirectorLoading(false);
                }}>
                {directorLoading ? "🔄" : "📊"} Portfolio Review
              </Button>
            </div>
          </div>

          {/* Director messages */}
          <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: "50vh", minHeight: "200px" }}>
            {directorMessages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm space-y-3 mt-12">
                <span className="text-6xl block">👔</span>
                <p className="font-medium text-base">I&apos;m the Director.</p>
                <p>I oversee your entire AI PM team. I see every project, every schedule, every budget — and I catch what individual PMs can&apos;t.</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {[
                    "Do any schedules overlap or conflict?",
                    "Which project needs the most attention?",
                    "Give me a full portfolio review",
                    "Are my timelines reasonable?",
                    "Where should I move resources?",
                    "Any crew or equipment conflicts?",
                    "How can we improve our app pipeline?",
                    "What data are we missing?",
                  ].map((q) => (
                    <button key={q} className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-full border border-purple-500/30"
                      onClick={() => setDirectorInput(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {directorMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {msg.role === "director" && <span className="text-lg mt-1">👔</span>}
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-purple-500/20 border border-purple-500/30"
                    : "bg-secondary/60 border border-border"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.text.split("\n").map((line, j) => {
                    if (line.startsWith("## ")) return <span key={j} className="block text-base font-bold mt-3 mb-1 text-purple-400">{line.replace("## ", "")}</span>;
                    if (line.startsWith("# ")) return <span key={j} className="block text-lg font-bold mb-2">{line.replace("# ", "")}</span>;
                    if (line.includes("🔴")) return <span key={j} className="block text-red-400 font-medium">{line.replace(/\*\*/g, "")}</span>;
                    if (line.includes("🟡")) return <span key={j} className="block text-yellow-400">{line.replace(/\*\*/g, "")}</span>;
                    if (line.includes("✅") || line.includes("🟢")) return <span key={j} className="block text-green-400">{line.replace(/\*\*/g, "")}</span>;
                    if (line.startsWith("- ") || line.startsWith("• ")) return <span key={j} className="block ml-3">{line.replace(/\*\*/g, "")}</span>;
                    if (line.match(/^\d+\./)) return <span key={j} className="block ml-2 font-medium">{line.replace(/\*\*/g, "")}</span>;
                    return <span key={j} className="block">{line.replace(/\*\*/g, "").replace(/\*/g, "")}</span>;
                  })}</div>
                </div>
              </div>
            ))}
            {directorLoading && (
              <div className="flex gap-2">
                <span className="text-lg">👔</span>
                <div className="bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground animate-pulse">
                  Director is analyzing all projects...
                </div>
              </div>
            )}
            <div ref={directorEndRef} />
          </div>

          {/* Director input */}
          <div className="p-3 border-t border-border shrink-0">
            {isListening && activeTab === "director" && (
              <div className="flex items-center gap-2 mb-2 px-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-400 font-medium">Listening...</span>
                <span className="text-xs text-muted-foreground flex-1 truncate">{voiceTranscript || "Start speaking..."}</span>
              </div>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (isListening) stopListening();
              if (!directorInput.trim() || directorLoading || !user) return;
              const msg = directorInput.trim();
              setDirectorInput("");
              setDirectorMessages((prev) => [...prev, { role: "user", text: msg }]);
              setDirectorLoading(true);
              try {
                const result = await chatWithDirector({ companyId: user.companyId as any, message: msg });
                setDirectorMessages((prev) => [...prev, { role: "director", text: (result as any).reply }]);
              } catch { setDirectorMessages((prev) => [...prev, { role: "director", text: "Failed to process. Try again." }]); }
              setDirectorLoading(false);
            }} className="flex gap-2">
              <Input placeholder="Talk to the Director..." value={directorInput} onChange={(e) => setDirectorInput(e.target.value)} className="flex-1" />
              <Button type="button" variant={isListening && activeTab === "director" ? "destructive" : "outline"} className={`px-3 ${isListening && activeTab === "director" ? "animate-pulse" : ""}`}
                onClick={() => {
                  if (isListening) { stopListening(); } else {
                    // Override voice input to target director input
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SpeechRecognition) { alert("Voice not supported. Try Chrome or Safari."); return; }
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US";
                    let finalT = "";
                    recognition.onresult = (event: any) => {
                      let interim = "";
                      for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) finalT += event.results[i][0].transcript + " ";
                        else interim += event.results[i][0].transcript;
                      }
                      const full = (finalT + interim).trim();
                      setVoiceTranscript(full);
                      setDirectorInput(full);
                      const sendTriggers = ["send to director", "send it", "send message", "go ahead and send"];
                      const lower = full.toLowerCase();
                      const matched = sendTriggers.find((t) => lower.endsWith(t) || lower.includes(t));
                      if (matched) {
                        const cleaned = full.replace(new RegExp(matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "").trim();
                        setDirectorInput(cleaned);
                        recognition.stop();
                        setTimeout(() => { document.getElementById("director-send-btn")?.click(); }, 300);
                      }
                    };
                    recognition.onerror = () => setIsListening(false);
                    recognition.onend = () => setIsListening(false);
                    recognitionRef.current = recognition;
                    recognition.start();
                    setIsListening(true); setVoiceTranscript("");
                  }
                }}>
                🎙️
              </Button>
              <Button id="director-send-btn" type="submit" disabled={directorLoading || !directorInput.trim()} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                onClick={() => { if (isListening) stopListening(); }}>
                Send
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* WAR ROOM TAB */}
      {activeTab === "warroom" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg">🏛️ War Room</h2>
              <p className="text-xs text-muted-foreground">Cross-project coordination between your AI PMs</p>
            </div>
          </div>

          {/* PM Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(allPms || []).filter((pm) => pm.status === "active").map((pm) => {
              const proj = activeProjects.find((p: any) => p._id === pm.projectId);
              const tasks = (pmTasks || []).filter((t: any) => t.pmId === pm._id);
              return (
                <Card key={pm._id} className="bg-card border-border">
                  <CardContent className="pt-3 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{pm.avatar}</span>
                      <div>
                        <div className="font-bold text-sm">{pm.name}</div>
                        <div className="text-[10px] text-muted-foreground">{proj?.name || "?"}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] ml-auto">🟢 Online</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* War Room Feed */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">📡 Cross-Project Communications</CardTitle>
            </CardHeader>
            <CardContent>
              {(!warRoom || warRoom.length === 0) ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <p className="text-3xl mb-2">🏛️</p>
                  <p>No cross-project communications yet.</p>
                  <p className="text-xs mt-1">As your AI PMs work, they&apos;ll coordinate here when they detect conflicts, shared resources, or dependencies between projects.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {warRoom.map((msg) => {
                    const pm = (allPms || []).find((p) => p._id === msg.fromPmId);
                    return (
                      <div key={msg._id} className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                        msg.type === "conflict" ? "bg-red-500/10 border-red-500/30" :
                        msg.type === "resource" ? "bg-yellow-500/10 border-yellow-500/30" :
                        "bg-secondary/40 border-border"
                      }`}>
                        <span className="text-lg">{pm?.avatar || "🤖"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">{msg.fromPmName}</span>
                            <span className="text-[10px] text-muted-foreground">({msg.fromProject})</span>
                            <Badge variant="outline" className="text-[9px]">{msg.type}</Badge>
                          </div>
                          <p className="text-sm mt-0.5">{msg.message}</p>
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function AIPMPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-muted-foreground p-8">Loading...</p>}>
        <AIPMContent />
      </Suspense>
    </AppShell>
  );
}
