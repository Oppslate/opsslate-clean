import "server-only";

import { createHash } from "node:crypto";

type PackageRouteBody = {
  envelopeId?: unknown;
  adapter?: unknown;
  manifestVersion?: unknown;
  name?: unknown;
  sourceType?: unknown;
  revisionKind?: unknown;
  revisionLabel?: unknown;
  entries?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function secureManualPackageInput(body: PackageRouteBody | null) {
  if (
    !body ||
    typeof body.envelopeId !== "string" ||
    body.adapter !== "manual" ||
    typeof body.manifestVersion !== "number" ||
    typeof body.name !== "string" ||
    typeof body.sourceType !== "string" ||
    typeof body.revisionKind !== "string" ||
    !Array.isArray(body.entries)
  ) {
    return null;
  }

  const entries = body.entries.map((entry) => {
    if (!isRecord(entry) || entry.kind !== "written_scope") return entry;
    if (typeof entry.content !== "string") return entry;
    const contentBytes = Buffer.from(entry.content, "utf8");
    return {
      ...entry,
      size: contentBytes.byteLength,
      sha256: createHash("sha256").update(contentBytes).digest("hex"),
    };
  });

  return {
    envelopeId: body.envelopeId,
    adapter: "manual" as const,
    manifestVersion: body.manifestVersion,
    name: body.name,
    sourceType: body.sourceType,
    revisionKind: body.revisionKind,
    revisionLabel:
      typeof body.revisionLabel === "string" ? body.revisionLabel : undefined,
    entries,
  };
}
