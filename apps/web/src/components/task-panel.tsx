"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Id } from "../../convex/_generated/dataModel";

const PHASES = ["Pre-Construction", "Foundation", "Framing", "Rough-In", "Finish", "Closeout"];
const TRADES = ["General", "Electrical", "Plumbing", "HVAC", "Concrete", "Steel", "Drywall", "Roofing", "Painting", "Flooring", "Insulation", "Fire Protection", "Excavation", "Masonry", "Carpentry", "Other"];
const STATUSES = ["Not Started", "In Progress", "Blocked", "Complete"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

function statusColor(s: string) {
  if (s === "Complete") return "bg-green-500/20 text-green-400";
  if (s === "In Progress") return "bg-blue-500/20 text-blue-400";
  if (s === "Blocked") return "bg-red-500/20 text-red-400";
  return "bg-secondary text-muted-foreground";
}

function priorityColor(p: string) {
  if (p === "Critical") return "text-red-400";
  if (p === "High") return "text-orange-400";
  if (p === "Medium") return "text-yellow-400";
  return "text-muted-foreground";
}

export function TaskPanel({ tasks, projectId, userName }: { tasks: any[]; projectId: string; userName: string }) {
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const addNote = useMutation(api.tasks.addNote);
  const removeTask = useMutation(api.tasks.remove);

  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<"active" | "overdue" | "week" | "all">("active");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteProgress, setNoteProgress] = useState<number | "">("");

  // New task form
  const [newTask, setNewTask] = useState({ name: "", priority: "Medium", trade: "", phase: "", assignedTo: "", dueDate: "", startDate: "" });

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const sorted = useMemo(() => {
    let list = [...tasks];
    if (filter === "active") list = list.filter((t) => t.status !== "Complete");
    else if (filter === "overdue") list = list.filter((t) => t.dateScheduled && t.dateScheduled < today && t.status !== "Complete");
    else if (filter === "week") list = list.filter((t) => t.dateScheduled && t.dateScheduled >= today && t.dateScheduled <= weekEnd && t.status !== "Complete");
    // Sort: overdue first, then by date
    return list.sort((a, b) => {
      const aOver = a.dateScheduled && a.dateScheduled < today && a.status !== "Complete" ? 0 : 1;
      const bOver = b.dateScheduled && b.dateScheduled < today && b.status !== "Complete" ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return (a.dateScheduled || "9999").localeCompare(b.dateScheduled || "9999");
    });
  }, [tasks, filter, today, weekEnd]);

  const overdue = tasks.filter((t) => t.dateScheduled && t.dateScheduled < today && t.status !== "Complete").length;
  const thisWeek = tasks.filter((t) => t.dateScheduled && t.dateScheduled >= today && t.dateScheduled <= weekEnd && t.status !== "Complete").length;
  const completed = tasks.filter((t) => t.status === "Complete").length;

  // Fullscreen task detail
  if (selectedTask) {
    const t = tasks.find((task) => task._id === selectedTask._id) || selectedTask;
    const log = (t.activityLog || []).slice().reverse();
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>← Back to Tasks</Button>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="font-bold text-lg">{t.customTask || t.task}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={statusColor(t.status || "Not Started")}>{t.status || "Not Started"}</Badge>
              {t.priority && <Badge variant="secondary" className={`text-[10px] ${priorityColor(t.priority)}`}>{t.priority}</Badge>}
              {t.trade && <Badge variant="secondary" className="text-[10px]">🔧 {t.trade}</Badge>}
              {t.phase && <Badge variant="secondary" className="text-[10px]">📐 {t.phase}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{t.progress || 0}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div className={`h-full rounded-full transition-all ${t.status === "Complete" ? "bg-green-500" : t.status === "Blocked" ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${t.progress || 0}%` }} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-secondary/30 rounded-lg p-2"><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{t.assignedTo || "—"}</span></div>
          <div className="bg-secondary/30 rounded-lg p-2"><span className="text-muted-foreground">Due:</span> <span className="font-medium">{t.dateScheduled || "—"}</span></div>
          <div className="bg-secondary/30 rounded-lg p-2"><span className="text-muted-foreground">Start:</span> <span className="font-medium">{t.startDate || "—"}</span></div>
          <div className="bg-secondary/30 rounded-lg p-2"><span className="text-muted-foreground">Completed:</span> <span className="font-medium">{t.dateComplete || "—"}</span></div>
        </div>

        {t.blocker && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-red-400">⚡ BLOCKER</p>
            <p className="text-sm">{t.blocker}</p>
          </div>
        )}

        {(t.sourceSpecSection || t.sourcePage || t.sourceQuote || t.sourceType === "spec_intelligence") && (
          <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3">
            <h3 className="mb-2 text-xs font-bold text-cyan-300">SOURCE EVIDENCE</h3>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {t.sourceSpecSection && <span>Spec: {t.sourceSpecSection}</span>}
              {t.sourcePage && <span>Page: {t.sourcePage}</span>}
              {typeof t.sourceConfidence === "number" && <span>Confidence: {Math.round(t.sourceConfidence * 100)}%</span>}
              {t.projectRole && <span>Role: {t.projectRole}</span>}
              {t.sourceItemId && <span>Matrix item: {String(t.sourceItemId).slice(-8)}</span>}
            </div>
            {t.sourceQuote && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">"{t.sourceQuote}"</p>}
          </div>
        )}

        {/* Quick update */}
        <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <Button key={s} size="sm" variant={t.status === s ? "default" : "outline"} className="text-xs h-7"
                onClick={() => updateTask({ id: t._id, status: s })}>
                {s === "Complete" ? "✅" : s === "In Progress" ? "🔄" : s === "Blocked" ? "🔴" : "⬜"} {s}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground w-14">Progress:</span>
            <input type="range" min="0" max="100" step="5" value={t.progress || 0} className="flex-1"
              onChange={(e) => updateTask({ id: t._id, progress: parseInt(e.target.value) })} />
            <span className="text-xs font-bold w-10">{t.progress || 0}%</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground w-14">Due:</span>
            <Input type="date" value={t.dateScheduled || ""} className="flex-1 text-sm h-8"
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              onChange={(e) => {
                addNote({ id: t._id, author: userName, note: `Rescheduled to ${e.target.value}`, type: "date_change", dateScheduled: e.target.value });
              }} />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground w-14">Assign:</span>
            <Input value={t.assignedTo || ""} className="flex-1 text-sm h-8" placeholder="Name or company..."
              onChange={(e) => updateTask({ id: t._id, assignedTo: e.target.value })} />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground w-14">Blocker:</span>
            <Input value={t.blocker || ""} className="flex-1 text-sm h-8" placeholder="What's blocking this?"
              onChange={(e) => updateTask({ id: t._id, blocker: e.target.value })} />
          </div>
        </div>

        {/* Add note */}
        <div className="flex gap-2">
          <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." className="flex-1 text-sm" />
          <Input type="number" value={noteProgress} onChange={(e) => setNoteProgress(e.target.value ? parseInt(e.target.value) : "")} placeholder="%" className="w-16 text-sm" min={0} max={100} />
          <Button size="sm" disabled={!noteText.trim()} onClick={() => {
            addNote({ id: t._id, author: userName, note: noteText.trim(), progress: noteProgress !== "" ? noteProgress as number : undefined });
            setNoteText(""); setNoteProgress("");
          }}>+ Note</Button>
        </div>

        {/* Activity Log */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">📝 Activity Log</h3>
          {log.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {log.map((entry: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0 w-16">{entry.date}</span>
                  <span className={`shrink-0 ${entry.type === "date_change" ? "text-yellow-400" : entry.type === "progress" ? "text-blue-400" : entry.type === "status_change" ? "text-green-400" : "text-muted-foreground"}`}>
                    {entry.type === "date_change" ? "📅" : entry.type === "progress" ? "📊" : entry.type === "status_change" ? "🔄" : entry.type === "created" ? "✨" : "📝"}
                  </span>
                  <div>
                    <span className="font-medium">{entry.author}</span>
                    <span className="text-muted-foreground ml-1">— {entry.note}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="destructive" size="sm" className="text-xs" onClick={() => { if (confirm("Delete this task?")) { removeTask({ id: t._id }); setSelectedTask(null); } }}>
          🗑️ Delete Task
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5">
          <button onClick={() => setView("list")} className={`px-2.5 py-1 rounded text-xs font-medium ${view === "list" ? "bg-orange-500 text-white" : "bg-secondary/50 text-muted-foreground"}`}>📋 List</button>
          <button onClick={() => setView("board")} className={`px-2.5 py-1 rounded text-xs font-medium ${view === "board" ? "bg-orange-500 text-white" : "bg-secondary/50 text-muted-foreground"}`}>📊 Board</button>
        </div>
        <div className="flex gap-1.5">
          {([
            { k: "active", l: `Active (${tasks.length - completed})` },
            { k: "overdue", l: `🔴 Overdue (${overdue})` },
            { k: "week", l: `This Week (${thisWeek})` },
            { k: "all", l: `All (${tasks.length})` },
          ] as const).map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-2 py-1 rounded text-[10px] font-medium ${filter === k ? "bg-orange-500 text-white" : "bg-secondary/50 text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs" onClick={() => setShowAdd(!showAdd)}>+ Add Task</Button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-2 text-xs">
        {overdue > 0 && <Badge variant="destructive" className="text-[10px]">🔴 {overdue} overdue</Badge>}
        <Badge variant="secondary" className="text-[10px]">🔄 {tasks.filter((t) => t.status === "In Progress").length} in progress</Badge>
        <Badge variant="secondary" className="text-[10px]">✅ {completed}/{tasks.length} done</Badge>
        {tasks.filter((t) => t.status === "Blocked").length > 0 && <Badge variant="destructive" className="text-[10px]">🚫 {tasks.filter((t) => t.status === "Blocked").length} blocked</Badge>}
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <Card className="bg-card border-border">
          <CardContent className="pt-3 pb-3 space-y-2">
            <Input placeholder="Task name..." value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <select className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" value={newTask.trade} onChange={(e) => setNewTask({ ...newTask, trade: e.target.value })}>
                <option value="">Trade...</option>
                {TRADES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" value={newTask.phase} onChange={(e) => setNewTask({ ...newTask, phase: e.target.value })}>
                <option value="">Phase...</option>
                {PHASES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <Input placeholder="Assigned to..." value={newTask.assignedTo} onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })} className="text-xs h-8" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={newTask.startDate} onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })} className="text-xs h-8" onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
              <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} className="text-xs h-8" onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600" disabled={!newTask.name.trim()} onClick={async () => {
                await createTask({
                  projectId: projectId as Id<"projects">,
                  task: "Other",
                  customTask: newTask.name.trim(),
                  priority: newTask.priority,
                  trade: newTask.trade || undefined,
                  phase: newTask.phase || undefined,
                  assignedTo: newTask.assignedTo || undefined,
                  dateScheduled: newTask.dueDate || undefined,
                  startDate: newTask.startDate || undefined,
                });
                setNewTask({ name: "", priority: "Medium", trade: "", phase: "", assignedTo: "", dueDate: "", startDate: "" });
                setShowAdd(false);
              }}>Create Task</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="space-y-1">
          {sorted.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p className="text-3xl mb-2">✅</p>
              <p>{filter === "overdue" ? "No overdue tasks!" : filter === "week" ? "Nothing due this week" : "No tasks yet"}</p>
            </div>
          )}
          {sorted.map((t) => {
            const isOverdue = t.dateScheduled && t.dateScheduled < today && t.status !== "Complete";
            return (
              <div key={t._id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${isOverdue ? "bg-red-500/5 border-red-500/20" : "bg-secondary/20 border-border hover:bg-secondary/40"}`}
                onClick={() => setSelectedTask(t)}>
                <span className="text-sm">
                  {t.status === "Complete" ? "✅" : t.status === "Blocked" ? "🔴" : t.status === "In Progress" ? "🔄" : "⬜"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${t.status === "Complete" ? "line-through text-muted-foreground" : ""}`}>{t.customTask || t.task}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    {t.assignedTo && <span>👷 {t.assignedTo}</span>}
                    {t.trade && <span>🔧 {t.trade}</span>}
                    {t.dateScheduled && <span className={isOverdue ? "text-red-400 font-bold" : ""}>📅 {t.dateScheduled}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.blocker && <span className="text-red-400 text-[10px]">⚡</span>}
                  <div className="w-12 bg-gray-700 rounded-full h-1.5">
                    <div className={`h-full rounded-full ${t.status === "Complete" ? "bg-green-500" : t.status === "Blocked" ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${t.progress || 0}%` }} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{t.progress || 0}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOARD VIEW */}
      {view === "board" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STATUSES.map((status) => {
            const col = tasks.filter((t) => (t.status || "Not Started") === status);
            return (
              <div key={status} className="space-y-1.5">
                <div className={`text-xs font-bold uppercase px-2 py-1 rounded ${statusColor(status)}`}>
                  {status} ({col.length})
                </div>
                {col.map((t) => (
                  <div key={t._id}
                    className="bg-card border border-border rounded-lg p-2 cursor-pointer hover:border-orange-500/30 transition-colors"
                    onClick={() => setSelectedTask(t)}>
                    <p className="text-xs font-medium truncate">{t.customTask || t.task}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {t.priority && <span className={`text-[9px] ${priorityColor(t.priority)}`}>{t.priority}</span>}
                      <div className="flex-1 bg-gray-700 rounded-full h-1">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${t.progress || 0}%` }} />
                      </div>
                      <span className="text-[9px]">{t.progress || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
