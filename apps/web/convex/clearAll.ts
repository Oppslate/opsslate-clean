import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["companies", "users", "projects", "equipment", "rentals", "deliveries", "concretePours", "submittals", "rfis", "risks", "maintenance", "vendors"] as const;
    let count = 0;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        count++;
      }
    }
    return `Cleared ${count} documents`;
  },
});
