import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("rentals")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const listByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const all = [];
    for (const p of projects) {
      const rentals = await ctx.db
        .query("rentals")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      for (const r of rentals) {
        const eq = await ctx.db.get(r.equipmentId);
        all.push({ ...r, projectName: p.name, equipmentName: eq?.name ?? "" });
      }
    }
    return all;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    equipmentId: v.id("equipment"),
    vendor: v.optional(v.string()),
    po: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    rateType: v.optional(v.string()),
    rate: v.optional(v.number()),
    qty: v.optional(v.number()),
    deliveryFee: v.optional(v.number()),
    pickupFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("rentals", {
      ...args,
      status: "On Rent",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("rentals"),
    vendor: v.optional(v.string()),
    po: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    rateType: v.optional(v.string()),
    rate: v.optional(v.number()),
    qty: v.optional(v.number()),
    deliveryFee: v.optional(v.number()),
    pickupFee: v.optional(v.number()),
    status: v.optional(v.string()),
    lastVerified: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const clean = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, clean);
  },
});

export const offRent = mutation({
  args: { id: v.id("rentals") },
  handler: async (ctx, args) => {
    const rental = await ctx.db.get(args.id);
    if (!rental) throw new Error("Rental not found");

    const endDate = new Date().toISOString().slice(0, 10);
    let daysRented = 1;
    let totalCost = 0;

    if (rental.start) {
      const start = new Date(rental.start);
      const end = new Date(endDate);
      daysRented = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      if (rental.rate) {
        const qty = rental.qty ?? 1;
        if (rental.rateType === "Weekly") {
          totalCost = Math.ceil(daysRented / 7) * rental.rate * qty;
        } else if (rental.rateType === "Monthly") {
          totalCost = Math.ceil(daysRented / 30) * rental.rate * qty;
        } else {
          // Default to daily
          totalCost = daysRented * rental.rate * qty;
        }
        totalCost += (rental.deliveryFee ?? 0) + (rental.pickupFee ?? 0);
      }
    }

    await ctx.db.patch(args.id, {
      status: "Off Rent",
      end: endDate,
      daysRented,
      totalCost,
    });
  },
});
