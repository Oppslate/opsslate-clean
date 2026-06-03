import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function taskName(task: any) {
  return String(task.customTask || task.task || "").trim();
}

function dependencyTypeLabel(value?: string) {
  const type = value || "finish_to_start";
  if (type === "start_to_start") return "Start-to-start";
  if (type === "finish_to_finish") return "Finish-to-finish";
  if (type === "start_to_finish") return "Start-to-finish";
  return "Finish-to-start";
}

function normalize(value?: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function matchScore(task: any, constraint: any) {
  const haystack = normalize([constraint.title, constraint.description, constraint.blockingRule, constraint.trade, constraint.phase].filter(Boolean).join(" "));
  const name = normalize(taskName(task));
  let score = 0;
  if (name && haystack.includes(name)) score += 8;
  if (task.trade && constraint.trade && normalize(task.trade) === normalize(constraint.trade)) score += 3;
  if (task.phase && constraint.phase && normalize(task.phase) === normalize(constraint.phase)) score += 3;
  for (const word of name.split(" ").filter((item) => item.length > 4)) {
    if (haystack.includes(word)) score += 1;
  }
  return score;
}

function matchTaskForConstraint(tasks: any[], constraint: any, excludeId?: string) {
  const ranked = tasks
    .filter((task) => String(task._id) !== String(excludeId || ""))
    .map((task) => ({ task, score: matchScore(task, constraint) }))
    .filter((row) => row.score >= 3)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.task || null;
}

function edgeFromConstraint(constraint: any, tasks: any[]) {
  const relatedTask = constraint.relatedTaskId ? tasks.find((task) => String(task._id) === String(constraint.relatedTaskId)) : null;
  const predecessor = constraint.predecessorTaskId
    ? tasks.find((task) => String(task._id) === String(constraint.predecessorTaskId))
    : matchTaskForConstraint(tasks, constraint, constraint.relatedTaskId);
  const successor = constraint.successorTaskId
    ? tasks.find((task) => String(task._id) === String(constraint.successorTaskId))
    : relatedTask;

  if (!predecessor || !successor || String(predecessor._id) === String(successor._id)) return null;
  return {
    id: String(constraint._id),
    constraintId: String(constraint._id),
    predecessorTaskId: String(predecessor._id),
    predecessorTitle: taskName(predecessor),
    successorTaskId: String(successor._id),
    successorTitle: taskName(successor),
    dependencyType: constraint.dependencyType || "finish_to_start",
    dependencyLabel: dependencyTypeLabel(constraint.dependencyType),
    lagDays: constraint.lagDays ?? constraint.leadTimeDays ?? constraint.reviewPeriodDays ?? 0,
    status: constraint.dependencyStatus || "candidate",
    title: constraint.title,
    blockingRule: constraint.blockingRule,
  };
}

function findCycleWarnings(edges: any[]) {
  const graph = new Map<string, string[]>();
  for (const edge of edges) graph.set(edge.predecessorTaskId, [...(graph.get(edge.predecessorTaskId) || []), edge.successorTaskId]);
  const warnings: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string, path: string[]) {
    if (visiting.has(node)) {
      warnings.push(`Cycle warnings: ${[...path, node].join(" -> ")}`);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of graph.get(node) || []) visit(next, [...path, node]);
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) visit(node, []);
  return warnings.slice(0, 8);
}

function buildDependencyGraph(tasks: any[], constraints: any[]) {
  const edges = constraints.map((constraint) => edgeFromConstraint(constraint, tasks)).filter(Boolean);
  const predecessorCounts = new Map<string, number>();
  const successorCounts = new Map<string, number>();
  for (const edge of edges as any[]) {
    predecessorCounts.set(edge.successorTaskId, (predecessorCounts.get(edge.successorTaskId) || 0) + 1);
    successorCounts.set(edge.predecessorTaskId, (successorCounts.get(edge.predecessorTaskId) || 0) + 1);
  }
  const nodes = tasks.map((task) => ({
    id: String(task._id),
    title: taskName(task),
    status: task.status,
    dateScheduled: task.dateScheduled,
    dependsOn: task.dependsOn || [],
    predecessorCount: predecessorCounts.get(String(task._id)) || 0,
    successorCount: successorCounts.get(String(task._id)) || 0,
  }));
  const criticalPathCandidates = nodes
    .filter((node) => node.predecessorCount || node.successorCount)
    .sort((a, b) => (b.predecessorCount + b.successorCount) - (a.predecessorCount + a.successorCount))
    .slice(0, 8);
  return {
    nodes,
    edges,
    unresolvedConstraints: constraints.filter((constraint) => !edgeFromConstraint(constraint, tasks)).map((constraint) => ({
      id: String(constraint._id),
      title: constraint.title,
      reason: constraint.relatedTaskId ? "Needs a matching predecessor task" : "Needs successor task link",
    })),
    cycleWarnings: findCycleWarnings(edges),
    criticalPathCandidates,
  };
}

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("scheduleConstraints").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
  },
});

export const getDependencyGraph = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const constraints = await ctx.db.query("scheduleConstraints").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    return buildDependencyGraph(tasks, constraints);
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    title: v.string(),
    constraintType: v.optional(v.string()),
    description: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    leadTimeDays: v.optional(v.number()),
    reviewPeriodDays: v.optional(v.number()),
    blockingRule: v.optional(v.string()),
    relatedTaskId: v.optional(v.string()),
    predecessorTaskId: v.optional(v.string()),
    successorTaskId: v.optional(v.string()),
    dependencyType: v.optional(v.string()),
    lagDays: v.optional(v.number()),
    dependencyStatus: v.optional(v.string()),
    dependencyNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("scheduleConstraints", {
      ...args,
      status: args.status || "active",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduleConstraints"),
    title: v.optional(v.string()),
    constraintType: v.optional(v.string()),
    description: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    projectRole: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    leadTimeDays: v.optional(v.number()),
    reviewPeriodDays: v.optional(v.number()),
    blockingRule: v.optional(v.string()),
    relatedTaskId: v.optional(v.string()),
    predecessorTaskId: v.optional(v.string()),
    successorTaskId: v.optional(v.string()),
    dependencyType: v.optional(v.string()),
    lagDays: v.optional(v.number()),
    dependencyStatus: v.optional(v.string()),
    dependencyNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)));
  },
});

export const applyConstraintDependencies = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const constraints = await ctx.db.query("scheduleConstraints").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    const graph = buildDependencyGraph(tasks, constraints);
    let applied = 0;

    for (const edge of graph.edges as any[]) {
      const successor = tasks.find((task) => String(task._id) === edge.successorTaskId);
      if (!successor) continue;
      const dependsOn = Array.from(new Set([...(successor.dependsOn || []).map(String), edge.predecessorTaskId]));
      await ctx.db.patch(successor._id, { dependsOn } as any);
      await ctx.db.patch(edge.constraintId as any, {
        predecessorTaskId: edge.predecessorTaskId,
        successorTaskId: edge.successorTaskId,
        dependencyType: edge.dependencyType,
        lagDays: edge.lagDays,
        dependencyStatus: "applied",
      } as any);
      applied += 1;
    }

    for (const unresolved of graph.unresolvedConstraints) {
      await ctx.db.patch(unresolved.id as any, {
        dependencyStatus: "needs_review",
        dependencyNotes: unresolved.reason,
      } as any);
    }

    return {
      applied,
      unresolved: graph.unresolvedConstraints.length,
      cycleWarnings: graph.cycleWarnings,
      criticalPathCandidates: graph.criticalPathCandidates,
    };
  },
});

export const remove = mutation({
  args: { id: v.id("scheduleConstraints") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
