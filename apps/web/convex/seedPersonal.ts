import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("personalEvents").first();
    if (existing) return "Already seeded personal events";

    const events = [
      { date: "2026-02-23", time: "09:00", title: "Review overnight research results", category: "content", createdBy: "Helios" },
      { date: "2026-02-23", time: "10:00", title: "Baby CEO reply engine check", category: "content", createdBy: "Helios" },
      { date: "2026-02-23", title: "Render 3 new video scripts", category: "content", createdBy: "Helios" },
      { date: "2026-02-24", title: "Skool community soft launch", category: "business", createdBy: "Mike" },
      { date: "2026-02-24", title: "Upload first 5 Skool lessons", category: "content", createdBy: "Mike" },
      { date: "2026-02-25", title: "Construction app: build submittal CRUD", category: "helios", createdBy: "Helios" },
      { date: "2026-02-25", title: "Construction app: build risk register CRUD", category: "helios", createdBy: "Helios" },
      { date: "2026-02-26", time: "12:00", title: "Check Baby CEO engagement metrics", category: "content", createdBy: "Mike" },
      { date: "2026-02-26", title: "Write 10 more video scripts", category: "content", createdBy: "Helios" },
      { date: "2026-02-27", title: "Construction app: add spreadsheet import", category: "helios", createdBy: "Helios" },
      { date: "2026-02-28", title: "End of month revenue review", category: "business", createdBy: "Mike" },
      { date: "2026-02-28", title: "Distill memory files → MEMORY.md", category: "helios", createdBy: "Helios" },
      { date: "2026-03-01", title: "March content calendar planning", category: "content", createdBy: "Mike" },
      { date: "2026-03-01", title: "Launch Skool $37/mo tier", category: "deadline", createdBy: "Mike" },
      { date: "2026-03-03", title: "Construction app: daily email digest feature", category: "helios", createdBy: "Helios" },
      { date: "2026-03-05", time: "19:00", title: "Erica dinner date", category: "personal", createdBy: "Mike" },
      { date: "2026-03-07", title: "Week 2 analytics review — all platforms", category: "business", createdBy: "Helios" },
      { date: "2026-03-10", title: "Lily's school event", category: "personal", createdBy: "Mike" },
      { date: "2026-03-11", title: "Mike's birthday 🎂", category: "personal", createdBy: "Helios" },
    ];

    for (const e of events) {
      await ctx.db.insert("personalEvents", { ...e, done: false });
    }

    return `Seeded ${events.length} personal events`;
  },
});
