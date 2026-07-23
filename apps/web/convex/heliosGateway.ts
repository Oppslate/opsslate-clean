import {
  normalizeProjectInput,
  type HeliosCockpitData,
  type HeliosDocumentSummary,
  type HeliosProjectDetail,
  type HeliosProjectInput,
  type HeliosProjectSummary,
} from "@opsslate/helios-domain";
import { makeFunctionReference } from "convex/server";

import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const MAX_IDENTITY_BODY_BYTES = 8 * 1024;
const MAX_DATA_BODY_BYTES = 32 * 1024;

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
>("heliosIdentity:resolveExistingUser");
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
const createUploadIntentReference = makeFunctionReference<
  "mutation",
  { principal: GatewayPrincipal; projectId: string },
  { intentId: string; uploadUrl: string }
>("heliosProjects:createUploadIntent");
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
  {
    kind: "created" | "duplicate";
    document: HeliosDocumentSummary;
  }
>("heliosProjects:registerDocument");

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
  } catch {
    return json({ error: "Project was not found." }, 404);
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

  try {
    const storageId = payload.storageId as Id<"_storage">;
    await ctx.runQuery(inspectUploadReference, {
      principal: principalFrom(payload),
      projectId: payload.projectId,
      intentId: payload.intentId,
      storageId,
    });
    const blob = await ctx.storage.get(storageId);
    const magicValid = blob
      ? new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer()) === "%PDF-"
      : false;
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
    return json({ data }, 201);
  } catch {
    return json({ error: "PDF validation or registration failed." }, 400);
  }
});
