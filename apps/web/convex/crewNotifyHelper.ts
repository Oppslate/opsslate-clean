import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAllActiveCrewByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    // Get all companies
    const companies = await ctx.db.query("companies").collect();
    const results = [];

    for (const company of companies) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const p of projects) {
        const members = await ctx.db
          .query("crew")
          .withIndex("by_project", (q) => q.eq("projectId", p._id))
          .collect();

        for (const m of members) {
          if (m.status === "Active" && m.start === args.date && m.email) {
            results.push({
              ...m,
              projectName: p.name,
              location: p.address
                ? `${p.address}${p.city ? ", " + p.city : ""}${p.state ? ", " + p.state : ""}`
                : p.location ?? "",
            });
          }
        }
      }
    }

    return results;
  },
});
