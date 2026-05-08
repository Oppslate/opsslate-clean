"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const generate = action({
  args: { projectId: v.id("projects"), companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    if (!project) throw new Error("Project not found");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Gather all data
    const allNotes = await ctx.runQuery(a.fieldNotes.list, { projectId: args.projectId });
    const todayNotes = (allNotes || []).filter((n: any) => n.createdAt >= todayStart);

    const allDocs = await ctx.runQuery(a.docManager.list, { companyId: args.companyId, projectId: args.projectId as string });
    const todayDocs = (allDocs || []).filter((d: any) => d.uploadedAt && new Date(d.uploadedAt).getTime() >= todayStart);

    const allEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId as string });
    const todayEmails = (allEmails || []).filter((e: any) => {
      if (e.projectId !== args.projectId) return false;
      if (e.createdAt && e.createdAt >= todayStart) return true;
      if (e.date) return e.date === now.toISOString().slice(0, 10);
      return false;
    });

    // Get crew info
    let crewOnSite: any[] = [];
    try {
      const crew = await ctx.runQuery(a.crew.list, { companyId: args.companyId });
      crewOnSite = (crew || []).filter((c: any) => c.projectId === args.projectId);
    } catch { /* crew query may not exist */ }

    // Get weather
    let weatherInfo = "";
    if (project.latitude && project.longitude) {
      try {
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${project.latitude}&longitude=${project.longitude}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&timezone=America/New_York`);
        if (weatherRes.ok) {
          const wd = await weatherRes.json();
          const current = wd.current;
          const temp = Math.round(current.temperature_2m);
          const wind = Math.round(current.windspeed_10m);
          const codes: Record<number, string> = { 0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Foggy", 48: "Freezing Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 95: "Thunderstorm" };
          weatherInfo = `${codes[current.weathercode] || "Unknown"}, ${temp}°F, Wind ${wind} mph`;
        }
      } catch { /* ignore weather errors */ }
    }

    // Build the AI prompt
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const dataContext = `
PROJECT: ${project.name}${project.code ? ` (${project.code})` : ""}
DATE: ${dateStr}
LOCATION: ${project.location || project.address || "N/A"}
WEATHER: ${weatherInfo || "Not available"}

FIELD NOTES TODAY (${todayNotes.length}):
${todayNotes.map((n: any) => {
  const time = new Date(n.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `- ${time}: ${n.note} (by ${n.author || "Unknown"})`;
}).join("\n") || "None recorded"}

DOCUMENTS UPLOADED TODAY (${todayDocs.length}):
${todayDocs.map((d: any) => `- ${d.name} (${d.category || "Uncategorized"}) uploaded by ${d.uploadedBy || "Unknown"}`).join("\n") || "None"}

COMMUNICATIONS TODAY (${todayEmails.length}):
${todayEmails.map((e: any) => `- ${e.subject || "(No Subject)"} — ${e.source || "Email"} from ${e.from || "Unknown"}`).join("\n") || "None"}

CREW ON SITE (${crewOnSite.length}):
${crewOnSite.map((c: any) => `- ${c.name || "Unknown"} — ${c.trade || c.role || "General"}`).join("\n") || "No crew data"}
`;

    const prompt = `You are a construction superintendent writing a professional daily construction log. Based on the project data below, generate a complete daily log entry.

${dataContext}

Generate a professional daily log with these sections:
1. **Header** — Project name, date, log number, weather conditions
2. **Work Performed Today** — Summarize all activities based on field notes and communications. Write in professional third-person construction language.
3. **Crew & Manpower** — List crews on site with trade and headcount if available
4. **Materials & Deliveries** — Note any materials or deliveries mentioned in notes/communications
5. **Equipment** — Note any equipment mentioned
6. **Visitors / Inspections** — Note any inspectors, visitors, or meetings mentioned
7. **Safety** — Any safety observations from notes (or "No incidents reported")
8. **Weather Impact** — How weather affected work (or "No weather delays")
9. **Issues / Delays** — Any problems mentioned in notes/communications
10. **Photos** — Note photos were taken if documents include images
11. **Tomorrow's Plan** — Brief outlook based on context

Keep it professional, concise, and factual. Use construction industry language. If data is sparse, note "No data recorded" for that section rather than making things up.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const log = result.content[0]?.text ?? "Failed to generate log";

    return { log, date: dateStr, weather: weatherInfo };
  },
});
