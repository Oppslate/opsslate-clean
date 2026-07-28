"use node";

import {
  parseAssistantAnswer,
  type HeliosAssistantSource,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import OpenAI from "openai";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { HELIOS_ASSISTANT_PROMPT, heliosAssistantAnswerFormat } from "./heliosAssistantOpenAI";

type AssistantAnswerContext = {
  message: Doc<"heliosAssistantMessages">;
  thread: Doc<"heliosAssistantThreads">;
  project: Doc<"heliosProjects">;
  question: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  sources: HeliosAssistantSource[];
};

const loadAnswerContextReference = makeFunctionReference<
  "query",
  { messageId: Id<"heliosAssistantMessages"> },
  AssistantAnswerContext | null
>("heliosAssistant:loadAnswerContext");
const markAnswerStartedReference = makeFunctionReference<"mutation", { messageId: Id<"heliosAssistantMessages"> }, boolean>("heliosAssistant:markAnswerStarted");
const completeAnswerReference = makeFunctionReference<"mutation", {
  messageId: Id<"heliosAssistantMessages">; model: string; responseId?: string;
  inputTokens?: number; outputTokens?: number; totalTokens?: number; result: unknown;
}, null>("heliosAssistant:completeAnswer");
const failAnswerReference = makeFunctionReference<"mutation", { messageId: Id<"heliosAssistantMessages">; error: string }, null>("heliosAssistant:failAnswer");

function modelName() {
  const configured = (process.env.HELIOS_ASSISTANT_MODEL || process.env.HELIOS_OPENAI_MODEL || "").trim();
  return configured && /^[a-zA-Z0-9._:-]{1,100}$/.test(configured) ? configured : "gpt-5.6-sol";
}

function openAIClient() {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey, maxRetries: 2, timeout: 180_000 });
}

function parsedOutput(outputText: string) {
  if (!outputText.trim()) throw new Error("The model returned no structured output.");
  return JSON.parse(outputText) as unknown;
}

export const startAnswer = internalAction({
  args: { messageId: v.id("heliosAssistantMessages") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadAnswerContextReference, args);
    if (!context) return null;
    const claimed = await ctx.runMutation(markAnswerStartedReference, args);
    if (!claimed) return null;
    if (!context.sources.length) {
      await ctx.runMutation(completeAnswerReference, {
        messageId: args.messageId, model: "deterministic-unavailable",
        result: {
          directAnswer: "The current project record does not contain enough information to answer that question.",
          explanation: "Complete or review the applicable document, plan, geometry, quantity, or estimate workflow, then ask again.",
          answerType: "mixed", answerStatus: "unavailable", method: "Canonical project record lookup",
          assumptions: [], limitations: ["No relevant canonical project source was available."], confidence: 100, citations: [],
        },
      });
      return null;
    }
    try {
      const client = openAIClient();
      const model = modelName();
      const response = await client.responses.create({
        model,
        store: false,
        safety_identifier: `helios_${String(context.message.companyId)}`.slice(0, 64),
        metadata: {
          helios_assistant_message: String(context.message._id),
          helios_project: String(context.project._id),
          helios_thread: String(context.thread._id),
        },
        instructions: HELIOS_ASSISTANT_PROMPT,
        input: JSON.stringify({
          project: {
            name: context.project.name, projectNumber: context.project.projectNumber || "",
            packageRevision: context.message.packageRevision || null,
          },
          question: context.question,
          conversationHistory: context.history,
          canonicalSources: context.sources,
        }),
        reasoning: { effort: "medium" },
        text: { format: heliosAssistantAnswerFormat, verbosity: "medium" },
        max_output_tokens: 8_000,
      });
      const result = parseAssistantAnswer(parsedOutput(response.output_text), context.sources);
      await ctx.runMutation(completeAnswerReference, {
        messageId: args.messageId, model: response.model || model, responseId: response.id,
        inputTokens: response.usage?.input_tokens, outputTokens: response.usage?.output_tokens,
        totalTokens: response.usage?.total_tokens, result,
      });
    } catch (error) {
      await ctx.runMutation(failAnswerReference, {
        messageId: args.messageId,
        error: error instanceof Error ? error.message : "Ask Helios failed unexpectedly.",
      });
    }
    return null;
  },
});
