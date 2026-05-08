import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1476281281393332356/ribQMhH_hwuIscG8kOyPM9-KUD0oVoWUPXRNaBzDXin1PlSiUxDeVRktK0Jhy5iviw6B";

const CATEGORY_EMOJI: Record<string, string> = {
  bug: "🐛",
  feature: "💡",
  ui: "🎨",
  data: "📊",
  workflow: "⚙️",
  general: "💬",
};

export const postFeedback = internalAction({
  args: {
    userName: v.optional(v.string()),
    category: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (_ctx, args) => {
    const cat = args.category ?? "general";
    const emoji = CATEGORY_EMOJI[cat] ?? "💬";
    const embed = {
      title: `${emoji} New Feedback — ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      description: args.message,
      color: 0x3b82f6,
      fields: [
        { name: "User", value: args.userName ?? "Anonymous", inline: true },
        { name: "Category", value: cat, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "OpsSlate Feedback" },
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "OpsSlate Feedback",
        embeds: [embed],
      }),
    });
  },
});
