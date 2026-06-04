"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, Clock, Link2, Users, AlertTriangle, Plus, Filter } from "lucide-react";
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

function SchedulerContent() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [activeWindow, setActiveWindow] = useState<"week" | "three-week" | "month">("three-week");
  const { user } = useAuth();

  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as Project[] | undefined;
  const events = useQuery(
    api.calendar.events,
    user ? { companyId: user.companyId, projectId: selectedProjectId === "all" ? undefined : selectedProjectId } : "skip",
  ) as ScheduleEvent[] | undefined;

  const today = useMemo(() => todayDate(), []);
  const windowDays = activeWindow === "week" ? 7 : activeWindow === "three-week" ? 21 : 30;
  const selectedProject = projects?.find((project) => project._id === selectedProjectId);

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
  const blockedEvents = upcomingEvents.filter((event) => ["rfi", "submittal", "delivery"].includes(event.type));

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      <section className="rounded-lg border border-white/10 bg-[#101821] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-cyan-400/35 text-cyan-100">PLAN</Badge>
              <Badge variant="outline" className="border-orange-400/30 text-orange-100">Main Scheduler</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Scheduler Workspace</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/58">
              Build the weekly plan, watch job constraints, and keep field dates tied to project activity.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] xl:min-w-[560px]">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-white/46">Project</span>
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#070b10] px-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400/50"
              >
                <option value="all">All active projects</option>
                {(projects || []).map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-white/46">Window</span>
              <div className="grid h-11 grid-cols-3 rounded-lg border border-white/10 bg-[#070b10] p-1">
                {[
                  ["week", "7d"],
                  ["three-week", "21d"],
                  ["month", "30d"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveWindow(value as typeof activeWindow)}
                    className={`rounded-md px-3 text-xs font-black transition ${activeWindow === value ? "bg-cyan-400 text-slate-950" : "text-white/58 hover:bg-white/[0.06] hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CalendarDays className="size-5" />} label="Scheduled Items" value={upcomingEvents.length} tone="cyan" />
        <MetricCard icon={<AlertTriangle className="size-5" />} label="Watch Items" value={highRiskEvents.length} tone="orange" />
        <MetricCard icon={<Users className="size-5" />} label="Crew Dates" value={crewEvents.length} tone="green" />
        <MetricCard icon={<Link2 className="size-5" />} label="Coordination Holds" value={blockedEvents.length} tone="purple" />
      </section>

      {selectedProject?._id && <ScheduleIntelligencePanel projectId={selectedProject._id} />}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
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

          <Panel title="Next Build Step" subtitle="Scheduler rebuild path">
            <ol className="space-y-2 text-sm text-white/62">
              <li>1. Add real task creation and editing.</li>
              <li>2. Add dependency links and drag schedule dates.</li>
              <li>3. Add crew assignment and weather shift logic.</li>
            </ol>
          </Panel>
        </aside>
      </section>
    </div>
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
