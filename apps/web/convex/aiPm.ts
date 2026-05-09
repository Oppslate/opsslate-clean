import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const PM_NAMES = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Taylor", "Quinn", "Blake", "Drew", "Avery", "Reese", "Skyler", "Dakota", "Rowan", "Sage", "Parker", "Hayden", "Emery", "Finley"];
const PM_AVATARS = ["👷", "👩‍💼", "🧑‍💻", "👨‍🔧", "👩‍🔧", "🏗️", "📋", "🎯", "⚡", "🔨", "🏢", "📊", "🛠️", "💼", "🧑‍🏭", "👷‍♀️", "🦺", "🔩", "📐", "🧱"];
const PERSONALITIES: Record<string, string> = {
  direct: "Direct & no-nonsense. Gets to the point fast. Flags problems immediately. Talks like a seasoned superintendent.",
  detailed: "Thorough & methodical. Covers every detail. Provides data and numbers. Thinks two steps ahead.",
  friendly: "Proactive & personable. Builds relationships. Communicates warmly but professionally. Great at client-facing work.",
};

// Get PM for a project
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.query("aiProjectManagers").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).first();
  },
});

export const getById = query({
  args: { id: v.id("aiProjectManagers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List all PMs for a company
export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.query("aiProjectManagers").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
  },
});

// Create/assign a PM to a project
export const assign = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    personality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already assigned
    const existing = await ctx.db.query("aiProjectManagers").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).first();
    if (existing) return existing._id;

    // Auto-pick name if not specified
    const allPms = await ctx.db.query("aiProjectManagers").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    const usedNames = new Set(allPms.map((p) => p.name));
    const availableName = PM_NAMES.find((n) => !usedNames.has(n)) || `PM-${allPms.length + 1}`;

    const usedAvatars = new Set(allPms.map((p) => p.avatar));
    const availableAvatar = PM_AVATARS.find((a) => !usedAvatars.has(a)) || "🤖";

    return await ctx.db.insert("aiProjectManagers", {
      companyId: args.companyId,
      projectId: args.projectId,
      name: args.name || availableName,
      avatar: args.avatar || availableAvatar,
      personality: args.personality || "direct",
      status: "active",
      permissions: {
        contacts: "readwrite",
        tasks: "readwrite",
        emails: "read",          // Default: can READ emails but NOT send
        documents: "readwrite",
        budget: "read",          // Default: view only for financials
        schedule: "readwrite",
        changeOrders: "read",    // Default: view only for COs
        rfis: "readwrite",
        submittals: "readwrite",
        deliveries: "readwrite",
        crew: "read",            // Default: view only for crew
        punchList: "readwrite",
      },
      createdAt: Date.now(),
    });
  },
});

// Update PM profile
export const update = mutation({
  args: {
    id: v.id("aiProjectManagers"),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    personality: v.optional(v.string()),
    status: v.optional(v.string()),
    permissions: v.optional(v.object({
      contacts: v.optional(v.string()),
      tasks: v.optional(v.string()),
      emails: v.optional(v.string()),
      documents: v.optional(v.string()),
      budget: v.optional(v.string()),
      schedule: v.optional(v.string()),
      changeOrders: v.optional(v.string()),
      rfis: v.optional(v.string()),
      submittals: v.optional(v.string()),
      deliveries: v.optional(v.string()),
      crew: v.optional(v.string()),
      punchList: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { id, permissions, ...updates } = args;
    const clean: Record<string, any> = {};
    if (updates.name) clean.name = updates.name;
    if (updates.avatar) clean.avatar = updates.avatar;
    if (updates.personality) clean.personality = updates.personality;
    if (updates.status) clean.status = updates.status;
    if (permissions) clean.permissions = permissions;
    await ctx.db.patch(id, clean);
  },
});

// Get chat messages for a PM
export const getMessages = query({
  args: { pmId: v.id("aiProjectManagers") },
  handler: async (ctx, args) => {
    return await ctx.db.query("aiPmMessages").withIndex("by_pm", (q) => q.eq("pmId", args.pmId)).collect();
  },
});

// Add a message (used by both user and AI response)
export const addMessage = mutation({
  args: {
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    role: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiPmMessages", {
      pmId: args.pmId,
      projectId: args.projectId,
      companyId: args.companyId,
      role: args.role,
      message: args.message,
      createdAt: Date.now(),
    });
  },
});

// Get tasks for a PM
export const getTasks = query({
  args: { pmId: v.id("aiProjectManagers") },
  handler: async (ctx, args) => {
    return await ctx.db.query("aiPmTasks").withIndex("by_pm", (q) => q.eq("pmId", args.pmId)).collect();
  },
});

// Get all tasks for a company
export const getAllTasks = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.query("aiPmTasks").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
  },
});

// Create a task for a PM
export const createTask = mutation({
  args: {
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    description: v.string(),
    type: v.string(),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiPmTasks", {
      pmId: args.pmId,
      projectId: args.projectId,
      companyId: args.companyId,
      description: args.description,
      type: args.type,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Update task status
export const updateTask = mutation({
  args: { id: v.id("aiPmTasks"), status: v.string(), result: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.result) updates.result = args.result;
    if (args.status === "done") updates.completedAt = Date.now();
    await ctx.db.patch(args.id, updates);
  },
});

// War Room messages
export const getWarRoom = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("aiWarRoom").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect();
    return messages.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  },
});

export const addWarRoomMessage = mutation({
  args: {
    companyId: v.id("companies"),
    fromPmId: v.id("aiProjectManagers"),
    fromPmName: v.string(),
    fromProject: v.string(),
    message: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiWarRoom", {
      companyId: args.companyId,
      fromPmId: args.fromPmId,
      fromPmName: args.fromPmName,
      fromProject: args.fromProject,
      message: args.message,
      type: args.type,
      resolved: false,
      createdAt: Date.now(),
    });
  },
});

// Export constants for frontend
export const getPersonalities = query({
  handler: async () => PERSONALITIES,
});
