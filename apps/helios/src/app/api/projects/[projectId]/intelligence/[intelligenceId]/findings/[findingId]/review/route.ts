import { normalizeFindingReviewInput } from "@opsslate/helios-domain";

import {
  callHeliosGateway,
  HeliosGatewayError,
} from "@/lib/helios-gateway";
import { readHeliosPrincipal } from "@/lib/helios-session";
import { apiJson, isSameOrigin } from "@/lib/request-security";

const MAX_REVIEW_BODY_BYTES = 16 * 1024;

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      intelligenceId: string;
      findingId: string;
    }>;
  },
) {
  if (!isSameOrigin(request)) {
    return apiJson({ error: "Request origin was rejected." }, 403);
  }
  const principal = await readHeliosPrincipal();
  if (!principal) return apiJson({ error: "Authentication required." }, 401);
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REVIEW_BODY_BYTES
  ) {
    return apiJson({ error: "Review request is too large." }, 413);
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REVIEW_BODY_BYTES) {
    return apiJson({ error: "Review request is too large." }, 413);
  }

  try {
    const input = normalizeFindingReviewInput(JSON.parse(rawBody));
    const { projectId, intelligenceId, findingId } = await params;
    const data = await callHeliosGateway(
      "/helios/v1/findings/review",
      principal,
      { projectId, intelligenceId, findingId, input },
    );
    return apiJson({ data }, 201);
  } catch (error) {
    return apiJson(
      {
        error:
          error instanceof HeliosGatewayError ||
          (error instanceof Error && error.name === "HeliosValidationError")
            ? error.message
            : "Finding review could not be saved.",
      },
      400,
    );
  }
}
