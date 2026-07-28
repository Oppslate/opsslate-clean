import {
  HeliosValidationError,
  normalizeFindingReviewInput,
  normalizeBidBasisReviewInput,
  normalizePlanReviewInput,
  normalizeTakeoffReviewInput,
  normalizeCivilGeometryReviewInput,
  normalizeEstimateBuildInput,
  normalizeEstimateSupportInput,
  normalizeEstimateReviewInput,
  normalizeProjectInput,
  type HeliosBidPackage,
  type HeliosBidBasisProfile,
  type HeliosBidBasisReviewInput,
  type HeliosPlanReviewInput,
  type HeliosTakeoffReviewInput,
  type HeliosTakeoffWorkspace,
  type HeliosCivilGeometryReviewInput,
  type HeliosCockpitData,
  type HeliosDocumentSummary,
  type HeliosFindingReviewEvent,
  type HeliosFindingReviewInput,
  type HeliosEstimateWorkspace,
  type HeliosEstimateReviewInput,
  type HeliosEstimateBuildInput,
  type HeliosEstimateSupportInput,
  type HeliosProjectDetail,
  type HeliosProjectInput,
  type HeliosProjectSummary,
  type HeliosPackageInput,
  type HeliosAssistantWorkspace,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";

import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const MAX_IDENTITY_BODY_BYTES = 8 * 1024;
const MAX_DATA_BODY_BYTES = 512 * 1024;
const PDF_SIGNATURE = "%PDF-";

type GatewayPrincipal = {
  userId: string;
  companyId: string;
  subject: string;
  issuer: string;
};

type ResolvedPrincipal = GatewayPrincipal & {
  email: string;
  name: string;
  role: string;
};

const resolveIdentityReference = makeFunctionReference<
  "mutation",
  { issuer: string; subject: string; email: string; name: string },
  ResolvedPrincipal
>("heliosIdentity:resolveOrProvisionUser");
const listCockpitReference = makeFunctionReference<
  "query",
  { principal: GatewayPrincipal },
  HeliosCockpitData
>("heliosProjects:listCockpit");
const createProjectReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; input: HeliosProjectInput },
  HeliosProjectSummary
>("heliosProjects:createProject");
const getProjectReference = makeFunctionReference<
  "query",
  { principal: GatewayPrincipal; projectId: string },
  HeliosProjectDetail
>("heliosProjects:getProject");
const getAssistantWorkspaceReference = makeFunctionReference<
  "query",
  { principal: GatewayPrincipal; projectId: string; threadId?: string },
  HeliosAssistantWorkspace
>("heliosAssistant:getWorkspace");
const askAssistantReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string; threadId?: string; question: string },
  { threadId: string; messageId: string; status: "pending" }
>("heliosAssistant:askProject");
const authorizeDocumentContentReference = makeFunctionReference<
  "query",
  {
    principal: GatewayPrincipal;
    projectId: string;
    documentId: string;
  },
  {
    storageId: Id<"_storage">;
    fileName: string;
    size: number;
  }
>("heliosProjects:authorizeDocumentContent");
const createUploadIntentReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    packageId?: string;
    packageEntryId?: string;
  },
  { intentId: string; uploadUrl: string }
>("heliosProjects:createUploadIntent");
const createPackageReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    input: HeliosPackageInput;
  },
  HeliosBidPackage
>("heliosPackages:createPackage");
const appendPackageEntriesReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    packageId: string;
    input: HeliosPackageInput;
  },
  HeliosBidPackage
>("heliosPackages:appendPackageEntries");
const abandonPackageReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    packageId: string;
  },
  { packageId: string; status: "abandoned" }
>("heliosPackages:abandonPackage");
const finalizePackageReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    packageId: string;
  },
  { packageId: string; status: string }
>("heliosIntelligence:finalizePackage");
const inspectUploadReference = makeFunctionReference<
  "query",
  {
    principal: GatewayPrincipal;
    projectId: string;
    intentId: string;
    storageId: Id<"_storage">;
  },
  { contentType?: string; size: number; sha256: string }
>("heliosProjects:inspectUpload");
const registerDocumentReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    intentId: string;
    storageId: Id<"_storage">;
    fileName: string;
    magicValid: boolean;
  },
  | {
      kind: "created" | "duplicate";
      document: HeliosDocumentSummary;
    }
  | { kind: "rejected"; error: string }
>("heliosProjects:registerDocument");
const retryDocumentReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    documentId: string;
  },
  { jobId: string; status: "queued" }
>("heliosIntelligence:retryDocument");
const retryProjectReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
  },
  { jobId: string; status: "synthesizing" }
>("heliosIntelligence:retryProject");
const reviewFindingReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    intelligenceId: string;
    findingId: string;
    input: HeliosFindingReviewInput;
  },
  HeliosFindingReviewEvent
>("heliosReviews:reviewFinding");
const reviewBidBasisReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    input: HeliosBidBasisReviewInput;
  },
  HeliosBidBasisProfile
>("heliosBidBasis:reviewBidBasis");
const reviewPlanIntelligenceReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    input: HeliosPlanReviewInput;
  },
  unknown
>("heliosPlanIntelligence:reviewPlanIntelligence");
const getTakeoffWorkspaceReference = makeFunctionReference<
  "query",
  { principal: GatewayPrincipal; projectId: string },
  HeliosTakeoffWorkspace | null
>("heliosTakeoffIntelligence:getWorkspace");
const mutateTakeoffReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string; input: HeliosTakeoffReviewInput },
  { eventId: string; measurementId?: string; quantityId?: string }
>("heliosTakeoffIntelligence:mutateTakeoff");
const reviewCivilGeometryReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string; input: HeliosCivilGeometryReviewInput },
  unknown
>("heliosCivilGeometry:reviewGeometry");
const getEstimateWorkspaceReference = makeFunctionReference<
  "query",
  { principal: GatewayPrincipal; projectId: string },
  HeliosEstimateWorkspace | null
>("heliosEstimates:getWorkspace");
const requestEstimateProposalReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string },
  { estimateId: string; jobId: string; status: "queued" }
>("heliosEstimates:requestProposal");
const reclassifyEstimateWbsReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string; estimateId: string },
  { changed: boolean; sections: number; items: number }
>("heliosEstimates:reclassifyEstimateWbs");
const reviewEstimateRecordReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    estimateId: string;
    input: HeliosEstimateReviewInput;
  },
  { eventId: string; status?: string }
>("heliosEstimateReviews:reviewRecord");
const acceptEstimateImportReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string; estimateId: string },
  { eventId: string; status: "accepted" }
>("heliosEstimateReviews:acceptImportReview");
const acceptRemainingEstimateRecordsReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string; estimateId: string },
  { accepted: number }
>("heliosEstimateReviews:acceptRemainingRecords");
const mutateEstimateBuildReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    estimateId: string;
    input: HeliosEstimateBuildInput;
  },
  { eventId: string; recordId: string; recordType: "cost_code" | "resource" | "quantity" | "allocation"; action: string }
>("heliosEstimateBuild:mutateBuild");
const mutateEstimateSupportReference = makeFunctionReference<
  "mutation",
  {
    principal: GatewayPrincipal;
    projectId: string;
    estimateId: string;
    input: HeliosEstimateSupportInput;
  },
  { eventId: string; recordId: string; recordType: "rfq" | "submittal" | "risk" | "evidence_link"; action: string }
>("heliosEstimateSupport:mutateSupport");

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safePackageValidationMessage(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : String(error);
  const validation = raw.match(/HeliosValidationError:\s*([^\r\n]+)/);
  return validation?.[1]?.trim() || fallback;
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function gatewaySecret() {
  const secret = process.env.HELIOS_IDENTITY_GATEWAY_SECRET || "";
  if (secret.length < 32) {
    throw new Error(
      "HELIOS_IDENTITY_GATEWAY_SECRET must be configured with at least 32 characters.",
    );
  }
  return secret;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
}

function isIdentityBody(
  value: unknown,
): value is {
  issuer: string;
  subject: string;
  email: string;
  name: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.issuer === "string" &&
    typeof body.subject === "string" &&
    typeof body.email === "string" &&
    typeof body.name === "string" &&
    body.issuer.length <= 512 &&
    body.subject.length <= 512 &&
    body.email.length <= 320 &&
    body.name.length <= 256
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maximum = 512): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isPrincipal(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    boundedString(value.userId) &&
    boundedString(value.companyId) &&
    boundedString(value.subject) &&
    boundedString(value.issuer)
  );
}

async function protectedPayload(request: Request) {
  let expectedSecret: string;
  try {
    expectedSecret = gatewaySecret();
  } catch {
    return {
      ok: false as const,
      response: json({ error: "Helios gateway is not configured." }, 503),
    };
  }

  if (!constantTimeEqual(bearerToken(request), expectedSecret)) {
    return {
      ok: false as const,
      response: json({ error: "Unauthorized." }, 401),
    };
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_DATA_BODY_BYTES
  ) {
    return {
      ok: false as const,
      response: json({ error: "Request body is too large." }, 413),
    };
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_DATA_BODY_BYTES) {
    return {
      ok: false as const,
      response: json({ error: "Request body is too large." }, 413),
    };
  }
  const payload = (() => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  })();
  if (!isRecord(payload) || !isPrincipal(payload.principal)) {
    return {
      ok: false as const,
      response: json({ error: "Invalid Helios request." }, 400),
    };
  }
  return { ok: true as const, payload };
}

function principalFrom(payload: Record<string, unknown>) {
  return payload.principal as GatewayPrincipal;
}

function safeInlineFileName(value: string) {
  const ascii =
    value
      .normalize("NFKC")
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_")
      .slice(0, 180) || "project-document.pdf";
  const encoded = encodeURIComponent(value.slice(0, 240)).replace(
    /['()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

async function storageHasPdfSignature(
  storage: {
    getUrl(storageId: Id<"_storage">): Promise<string | null>;
  },
  storageId: Id<"_storage">,
) {
  const storageUrl = await storage.getUrl(storageId);
  if (!storageUrl) return false;

  const response = await fetch(storageUrl, {
    headers: { Range: "bytes=0-4" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok || !response.body) return false;

  const reader = response.body.getReader();
  const prefix: number[] = [];
  try {
    while (prefix.length < PDF_SIGNATURE.length) {
      const { done, value } = await reader.read();
      if (done) break;
      prefix.push(
        ...value.slice(0, PDF_SIGNATURE.length - prefix.length),
      );
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return (
    new TextDecoder().decode(new Uint8Array(prefix)) === PDF_SIGNATURE
  );
}

export const resolveIdentity = httpAction(async (ctx, request) => {
  let expectedSecret: string;
  try {
    expectedSecret = gatewaySecret();
  } catch {
    return json({ error: "Identity gateway is not configured." }, 503);
  }

  if (!constantTimeEqual(bearerToken(request), expectedSecret)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_IDENTITY_BODY_BYTES
  ) {
    return json({ error: "Request body is too large." }, 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_IDENTITY_BODY_BYTES) {
    return json({ error: "Request body is too large." }, 413);
  }
  const body = (() => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  })();
  if (!isIdentityBody(body)) {
    return json({ error: "Invalid identity payload." }, 400);
  }

  try {
    const principal = await ctx.runMutation(
      resolveIdentityReference,
      body,
    );
    return json({ principal }, 200);
  } catch {
    return json({ error: "Identity could not be authorized." }, 403);
  }
});

export const listHeliosProjects = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  try {
    const data = await ctx.runQuery(listCockpitReference, {
      principal: principalFrom(authorization.payload),
    });
    return json({ data }, 200);
  } catch {
    return json({ error: "Helios projects could not be loaded." }, 403);
  }
});

export const createHeliosProject = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (!isRecord(authorization.payload.input)) {
    return json({ error: "Invalid project information." }, 400);
  }
  try {
    const data = await ctx.runMutation(
      createProjectReference,
      {
        principal: principalFrom(authorization.payload),
        input: normalizeProjectInput(authorization.payload.input),
      },
    );
    return json({ data }, 201);
  } catch {
    return json({ error: "Project information could not be saved." }, 400);
  }
});

export const getHeliosProject = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (!boundedString(authorization.payload.projectId)) {
    return json({ error: "Invalid project." }, 400);
  }
  try {
    const data = await ctx.runQuery(
      getProjectReference,
      {
        principal: principalFrom(authorization.payload),
        projectId: authorization.payload.projectId,
      },
    );
    return json({ data }, 200);
  } catch (error) {
    console.error("[helios:project-get] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Project was not found." }, 404);
  }
});

export const getHeliosAssistantWorkspace = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) ||
      (payload.threadId !== undefined && !boundedString(payload.threadId))) {
    return json({ error: "Invalid Ask Helios workspace." }, 400);
  }
  try {
    const data = await ctx.runQuery(getAssistantWorkspaceReference, {
      principal: principalFrom(payload), projectId: payload.projectId,
      threadId: typeof payload.threadId === "string" ? payload.threadId : undefined,
    });
    return json({ data }, 200);
  } catch {
    return json({ error: "Ask Helios workspace was not found." }, 404);
  }
});

export const askHeliosProject = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !boundedString(payload.question, 2_000) ||
      (payload.threadId !== undefined && !boundedString(payload.threadId))) {
    return json({ error: "Enter a valid project question." }, 400);
  }
  try {
    const data = await ctx.runMutation(askAssistantReference, {
      principal: principalFrom(payload), projectId: payload.projectId,
      threadId: typeof payload.threadId === "string" ? payload.threadId : undefined,
      question: payload.question,
    });
    return json({ data }, 202);
  } catch (error) {
    return json({
      error: error instanceof Error && error.message.includes("Wait for")
        ? "Wait for the current answer to finish."
        : "Ask Helios could not accept that question.",
    }, 400);
  }
});

export const viewHeliosDocument = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (
    !boundedString(payload.projectId) ||
    !boundedString(payload.documentId)
  ) {
    return json({ error: "Invalid document request." }, 400);
  }
  const range =
    typeof payload.range === "string" &&
    /^bytes=\d*-\d*$/.test(payload.range) &&
    payload.range.length <= 80
      ? payload.range
      : undefined;
  try {
    const document = await ctx.runQuery(authorizeDocumentContentReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      documentId: payload.documentId,
    });
    const storageUrl = await ctx.storage.getUrl(document.storageId);
    if (!storageUrl) {
      return json({ error: "Document content was not found." }, 404);
    }
    const source = await fetch(storageUrl, {
      headers: range ? { Range: range } : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    });
    if (!source.ok || !source.body) {
      return json({ error: "Document content could not be loaded." }, 502);
    }
    const headers = new Headers({
      "Accept-Ranges": source.headers.get("accept-ranges") || "bytes",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": safeInlineFileName(document.fileName),
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    });
    for (const name of ["content-length", "content-range"]) {
      const value = source.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(source.body, {
      status: source.status,
      headers,
    });
  } catch {
    return json({ error: "Document was not found." }, 404);
  }
});

export const createHeliosPackage = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (
    !boundedString(authorization.payload.projectId) ||
    !isRecord(authorization.payload.input)
  ) {
    return json({ error: "Invalid bid package." }, 400);
  }
  try {
    const data = await ctx.runMutation(createPackageReference, {
      principal: principalFrom(authorization.payload),
      projectId: authorization.payload.projectId,
      input: authorization.payload.input as HeliosPackageInput,
    });
    return json({ data }, 201);
  } catch (error) {
    console.error("[helios:package-create] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json(
      {
        error: safePackageValidationMessage(
          error,
          "Bid package could not be created.",
        ),
      },
      400,
    );
  }
});

export const abandonHeliosPackage = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (
    !boundedString(authorization.payload.projectId) ||
    !boundedString(authorization.payload.packageId)
  ) {
    return json({ error: "Invalid bid package." }, 400);
  }
  try {
    const data = await ctx.runMutation(abandonPackageReference, {
      principal: principalFrom(authorization.payload),
      projectId: authorization.payload.projectId,
      packageId: authorization.payload.packageId,
    });
    return json({ data }, 200);
  } catch (error) {
    console.error("[helios:package-abandon] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Bid package could not be abandoned." }, 400);
  }
});

export const appendHeliosPackageEntries = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (
    !boundedString(authorization.payload.projectId) ||
    !boundedString(authorization.payload.packageId) ||
    !isRecord(authorization.payload.input)
  ) {
    return json({ error: "Invalid bid package addition." }, 400);
  }
  try {
    const data = await ctx.runMutation(appendPackageEntriesReference, {
      principal: principalFrom(authorization.payload),
      projectId: authorization.payload.projectId,
      packageId: authorization.payload.packageId,
      input: authorization.payload.input as HeliosPackageInput,
    });
    return json({ data }, 201);
  } catch (error) {
    console.error("[helios:package-append] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Files could not be added to the bid package.",
      },
      400,
    );
  }
});

export const finalizeHeliosPackage = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (
    !boundedString(authorization.payload.projectId) ||
    !boundedString(authorization.payload.packageId)
  ) {
    return json({ error: "Invalid bid package." }, 400);
  }
  try {
    const data = await ctx.runMutation(finalizePackageReference, {
      principal: principalFrom(authorization.payload),
      projectId: authorization.payload.projectId,
      packageId: authorization.payload.packageId,
    });
    return json({ data }, 202);
  } catch (error) {
    console.error("[helios:package-finalize] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bid package could not be finalized.",
      },
      400,
    );
  }
});

export const createHeliosUploadIntent = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (!boundedString(authorization.payload.projectId)) {
    return json({ error: "Invalid project." }, 400);
  }
  try {
    const data = await ctx.runMutation(
      createUploadIntentReference,
      {
        principal: principalFrom(authorization.payload),
        projectId: authorization.payload.projectId,
        packageId: boundedString(authorization.payload.packageId)
          ? authorization.payload.packageId
          : undefined,
        packageEntryId: boundedString(authorization.payload.packageEntryId)
          ? authorization.payload.packageEntryId
          : undefined,
      },
    );
    return json({ data }, 201);
  } catch {
    return json({ error: "Upload could not be authorized." }, 403);
  }
});

export const registerHeliosDocument = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (
    !boundedString(payload.projectId) ||
    !boundedString(payload.intentId) ||
    !boundedString(payload.storageId) ||
    !boundedString(payload.fileName, 512)
  ) {
    return json({ error: "Invalid document registration." }, 400);
  }

  let stage:
    | "inspect_upload"
    | "read_pdf_signature"
    | "commit_document" = "inspect_upload";
  try {
    const storageId = payload.storageId as Id<"_storage">;
    await ctx.runQuery(inspectUploadReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      intentId: payload.intentId,
      storageId,
    });
    stage = "read_pdf_signature";
    const magicValid = await storageHasPdfSignature(ctx.storage, storageId);
    stage = "commit_document";
    const data = await ctx.runMutation(
      registerDocumentReference,
      {
        principal: principalFrom(payload),
        projectId: payload.projectId,
        intentId: payload.intentId,
        storageId,
        fileName: payload.fileName,
        magicValid,
      },
    );
    if (data.kind === "rejected") {
      return json(
        {
          error: data.error,
          code: "document_registration_validation_failed",
        },
        400,
      );
    }
    return json({ data }, 201);
  } catch (error) {
    console.error("[helios:document-registration] failed", {
      stage,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError", message: String(error) },
    });
    return json(
      {
        error: "PDF validation or registration failed.",
        code: `document_registration_${stage}_failed`,
      },
      400,
    );
  }
});

export const retryHeliosDocument = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (
    !boundedString(payload.projectId) ||
    !boundedString(payload.documentId)
  ) {
    return json({ error: "Invalid document retry request." }, 400);
  }
  try {
    const data = await ctx.runMutation(retryDocumentReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      documentId: payload.documentId,
    });
    return json({ data }, 202);
  } catch {
    return json({ error: "Document processing could not be retried." }, 400);
  }
});

export const retryHeliosProject = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId)) {
    return json({ error: "Invalid project retry request." }, 400);
  }
  try {
    const data = await ctx.runMutation(retryProjectReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
    });
    return json({ data }, 202);
  } catch {
    return json({ error: "Project intelligence could not be retried." }, 400);
  }
});

export const reviewHeliosFinding = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (
    !boundedString(payload.projectId) ||
    !boundedString(payload.intelligenceId) ||
    !boundedString(payload.findingId, 256) ||
    !isRecord(payload.input)
  ) {
    return json({ error: "Invalid finding review request." }, 400);
  }
  try {
    const data = await ctx.runMutation(reviewFindingReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      intelligenceId: payload.intelligenceId,
      findingId: payload.findingId,
      input: normalizeFindingReviewInput(payload.input),
    });
    return json({ data }, 201);
  } catch (error) {
    return json(
      {
        error:
          error instanceof HeliosValidationError
            ? error.message
            : "Finding review could not be saved.",
      },
      400,
    );
  }
});

export const reviewHeliosBidBasis = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !isRecord(payload.input)) {
    return json({ error: "Invalid bid-basis review request." }, 400);
  }
  try {
    const data = await ctx.runMutation(reviewBidBasisReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      input: normalizeBidBasisReviewInput(payload.input),
    });
    return json({ data }, 201);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bid-basis decision could not be saved.",
      },
      400,
    );
  }
});

export const reviewHeliosPlanIntelligence = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !isRecord(payload.input)) {
    return json({ error: "Invalid plan-intelligence request." }, 400);
  }
  try {
    const data = await ctx.runMutation(reviewPlanIntelligenceReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      input: normalizePlanReviewInput(payload.input),
    });
    return json({ data }, 202);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Plan-intelligence action could not be saved.",
    }, 400);
  }
});

export const getHeliosTakeoff = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (!boundedString(authorization.payload.projectId)) {
    return json({ error: "Invalid takeoff request." }, 400);
  }
  try {
    const data = await ctx.runQuery(getTakeoffWorkspaceReference, {
      principal: principalFrom(authorization.payload),
      projectId: authorization.payload.projectId,
    });
    return json({ data }, 200);
  } catch {
    return json({ error: "Quantity intelligence could not be loaded." }, 404);
  }
});

export const mutateHeliosTakeoff = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !isRecord(payload.input)) {
    return json({ error: "Invalid quantity-intelligence request." }, 400);
  }
  try {
    const data = await ctx.runMutation(mutateTakeoffReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      input: normalizeTakeoffReviewInput(payload.input),
    });
    return json({ data }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Quantity-intelligence action could not be saved.",
    }, 400);
  }
});

export const reviewHeliosCivilGeometry = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !isRecord(payload.input)) {
    return json({ error: "Invalid civil-geometry request." }, 400);
  }
  try {
    const data = await ctx.runMutation(reviewCivilGeometryReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      input: normalizeCivilGeometryReviewInput(payload.input),
    });
    return json({ data }, 202);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Civil geometry action could not be saved." }, 400);
  }
});

export const getHeliosEstimate = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (!boundedString(authorization.payload.projectId)) {
    return json({ error: "Invalid estimate request." }, 400);
  }
  try {
    const data = await ctx.runQuery(getEstimateWorkspaceReference, {
      principal: principalFrom(authorization.payload),
      projectId: authorization.payload.projectId,
    });
    return json({ data }, 200);
  } catch (error) {
    console.error("[helios:estimate-get] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Estimate workspace could not be loaded." }, 404);
  }
});

export const requestHeliosEstimateProposal = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  if (!boundedString(authorization.payload.projectId)) {
    return json({ error: "Invalid estimate proposal request." }, 400);
  }
  try {
    const data = await ctx.runMutation(requestEstimateProposalReference, {
      principal: principalFrom(authorization.payload),
      projectId: authorization.payload.projectId,
    });
    return json({ data }, 202);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Estimate proposal could not be requested.",
      },
      400,
    );
  }
});

export const reclassifyHeliosEstimateWbs = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !boundedString(payload.estimateId)) {
    return json({ error: "Invalid contractor WBS request." }, 400);
  }
  try {
    const data = await ctx.runMutation(reclassifyEstimateWbsReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      estimateId: payload.estimateId,
    });
    return json({ data }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Contractor WBS could not be applied.",
    }, 400);
  }
});

export const reviewHeliosEstimateRecord = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (
    !boundedString(payload.projectId) ||
    !boundedString(payload.estimateId) ||
    !isRecord(payload.input)
  ) return json({ error: "Invalid estimate review request." }, 400);
  try {
    const data = await ctx.runMutation(reviewEstimateRecordReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      estimateId: payload.estimateId,
      input: normalizeEstimateReviewInput(payload.input),
    });
    return json({ data }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Estimate review could not be saved.",
    }, 400);
  }
});

export const mutateHeliosEstimateBuild = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (
    !boundedString(payload.projectId) ||
    !boundedString(payload.estimateId) ||
    !isRecord(payload.input)
  ) return json({ error: "Invalid estimate build request." }, 400);
  try {
    const data = await ctx.runMutation(mutateEstimateBuildReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      estimateId: payload.estimateId,
      input: normalizeEstimateBuildInput(payload.input),
    });
    return json({ data }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Estimate build change could not be saved.",
    }, 400);
  }
});

export const mutateHeliosEstimateSupport = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (
    !boundedString(payload.projectId) ||
    !boundedString(payload.estimateId) ||
    !isRecord(payload.input)
  ) return json({ error: "Invalid estimate supporting-record request." }, 400);
  try {
    const data = await ctx.runMutation(mutateEstimateSupportReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      estimateId: payload.estimateId,
      input: normalizeEstimateSupportInput(payload.input),
    });
    return json({ data }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Estimate supporting record could not be saved.",
    }, 400);
  }
});

export const acceptHeliosEstimateImport = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !boundedString(payload.estimateId)) {
    return json({ error: "Invalid import acceptance request." }, 400);
  }
  try {
    const data = await ctx.runMutation(acceptEstimateImportReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      estimateId: payload.estimateId,
    });
    return json({ data }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Import review could not be accepted.",
    }, 400);
  }
});

export const acceptRemainingHeliosEstimateRecords = httpAction(async (ctx, request) => {
  const authorization = await protectedPayload(request);
  if (!authorization.ok) return authorization.response;
  const { payload } = authorization;
  if (!boundedString(payload.projectId) || !boundedString(payload.estimateId)) {
    return json({ error: "Invalid bulk acceptance request." }, 400);
  }
  try {
    const data = await ctx.runMutation(acceptRemainingEstimateRecordsReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      estimateId: payload.estimateId,
    });
    return json({ data }, 201);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Remaining proposals could not be accepted.",
    }, 400);
  }
});
