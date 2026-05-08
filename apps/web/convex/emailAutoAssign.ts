"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const autoAssign = action({
  args: { emailId: v.string(), companyId: v.string(), subject: v.string(), from: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    // Find the actual email - get most recent unassigned email matching subject
    let targetEmailId = args.emailId;
    if (targetEmailId === "latest") {
      try {
        const allEmails = await ctx.runQuery(a.emails.list, { companyId: args.companyId });
        const match = (allEmails || [])
          .filter((e: any) => !e.projectId && e.subject === args.subject)
          .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))[0];
        if (match) targetEmailId = match._id;
        else return { projectId: null, confidence: 0, reason: "Could not find email to assign" };
      } catch { return { projectId: null, confidence: 0, reason: "Could not find email" }; }
    }

    // Get all projects for this company
    const projects = await ctx.runQuery(a.projects.list, { companyId: args.companyId });
    if (!projects || projects.length === 0) return { projectId: null, confidence: 0, reason: "No projects found" };

    const activeProjects = projects.filter((p: any) => p.status !== "Inactive" && p.status !== "Archived");

    // Build matching context from email
    const emailText = `${args.subject} ${args.from} ${args.body}`.toLowerCase();

    // Try rule-based matching first (fast, no AI cost)
    let bestMatch: any = null;
    let bestScore = 0;

    for (const p of activeProjects) {
      let score = 0;
      const projectName = (p.name || "").toLowerCase();
      const projectCode = (p.code || "").toLowerCase();
      const projectAddress = (p.address || "").toLowerCase();
      const projectCity = (p.city || "").toLowerCase();
      const projectContractor = (p.contractor || "").toLowerCase();
      const projectFabricator = (p.fabricator || "").toLowerCase();
      const projectManager = (p.projectManager || "").toLowerCase();

      // Check for project name match (strongest signal)
      if (projectName && emailText.includes(projectName)) score += 10;
      
      // Check for project code match
      if (projectCode && projectCode.length >= 3 && emailText.includes(projectCode)) score += 8;
      
      // Check for address/location match
      if (projectAddress && projectAddress.length >= 5 && emailText.includes(projectAddress)) score += 7;
      if (projectCity && projectCity.length >= 3 && emailText.includes(projectCity)) score += 3;
      
      // Check contractor/fabricator
      if (projectContractor && projectContractor.length >= 3 && emailText.includes(projectContractor)) score += 5;
      if (projectFabricator && projectFabricator.length >= 3 && emailText.includes(projectFabricator)) score += 5;
      
      // Check PM name
      if (projectManager && projectManager.length >= 3 && emailText.includes(projectManager)) score += 4;

      // Check individual significant words from project name (3+ chars)
      const nameWords = projectName.split(/\s+/).filter((w: string) => w.length >= 4);
      for (const word of nameWords) {
        if (emailText.includes(word)) score += 2;
      }

      // Check if sender email domain matches any project contacts
      const senderDomain = args.from.match(/@(.+?)>/)?.[1] || args.from.split("@")[1] || "";
      if (senderDomain && senderDomain.length >= 4) {
        // Try to match against project contacts
        try {
          const contacts = await ctx.runQuery(a.contacts.list, { projectId: p._id });
          for (const c of (contacts || [])) {
            const contactEmail = ((c as any).email || "").toLowerCase();
            if (contactEmail && contactEmail.includes(senderDomain)) {
              score += 6;
              break;
            }
          }
        } catch {}

        // Try to match against crew
        try {
          const allCrew = await ctx.runQuery(a.crew.list, { companyId: args.companyId });
          for (const c of (allCrew || [])) {
            if ((c as any).projectId === p._id && (c as any).email && (c as any).email.toLowerCase().includes(senderDomain)) {
              score += 6;
              break;
            }
          }
        } catch {}
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }

    // If rule-based match is confident enough, use it
    if (bestMatch && bestScore >= 5) {
      // Auto-assign
      try {
        await ctx.runMutation(a.emails.update as any, {
          id: targetEmailId as any,
          projectId: bestMatch._id,
        });
      } catch {}
      return { projectId: bestMatch._id, projectName: bestMatch.name, confidence: Math.min(bestScore * 10, 100), reason: `Matched by: ${bestScore >= 10 ? "project name" : bestScore >= 8 ? "project code" : bestScore >= 7 ? "address" : bestScore >= 5 ? "contacts/contractor" : "keywords"}` };
    }

    // If no strong rule-based match, try AI matching for ambiguous cases
    if (activeProjects.length > 0 && args.body.length > 20) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        try {
          const projectList = activeProjects.map((p: any) => 
            `ID: ${p._id} | Name: ${p.name} | Code: ${p.code || "?"} | Address: ${p.address || "?"} ${p.city || ""} | Contractor: ${p.contractor || "?"} | PM: ${p.projectManager || "?"}`
          ).join("\n");

          const prompt = `Match this email to the most likely construction project. If no project matches, respond with "NONE".

EMAIL:
From: ${args.from}
Subject: ${args.subject}
Body: ${args.body.slice(0, 1500)}

PROJECTS:
${projectList}

Respond with ONLY the project ID (starts with "j" or similar) or "NONE". Nothing else.`;

          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 100, messages: [{ role: "user", content: prompt }] }),
          });

          if (response.ok) {
            const result = await response.json();
            const aiAnswer = (result.content[0]?.text || "").trim();
            if (aiAnswer && aiAnswer !== "NONE") {
              const matchedProject = activeProjects.find((p: any) => aiAnswer.includes(p._id));
              if (matchedProject) {
                try {
                  await ctx.runMutation(a.emails.update as any, {
                    id: targetEmailId as any,
                    projectId: matchedProject._id,
                  });
                } catch {}
                return { projectId: matchedProject._id, projectName: matchedProject.name, confidence: 60, reason: "AI-matched by content analysis" };
              }
            }
          }
        } catch {}
      }
    }

    return { projectId: null, confidence: 0, reason: "No matching project found — will appear in unassigned inbox" };
  },
});
