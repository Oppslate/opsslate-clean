import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate a unique share token for a project
export const createShareLink = mutation({
  args: { projectId: v.id("projects"), companyId: v.id("companies"), clientName: v.optional(v.string()), expiresInDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Check for existing active link
    const existing = await ctx.db.query("clientPortalLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    if (existing && (!existing.expiresAt || existing.expiresAt > Date.now())) {
      return { token: existing.token, url: `https://www.opsslate.app/client/${existing.token}` };
    }

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresAt = args.expiresInDays ? Date.now() + args.expiresInDays * 86400000 : undefined;

    await ctx.db.insert("clientPortalLinks", {
      projectId: args.projectId,
      companyId: args.companyId,
      token,
      clientName: args.clientName || "Client",
      expiresAt,
      isActive: true,
      createdAt: Date.now(),
    });

    return { token, url: `https://www.opsslate.app/client/${token}` };
  },
});

// Verify and get project data for client view
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db.query("clientPortalLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link || !link.isActive) return null;
    if (link.expiresAt && link.expiresAt < Date.now()) return null;

    const project = await ctx.db.get(link.projectId);
    if (!project) return null;

    // Get company branding
    const company = await ctx.db.get(link.companyId);
    let companyLogoUrl = null;
    if (company && (company as any).logoStorageId) {
      try { companyLogoUrl = await ctx.storage.getUrl((company as any).logoStorageId as any); } catch {}
    }
    const branding = company ? {
      name: company.name,
      logoUrl: companyLogoUrl || (company as any).logoUrl,
      primaryColor: (company as any).primaryColor || "#f97316",
      accentColor: (company as any).accentColor || "#fb923c",
      phone: (company as any).phone,
      email: (company as any).email,
      website: (company as any).website,
      tagline: (company as any).tagline,
    } : null;

    // Get client-safe data (no budget/cost info)
    const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", link.projectId)).collect();
    const media = await ctx.db.query("siteMedia").withIndex("by_project", (q) => q.eq("projectId", link.projectId)).collect();
    const fieldNotes = await ctx.db.query("fieldNotes").withIndex("by_project", (q) => q.eq("projectId", link.projectId)).collect();

    // Resolve photo URLs
    const resolvedMedia = [];
    for (const m of media) {
      let url = m.url;
      if (url && !url.startsWith("http")) {
        try { url = await ctx.storage.getUrl(url as any) || url; } catch {}
      }
      resolvedMedia.push({ ...m, url });
    }

    // Get change orders (approved only — no internal drafts)
    const changeOrders = await ctx.db.query("changeOrders").withIndex("by_project", (q) => q.eq("projectId", link.projectId)).collect();
    const approvedCOs = changeOrders.filter((co) => co.status === "Approved") as any[];

    // Get deliveries
    const deliveries = await ctx.db.query("deliveries").withIndex("by_project", (q) => q.eq("projectId", link.projectId)).collect();

    return {
      project: {
        name: project.name,
        code: project.code,
        address: project.address,
        city: project.city,
        state: project.state,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        projectManager: project.projectManager,
      },
      clientName: link.clientName,
      tasks: tasks.map((t) => ({
        name: t.customTask || t.task,
        status: t.status,
        dateScheduled: t.dateScheduled,
        dateComplete: t.dateComplete,
        priority: t.priority,
      })),
      photos: resolvedMedia.filter((m) => m.type === "photo").map((m) => ({
        url: m.url,
        fileName: m.fileName,
        capturedDate: m.capturedDate,
      })),
      fieldNotes: fieldNotes.slice(-10).map((n) => ({
        note: n.note,
        author: n.author,
        date: new Date(n.createdAt).toLocaleDateString(),
      })),
      changeOrders: approvedCOs.map((co) => ({
        number: co.number,
        description: co.description,
        amount: co.amount,
        status: co.status,
      })),
      deliveries: deliveries.map((d) => ({
        material: d.material,
        supplier: d.supplier,
        status: d.status,
        eta: d.eta,
      })),
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "Complete").length,
      branding,
    };
  },
});

// Deactivate a share link
export const deactivateLink = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const link = await ctx.db.query("clientPortalLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    if (link) await ctx.db.patch(link._id, { isActive: false });
  },
});

// List all share links for a company
export const listLinks = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.query("clientPortalLinks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});
