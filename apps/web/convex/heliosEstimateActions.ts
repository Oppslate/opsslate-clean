"use node";

import { parseEstimateProposal } from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import OpenAI from "openai";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
  HELIOS_ESTIMATE_PROPOSAL_PROMPT,
  heliosEstimateProposalFormat,
} from "./heliosEstimateOpenAIContracts";

const DEFAULT_MODEL = "gpt-5.6-sol";
const POLL_DELAY_MS = 5_000;
const RETRY_DELAY_MS = 10_000;
const TIMEOUT_MS = 12 * 60 * 1_000;

type EstimateJobContext = {
  job: Doc<"heliosEstimateJobs">;
  estimate: Doc<"heliosEstimates">;
  project: Doc<"heliosProjects">;
  intelligence: Doc<"heliosProjectIntelligence">;
  evidence: Array<Doc<"heliosEvidence">>;
};

const loadJobReference = makeFunctionReference<
  "query",
  { jobId: Id<"heliosEstimateJobs"> },
  EstimateJobContext | null
>("heliosEstimates:loadEstimateJob");
const markProcessingReference = makeFunctionReference<
  "mutation",
  { jobId: Id<"heliosEstimateJobs">; responseId: string; model: string },
  boolean
>("heliosEstimates:markEstimateProcessing");
const completeReference = makeFunctionReference<
  "mutation",
  {
    jobId: Id<"heliosEstimateJobs">;
    model: string;
    result: unknown;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  },
  null
>("heliosEstimates:completeEstimateProposal");
const failReference = makeFunctionReference<
  "mutation",
  { jobId: Id<"heliosEstimateJobs">; error: string },
  null
>("heliosEstimates:failEstimateProposal");
const pollReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosEstimateJobs"> },
  null
>("heliosEstimateActions:pollEstimateProposal");

function modelName() {
  const configured = (process.env.HELIOS_OPENAI_MODEL || "").trim();
  return configured && /^[a-zA-Z0-9._:-]{1,100}$/.test(configured)
    ? configured
    : DEFAULT_MODEL;
}

function openAIClient() {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey, maxRetries: 2, timeout: 90_000 });
}

function proposalInput(context: EstimateJobContext) {
  return JSON.stringify({
    estimatorEnteredProjectContext: {
      name: context.project.name,
      projectNumber: context.project.projectNumber || "",
      ownerClient: context.project.ownerClient || "",
      bidDate: context.project.bidDate || "",
      location: context.project.location || "",
    },
    projectIntelligence: {
      summary: context.intelligence.summary,
      projectType: context.intelligence.projectType,
      fundingSource: context.intelligence.fundingSource,
      findings: context.intelligence.findings.map((finding) => ({
        ...finding,
        evidenceIds: finding.evidenceIds.map(String),
      })),
    },
    evidenceRegister: context.evidence.map((row) => ({
      evidenceId: String(row._id),
      documentId: String(row.documentId),
      pageNumber: row.pageNumber || null,
      locator: row.locator,
      excerpt: row.excerpt,
    })),
  });
}

async function deleteResponse(client: OpenAI, responseId?: string) {
  if (!responseId) return;
  try {
    await client.responses.delete(responseId);
  } catch {
    // Best-effort remote retention cleanup; no bid content is logged.
  }
}

function structuredOutput(output: string) {
  if (!output.trim()) throw new Error("The model returned no structured estimate proposal.");
  return JSON.parse(output) as unknown;
}

export const startEstimateProposal = internalAction({
  args: { jobId: v.id("heliosEstimateJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadJobReference, args);
    if (!context || context.job.status !== "queued") return null;
    let client: OpenAI | undefined;
    let responseId: string | undefined;
    try {
      client = openAIClient();
      const model = modelName();
      const response = await client.responses.create({
        model,
        background: true,
        store: true,
        safety_identifier: `helios_${String(context.job.companyId)}`.slice(0, 64),
        metadata: {
          helios_estimate_job: String(context.job._id),
          helios_project: String(context.project._id),
          helios_estimate: String(context.estimate._id),
        },
        instructions: HELIOS_ESTIMATE_PROPOSAL_PROMPT,
        input: proposalInput(context),
        reasoning: { effort: "high" },
        text: { format: heliosEstimateProposalFormat, verbosity: "medium" },
        max_output_tokens: 50_000,
      });
      responseId = response.id;
      const marked = await ctx.runMutation(markProcessingReference, {
        jobId: args.jobId,
        responseId,
        model: response.model || model,
      });
      if (!marked) {
        await deleteResponse(client, responseId);
        return null;
      }
      await ctx.scheduler.runAfter(POLL_DELAY_MS, pollReference, args);
    } catch {
      if (client) await deleteResponse(client, responseId);
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        error: "The estimate proposal could not be started. Existing project intelligence was not changed.",
      });
    }
    return null;
  },
});

export const pollEstimateProposal = internalAction({
  args: { jobId: v.id("heliosEstimateJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadJobReference, args);
    if (!context || context.job.status !== "processing" || !context.job.openaiResponseId) {
      return null;
    }
    const client = openAIClient();
    const elapsed = Date.now() - (context.job.startedAt || context.job.createdAt);
    let response;
    try {
      response = await client.responses.retrieve(context.job.openaiResponseId);
    } catch {
      if (elapsed < TIMEOUT_MS) {
        await ctx.scheduler.runAfter(RETRY_DELAY_MS, pollReference, args);
        return null;
      }
      await deleteResponse(client, context.job.openaiResponseId);
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        error: "Estimate proposal processing timed out. Existing estimate versions remain unchanged.",
      });
      return null;
    }
    if (response.status === "queued" || response.status === "in_progress") {
      if (elapsed < TIMEOUT_MS) {
        await ctx.scheduler.runAfter(POLL_DELAY_MS, pollReference, args);
        return null;
      }
      await deleteResponse(client, context.job.openaiResponseId);
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        error: "Estimate proposal processing exceeded the secure processing window.",
      });
      return null;
    }
    if (response.status !== "completed") {
      await deleteResponse(client, context.job.openaiResponseId);
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        error: "OpenAI did not complete the estimate proposal. Existing estimate versions remain unchanged.",
      });
      return null;
    }
    try {
      const validEvidenceIds = context.evidence.map((row) => String(row._id));
      const result = parseEstimateProposal(
        structuredOutput(response.output_text),
        validEvidenceIds,
      );
      await ctx.runMutation(completeReference, {
        jobId: args.jobId,
        model: response.model || context.job.model || modelName(),
        result,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        totalTokens: response.usage?.total_tokens,
      });
    } catch (error) {
      await ctx.runMutation(failReference, {
        jobId: args.jobId,
        error: `Estimate evidence validation failed: ${
          error instanceof Error ? error.message : "Unknown validation error."
        } Existing estimate versions remain unchanged.`,
      });
    } finally {
      await deleteResponse(client, context.job.openaiResponseId);
    }
    return null;
  },
});
