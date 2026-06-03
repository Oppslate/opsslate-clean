import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    task: v.string(),
    customTask: v.optional(v.string()),
    dateOrdered: v.optional(v.string()),
    dateScheduled: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dateComplete: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    impact: v.optional(v.string()),
    progress: v.optional(v.number()),
    assignedTo: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceItemId: v.optional(v.string()),
    sourceDocumentId: v.optional(v.string()),
    sourceSpecSection: v.optional(v.string()),
    sourcePage: v.optional(v.string()),
    sourceQuote: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    sourceCategory: v.optional(v.string()),
    blocker: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString().slice(0, 10);
    const log = [{ date: now, author: "System", note: `Task created: ${args.customTask || args.task}`, type: "created" }];
    return ctx.db.insert("tasks", {
      ...args,
      status: args.status ?? "Not Started",
      progress: args.progress ?? 0,
      activityLog: log,
    });
  },
});

async function syncSpecIntelligenceResolution(ctx: any, record: any, args: { recordType: string; recordId: string; note: string; resolvedBy?: string; resolvedAnswer?: string }) {
  if (!record?.sourceItemId || record.sourceType !== "spec_intelligence") return;
  const sourceItem = await ctx.db.get(record.sourceItemId as any);
  if (!sourceItem) return;
  await ctx.db.patch(record.sourceItemId as any, {
    status: "resolved",
    resolutionStatus: "resolved",
    resolvedAnswer: args.resolvedAnswer,
    resolvedByRecordType: args.recordType,
    resolvedByRecordId: args.recordId,
    resolvedNote: args.note,
    resolvedAt: Date.now(),
    resolvedBy: args.resolvedBy,
    closedLoopSyncedAt: Date.now(),
  });
}

export const update = mutation({
  args: {
    id: v.id("tasks"),
    task: v.optional(v.string()),
    customTask: v.optional(v.string()),
    dateOrdered: v.optional(v.string()),
    dateScheduled: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dateComplete: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    impact: v.optional(v.string()),
    progress: v.optional(v.number()),
    assignedTo: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    blocker: v.optional(v.string()),
    dependsOn: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) return;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    
    // Auto-complete logic
    if (clean.status === "Complete" && !clean.dateComplete) {
      clean.dateComplete = new Date().toISOString().slice(0, 10);
    }
    if (clean.status === "Complete") {
      clean.progress = 100;
    }
    
    await ctx.db.patch(id, clean);
    if (existing.sourceType === "spec_intelligence" && (clean.status === "Complete" || clean.progress === 100)) {
      await syncSpecIntelligenceResolution(ctx, existing, {
        recordType: "task",
        recordId: String(id),
        note: "Task completed and synced to Spec Intelligence Matrix",
        resolvedBy: clean.assignedTo || existing.assignedTo ? String(clean.assignedTo || existing.assignedTo) : undefined,
        resolvedAnswer: clean.impact || existing.impact ? String(clean.impact || existing.impact) : "Task completed",
      });
    }
  },
});

// Add a note to a task's activity log
export const addNote = mutation({
  args: {
    id: v.id("tasks"),
    author: v.string(),
    note: v.string(),
    type: v.optional(v.string()),
    // Optional: also update fields when adding a note
    progress: v.optional(v.number()),
    status: v.optional(v.string()),
    dateScheduled: v.optional(v.string()),
    blocker: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return;
    
    const now = new Date().toISOString().slice(0, 10);
    const log = (task as any).activityLog || [];
    
    // Add the note
    log.push({ date: now, author: args.author, note: args.note, type: args.type || "note" });
    
    // Track changes in the log
    const updates: Record<string, any> = { activityLog: log };
    
    if (args.progress !== undefined && args.progress !== (task as any).progress) {
      log.push({ date: now, author: args.author, note: `Progress: ${(task as any).progress || 0}% → ${args.progress}%`, type: "progress" });
      updates.progress = args.progress;
      if (args.progress === 100) {
        updates.status = "Complete";
        updates.dateComplete = now;
      } else if (args.progress > 0 && task.status === "Not Started") {
        updates.status = "In Progress";
      }
    }
    
    if (args.status && args.status !== task.status) {
      log.push({ date: now, author: args.author, note: `Status: ${task.status} → ${args.status}`, type: "status_change" });
      updates.status = args.status;
      if (args.status === "Complete") {
        updates.progress = 100;
        updates.dateComplete = now;
      }
    }
    
    if (args.dateScheduled && args.dateScheduled !== task.dateScheduled) {
      log.push({ date: now, author: args.author, note: `Due date: ${task.dateScheduled || "none"} → ${args.dateScheduled}`, type: "date_change" });
      updates.dateScheduled = args.dateScheduled;
    }
    
    if (args.blocker !== undefined) {
      updates.blocker = args.blocker;
      if (args.blocker && task.status !== "Blocked") {
        updates.status = "Blocked";
        log.push({ date: now, author: args.author, note: `Blocked: ${args.blocker}`, type: "status_change" });
      } else if (!args.blocker && task.status === "Blocked") {
        updates.status = "In Progress";
        log.push({ date: now, author: args.author, note: `Blocker cleared`, type: "status_change" });
      }
    }
    
    await ctx.db.patch(args.id, updates);
    if (task.sourceType === "spec_intelligence" && (updates.status === "Complete" || updates.progress === 100)) {
      await syncSpecIntelligenceResolution(ctx, task, {
        recordType: "task",
        recordId: String(args.id),
        note: "Task activity completed and synced to Spec Intelligence Matrix",
        resolvedBy: args.author,
        resolvedAnswer: args.note || "Task completed",
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
