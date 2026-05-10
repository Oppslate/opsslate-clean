"use client";

import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoginForm } from "@/components/login-form";
import { Onboarding } from "@/components/onboarding";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CrudModal, FieldDef } from "@/components/crud-modal";
import type { Id } from "../../convex/_generated/dataModel";

function DashboardContent() {
  const { user } = useAuth();
  const data = useQuery(api.dashboard.summary, user ? { companyId: user.companyId } : "skip") as any;
  const nags = useQuery(api.smartNag.getNags, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const geocodeAndSave = useAction(api.weather.geocodeAndSave as any);
  const chatWithDirector = useAction(api.aiDirector.chat as any);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [filter, setFilter] = useState<"active" | "bid" | "all" | "atRisk" | "onTrack" | "overdue" | "completed">("all");
  const [showPortfolioFilters, setShowPortfolioFilters] = useState(false);
  const [showPortfolioActions, setShowPortfolioActions] = useState(false);
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [portfolioManager, setPortfolioManager] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const generateWip = useAction(api.wipReport.generate as any);
  const [wipLoading, setWipLoading] = useState(false);
  const [wipReport, setWipReport] = useState<any>(null);

  // Director Voice Widget State
  const [dirOpen, setDirOpen] = useState(false);
  const [dirMessages, setDirMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [dirInput, setDirInput] = useState("");
  const [dirLoading, setDirLoading] = useState(false);
  const [dirListening, setDirListening] = useState(false);
  const [dirTranscript, setDirTranscript] = useState("");
  const [dirSpeaking, setDirSpeaking] = useState(false);
  const [dirVoiceEnabled, setDirVoiceEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("opsslate_dir_voice") !== "false"; } catch { return true; }
  });
  const [dirVoiceStyle, setDirVoiceStyle] = useState(() => {
    if (typeof window === "undefined") return "executive";
    try { return localStorage.getItem("opsslate_dir_voice_style") || "executive"; } catch { return "executive"; }
  });
  const [dirShowSettings, setDirShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem("opsslate_dir_voice_name") || ""; } catch { return ""; }
  });
  const [dirAutoListen, setDirAutoListen] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("opsslate_dir_autolisten") === "true"; } catch { return false; }
  });
  const dirRecRef = useRef<any>(null);
  const dirEndRef = useRef<HTMLDivElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  // Voice styles — rate, pitch combos
  const VOICE_STYLES: Record<string, { label: string; rate: number; pitch: number; desc: string }> = {
    executive: { label: "Executive", rate: 1.0, pitch: 0.9, desc: "Calm, authoritative" },
    fast: { label: "Fast & Sharp", rate: 1.3, pitch: 1.0, desc: "Quick briefing style" },
    calm: { label: "Calm & Steady", rate: 0.9, pitch: 0.85, desc: "Relaxed, thoughtful" },
    energetic: { label: "Energetic", rate: 1.15, pitch: 1.1, desc: "Upbeat, motivated" },
    deep: { label: "Deep & Serious", rate: 0.95, pitch: 0.7, desc: "Low, commanding" },
  };

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      // Filter to English voices
      const enVoices = voices.filter((v) => v.lang.startsWith("en"));
      setAvailableVoices(enVoices.length > 0 ? enVoices : voices);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => { window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices); };
  }, []);

  const speak = useCallback((text: string) => {
    if (!dirVoiceEnabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`]/g, "").replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/\[.*?\]/g, "").replace(/---+/g, "").trim();
    if (!clean) return;
    const chunks = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    const style = VOICE_STYLES[dirVoiceStyle] || VOICE_STYLES.executive;
    setDirSpeaking(true);
    let i = 0;
    const speakNext = () => {
      if (i >= chunks.length) {
        setDirSpeaking(false);
        // Auto-listen after Director finishes speaking
        if (dirAutoListen) {
          setTimeout(() => dirStartListening(), 500);
        }
        return;
      }
      const utter = new SpeechSynthesisUtterance(chunks[i].trim());
      utter.rate = style.rate;
      utter.pitch = style.pitch;
      // Use selected voice or find best match
      const voices = window.speechSynthesis.getVoices();
      if (selectedVoiceName) {
        const exact = voices.find((v) => v.name === selectedVoiceName);
        if (exact) utter.voice = exact;
      } else {
        // Auto-pick best voice
        const preferred = voices.find((v) => v.name.includes("Daniel")) ||
          voices.find((v) => v.name.includes("Google UK English Male")) ||
          voices.find((v) => v.name.includes("Aaron")) ||
          voices.find((v) => v.name.includes("Alex")) ||
          voices.find((v) => v.name.includes("Samantha")) ||
          voices.find((v) => v.lang.startsWith("en") && !v.name.includes("Google"));
        if (preferred) utter.voice = preferred;
      }
      utter.onend = () => { i++; speakNext(); };
      utter.onerror = () => { i++; speakNext(); };
      window.speechSynthesis.speak(utter);
    };
    speakNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirVoiceEnabled, dirVoiceStyle, selectedVoiceName, dirAutoListen]);

  const dirStartListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported — try Chrome or Safari."); return; }
    // Stop TTS if speaking
    window.speechSynthesis?.cancel();
    setDirSpeaking(false);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim = t;
      }
      setDirTranscript(finalText + interim);
      setDirInput(finalText + interim);
      // Check for send triggers
      const full = (finalText + interim).toLowerCase();
      const sendTriggers = ["send", "send it", "send message", "go ahead", "that's it send", "send to director"];
      if (sendTriggers.some((t) => full.endsWith(t) || full.includes(t + "."))) {
        rec.stop();
        const cleanMsg = (finalText + interim).replace(/\b(send it|send message|send to director|go ahead and send|that's it send|send)\b\.?$/i, "").trim();
        if (cleanMsg.length > 2) {
          setDirInput(cleanMsg);
          setTimeout(() => document.getElementById("dir-send-btn")?.click(), 300);
        }
      }
    };
    rec.onerror = () => { setDirListening(false); };
    rec.onend = () => { setDirListening(false); };
    rec.start();
    dirRecRef.current = rec;
    setDirListening(true);
    setDirTranscript("");
  }, []);

  const dirStopListening = useCallback(() => {
    dirRecRef.current?.stop();
    setDirListening(false);
  }, []);

  const dirSend = useCallback(async () => {
    if (!dirInput.trim() || dirLoading || !user) return;
    const msg = dirInput.trim();
    setDirInput("");
    setDirTranscript("");
    setDirMessages((prev) => [...prev, { role: "user", text: msg }]);
    setDirLoading(true);
    try {
      const result = await chatWithDirector({ companyId: user.companyId, message: msg });
      const r = result as any;
      const reply = r?.reply || r?.answer || r?.response || (typeof r === "string" ? r : JSON.stringify(r));
      setDirMessages((prev) => [...prev, { role: "director", text: reply }]);
      speak(reply);
    } catch {
      setDirMessages((prev) => [...prev, { role: "director", text: "Sorry, I couldn't process that right now." }]);
    }
    setDirLoading(false);
  }, [dirInput, dirLoading, user, chatWithDirector, speak]);

  useEffect(() => { dirEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dirMessages]);

  // Load voices
  useEffect(() => { window.speechSynthesis?.getVoices(); }, []);

  const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

  const projectFields: FieldDef[] = [
    { key: "name", label: "Project Name", required: true },
    { key: "code", label: "Project Code" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State", type: "select", options: US_STATES.map((s) => ({ label: s, value: s })) },
    { key: "zip", label: "Zip Code" },
    { key: "county", label: "County" },
    { key: "contractor", label: "Contractor" },
    { key: "type", label: "Type" },
    { key: "contractDate", label: "Contract Date", type: "date" },
    { key: "startDate", label: "Start Date", type: "date" },
    { key: "endDate", label: "End Date", type: "date" },
    { key: "projectManager", label: "Project Manager" },
  ];

  const handleCreateProject = async (values: Record<string, unknown>) => {
    if (!user) return;
    const v = values as Record<string, string | undefined>;
    const projectId = await createProject({
      companyId: user.companyId,
      name: v.name?.trim() ?? "",
      code: v.code?.trim() || undefined,
      location: [v.address, v.city, v.state, v.zip].filter(Boolean).join(", ") || undefined,
      address: v.address?.trim() || undefined,
      city: v.city?.trim() || undefined,
      state: v.state || undefined,
      zip: v.zip?.trim() || undefined,
      county: v.county?.trim() || undefined,
      contractor: v.contractor?.trim() || undefined,
      type: v.type?.trim() || undefined,
      contractDate: v.contractDate || undefined,
      startDate: v.startDate || undefined,
      endDate: v.endDate || undefined,
      projectManager: v.projectManager?.trim() || undefined,
    });
    if (v.address?.trim() && projectId) {
      geocodeAndSave({ projectId, address: v.address.trim() }).catch(() => {});
    }
    setShowCreateProject(false);
  };

  if (!data) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">🏗️</div></div>;
  if (data.projects.length === 0 && !showCreateProject) return <Onboarding onComplete={() => window.location.reload()} />;

  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toLocaleString()}`;

  const completedProjects = data.projects.filter((p: any) => p.status === "Complete");
  const allOverdue = data?.overdueTasks || [];
  const allThisWeek = data?.thisWeekTasks || [];
  const activeProjects = data.projects.filter((p: any) => p.status !== "Complete");
  const onTrackCount = activeProjects.filter((p: any) => p.healthStatus === "green").length;
  const atRiskCount = activeProjects.filter((p: any) => p.healthStatus === "yellow").length;
  const offTrackCount = activeProjects.filter((p: any) => p.healthStatus === "red").length;
  const healthPct = activeProjects.length ? Math.round((onTrackCount / activeProjects.length) * 100) : 100;

  const projects = data.projects.filter((p: any) => {
    const late = p.overdueTasks || 0;
    if (filter === "completed") return p.status === "Complete";
    if (p.status === "Complete") return false;
    if (filter === "active") return p.status === "Active" || !p.status;
    if (filter === "bid") return p.status === "Bid";
    if (filter === "atRisk") return p.healthStatus === "yellow";
    if (filter === "onTrack") return p.healthStatus === "green";
    if (filter === "overdue") return late > 0;
    return true;
  }).filter((p: any) => {
    const q = portfolioSearch.trim().toLowerCase();
    const manager = p.aiPmName || p.projectManager || "";
    if (portfolioManager && manager !== portfolioManager) return false;
    if (!q) return true;
    return [p.name, p.city, p.location, p.address, manager, p.status]
      .filter(Boolean)
      .some((v: string) => v.toLowerCase().includes(q));
  });

  const projectManagers = Array.from(new Set(
    data.projects.map((p: any) => p.aiPmName || p.projectManager).filter(Boolean)
  )) as string[];

  const exportPortfolioCsv = () => {
    const headers = ["Project", "PM", "Status", "Location", "Tasks", "Progress", "Late", "Risk"];
    const rows = projects.map((p: any) => {
      const pct = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
      const risk = p.healthStatus === "green" ? "On Track" : p.healthStatus === "yellow" ? "At Risk" : "Off Track";
      return [
        p.name || "",
        p.aiPmName || p.projectManager || "",
        p.status || "Active",
        p.city || p.location || p.address || "",
        `${p.completedTasks || 0}/${p.totalTasks || 0}`,
        `${pct}%`,
        p.overdueTasks || 0,
        risk,
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((value: string | number) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opsslate-project-portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
    setShowPortfolioActions(false);
  };

  const priorityActions = [
    { label: "RFIs Awaiting Response", count: data.openRfis || 0, icon: "▣", tone: "red", href: "/rfis" },
    { label: "Submittals Overdue", count: data.overdueSubmittals || 0, icon: "▤", tone: "amber", href: "/submittals" },
    { label: "Change Orders Pending", count: data.pendingChangeOrders || 0, icon: "◇", tone: "orange", href: "/change-orders" },
    { label: "Inspections This Week", count: allThisWeek.length, icon: "▦", tone: "blue", href: "/calendar" },
    { label: "Safety Incidents", count: data.safetyIncidents || 0, icon: "⚠", tone: "red", href: "/safety" },
  ];

  const quickInsights = [
    { label: "Completed Jobs", value: completedProjects.length, hint: "+2 this month", icon: "✓", tone: "green" },
    { label: "Budget Spent", value: fmt(data.totalContractValue || 0), hint: "Portfolio value", icon: "$", tone: "green" },
    { label: "Change Order Impact", value: fmt(data.pendingChangeOrdersValue || 0), hint: "Pending exposure", icon: "▣", tone: "orange" },
    { label: "Open Punch Items", value: data.openPunchItems || 0, hint: `${allOverdue.length} late tasks`, icon: "↗", tone: "amber" },
  ];

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex flex-1 min-w-[240px] justify-end gap-3">
          <select
            className="w-full max-w-xs bg-card/80 border border-border rounded-xl px-4 py-3 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              if (e.target.value) window.location.href = `/project/${e.target.value}`;
            }}
          >
            <option value="">Select a project</option>
            {activeProjects.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
            {completedProjects.map((p: any) => <option key={p._id} value={p._id}>✓ {p.name}</option>)}
          </select>
          <Button variant="outline" className="hidden sm:inline-flex border-border bg-card/80 hover:bg-secondary" disabled={wipLoading} onClick={async () => {
            if (!user) return;
            setWipLoading(true);
            try {
              const result = await generateWip({ companyId: user.companyId });
              setWipReport(result);
            } catch { alert("Failed to generate WIP report"); }
            setWipLoading(false);
          }}>
            {wipLoading ? "🔄" : "▦"} WIP
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20" onClick={() => setShowCreateProject(true)}>+ New</Button>
        </div>
      </div>

      {showCreateProject && <CrudModal title="Create New Project" fields={projectFields} onSave={handleCreateProject} onClose={() => setShowCreateProject(false)} />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.15fr_1fr_.85fr_1.35fr]">
        {[
          { label: "Active Jobs", value: activeProjects.length, icon: "⛑", hint: "+3 from last week", tone: "orange" },
          { label: "Portfolio", value: fmt(data.totalContractValue || 0), icon: "$", hint: "+$540K (6.4%)", tone: "orange" },
          { label: "Overdue", value: allOverdue.length, icon: "◷", hint: `${allOverdue.length ? "+4 from yesterday" : "Clear"}`, tone: allOverdue.length ? "red" : "green" },
          { label: "This Week", value: allThisWeek.length, icon: "▦", hint: `${allThisWeek.length} starting`, tone: "blue" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card/80 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full border ${m.tone === "red" ? "border-red-500/40 bg-red-500/10 text-red-400" : m.tone === "blue" ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : m.tone === "green" ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-orange-500/40 bg-orange-500/10 text-orange-400"}`}>{m.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold tracking-tight">{m.value}</p>
              </div>
            </div>
            <p className={`mt-3 text-xs ${m.tone === "red" ? "text-red-400" : m.tone === "blue" ? "text-blue-400" : m.tone === "green" ? "text-green-400" : "text-green-400"}`}>{m.hint}</p>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-card/80 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-4">
            <div className="relative grid h-20 w-20 place-items-center rounded-full" style={{ background: `conic-gradient(#22c55e ${healthPct * 3.6}deg, #f59e0b ${healthPct * 3.6}deg ${(healthPct + atRiskCount * 8) * 3.6}deg, #ef4444 0deg, #1f2937 0deg)` }}>
              <div className="grid h-14 w-14 place-items-center rounded-full bg-card text-lg font-black">{healthPct}%</div>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-green-400">● On Track</span><b>{onTrackCount}</b></div>
              <div className="flex justify-between"><span className="text-amber-400">● At Risk</span><b>{atRiskCount}</b></div>
              <div className="flex justify-between"><span className="text-red-400">● Off Track</span><b>{offTrackCount}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card/80 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-lg font-bold">Project Portfolio</h2>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPortfolioFilters((v) => !v)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${showPortfolioFilters ? "border-orange-500/30 bg-orange-500/15 text-orange-300" : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"}`}
              >
                ☰ Filters
              </button>
              <button
                type="button"
                onClick={() => setShowPortfolioActions((v) => !v)}
                className="rounded-lg border border-border bg-secondary/40 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Project portfolio actions"
              >
                ⋮
              </button>
              {showPortfolioActions && (
                <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                  <button type="button" onClick={() => { setShowCreateProject(true); setShowPortfolioActions(false); }} className="block w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground">+ New project</button>
                  <button type="button" onClick={exportPortfolioCsv} className="block w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground">Export CSV</button>
                  <button type="button" onClick={() => { window.print(); setShowPortfolioActions(false); }} className="block w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground">Print dashboard</button>
                </div>
              )}
            </div>
          </div>
          {showPortfolioFilters && (
            <div className="grid gap-3 border-b border-border bg-secondary/10 px-4 py-3 md:grid-cols-[1fr_220px_auto]">
              <input
                value={portfolioSearch}
                onChange={(e) => setPortfolioSearch(e.target.value)}
                placeholder="Search project, location, PM, status..."
                className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-orange-500/45"
              />
              <select
                value={portfolioManager}
                onChange={(e) => setPortfolioManager(e.target.value)}
                className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none transition-colors focus:border-orange-500/45"
              >
                <option value="">All PMs</option>
                {projectManagers.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
              </select>
              <button
                type="button"
                onClick={() => { setFilter("all"); setPortfolioSearch(""); setPortfolioManager(""); }}
                className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Reset
              </button>
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 text-xs">
            {[
              ["all", "All"], ["atRisk", "At Risk"], ["onTrack", "On Track"], ["overdue", "Overdue"], ["completed", "Completed"], ["bid", "Bid"]
            ].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key as typeof filter)} className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${filter === key ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>{label}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/25 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Project</th>
                  <th className="px-4 py-3 text-left font-semibold">PM</th>
                  <th className="px-4 py-3 text-left font-semibold">Tasks</th>
                  <th className="px-4 py-3 text-left font-semibold">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold">Late</th>
                  <th className="px-4 py-3 text-left font-semibold">Risk</th>
                  <th className="px-4 py-3 text-left font-semibold">Trend</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {projects.map((p: any) => {
                  const pct = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
                  const late = p.overdueTasks || 0;
                  const risk = p.healthStatus === "green" ? "On Track" : p.healthStatus === "yellow" ? "At Risk" : "Off Track";
                  const riskClass = p.healthStatus === "green" ? "text-green-400" : p.healthStatus === "yellow" ? "text-amber-400" : "text-red-400";
                  const barClass = p.healthStatus === "green" ? "bg-green-500" : p.healthStatus === "yellow" ? "bg-orange-500" : "bg-red-500";
                  return (
                    <tr key={p._id} className="hover:bg-secondary/25">
                      <td className="px-4 py-3">
                        <Link href={`/project/${p._id}`} className="flex items-center gap-3">
                          <span className={`grid h-8 w-8 place-items-center rounded-lg border ${p.healthStatus === "green" ? "border-green-500/30 bg-green-500/10" : p.healthStatus === "yellow" ? "border-orange-500/30 bg-orange-500/10" : "border-red-500/30 bg-red-500/10"}`}>▦</span>
                          <span>
                            <span className="block font-semibold text-foreground">{p.name}</span>
                            <span className="block text-xs text-muted-foreground">{p.city || p.location || p.address || "No location"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.aiPmName || p.projectManager || "—"}</td>
                      <td className="px-4 py-3">{p.completedTasks || 0} / {p.totalTasks || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 rounded-full bg-secondary">
                            <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{late > 0 ? <Badge variant="destructive" className="text-[10px]">{late} late</Badge> : <span className="text-muted-foreground">—</span>}</td>
                      <td className={`px-4 py-3 text-xs font-semibold ${riskClass}`}>● {risk}</td>
                      <td className="px-4 py-3"><div className={`h-8 w-20 rounded-lg border ${p.healthStatus === "green" ? "border-green-500/20 bg-green-500/5" : p.healthStatus === "yellow" ? "border-orange-500/20 bg-orange-500/5" : "border-red-500/20 bg-red-500/5"}`} /></td>
                      <td className="px-4 py-3 text-right text-muted-foreground">⋮</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Showing 1 to {projects.length} of {data.projects.length} projects</span>
            <span className="rounded-lg border border-border bg-secondary/40 px-2 py-1">1</span>
          </div>
        </section>

        <aside className="space-y-4">
          <Link href="/weather" className="block rounded-xl border border-border bg-card/80 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.20)] transition-colors hover:border-orange-500/35 hover:bg-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Weather</h2>
              <span className="text-xs text-muted-foreground">{activeProjects[0]?.city || activeProjects[0]?.location || "All projects"}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl text-slate-200">☁️</div>
              <div className="flex-1">
                <div className="text-3xl font-bold tracking-tight">Field</div>
                <div className="text-xs text-muted-foreground">Weather Board</div>
              </div>
              <div className="space-y-1 text-right text-xs text-muted-foreground">
                <div>High <span className="text-foreground">—</span></div>
                <div>Low <span className="text-foreground">—</span></div>
                <div>Wind <span className="text-foreground">—</span></div>
                <div>Precip <span className="text-foreground">—</span></div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Open forecast, alerts, and call-off tools</span>
              <span>→</span>
            </div>
          </Link>

          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.20)]">
            <h2 className="mb-3 text-lg font-bold">Priority Actions</h2>
            <div className="space-y-2">
              {priorityActions.map((a) => (
                <Link key={a.label} href={a.href} className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-border hover:bg-secondary/30">
                  <span className={`${a.tone === "red" ? "text-red-400" : a.tone === "blue" ? "text-blue-400" : a.tone === "amber" ? "text-amber-400" : "text-orange-400"}`}>{a.icon}</span>
                  <span className="flex-1 text-sm text-muted-foreground">{a.label}</span>
                  <Badge className={`${a.tone === "red" ? "bg-red-500/20 text-red-300" : a.tone === "blue" ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300"}`}>{a.count}</Badge>
                  <span className="text-muted-foreground">›</span>
                </Link>
              ))}
            </div>
            <Link href="/reports" className="mt-3 flex justify-between rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">View all actions <span>→</span></Link>
          </div>

          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.20)]">
            <h2 className="mb-3 text-lg font-bold">Quick Insights</h2>
            <div className="space-y-3">
              {quickInsights.map((i) => (
                <div key={i.label} className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${i.tone === "green" ? "bg-green-500/10 text-green-400" : i.tone === "orange" ? "bg-orange-500/10 text-orange-400" : "bg-amber-500/10 text-amber-400"}`}>{i.icon}</span>
                  <span className="flex-1">
                    <span className="block text-sm text-muted-foreground">{i.label}</span>
                    <span className="block text-[10px] text-muted-foreground/70">{i.hint}</span>
                  </span>
                  <b>{i.value}</b>
                </div>
              ))}
            </div>
            <Link href="/reports" className="mt-3 flex justify-between rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">View full reports <span>→</span></Link>
          </div>

          {(nags || []).length > 0 && (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-orange-300">Smart Alerts</h2>
              <div className="space-y-2">
                {(nags || []).slice(0, 5).map((n: any, i: number) => (
                  <Link key={i} href={n.projectId ? `/job/${n.projectId}` : "#"} className="block rounded-lg px-2 py-2 hover:bg-orange-500/10">
                    <p className="text-sm font-semibold">{n.icon} {n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.project} • {n.detail}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* WIP Report Fullscreen */}
      {wipReport && (
        <div className="fixed inset-0 bg-[#0b0f14] z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setWipReport(null)}>← Back</Button>
            <span className="text-xl">📋</span>
            <div className="flex-1">
              <p className="font-bold text-sm">Daily WIP Report</p>
              <p className="text-[10px] text-muted-foreground">{wipReport.dateFormatted}</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => window.print()}>🖨️ Print</Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              const el = document.getElementById("wip-content");
              if (el) { navigator.clipboard.writeText(el.innerText); alert("Copied!"); }
            }}>📋 Copy</Button>
          </div>

          <div id="wip-content" className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
            {/* Header */}
            <div className="text-center border-b border-border pb-4">
              <h1 className="text-xl font-bold">📋 DAILY WIP REPORT</h1>
              <p className="text-sm text-muted-foreground">{wipReport.companyName}</p>
              <p className="text-sm text-muted-foreground">{wipReport.dateFormatted}</p>
            </div>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { v: wipReport.summary.activeProjects, l: "Active Projects" },
                { v: wipReport.summary.totalContractValue > 0 ? `$${(wipReport.summary.totalContractValue / 1000).toFixed(0)}K` : "$0", l: "Contract Value" },
                { v: wipReport.summary.crewOnSite, l: "Crew On Site" },
                { v: wipReport.summary.deliveriesToday, l: "Deliveries Today" },
                { v: wipReport.summary.tasksCompletedToday, l: "Completed Today" },
                { v: wipReport.summary.newIssues, l: "Issues" },
              ].map(({ v, l }) => (
                <div key={l} className="bg-secondary/40 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{v}</p>
                  <p className="text-[9px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>

            {/* Company Alerts */}
            {wipReport.alerts.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs font-bold text-red-400 uppercase mb-1.5">⚠️ Company-Wide Alerts</p>
                {wipReport.alerts.map((a: string, i: number) => <p key={i} className="text-xs">{a}</p>)}
              </div>
            )}

            {/* Project Reports */}
            {wipReport.projects.map((p: any) => (
              <div key={p.name} className="border border-border rounded-xl overflow-hidden">
                {/* Project Header */}
                <div className="bg-secondary/30 px-4 py-2.5 flex items-center gap-2">
                  <span>{p.healthDot}</span>
                  <div className="flex-1">
                    <span className="font-bold text-sm">{p.name}</span>
                    {p.code && <span className="text-xs text-muted-foreground ml-2">({p.code})</span>}
                  </div>
                  <span className="text-sm font-bold">{p.pct}%</span>
                  <div className="w-16 bg-gray-700 rounded-full h-1.5">
                    <div className={`h-full rounded-full ${p.healthDot === "🟢" ? "bg-green-500" : p.healthDot === "🟡" ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2 text-xs">
                  {p.address && <p className="text-muted-foreground">{p.address}</p>}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><span className="text-muted-foreground">👷 Crew:</span> <span className="font-medium">{p.crewCount}</span></div>
                    <div><span className="text-muted-foreground">❓ RFIs:</span> <span className="font-medium">{p.openRfis}{p.overdueRfis > 0 ? ` (${p.overdueRfis} overdue)` : ""}</span></div>
                    <div><span className="text-muted-foreground">📧 Emails:</span> <span className="font-medium">{p.emailsToday} today</span></div>
                    <div><span className="text-muted-foreground">💰 Budget:</span> <span className={`font-medium ${p.budgetPct > 90 ? "text-red-400" : p.budgetPct > 75 ? "text-yellow-400" : ""}`}>{p.budgetStatus} ({p.budgetPct}%)</span></div>
                  </div>

                  {p.crew.length > 0 && <div><span className="text-muted-foreground">👷 On Site: </span>{p.crew.join(", ")}</div>}
                  {p.completedToday.length > 0 && <div><span className="text-muted-foreground">✅ Completed: </span>{p.completedToday.join(", ")}</div>}
                  {p.inProgress.length > 0 && <div><span className="text-muted-foreground">🔄 In Progress: </span>{p.inProgress.join(", ")}</div>}
                  {p.scheduledToday.length > 0 && <div><span className="text-muted-foreground">📅 Scheduled Today: </span>{p.scheduledToday.join(", ")}</div>}
                  {p.deliveriesToday.length > 0 && <div><span className="text-muted-foreground">🚚 Deliveries: </span>{p.deliveriesToday.join(", ")}</div>}
                  {p.overdue.length > 0 && <div className="text-red-400"><span>🔴 Overdue: </span>{p.overdue.join(", ")}</div>}
                  {p.pendingCOs > 0 && <div><span className="text-muted-foreground">🔄 Pending COs: </span>{p.pendingCOs}</div>}
                  {(p.fieldNotesToday > 0 || p.photosToday > 0) && <div><span className="text-muted-foreground">📝 Notes: {p.fieldNotesToday} | 📷 Photos: {p.photosToday}</span></div>}
                  {p.pmName && <div className="text-muted-foreground">{p.pmAvatar} PM: {p.pmName}</div>}
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground pt-4 pb-8 border-t border-border">
              <p>Generated by OpsSlate AI Director • {wipReport.dateFormatted}</p>
              <p>{wipReport.companyName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Director Tab */}
      <button
        onClick={() => setDirOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 hover:from-purple-600/20 hover:to-indigo-600/20 transition-all"
      >
        <span className="text-2xl">👔</span>
        <div className="flex-1 text-left">
          <p className="font-bold text-sm">AI Director</p>
          <p className="text-[10px] text-muted-foreground">Voice commands • PM delegation • Portfolio oversight</p>
        </div>
        <span className="text-muted-foreground text-sm">🎙️</span>
      </button>

      {/* Director Fullscreen */}
      {dirOpen && (
        <div className="fixed inset-0 bg-[#0b0f14] z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-purple-600/10 to-indigo-600/10 shrink-0">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => { setDirOpen(false); window.speechSynthesis?.cancel(); setDirSpeaking(false); dirStopListening(); }}>
              ← Back
            </Button>
            <span className="text-2xl">{dirSpeaking ? "🗣️" : dirListening ? "🎙️" : "👔"}</span>
            <div className="flex-1">
              <p className="font-bold text-sm">AI Director</p>
              <p className="text-[10px] text-muted-foreground">
                {dirSpeaking ? "Speaking..." : dirListening ? "Listening..." : dirLoading ? "Thinking..." : "Ready"}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => setDirShowSettings(!dirShowSettings)}>⚙️</Button>
            <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => {
              const next = !dirVoiceEnabled;
              setDirVoiceEnabled(next);
              try { localStorage.setItem("opsslate_dir_voice", String(next)); } catch {}
              if (!next) { window.speechSynthesis?.cancel(); setDirSpeaking(false); }
            }}>
              {dirVoiceEnabled ? "🔊" : "🔇"}
            </Button>
          </div>

          {/* Voice Settings */}
          {dirShowSettings && (
            <div className="p-3 border-b border-border bg-secondary/20 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-muted-foreground uppercase">Voice Settings</h4>
                <Button variant="ghost" size="sm" className="text-[10px] h-5 px-1.5" onClick={() => setDirShowSettings(false)}>Done</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(VOICE_STYLES).map(([key, style]) => (
                  <button key={key}
                    className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${dirVoiceStyle === key ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "border-border hover:border-purple-500/30"}`}
                    onClick={() => { setDirVoiceStyle(key); try { localStorage.setItem("opsslate_dir_voice_style", key); } catch {} }}>
                    {style.label}
                  </button>
                ))}
              </div>
              <select className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" value={selectedVoiceName}
                onChange={(e) => { setSelectedVoiceName(e.target.value); try { localStorage.setItem("opsslate_dir_voice_name", e.target.value); } catch {} }}>
                <option value="">Auto voice</option>
                {availableVoices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
              <div className="flex items-center justify-between">
                <span className="text-xs">🔄 Auto-listen</span>
                <button className={`w-10 h-5 rounded-full transition-colors ${dirAutoListen ? "bg-purple-500" : "bg-gray-600"}`}
                  onClick={() => { const next = !dirAutoListen; setDirAutoListen(next); try { localStorage.setItem("opsslate_dir_autolisten", String(next)); } catch {} }}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${dirAutoListen ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {dirMessages.length === 0 && (
              <div className="text-center text-muted-foreground py-20">
                <p className="text-5xl">👔</p>
                <p className="font-medium mt-3">Director is ready.</p>
              </div>
            )}
            {dirMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {m.role === "director" && <span className="text-lg mt-1">👔</span>}
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  m.role === "user" ? "bg-purple-500/20 border border-purple-500/30" : "bg-secondary/60 border border-border"
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{m.text}</div>
                </div>
              </div>
            ))}
            {dirLoading && (
              <div className="flex gap-2">
                <span className="text-lg">👔</span>
                <div className="bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground animate-pulse">Thinking...</div>
              </div>
            )}
            <div ref={dirEndRef} />
          </div>

          {/* Listening indicator */}
          {dirListening && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 shrink-0">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-400 font-medium">Listening...</span>
              <span className="text-sm text-muted-foreground flex-1 truncate">{dirTranscript || "Start speaking..."}</span>
            </div>
          )}

          {/* Speaking bar */}
          {dirSpeaking && (
            <div className="flex items-center gap-2 px-4 py-2 pb-6 bg-purple-500/10 shrink-0">
              <span className="text-sm text-purple-400 font-medium flex-1">🗣️ Director is speaking...</span>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-3" onClick={() => { window.speechSynthesis?.cancel(); setDirSpeaking(false); }}>⏹️ Stop</Button>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 pb-6 border-t border-border flex gap-2 shrink-0 bg-card">
            <Button
              variant={dirListening ? "destructive" : "outline"}
              className={`px-4 shrink-0 h-11 ${dirListening ? "animate-pulse" : "border-purple-500/30 hover:bg-purple-500/10"}`}
              onClick={() => dirListening ? dirStopListening() : dirStartListening()}
            >
              🎙️
            </Button>
            <input
              ref={dirInputRef}
              value={dirInput}
              onChange={(e) => setDirInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") dirSend(); }}
              placeholder="Talk or type..."
              className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-purple-500/50"
            />
            <Button
              id="dir-send-btn"
              disabled={dirLoading || !dirInput.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-5 shrink-0 h-11"
              onClick={dirSend}
            >
              Send
            </Button>
          </div>
        </div>
      )}

      {/* Floating Director Button */}
      {!dirOpen && (
        <button
          className="fixed bottom-20 md:bottom-6 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg hover:shadow-purple-500/25 flex items-center justify-center text-2xl z-50 transition-transform hover:scale-110 active:scale-95"
          onClick={() => setDirOpen(true)}
          title="Talk to AI Director"
        >
          👔
        </button>
      )}

      {/* Mobile Quick Actions Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-2 flex gap-2 justify-around md:hidden z-40">
        <Button variant="ghost" className="flex-1 flex flex-col gap-0.5 h-auto py-2 text-xs" onClick={() => setShowCreateProject(true)}>
          <span className="text-lg">➕</span>New
        </Button>
        <Link href="/ai-pm" className="flex-1">
          <Button variant="ghost" className="w-full flex flex-col gap-0.5 h-auto py-2 text-xs">
            <span className="text-lg">🤖</span>Director
          </Button>
        </Link>
        <Link href="/calendar" className="flex-1">
          <Button variant="ghost" className="w-full flex flex-col gap-0.5 h-auto py-2 text-xs">
            <span className="text-lg">📅</span>Calendar
          </Button>
        </Link>
        <Link href="/correspondence" className="flex-1">
          <Button variant="ghost" className="w-full flex flex-col gap-0.5 h-auto py-2 text-xs">
            <span className="text-lg">📧</span>Email
          </Button>
        </Link>
        <Link href="/reports" className="flex-1">
          <Button variant="ghost" className="w-full flex flex-col gap-0.5 h-auto py-2 text-xs">
            <span className="text-lg">📊</span>Reports
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">🚜</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  return <AppShell><DashboardContent /></AppShell>;
}
