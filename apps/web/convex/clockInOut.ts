import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getActiveClockIn = query({
  args: { companyId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const entries: any[] = await ctx.db.query("timeEntries")
      .filter((q) => q.and(
        q.eq(q.field("companyId"), args.companyId),
        q.eq(q.field("clockedInBy"), args.userId),
        q.eq(q.field("clockedOut"), false)
      )).collect();
    return entries[0] || null;
  },
});

export const clockIn = mutation({
  args: {
    companyId: v.string(),
    projectId: v.id("projects"),
    crewMemberId: v.optional(v.string()),
    crewMemberName: v.string(),
    trade: v.optional(v.string()),
    costCode: v.optional(v.string()),
    clockedInBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);

    return await ctx.db.insert("timeEntries", {
      companyId: args.companyId as any,
      projectId: args.projectId,
      crewMemberId: args.crewMemberId,
      crewMemberName: args.crewMemberName,
      trade: args.trade,
      costCode: args.costCode,
      date: today,
      hoursRegular: 0,
      hoursOvertime: 0,
      totalHours: 0,
      totalCost: 0,
      clockInTime: now,
      clockedOut: false,
      clockedInBy: args.clockedInBy,
      status: "active",
    });
  },
});

export const clockOut = mutation({
  args: { id: v.id("timeEntries"), rateRegular: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.id);
    if (!entry || !entry.clockInTime) return;

    const now = Date.now();
    const elapsed = (now - (entry.clockInTime as number)) / 3600000; // hours
    const regular = Math.min(elapsed, 8);
    const overtime = Math.max(elapsed - 8, 0);
    const rate = args.rateRegular || (entry.rateRegular as number) || 0;
    const cost = regular * rate + overtime * rate * 1.5;

    await ctx.db.patch(args.id, {
      clockOutTime: now,
      clockedOut: true,
      hoursRegular: Math.round(regular * 100) / 100,
      hoursOvertime: Math.round(overtime * 100) / 100,
      totalHours: Math.round(elapsed * 100) / 100,
      totalCost: Math.round(cost * 100) / 100,
      rateRegular: rate || undefined,
      status: "pending",
    });
  },
});
