"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

type WeekPlanResult = { plan: string };
interface WeatherDay { date: string; high: number; low: number; precip: number; precipProb: number; windMax: number; gustMax: number; icon: string; condition: string; status: string; recommendations: string[] }
interface ProjectForecast { projectIds: string[]; projectNames: string[]; days: WeatherDay[] }
type BulkWeatherResult = { forecasts?: ProjectForecast[] };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TYPE_COLORS: Record<string, string> = {
  "rental-start": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "rental-end": "bg-red-500/20 text-red-300 border-red-500/30",
  delivery: "bg-green-500/20 text-green-300 border-green-500/30",
  pour: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  rfi: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  submittal: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  maintenance: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  task: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "task-done": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  udig: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "crew-start": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "crew-end": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  milestone: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  insurance: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

interface CalEvent {
  id: string;
  date: string;
  title: string;
  type: string;
  project: string;
  projectId: string;
  detail?: string;
  priority?: string;
}

function CalendarContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [showWeather, setShowWeather] = useState(true);
  const [weekPlan, setWeekPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const generateWeekPlan = useAction(api.calendarAI.weekPlanner) as unknown as (args: { companyId: string }) => Promise<WeekPlanResult>;

  const [weatherData, setWeatherData] = useState<ProjectForecast[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherRequested, setWeatherRequested] = useState(false);
  const bulkWeather = useAction(api.weather.bulkProjectWeather) as unknown as (args: { companyId: string }) => Promise<BulkWeatherResult>;

  const loadWeather = useCallback(async () => {
    if (!user || weatherRequested || weatherData.length > 0) return;
    setWeatherRequested(true);
    setWeatherLoading(true);
    try {
      const res = await bulkWeather({ companyId: user.companyId });
      setWeatherData(res.forecasts ?? []);
    } catch {
      // ignore for now
    } finally {
      setWeatherLoading(false);
    }
  }, [bulkWeather, user, weatherRequested, weatherData.length]);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  const weatherByDate = useMemo(() => {
    const map: Record<string, { status: string; icon: string; high: number; low: number; condition: string; recommendations: string[]; projects: string[] }> = {};
    for (const pf of weatherData) {
      for (const d of pf.days) {
        const existing = map[d.date];
        if (!existing) {
          map[d.date] = {
            status: d.status,
            icon: d.icon,
            high: d.high,
            low: d.low,
            condition: d.condition,
            recommendations: [...d.recommendations],
            projects: [...pf.projectNames],
          };
        } else {
          if (d.status === "red" || existing.status === "red") existing.status = "red";
          else if (d.status === "yellow") existing.status = "yellow";
          for (const r of d.recommendations) if (!existing.recommendations.includes(r)) existing.recommendations.push(r);
          for (const p of pf.projectNames) if (!existing.projects.includes(p)) existing.projects.push(p);
        }
      }
    }
    return map;
  }, [weatherData]);

  const events = useQuery(
    api.calendar.events,
    user ? { companyId: user.companyId, projectId: filterProject || undefined } : "skip"
  ) as CalEvent[] | undefined;

  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().slice(0, 10);
  const in14Str = new Date(today.getTime() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return filterType ? events.filter((e) => e.type === filterType) : events;
  }, [events, filterType]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of filteredEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [filteredEvents]);

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  const upcomingEvents = useMemo(() => {
    return filteredEvents.filter((e) => e.date >= todayStr && e.date <= in14Str);
  }, [filteredEvents, in14Str, todayStr]);

  if (!projects) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm">
          <div className="mb-4 h-4 w-36 animate-pulse rounded-full bg-secondary/80" />
          <div className="mb-3 h-8 w-64 animate-pulse rounded-full bg-secondary/80" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-secondary/60" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm">
            <div className="h-[520px] animate-pulse rounded-2xl bg-secondary/40" />
          </div>
          <div className="space-y-6">
            <div className="h-64 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm animate-pulse" />
            <div className="h-72 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm">
        <div className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-transparent to-transparent px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                ← Back to Dashboard
              </Link>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                    Project Calendar
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] text-muted-foreground">
                    {filteredEvents.length} scheduled items
                  </Badge>
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">Schedule command center</h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Track field work, deliveries, pours, rentals, and deadlines in one clean planning view.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[440px]">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">This month</div>
                <div className="mt-2 text-2xl font-semibold">{filteredEvents.length}</div>
                <div className="text-sm text-muted-foreground">events in view</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Next 14 days</div>
                <div className="mt-2 text-2xl font-semibold">{upcomingEvents.length}</div>
                <div className="text-sm text-muted-foreground">upcoming commitments</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:min-w-[520px]">
              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Project</label>
                <Select value={filterProject || "all-projects"} onValueChange={(value) => setFilterProject(value === "all-projects" ? "" : value)}>
                  <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/80 px-4 shadow-none">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-projects">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Item type</label>
                <Select value={filterType || "all-types"} onValueChange={(value) => setFilterType(value === "all-types" ? "" : value)}>
                  <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/80 px-4 shadow-none">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-types">All Types</SelectItem>
                    <SelectItem value="rental-start">Rental Start</SelectItem>
                    <SelectItem value="rental-end">Rental End</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pour">Pour</SelectItem>
                    <SelectItem value="rfi">RFI</SelectItem>
                    <SelectItem value="submittal">Submittal</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="crew-start">Crew</SelectItem>
                    <SelectItem value="udig">U-Dig</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant={showWeather ? "default" : "outline"} className="h-11 rounded-2xl px-4" onClick={() => setShowWeather(!showWeather)}>
                {weatherLoading ? "Checking weather..." : showWeather ? "Weather overlay on" : "Weather overlay off"}
              </Button>
              <Button
                className="h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 text-white"
                disabled={planLoading}
                onClick={async () => {
                  if (!user) return;
                  setPlanLoading(true);
                  try {
                    const result = await generateWeekPlan({ companyId: user.companyId });
                    setWeekPlan(result.plan);
                  } catch {
                    setWeekPlan("Failed to generate weekly plan.");
                  }
                  setPlanLoading(false);
                }}
              >
                {planLoading ? "Building week plan..." : "AI week planner"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {events && (() => {
        const todayEvents = events.filter((e) => e.date === todayStr);
        const overdueEvents = events.filter((e) => e.date < todayStr && e.priority === "high");
        const tomorrowEvents = events.filter((e) => e.date === tomorrowStr);

        if (todayEvents.length === 0 && overdueEvents.length === 0 && tomorrowEvents.length === 0) return null;

        return (
          <Card className="rounded-3xl border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/10 shadow-sm">
            <CardContent className="px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold">Today&apos;s priorities</span>
                <Badge variant="outline" className="text-[10px]">
                  {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
                {overdueEvents.length > 0 && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
                    <span className="text-xs font-bold text-red-400">OVERDUE ({overdueEvents.length})</span>
                    {overdueEvents.slice(0, 3).map((e) => (
                      <div key={e.id} className="mt-1 text-xs truncate">{e.title} — {e.project}</div>
                    ))}
                  </div>
                )}
                {todayEvents.length > 0 && (
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3">
                    <span className="text-xs font-bold text-blue-400">TODAY ({todayEvents.length})</span>
                    {todayEvents.slice(0, 4).map((e) => (
                      <div key={e.id} className="mt-1 text-xs truncate">{e.title}</div>
                    ))}
                  </div>
                )}
                {tomorrowEvents.length > 0 && (
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3">
                    <span className="text-xs font-bold text-purple-400">TOMORROW ({tomorrowEvents.length})</span>
                    {tomorrowEvents.slice(0, 3).map((e) => (
                      <div key={e.id} className="mt-1 text-xs truncate">{e.title}</div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {weekPlan && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">AI week planner</h3>
                <p className="text-xs text-muted-foreground">Smart schedule analysis with weather and conflict detection</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setWeekPlan(null)}>Close</Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="text-sm leading-relaxed">
                {weekPlan.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) return <h3 key={i} className="mb-2 mt-5 border-b border-border/30 pb-1 text-base font-bold text-orange-400">{line.replace("## ", "")}</h3>;
                  if (line.startsWith("# ")) return <h2 key={i} className="mb-3 text-lg font-bold">{line.replace("# ", "")}</h2>;
                  if (line.startsWith("### ")) return <h4 key={i} className="mb-1 mt-3 text-sm font-bold">{line.replace("### ", "")}</h4>;
                  if (line.includes("⚠️") || line.includes("🔴")) return <p key={i} className="my-1 font-medium text-red-400">{line.replace(/\*\*/g, "")}</p>;
                  if (line.includes("✅") || line.includes("🟢")) return <p key={i} className="my-1 text-green-400">{line.replace(/\*\*/g, "")}</p>;
                  if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="my-0.5 ml-4">• {line.slice(2).replace(/\*\*/g, "")}</p>;
                  if (line.match(/^\d+\./)) return <p key={i} className="my-0.5 ml-2 font-medium">{line.replace(/\*\*/g, "")}</p>;
                  if (line.startsWith("**")) return <p key={i} className="mt-2 font-medium">{line.replace(/\*\*/g, "")}</p>;
                  if (line.startsWith("---")) return <hr key={i} className="my-3 border-border" />;
                  return <p key={i} className="my-0.5">{line.replace(/\*\*/g, "").replace(/\*/g, "")}</p>;
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(weekPlan.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,3} /g, ""))}>
                Copy plan
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekPlan(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_360px]">
        <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/90 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border/50 px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Month view</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">{MONTHS[viewMonth]} {viewYear}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl px-4" onClick={prevMonth}>← Previous</Button>
                  <Button variant="outline" size="sm" className="rounded-xl px-4" onClick={goToday}>Today</Button>
                  <Button variant="outline" size="sm" className="rounded-xl px-4" onClick={nextMonth}>Next →</Button>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-2 grid grid-cols-7 gap-2">
                {DAYS.map((d) => (
                  <div key={d} className="rounded-xl bg-secondary/30 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {cells.map((cell, i) => {
                  if (!cell) return <div key={`e${i}`} className="min-h-[112px] rounded-2xl border border-dashed border-border/40 bg-muted/10" />;

                  const dayEvents = eventsByDate[cell.dateStr] ?? [];
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDate;
                  const hasPriority = dayEvents.some((e) => e.priority === "high");
                  const weather = showWeather ? weatherByDate[cell.dateStr] : null;
                  const weatherBorder = weather?.status === "red"
                    ? "border-red-500/50 bg-red-500/5"
                    : weather?.status === "yellow"
                      ? "border-yellow-500/40 bg-yellow-500/5"
                      : "";

                  return (
                    <div
                      key={cell.dateStr}
                      className={`min-h-[112px] cursor-pointer rounded-2xl border p-2.5 transition-all ${
                        isSelected ? "border-primary/60 bg-primary/10 shadow-sm shadow-primary/10" :
                        isToday ? "border-accent/50 bg-accent/5" :
                        hasPriority ? "border-red-500/30 bg-red-500/5" :
                        weather && weatherBorder ? weatherBorder :
                        "border-border/50 bg-background/40 hover:border-border hover:bg-secondary/20"
                      }`}
                      onClick={() => setSelectedDate(cell.dateStr)}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isToday ? "text-accent" : "text-muted-foreground"}`}>
                          {cell.day}
                        </span>
                        {weather && (
                          <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] leading-none shadow-sm" title={`${weather.condition} ${weather.high}°/${weather.low}°`}>
                            {weather.icon}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className={`truncate rounded-md border px-2 py-1 text-[10px] font-medium leading-tight ${TYPE_COLORS[ev.type] ?? "bg-secondary text-foreground"}`}
                          >
                            {ev.title.slice(0, 25)}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedDate && (
            <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/90 shadow-sm">
              <CardContent className="p-0">
                <div className="border-b border-border/50 px-5 py-4">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Selected day</div>
                  <h3 className="mt-1 text-lg font-semibold leading-tight">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </h3>
                </div>
                <div className="space-y-4 px-5 py-5">
                  {showWeather && weatherByDate[selectedDate] && (() => {
                    const w = weatherByDate[selectedDate];
                    const statusColor = w.status === "red"
                      ? "border-red-500/50 bg-red-500/10"
                      : w.status === "yellow"
                        ? "border-yellow-500/40 bg-yellow-500/10"
                        : "border-green-500/40 bg-green-500/10";
                    const statusLabel = w.status === "red" ? "STOP / CALL OFF" : w.status === "yellow" ? "CAUTION" : "ALL CLEAR";

                    return (
                      <div className={`rounded-2xl border p-4 ${statusColor}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-lg">{w.icon} {w.condition}</span>
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em]">{statusLabel}</span>
                        </div>
                        <div className="mb-2 flex gap-3 text-xs text-muted-foreground">
                          <span>{w.high}° / {w.low}°F</span>
                        </div>
                        {w.recommendations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-xs font-semibold">Recommendations</span>
                            {w.recommendations.map((r, i) => (
                              <div key={i} className="border-l-2 border-yellow-500/50 pl-2 text-xs text-muted-foreground">{r}</div>
                            ))}
                          </div>
                        )}
                        {w.projects.length > 0 && (
                          <div className="mt-2 text-[10px] text-muted-foreground">Projects: {w.projects.join(", ")}</div>
                        )}
                      </div>
                    );
                  })()}

                  {selectedEvents.length === 0 && !weatherByDate[selectedDate] ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                      No scheduled items for this day.
                    </div>
                  ) : selectedEvents.length === 0 ? null : (
                    <div className="space-y-3">
                      {selectedEvents.map((ev) => (
                        <div key={ev.id} className={`rounded-2xl border p-3 text-sm ${TYPE_COLORS[ev.type] ?? ""}`}>
                          <div className="font-medium leading-snug">{ev.title}</div>
                          <div className="mt-1 flex gap-2 text-xs opacity-80">
                            <span>{ev.project}</span>
                            {ev.detail && <span>• {ev.detail}</span>}
                          </div>
                          {ev.priority === "high" && <Badge variant="destructive" className="mt-2 text-[10px]">Action Needed</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/90 shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-border/50 px-5 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Forward look</div>
                <h3 className="mt-1 text-lg font-semibold">Upcoming 14 days</h3>
              </div>
              <div className="px-5 py-5">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing upcoming.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 12).map((ev) => (
                      <div
                        key={ev.id}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-transparent bg-background/40 p-3 text-sm transition-colors hover:border-border/60 hover:bg-secondary/20"
                        onClick={() => setSelectedDate(ev.date)}
                      >
                        <span className="mt-0.5 whitespace-nowrap rounded-full bg-secondary/70 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          {ev.date.slice(5)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium leading-snug">{ev.title}</div>
                          <div className="text-xs text-muted-foreground">{ev.project}</div>
                        </div>
                      </div>
                    ))}
                    {upcomingEvents.length > 12 && (
                      <p className="text-xs text-muted-foreground">+{upcomingEvents.length - 12} more scheduled items</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return <AppShell><CalendarContent /></AppShell>;
}
