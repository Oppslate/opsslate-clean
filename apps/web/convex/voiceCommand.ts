"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const processCommand = action({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    userId: v.string(),
    userName: v.string(),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    // Gather context
    const project = await ctx.runQuery(a.projects.getById, { id: args.projectId });
    const crew = (await ctx.runQuery(a.crew.listByCompany, { companyId: args.companyId }) as any[])
      .filter((c: any) => c.projectId === args.projectId);
    const tasks = await ctx.runQuery(a.tasks.list, { projectId: args.projectId });
    const rfis = await ctx.runQuery(a.rfis.list, { companyId: args.companyId, projectId: args.projectId as unknown as string });
    const submittals = await ctx.runQuery(a.submittals.list, { companyId: args.companyId, projectId: args.projectId as unknown as string });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const today = new Date().toISOString().slice(0, 10);
    const crewNames = crew.map((c: any) => `${c.firstName} ${c.lastName || ""} (${c.trade || "N/A"})`).join(", ");
    const openRfis = (rfis as any[]).filter((r: any) => r.status === "Open" || r.status === "In Review");
    const pendingSubs = (submittals as any[]).filter((s: any) => s.status === "Pending" || s.status === "In Review");

    const systemPrompt = `You are OpsSlate Voice Command — a hands-free AI assistant for construction jobsites. The user is speaking voice commands while working on site with dirty gloves. Parse their speech and execute commands.

PROJECT: ${project?.name || "Unknown"}
ADDRESS: ${project?.address || "N/A"}, ${project?.city || ""} ${project?.state || ""}
DATE: ${today}
USER: ${args.userName}
CREW ON PROJECT: ${crewNames || "None assigned"}
OPEN RFIs: ${openRfis.length}
PENDING SUBMITTALS: ${pendingSubs.length}
LAT/LON: ${project?.latitude || "N/A"}, ${project?.longitude || "N/A"}

AVAILABLE COMMANDS (return ONE action object):

1. ADD_PUNCH_ITEM - Add a punch list item
   {"action": "ADD_PUNCH_ITEM", "location": "unit/area", "description": "what's wrong", "severity": "Critical|Major|Minor", "trade": "trade responsible"}

2. CLOCK_IN - Clock in a crew member or self
   {"action": "CLOCK_IN", "person": "name or 'me'"}

3. CLOCK_OUT - Clock out
   {"action": "CLOCK_OUT", "person": "name or 'me'"}

4. ADD_DAILY_LOG - Add a daily log entry
   {"action": "ADD_DAILY_LOG", "workPerformed": "description of work", "weather": "conditions", "crewCount": number}

5. CHECK_WEATHER - Get weather forecast
   {"action": "CHECK_WEATHER", "when": "today|tomorrow|week"}

6. CHECK_RFIS - Check RFI status
   {"action": "CHECK_RFIS"}

7. CHECK_SUBMITTALS - Check submittal status
   {"action": "CHECK_SUBMITTALS"}

8. ADD_SAFETY_NOTE - Report safety concern
   {"action": "ADD_SAFETY_NOTE", "description": "what happened", "severity": "Critical|High|Medium|Low", "location": "where"}

9. CHECK_CREW - Who's on site
   {"action": "CHECK_CREW"}

10. CHECK_BUDGET - Budget status
    {"action": "CHECK_BUDGET"}

11. ADD_DELIVERY_NOTE - Note a delivery
    {"action": "ADD_DELIVERY_NOTE", "material": "what was delivered", "status": "Delivered|Damaged|Partial"}

12. ASK_QUESTION - General project question
    {"action": "ASK_QUESTION", "answer": "your answer based on project data"}

Return JSON: {"action": "...", ...fields, "spoken_response": "brief natural response to read aloud (keep under 20 words)", "confirmation": "what was done"}

IMPORTANT: 
- Be forgiving of speech recognition errors (e.g., "unit to oh four" = "unit 204")
- Always include spoken_response (this gets read aloud to the user)
- Keep spoken_response SHORT and natural, like talking to a coworker
- If unclear, ask for clarification in spoken_response`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: `Voice command: "${args.transcript}"` }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    let parsed;
    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      parsed = JSON.parse(jsonMatch[1] || aiText);
    } catch {
      return { action: "ERROR", spoken_response: "Sorry, I didn't understand that. Try again.", confirmation: "Parse error" };
    }

    // Execute the action
    try {
      switch (parsed.action) {
        case "ADD_PUNCH_ITEM":
          await ctx.runMutation(a.punchList.create, {
            companyId: args.companyId,
            projectId: args.projectId,
            title: parsed.description || "Voice entry",
            description: parsed.description || "",
            location: parsed.location || "TBD",
            trade: parsed.trade || "",
            priority: parsed.severity === "Critical" ? "High" : parsed.severity === "Major" ? "Medium" : "Low",
            status: "Open",
          });
          break;

        case "CLOCK_IN": {
          const person = parsed.person?.toLowerCase();
          let clockName = args.userName;
          if (person && person !== "me" && person !== "myself") {
            const match = crew.find((c: any) =>
              `${c.firstName} ${c.lastName || ""}`.toLowerCase().includes(person)
            );
            if (match) clockName = `${match.firstName} ${match.lastName || ""}`;
          }
          await ctx.runMutation(a.clockInOut.clockIn, {
            companyId: args.companyId as any,
            projectId: args.projectId,
            crewMemberName: clockName,
            clockedInBy: args.userName,
          });
          break;
        }

        case "CLOCK_OUT": {
          // Find active clock entry and close it
          const person2 = parsed.person?.toLowerCase();
          let clockName2 = args.userName;
          if (person2 && person2 !== "me" && person2 !== "myself") {
            const match2 = crew.find((c: any) =>
              `${c.firstName} ${c.lastName || ""}`.toLowerCase().includes(person2)
            );
            if (match2) clockName2 = `${match2.firstName} ${match2.lastName || ""}`;
          }
          // We'll try to find and close the entry
          const entries = await ctx.runQuery(a.timeTracking.list, { projectId: args.projectId });
          const active = (entries as any[]).find((e: any) => e.workerName === clockName2 && e.clockedOut === false);
          if (active) {
            await ctx.runMutation(a.clockInOut.clockOut, { entryId: active._id });
          }
          break;
        }

        case "ADD_DAILY_LOG":
          await ctx.runMutation(a.dailyLogs.create, {
            companyId: args.companyId,
            projectId: args.projectId,
            date: today,
            workPerformed: parsed.workPerformed || "Voice entry",
            weatherCondition: parsed.weather || "",
            createdBy: args.userName,
          });
          break;

        case "CHECK_WEATHER":
          if (project?.latitude && project?.longitude) {
            try {
              const weatherResult = await ctx.runAction(a.weather.analyzeWeather, {
                latitude: project.latitude,
                longitude: project.longitude,
              });
              const forecast = (weatherResult as any).forecast;
              if (forecast?.length > 0) {
                const day = parsed.when === "tomorrow" ? forecast[1] : forecast[0];
                parsed.spoken_response = `${parsed.when === "tomorrow" ? "Tomorrow" : "Today"}: ${day.condition}, high ${day.high}, low ${day.low}. ${day.fieldStatus === "red" ? "Crew call-off recommended." : day.fieldStatus === "yellow" ? "Proceed with caution." : "All clear for field work."}`;
                parsed.weatherData = day;
              }
            } catch { /* use AI's default response */ }
          }
          break;

        case "CHECK_RFIS":
          parsed.spoken_response = `You have ${openRfis.length} open RFIs. ${openRfis.length > 0 ? `Oldest is ${(openRfis[0] as any).subject || "untitled"}.` : ""}`;
          break;

        case "CHECK_SUBMITTALS":
          parsed.spoken_response = `${pendingSubs.length} submittals pending review. ${pendingSubs.length > 0 ? `Next up: ${(pendingSubs[0] as any).title || "untitled"}.` : "All clear."}`;
          break;

        case "ADD_SAFETY_NOTE":
          await ctx.runMutation(a.incidents.create, {
            companyId: args.companyId,
            projectId: args.projectId,
            title: (parsed.description || "Voice safety report").slice(0, 80),
            type: "Near Miss",
            description: parsed.description || "Voice report",
            severity: parsed.severity || "Medium",
            location: parsed.location || "TBD",
            date: today,
          });
          break;

        case "CHECK_CREW":
          parsed.spoken_response = `${crew.length} crew members assigned. ${crewNames || "None."}`;
          break;

        case "ADD_DELIVERY_NOTE":
          await ctx.runMutation(a.deliveries.create, {
            projectId: args.projectId,
            material: parsed.material || "Voice entry",
            status: parsed.status || "Delivered",
            eta: today,
            notes: `Voice command by ${args.userName}`,
          });
          break;
      }
    } catch (e: any) {
      parsed.spoken_response = `Command understood but there was an error: ${e.message.slice(0, 50)}`;
      parsed.error = e.message;
    }

    // Log command
    await ctx.runMutation(a.voiceCommandHelpers.logCommand, {
      companyId: args.companyId,
      projectId: args.projectId,
      userId: args.userId,
      transcript: args.transcript,
      action: parsed.action,
      response: parsed.spoken_response || "",
      timestamp: Date.now(),
    });

    return parsed;
  },
});
