"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, Users, AlertTriangle, Plus, Filter, GitBranch, Layers, HardHat, Flag, Save, Download, SlidersHorizontal, Search, Printer, ClipboardList, FileText, FolderOpen, Trash2, LayoutDashboard } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { ScheduleIntelligencePanel } from "@/components/schedule-intelligence-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Project {
  _id: Id<"projects">;
  name: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface ScheduleEvent {
  id: string;
  date: string;
  title: string;
  type: string;
  project: string;
  projectId: string;
  detail?: string;
  priority?: string;
}

interface ConstructionTask {
  id: string;
  wbs: string;
  phase: string;
  task: string;
  crew: string;
  duration: number;
  startOffset: number;
  predecessor: string;
  status: "Ready" | "Active" | "Watch" | "Blocked" | "Planned";
  percent: number;
  critical?: boolean;
}

const CONSTRUCTION_TASKS: ConstructionTask[] = [
  { id: "mobilize", wbs: "01.01", phase: "Mobilization", task: "Mobilize field office, permits, layout controls", crew: "PM / Field", duration: 2, startOffset: 0, predecessor: "-", status: "Ready", percent: 20, critical: true },
  { id: "site-controls", wbs: "01.02", phase: "Mobilization", task: "Install erosion control and site protection", crew: "Site Crew", duration: 2, startOffset: 1, predecessor: "01.01", status: "Ready", percent: 0 },
  { id: "demo", wbs: "02.01", phase: "Site Work", task: "Saw cut, demo, removals, haul off", crew: "Excavation", duration: 3, startOffset: 3, predecessor: "01.02", status: "Planned", percent: 0, critical: true },
  { id: "underground", wbs: "03.01", phase: "Utilities", task: "Underground conduit, trench, warning tape", crew: "Electrical", duration: 5, startOffset: 6, predecessor: "02.01", status: "Watch", percent: 0, critical: true },
  { id: "concrete", wbs: "04.01", phase: "Concrete", task: "Form, stone base, rebar, pour equipment pads", crew: "Concrete", duration: 4, startOffset: 11, predecessor: "03.01", status: "Planned", percent: 0, critical: true },
  { id: "equipment", wbs: "05.01", phase: "Electrical", task: "Set bollards, pedestals, equipment, terminations", crew: "Electrical", duration: 4, startOffset: 15, predecessor: "04.01", status: "Planned", percent: 0 },
  { id: "restore", wbs: "06.01", phase: "Restoration", task: "Asphalt repair, striping, turf restoration", crew: "Site Crew", duration: 3, startOffset: 19, predecessor: "05.01", status: "Planned", percent: 0 },
  { id: "closeout", wbs: "07.01", phase: "Closeout", task: "Testing, punch list, as-builts, owner turnover", crew: "PM / QA", duration: 2, startOffset: 22, predecessor: "06.01", status: "Planned", percent: 0, critical: true },
];

const PHASE_TEMPLATES = [
  "Mobilization",
  "Site Work",
  "Utilities",
  "Concrete",
  "Electrical",
  "Restoration",
  "Closeout",
];

const SCHEDULER_TABS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Schedule", icon: ClipboardList },
  { label: "Team", icon: Users },
  { label: "Crews", icon: HardHat },
  { label: "Details", icon: FileText },
  { label: "Documents", icon: FolderOpen },
];

const TYPE_STYLES: Record<string, string> = {
  milestone: "border-indigo-400/35 bg-indigo-400/10 text-indigo-100",
  task: "border-sky-400/35 bg-sky-400/10 text-sky-100",
  "crew-start": "border-emerald-400/35 bg-emerald-400/10 text-emerald-100",
  "crew-end": "border-emerald-400/35 bg-emerald-400/10 text-emerald-100",
  delivery: "border-lime-400/35 bg-lime-400/10 text-lime-100",
  pour: "border-orange-400/35 bg-orange-400/10 text-orange-100",
  rfi: "border-purple-400/35 bg-purple-400/10 text-purple-100",
  submittal: "border-amber-400/35 bg-amber-400/10 text-amber-100",
  insurance: "border-red-400/35 bg-red-400/10 text-red-100",
};

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function prettyDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function daysFromNow(value: string) {
  const start = todayDate().getTime();
  const target = new Date(`${value}T00:00:00`).getTime();
  return Math.round((target - start) / 86400000);
}

function typeLabel(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventStyle(type: string) {
  return TYPE_STYLES[type] || "border-white/12 bg-white/[0.04] text-white/86";
}

function statusStyle(status: ConstructionTask["status"]) {
  const styles = {
    Ready: "border-lime-400/30 bg-lime-400/10 text-lime-100",
    Active: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
    Watch: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    Blocked: "border-red-400/30 bg-red-400/10 text-red-100",
    Planned: "border-white/10 bg-white/[0.04] text-white/60",
  };
  return styles[status];
}

function ganttGridStyle(task: ConstructionTask) {
  return {
    gridColumn: `${task.startOffset + 1} / span ${task.duration}`,
  };
}

function SchedulerContent() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [activeWindow, setActiveWindow] = useState<"week" | "three-week" | "month">("three-week");
  const [activeView, setActiveView] = useState<"table" | "gantt">("table");
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const { user } = useAuth();

  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as Project[] | undefined;
  const events = useQuery(
    api.calendar.events,
    user ? { companyId: user.companyId, projectId: selectedProjectId === "all" ? undefined : selectedProjectId } : "skip",
  ) as ScheduleEvent[] | undefined;

  const today = useMemo(() => todayDate(), []);
  const windowDays = activeWindow === "week" ? 7 : activeWindow === "three-week" ? 21 : 30;
  const lookaheadDays = useMemo(() => {
    const safeEvents = events || [];
    return Array.from({ length: windowDays }, (_, index) => {
      const date = addDays(today, index);
      const key = dateKey(date);
      return {
        key,
        date,
        events: safeEvents.filter((event) => event.date === key),
      };
    });
  }, [events, today, windowDays]);

  const upcomingEvents = useMemo(() => {
    const end = dateKey(addDays(today, windowDays));
    return (events || []).filter((event) => event.date >= dateKey(today) && event.date <= end);
  }, [events, today, windowDays]);

  const highRiskEvents = upcomingEvents.filter((event) => event.priority === "high" || ["rfi", "insurance", "rental-end"].includes(event.type));
  const crewEvents = upcomingEvents.filter((event) => event.type.startsWith("crew"));
  const criticalTasks = CONSTRUCTION_TASKS.filter((task) => task.critical);
  const phaseCount = new Set(CONSTRUCTION_TASKS.map((task) => task.phase)).size;

  const visibleTasks = sampleLoaded ? CONSTRUCTION_TASKS : [];

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#07101a]">
      <section className="border-b border-white/10 bg-[#0b1320] px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
              <span className="flex size-4 items-center justify-center rounded border border-blue-400/70 text-blue-300">
                <span className="size-1.5 rounded-full bg-blue-300" />
              </span>
              <h1 className="text-xl font-black text-white">OpsSlate Scheduler</h1>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3">
              <span className="text-xs text-white/48">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="max-w-[220px] bg-transparent text-sm font-black text-white outline-none"
              >
                <option value="all">MAz</option>
                {(projects || []).map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Button>
            <Button type="button" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500">
              <Plus className="size-4" />
              New Project
            </Button>
            <button type="button" className="rounded-md p-2 text-white/42 transition hover:bg-white/[0.06] hover:text-white">
              <Trash2 className="size-4" />
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">T</div>
            <span className="text-sm font-semibold text-white/72">Test</span>
            <Button type="button" variant="outline" size="sm">Log out</Button>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-6">
          {SCHEDULER_TABS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`flex h-10 items-center gap-2 border-b-2 px-5 text-sm font-black transition ${
                label === "Schedule" ? "border-blue-500 text-white" : "border-transparent text-blue-200/72 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
      </section>

      <section className="px-4 py-9 lg:px-6">
        <div className="mx-auto max-w-[1540px]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Button type="button" className="h-10 gap-2 bg-emerald-600 px-6 font-black hover:bg-emerald-500">
                <Plus className="size-4" />
                New Item
              </Button>
              <label className="flex h-11 w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 md:w-64">
                <Search className="size-4 text-white/45" />
                <input
                  type="search"
                  placeholder="Search tasks..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/42"
                />
              </label>
              <div className="flex h-11 rounded-lg border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setActiveView("table")}
                  className={`rounded-md px-4 text-sm font-black transition ${activeView === "table" ? "bg-blue-600 text-white" : "text-blue-200/70 hover:text-white"}`}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("gantt")}
                  className={`rounded-md px-4 text-sm font-black transition ${activeView === "gantt" ? "bg-blue-600 text-white" : "text-blue-200/70 hover:text-white"}`}
                >
                  Gantt
                </button>
              </div>
              <Button type="button" variant="ghost" size="sm" className="gap-2 text-blue-200/72">
                <Printer className="size-4" />
                Print
              </Button>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setSampleLoaded(true)}>
              Load Sample Data
            </Button>
          </div>

          <button type="button" className="mt-9 text-sm font-semibold text-blue-200 transition hover:text-white">
            + Add new group
          </button>

          {activeView === "table" ? (
            <TaskTableView tasks={visibleTasks} />
          ) : (
            <GanttChartView tasks={visibleTasks} criticalTasks={criticalTasks} phaseCount={phaseCount} />
          )}
        </div>
      </section>

      {activeView === "gantt" && (
      <section className="mx-auto grid max-w-[1540px] gap-5 px-4 pb-10 lg:px-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-white/10 bg-[#101821]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-cyan-300" />
                <h2 className="text-lg font-black text-white">3-Week Lookahead</h2>
              </div>
              <p className="mt-1 text-sm text-white/50">Daily planning lane for milestones, deliveries, crews, RFIs, submittals, and project dates.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Filter className="size-4" />
                Filters
              </Button>
              <Button type="button" size="sm" className="gap-2">
                <Plus className="size-4" />
                Add Schedule Item
              </Button>
            </div>
          </div>

          <div className="grid auto-rows-fr gap-px overflow-hidden bg-white/10 md:grid-cols-3 xl:grid-cols-7">
            {lookaheadDays.map((day) => (
              <div key={day.key} className="min-h-[220px] bg-[#0c1219] p-3">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-white">{prettyDate(day.key)}</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">
                      {day.key === dateKey(today) ? "Today" : daysFromNow(day.key) > 0 ? `${daysFromNow(day.key)} days out` : "Past"}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-[10px] text-white/52">{day.events.length}</Badge>
                </div>

                <div className="space-y-2">
                  {day.events.length === 0 ? (
                    <div className="rounded-md border border-dashed border-white/10 p-3 text-xs text-white/34">No scheduled work yet</div>
                  ) : (
                    day.events.slice(0, 5).map((event) => <ScheduleEventCard key={event.id} event={event} />)
                  )}
                  {day.events.length > 5 && <div className="text-xs font-bold text-cyan-200">+{day.events.length - 5} more</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Schedule Intelligence" subtitle="What needs attention before the week slips">
            {highRiskEvents.length === 0 ? (
              <EmptyText text="No high-risk dates in this window." />
            ) : (
              highRiskEvents.slice(0, 6).map((event) => <CompactEvent key={event.id} event={event} />)
            )}
          </Panel>

          <Panel title="Crew Load" subtitle="Crew starts and ends in the selected window">
            {crewEvents.length === 0 ? (
              <EmptyText text="No crew dates are scheduled yet." />
            ) : (
              crewEvents.slice(0, 6).map((event) => <CompactEvent key={event.id} event={event} />)
            )}
          </Panel>

          <Panel title="Project Flow" subtitle="Baseline sequence health">
            <div className="space-y-3">
              {[
                ["Mobilization", "Ready", "text-lime-200"],
                ["Underground", "Watch", "text-amber-200"],
                ["Closeout", "Planned", "text-white/60"],
              ].map(([label, status, color]) => (
                <div key={label} className="flex items-center justify-between rounded-md border border-white/10 bg-[#0b1118] px-3 py-2">
                  <span className="text-sm font-bold text-white">{label}</span>
                  <span className={`text-xs font-black uppercase ${color}`}>{status}</span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </section>
      )}
    </div>
  );
}

function TaskTableView({ tasks }: { tasks: ConstructionTask[] }) {
  const groupedTasks = useMemo(() => {
    return PHASE_TEMPLATES.map((phase) => ({
      phase,
      tasks: tasks.filter((task) => task.phase === phase),
    })).filter((group) => group.tasks.length > 0);
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-blue-100/88">No groups yet</h2>
          <p className="mt-3 text-sm text-blue-200/72">
            Add a group above, or click "Load Sample Data" to see a demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#0d1724]">
      <div className="grid grid-cols-[minmax(260px,1.5fr)_110px_110px_140px_140px_110px] border-b border-white/10 bg-white/[0.035] px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100/48">
        <span>Task</span>
        <span>Duration</span>
        <span>Start</span>
        <span>Crew</span>
        <span>Predecessor</span>
        <span>Status</span>
      </div>
      {groupedTasks.map((group) => (
        <div key={group.phase}>
          <div className="border-b border-white/10 bg-[#111c2a] px-4 py-3 text-sm font-black text-white">
            {group.phase}
          </div>
          {group.tasks.map((task) => (
            <div key={task.id} className="grid grid-cols-[minmax(260px,1.5fr)_110px_110px_140px_140px_110px] items-center border-b border-white/[0.06] px-4 py-3 text-sm text-blue-100/76 transition hover:bg-white/[0.035]">
              <div>
                <div className="font-black text-white">{task.task}</div>
                <div className="mt-1 font-mono text-xs text-blue-200/42">WBS {task.wbs}</div>
              </div>
              <span>{task.duration} days</span>
              <span>D{task.startOffset + 1}</span>
              <span>{task.crew}</span>
              <span>{task.predecessor}</span>
              <Badge variant="outline" className={`w-fit justify-center text-[10px] ${statusStyle(task.status)}`}>{task.status}</Badge>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GanttChartView({ tasks, criticalTasks, phaseCount }: { tasks: ConstructionTask[]; criticalTasks: ConstructionTask[]; phaseCount: number }) {
  if (tasks.length === 0) {
    return (
      <div className="mt-16 flex min-h-[330px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02]">
        <div className="text-center">
          <h2 className="text-xl font-medium text-blue-100/88">No Gantt data yet</h2>
          <p className="mt-3 text-sm text-blue-200/72">
            Load sample data or add schedule groups before opening the Gantt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-5 rounded-lg border border-white/10 bg-[#101821]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="size-5 text-orange-300" />
            <h2 className="text-lg font-black text-white">Construction Gantt</h2>
            <Badge variant="outline" className="border-white/10 text-white/52">{phaseCount} phases</Badge>
          </div>
          <p className="mt-1 text-sm text-white/50">Project flow, predecessor logic, and critical path timing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="gap-2">
            <Save className="size-4" />
            Save Baseline
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <GitBranch className="size-4" />
            Dependencies
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="size-4" />
            Options
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[420px_minmax(720px,1fr)] border-b border-white/10 bg-[#0b1118]">
            <div className="grid grid-cols-[74px_118px_1fr_96px] gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
              <span>WBS</span>
              <span>Phase</span>
              <span>Task / WBS</span>
              <span>Status</span>
            </div>
            <div>
              <div className="px-4 pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">Gantt Timeline</div>
              <div className="grid [grid-template-columns:repeat(24,minmax(0,1fr))] gap-px px-4 pb-3 pt-1 text-center text-[10px] font-black uppercase tracking-[0.08em] text-white/38">
                {Array.from({ length: 24 }, (_, index) => <span key={index}>D{index + 1}</span>)}
              </div>
            </div>
          </div>

          {tasks.map((task) => (
            <div key={task.id} className="grid min-h-[62px] grid-cols-[420px_minmax(720px,1fr)] border-b border-white/8 bg-[#0c1219] transition hover:bg-[#111b26]">
              <div className="grid grid-cols-[74px_118px_1fr_96px] items-center gap-2 px-4 py-3">
                <div className="font-mono text-xs font-black text-white/72">{task.wbs}</div>
                <div className="truncate text-xs font-bold text-cyan-100">{task.phase}</div>
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-bold text-white">{task.task}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/42">
                    <span>{task.crew}</span>
                    <span>{task.duration}d</span>
                    <span>Predecessor: {task.predecessor}</span>
                  </div>
                </div>
                <Badge variant="outline" className={`justify-center text-[10px] ${statusStyle(task.status)}`}>{task.status}</Badge>
              </div>
              <div className="relative grid [grid-template-columns:repeat(24,minmax(0,1fr))] gap-px px-4 py-3">
                {Array.from({ length: 24 }, (_, index) => <div key={index} className="min-h-8 border-l border-white/[0.035]" />)}
                <div
                  className={`absolute inset-y-3 rounded-md border px-2 py-1 shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${task.critical ? "border-orange-300/45 bg-orange-500/35" : "border-cyan-300/35 bg-cyan-500/24"}`}
                  style={{
                    left: `calc(${(task.startOffset / 24) * 100}% + 1rem)`,
                    width: `calc(${(task.duration / 24) * 100}% - 2px)`,
                  }}
                >
                  <div className="flex h-full items-center justify-between gap-2 overflow-hidden text-[11px] font-black text-white">
                    <span className="truncate">{task.phase}</span>
                    <span>{task.percent}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        <div className="rounded-lg border border-orange-400/25 bg-orange-400/8 p-3">
          <div className="flex items-center gap-2 text-sm font-black text-orange-100"><Flag className="size-4" /> Critical Path</div>
          <p className="mt-1 text-xs text-white/50">{criticalTasks.length} activities are driving the baseline sequence.</p>
        </div>
        <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/8 p-3">
          <div className="flex items-center gap-2 text-sm font-black text-cyan-100"><GitBranch className="size-4" /> Dependencies</div>
          <p className="mt-1 text-xs text-white/50">{tasks.filter((task) => task.predecessor !== "-").length} predecessor links are visible in the task matrix.</p>
        </div>
        <div className="rounded-lg border border-lime-400/25 bg-lime-400/8 p-3">
          <div className="flex items-center gap-2 text-sm font-black text-lime-100"><Layers className="size-4" /> Construction Flow</div>
          <p className="mt-1 text-xs text-white/50">{phaseCount} phases are arranged from mobilization through closeout.</p>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "cyan" | "orange" | "green" | "purple" }) {
  const tones = {
    cyan: "border-cyan-400/25 text-cyan-200",
    orange: "border-orange-400/25 text-orange-200",
    green: "border-emerald-400/25 text-emerald-200",
    purple: "border-purple-400/25 text-purple-200",
  };
  return (
    <div className={`rounded-lg border bg-[#101821] p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-white/58">{icon}</div>
        <div className="text-3xl font-black text-white">{value}</div>
      </div>
      <div className="mt-3 text-sm font-semibold text-white/62">{label}</div>
    </div>
  );
}

function ScheduleEventCard({ event }: { event: ScheduleEvent }) {
  return (
    <div className={`rounded-md border p-2 ${eventStyle(event.type)}`}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
        <span className="truncate text-xs font-black">{typeLabel(event.type)}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-sm font-semibold text-white">{event.title}</div>
      <div className="mt-1 truncate text-xs text-white/50">{event.project}{event.detail ? ` - ${event.detail}` : ""}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#101821] p-4">
      <h3 className="text-base font-black text-white">{title}</h3>
      <p className="mt-1 text-xs text-white/45">{subtitle}</p>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function CompactEvent({ event }: { event: ScheduleEvent }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0b1118] p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="border-white/10 text-[10px]">{prettyDate(event.date)}</Badge>
        <span className="text-[10px] font-bold uppercase text-white/38">{typeLabel(event.type)}</span>
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-semibold text-white">{event.title}</div>
      <div className="mt-1 text-xs text-white/45">{event.project}</div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-white/10 p-3 text-sm text-white/40">{text}</div>;
}

export default function SchedulerPage() {
  return (
    <AppShell>
      <SchedulerContent />
    </AppShell>
  );
}
