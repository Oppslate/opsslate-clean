"use node";

import {
  parseDocumentIntelligence,
  parseProjectSynthesis,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import OpenAI from "openai";

import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
  HELIOS_DOCUMENT_PROMPT,
  HELIOS_SYNTHESIS_PROMPT,
  heliosDocumentIntelligenceFormat,
  heliosProjectSynthesisFormat,
} from "./heliosOpenAIContracts";

const DOCUMENT_POLL_DELAY_MS = 5_000;
const DOCUMENT_RETRY_DELAY_MS = 10_000;
const DOCUMENT_TIMEOUT_MS = 9 * 60 * 1_000;
const DEFAULT_MODEL = "gpt-5.6-sol";

type DocumentJobContext = {
  job: Doc<"heliosIntelligenceJobs">;
  document: Doc<"heliosDocuments">;
  project: Doc<"heliosProjects">;
};

type ProjectJobContext = {
  job: Doc<"heliosIntelligenceJobs">;
  project: Doc<"heliosProjects">;
  analyses: Array<{
    document: Doc<"heliosDocuments">;
    analysis: Doc<"heliosDocumentIntelligence">;
  }>;
  evidence: Array<Doc<"heliosEvidence">>;
};

const loadDocumentJobReference = makeFunctionReference<
  "query",
  { jobId: Id<"heliosIntelligenceJobs"> },
  DocumentJobContext | null
>("heliosIntelligence:loadDocumentJob");
const markDocumentUploadingReference = makeFunctionReference<
  "mutation",
  { jobId: Id<"heliosIntelligenceJobs"> },
  boolean
>("heliosIntelligence:markDocumentUploading");
const markDocumentAnalyzingReference = makeFunctionReference<
  "mutation",
  {
    jobId: Id<"heliosIntelligenceJobs">;
    openaiFileId: string;
    openaiResponseId: string;
  },
  boolean
>("heliosIntelligence:markDocumentAnalyzing");
const failDocumentJobReference = makeFunctionReference<
  "mutation",
  { jobId: Id<"heliosIntelligenceJobs">; error: string },
  null
>("heliosIntelligence:failDocumentJob");
const completeDocumentJobReference = makeFunctionReference<
  "mutation",
  {
    jobId: Id<"heliosIntelligenceJobs">;
    model: string;
    result: unknown;
  },
  null
>("heliosIntelligence:completeDocumentJob");
const loadProjectJobReference = makeFunctionReference<
  "query",
  { jobId: Id<"heliosIntelligenceJobs"> },
  ProjectJobContext | null
>("heliosIntelligence:loadProjectJob");
const completeProjectJobReference = makeFunctionReference<
  "mutation",
  {
    jobId: Id<"heliosIntelligenceJobs">;
    model: string;
    result: unknown;
  },
  null
>("heliosIntelligence:completeProjectJob");
const failProjectJobReference = makeFunctionReference<
  "mutation",
  { jobId: Id<"heliosIntelligenceJobs">; error: string },
  null
>("heliosIntelligence:failProjectJob");
const pollDocumentReference = makeFunctionReference<
  "action",
  { jobId: Id<"heliosIntelligenceJobs"> },
  null
>("heliosIntelligenceActions:pollDocument");

function modelName() {
  const configured = (process.env.HELIOS_OPENAI_MODEL || "").trim();
  if (configured && /^[a-zA-Z0-9._:-]{1,100}$/.test(configured)) {
    return configured;
  }
  return DEFAULT_MODEL;
}

function openAIClient() {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({
    apiKey,
    maxRetries: 2,
    timeout: 90_000,
  });
}

function safetyIdentifier(companyId: Id<"companies">) {
  return `helios_${String(companyId)}`.slice(0, 64);
}

function documentPrompt(context: DocumentJobContext) {
  const enteredProjectContext = {
    name: context.project.name,
    projectNumber: context.project.projectNumber || "",
    ownerClient: context.project.ownerClient || "",
    engineer: context.project.engineer || "",
    bidDate: context.project.bidDate || "",
    location: context.project.location || "",
  };
  return [
    `Analyze the attached bid document named "${context.document.fileName}".`,
    "The estimator-entered project context follows. Treat it as context only; do not cite it as document evidence.",
    JSON.stringify(enteredProjectContext),
  ].join("\n\n");
}

function projectSynthesisInput(context: ProjectJobContext) {
  const evidence = context.evidence.map((row) => {
    const document = context.analyses.find(
      (item) => item.document._id === row.documentId,
    )?.document;
    return {
      evidenceId: String(row._id),
      documentName: document?.fileName || "Project document",
      pageNumber: row.pageNumber || null,
      locator: row.locator,
      excerpt: row.excerpt,
    };
  });
  const documentAnalyses = context.analyses.map(({ document, analysis }) => ({
    documentName: document.fileName,
    documentType: analysis.documentType,
    summary: analysis.summary,
    summaryEvidenceIds: analysis.summaryEvidenceIds.map(String),
    confidence: analysis.confidence,
    findings: analysis.findings.map((finding) => ({
      ...finding,
      evidenceIds: finding.evidenceIds.map(String),
    })),
  }));
  return JSON.stringify({
    estimatorEnteredProjectContext: {
      name: context.project.name,
      projectNumber: context.project.projectNumber || "",
      ownerClient: context.project.ownerClient || "",
      engineer: context.project.engineer || "",
      bidDate: context.project.bidDate || "",
      location: context.project.location || "",
    },
    documentAnalyses,
    evidence,
  });
}

async function cleanupOpenAI(
  client: OpenAI,
  fileId?: string,
  responseId?: string,
) {
  if (responseId) {
    try {
      await client.responses.delete(responseId);
    } catch {
      // Best-effort cleanup is retried by OpenAI's SDK; no document content is logged.
    }
  }
  if (fileId) {
    try {
      await client.files.delete(fileId);
    } catch {
      // Best-effort cleanup is retried by OpenAI's SDK; no document content is logged.
    }
  }
}

function parsedOutput(outputText: string) {
  if (!outputText.trim()) {
    throw new Error("The model returned no structured output.");
  }
  return JSON.parse(outputText) as unknown;
}

export const startDocument = internalAction({
  args: { jobId: v.id("heliosIntelligenceJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadDocumentJobReference, args);
    if (!context || context.job.status !== "queued") return null;

    const claimed = await ctx.runMutation(markDocumentUploadingReference, args);
    if (!claimed) return null;

    let client: OpenAI | undefined;
    let fileId: string | undefined;
    let responseId: string | undefined;
    try {
      client = openAIClient();
      const blob = await ctx.storage.get(context.document.storageId);
      if (!blob) throw new Error("The stored PDF is unavailable.");

      const uploaded = await client.files.create({
        file: new File([blob], context.document.fileName, {
          type: "application/pdf",
        }),
        purpose: "user_data",
      });
      fileId = uploaded.id;
      const model = modelName();
      const response = await client.responses.create({
        model,
        background: true,
        store: true,
        safety_identifier: safetyIdentifier(context.job.companyId),
        metadata: {
          helios_job: String(context.job._id),
          helios_document: String(context.document._id),
        },
        instructions: HELIOS_DOCUMENT_PROMPT,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: documentPrompt(context) },
              {
                type: "input_file",
                file_id: fileId,
                detail: "auto",
              },
            ],
          },
        ],
        reasoning: { effort: "high" },
        text: {
          format: heliosDocumentIntelligenceFormat,
          verbosity: "medium",
        },
        max_output_tokens: 50_000,
      });
      responseId = response.id;
      const marked = await ctx.runMutation(markDocumentAnalyzingReference, {
        jobId: args.jobId,
        openaiFileId: fileId,
        openaiResponseId: responseId,
      });
      if (!marked) {
        await cleanupOpenAI(client, fileId, responseId);
        return null;
      }
      await ctx.scheduler.runAfter(DOCUMENT_POLL_DELAY_MS, pollDocumentReference, {
        jobId: args.jobId,
      });
      return null;
    } catch {
      if (client) await cleanupOpenAI(client, fileId, responseId);
      await ctx.runMutation(failDocumentJobReference, {
        jobId: args.jobId,
        error:
          "Document intelligence could not be started. Confirm the OpenAI configuration, then retry.",
      });
      return null;
    }
  },
});

export const pollDocument = internalAction({
  args: { jobId: v.id("heliosIntelligenceJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadDocumentJobReference, args);
    if (
      !context ||
      context.job.status !== "analyzing" ||
      !context.job.openaiFileId ||
      !context.job.openaiResponseId
    ) {
      return null;
    }
    const client = openAIClient();
    const elapsed = Date.now() - (context.job.startedAt || context.job.createdAt);

    let response;
    try {
      response = await client.responses.retrieve(
        context.job.openaiResponseId,
      );
    } catch {
      if (elapsed < DOCUMENT_TIMEOUT_MS) {
        await ctx.scheduler.runAfter(
          DOCUMENT_RETRY_DELAY_MS,
          pollDocumentReference,
          args,
        );
        return null;
      }
      await cleanupOpenAI(
        client,
        context.job.openaiFileId,
        context.job.openaiResponseId,
      );
      await ctx.runMutation(failDocumentJobReference, {
        jobId: args.jobId,
        error: "Document intelligence timed out while checking model progress.",
      });
      return null;
    }

    if (response.status === "queued" || response.status === "in_progress") {
      if (elapsed < DOCUMENT_TIMEOUT_MS) {
        await ctx.scheduler.runAfter(
          DOCUMENT_POLL_DELAY_MS,
          pollDocumentReference,
          args,
        );
        return null;
      }
      await cleanupOpenAI(
        client,
        context.job.openaiFileId,
        context.job.openaiResponseId,
      );
      await ctx.runMutation(failDocumentJobReference, {
        jobId: args.jobId,
        error: "Document intelligence exceeded the secure processing window.",
      });
      return null;
    }

    if (response.status !== "completed") {
      await cleanupOpenAI(
        client,
        context.job.openaiFileId,
        context.job.openaiResponseId,
      );
      await ctx.runMutation(failDocumentJobReference, {
        jobId: args.jobId,
        error:
          "OpenAI did not complete this document. Review the PDF and retry processing.",
      });
      return null;
    }

    try {
      const result = parseDocumentIntelligence(
        parsedOutput(response.output_text),
      );
      await ctx.runMutation(completeDocumentJobReference, {
        jobId: args.jobId,
        model: response.model || modelName(),
        result,
      });
    } catch {
      await ctx.runMutation(failDocumentJobReference, {
        jobId: args.jobId,
        error:
          "The AI response did not satisfy Helios evidence requirements. Retry the document.",
      });
    } finally {
      await cleanupOpenAI(
        client,
        context.job.openaiFileId,
        context.job.openaiResponseId,
      );
    }
    return null;
  },
});

export const synthesizeProject = internalAction({
  args: { jobId: v.id("heliosIntelligenceJobs") },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(loadProjectJobReference, args);
    if (!context) return null;
    if (!context.analyses.length || !context.evidence.length) {
      await ctx.runMutation(failProjectJobReference, {
        jobId: args.jobId,
        error: "No evidence-backed document intelligence is available.",
      });
      return null;
    }

    try {
      const client = openAIClient();
      const model = modelName();
      const response = await client.responses.create({
        model,
        store: false,
        safety_identifier: safetyIdentifier(context.job.companyId),
        instructions: HELIOS_SYNTHESIS_PROMPT,
        input: projectSynthesisInput(context),
        reasoning: { effort: "high" },
        text: {
          format: heliosProjectSynthesisFormat,
          verbosity: "medium",
        },
        max_output_tokens: 40_000,
      });
      if (response.status !== "completed") {
        throw new Error("Project synthesis did not complete.");
      }
      const validEvidenceIds = context.evidence.map((row) => String(row._id));
      const result = parseProjectSynthesis(
        parsedOutput(response.output_text),
        validEvidenceIds,
      );
      await ctx.runMutation(completeProjectJobReference, {
        jobId: args.jobId,
        model: response.model || model,
        result,
      });
    } catch {
      await ctx.runMutation(failProjectJobReference, {
        jobId: args.jobId,
        error:
          "Project intelligence synthesis failed. Existing document evidence remains available for retry.",
      });
    }
    return null;
  },
});
