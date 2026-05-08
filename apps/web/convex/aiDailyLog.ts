"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

export const generate = action({
  args: {
    companyId: v.string(),
    projectId: v.id("projects"),
    projectName: v.string(),
    date: v.string(),
    // All activity data passed from client
    crewOnSite: v.array(v.object({ name: v.string(), trade: v.optional(v.string()) })),
    timeEntries: v.array(v.object({ name: v.string(), hours: v.number(), trade: v.optional(v.string()) })),
    punchItems: v.array(v.object({ title: v.string(), status: v.string() })),
    changeOrders: v.array(v.object({ title: v.string(), status: v.string(), cost: v.optional(v.number()) })),
    incidents: v.array(v.object({ type: v.string(), severity: v.optional(v.string()) })),
    rfis: v.array(v.object({ subject: v.string(), status: v.string() })),
    submittals: v.array(v.object({ title: v.string(), status: v.string() })),
    weather: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const client = new Anthropic({ apiKey });

    const prompt = `You are a construction superintendent writing a professional daily log for a construction project.

Project: ${args.projectName}
Date: ${args.date}
${args.weather ? `Weather: ${args.weather}` : ""}

TODAY'S ACTIVITY:
${args.crewOnSite.length > 0 ? `\nCrew On Site (${args.crewOnSite.length}):\n${args.crewOnSite.map(c => `- ${c.name} (${c.trade || "General"})`).join("\n")}` : "\nNo crew logged."}
${args.timeEntries.length > 0 ? `\nTime Logged:\n${args.timeEntries.map(t => `- ${t.name}: ${t.hours}hrs (${t.trade || "General"})`).join("\n")}` : ""}
${args.punchItems.length > 0 ? `\nPunch List Activity:\n${args.punchItems.map(p => `- ${p.title} [${p.status}]`).join("\n")}` : ""}
${args.changeOrders.length > 0 ? `\nChange Orders:\n${args.changeOrders.map(c => `- ${c.title} [${c.status}]${c.cost ? " $" + c.cost.toLocaleString() : ""}`).join("\n")}` : ""}
${args.incidents.length > 0 ? `\n⚠️ Safety Incidents:\n${args.incidents.map(i => `- ${i.type} (${i.severity || "Unknown"})`).join("\n")}` : ""}
${args.rfis.length > 0 ? `\nRFIs:\n${args.rfis.map(r => `- ${r.subject} [${r.status}]`).join("\n")}` : ""}
${args.submittals.length > 0 ? `\nSubmittals:\n${args.submittals.map(s => `- ${s.title} [${s.status}]`).join("\n")}` : ""}
${args.notes ? `\nAdditional Notes: ${args.notes}` : ""}

Write a concise, professional daily construction log. Include:
1. Weather & Conditions (1-2 sentences)
2. Manpower Summary (crew count by trade)
3. Work Performed Today (bulleted, specific)
4. Issues & Delays (if any)
5. Safety (incidents or "No safety incidents")
6. Materials & Deliveries (if applicable)
7. Tomorrow's Plan (2-3 items based on context)

Keep it factual, concise, and in construction industry standard format. No fluff.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text;
  },
});
