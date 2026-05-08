"use node";

import { internalAction } from "./_generated/server";

const DEFAULT_COMPANY_ID = "kd7dcc6qqsm83v2hrgvhzbzbyd81qf1e";

export const runDecisionEngine = internalAction({
  args: {},
  handler: async (ctx) => {
    const a = (await import("./_generated/api")).api as any;
    try {
      await ctx.runAction(a.decisionEngine.analyze, {
        companyId: DEFAULT_COMPANY_ID as any,
        trigger: "scheduled",
        context: "Scheduled 4-hour analysis cycle. Focus on: overdue items, budget drift, resource conflicts, and patterns from recent activity.",
      });
    } catch (e) {
      console.error("Decision Engine cron failed:", (e as Error).message);
    }
  },
});
