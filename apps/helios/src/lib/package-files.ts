"use client";

import {
  HELIOS_MAX_ARCHIVE_BYTES,
  HELIOS_MAX_ARCHIVE_EXPANDED_BYTES,
  HELIOS_MAX_ARCHIVE_EXPANSION_RATIO,
  HELIOS_MAX_PACKAGE_ENTRIES,
  HELIOS_MAX_UPLOAD_BATCH,
  HELIOS_MAX_WRITTEN_SCOPE_BYTES,
  HeliosValidationError,
  normalizePackagePath,
  validatePdfCandidate,
  type HeliosPackageSourceType,
} from "@opsslate/helios-domain";
import { unzip } from "fflate";

export type PreparedPackageFile = {
  id: string;
  file: File;
  relativePath: string;
  sha256: string;
};

export type RejectedPackageEntry = {
  relativePath: string;
  size: number;
  reason: string;
};

export type PreparedWrittenScope = {
  id: string;
  title: string;
  content: string;
  sourceLocation?: string;
  relativePath: string;
  size: number;
  sha256: string;
};

export type PreparedBidPackage = {
  envelopeId: string;
  name: string;
  sourceType: HeliosPackageSourceType;
  files: PreparedPackageFile[];
  writtenScopes: PreparedWrittenScope[];
  rejected: RejectedPackageEntry[];
};

function packageFileId(relativePath: string, index: number) {
  return `${index}-${relativePath.toLowerCase()}`;
}

function rejectedManifestPath(rawPath: string, index: number) {
  const leaf =
    rawPath
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .slice(0, 120) || "entry";
  return `Rejected files/${String(index + 1).padStart(3, "0")} - ${leaf}`;
}

function defaultPackageName(sourceType: HeliosPackageSourceType, root?: string) {
  if (root) return root.replace(/\.zip$/i, "").slice(0, 160);
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  if (sourceType === "written_scope") return `Written scope ${timestamp}`;
  return `${sourceType === "folder" ? "Bid folder" : "Bid package"} ${timestamp}`;
}

function envelopeId() {
  return `manual:${crypto.randomUUID()}`;
}

async function sha256File(file: File) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
  );
  return Array.from(digest, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

export async function prepareSelectedFiles(
  selected: File[],
  sourceType: "files" | "folder",
): Promise<PreparedBidPackage> {
  if (!selected.length) {
    throw new HeliosValidationError("Select at least one project file.");
  }
  if (selected.length > HELIOS_MAX_PACKAGE_ENTRIES) {
    throw new HeliosValidationError(
      `A package can contain up to ${HELIOS_MAX_PACKAGE_ENTRIES} files.`,
    );
  }

  const files: Array<Omit<PreparedPackageFile, "sha256">> = [];
  const rejected: RejectedPackageEntry[] = [];
  const seen = new Set<string>();
  selected.forEach((file, index) => {
    let relativePath: string;
    try {
      relativePath = normalizePackagePath(
        sourceType === "folder" && file.webkitRelativePath
          ? file.webkitRelativePath
          : file.name,
      );
      const canonicalPath = relativePath.toLowerCase();
      if (seen.has(canonicalPath)) {
        rejected.push({
          relativePath: rejectedManifestPath(relativePath, index),
          size: file.size,
          reason: "Duplicate path in this package.",
        });
        return;
      }
      seen.add(canonicalPath);
      validatePdfCandidate(file);
      if (files.length >= HELIOS_MAX_UPLOAD_BATCH) {
        rejected.push({
          relativePath,
          size: file.size,
          reason: `Package exceeds the ${HELIOS_MAX_UPLOAD_BATCH}-PDF limit.`,
        });
        return;
      }
      files.push({
        id: packageFileId(relativePath, index),
        file,
        relativePath,
      });
    } catch (error) {
      rejected.push({
        relativePath: rejectedManifestPath(
          typeof file.webkitRelativePath === "string" &&
            file.webkitRelativePath
            ? file.webkitRelativePath
            : file.name,
          index,
        ),
        size: file.size,
        reason:
          error instanceof Error ? error.message : "File cannot be uploaded.",
      });
    }
  });
  if (!files.length) {
    throw new HeliosValidationError("The selected package contains no valid PDFs.");
  }

  const folderRoot =
    sourceType === "folder"
      ? files[0]?.relativePath.split("/")[0]
      : undefined;
  const verifiedFiles: PreparedPackageFile[] = [];
  for (const file of files) {
    verifiedFiles.push({ ...file, sha256: await sha256File(file.file) });
  }
  return {
    envelopeId: envelopeId(),
    name: defaultPackageName(sourceType, folderRoot),
    sourceType,
    files: verifiedFiles,
    writtenScopes: [],
    rejected,
  };
}

export async function prepareZipPackage(
  archive: File,
): Promise<PreparedBidPackage> {
  if (!archive.name.toLowerCase().endsWith(".zip")) {
    throw new HeliosValidationError("Select a ZIP bid package.");
  }
  if (archive.size <= 0 || archive.size > HELIOS_MAX_ARCHIVE_BYTES) {
    throw new HeliosValidationError(
      "ZIP packages must be larger than 0 bytes and no more than 250 MB.",
    );
  }

  const archiveBytes = new Uint8Array(await archive.arrayBuffer());
  const accepted = new Map<
    string,
    { relativePath: string; size: number; index: number }
  >();
  const rejected: RejectedPackageEntry[] = [];
  const seen = new Set<string>();
  let entryCount = 0;
  let expandedBytes = 0;
  let fatalError: Error | undefined;

  const unzipped = await new Promise<Record<string, Uint8Array>>(
    (resolve, reject) => {
      unzip(
        archiveBytes,
        {
          filter(entry) {
            entryCount += 1;
            if (entryCount > HELIOS_MAX_PACKAGE_ENTRIES) {
              fatalError = new HeliosValidationError(
                `A ZIP package can contain up to ${HELIOS_MAX_PACKAGE_ENTRIES} entries.`,
              );
              return false;
            }
            if (entry.name.endsWith("/")) return false;

            let relativePath: string;
            try {
              relativePath = normalizePackagePath(entry.name);
            } catch (error) {
              rejected.push({
                relativePath: rejectedManifestPath(entry.name, entryCount),
                size: entry.originalSize,
                reason:
                  error instanceof Error ? error.message : "Unsafe ZIP path.",
              });
              return false;
            }
            const canonicalPath = relativePath.toLowerCase();
            if (seen.has(canonicalPath)) {
              rejected.push({
                relativePath: rejectedManifestPath(relativePath, entryCount),
                size: entry.originalSize,
                reason: "Duplicate path in this ZIP package.",
              });
              return false;
            }
            seen.add(canonicalPath);
            if (!canonicalPath.endsWith(".pdf")) {
              rejected.push({
                relativePath,
                size: entry.originalSize,
                reason: "Only PDF files enter project intelligence.",
              });
              return false;
            }
            if (
              entry.originalSize <= 0 ||
              entry.originalSize > 50 * 1024 * 1024
            ) {
              rejected.push({
                relativePath,
                size: entry.originalSize,
                reason: "PDF is empty or exceeds the 50 MB file limit.",
              });
              return false;
            }
            if (
              entry.originalSize >
              Math.max(1, entry.size) * HELIOS_MAX_ARCHIVE_EXPANSION_RATIO
            ) {
              rejected.push({
                relativePath,
                size: entry.originalSize,
                reason: "Unsafe ZIP expansion ratio.",
              });
              return false;
            }
            if (accepted.size >= HELIOS_MAX_UPLOAD_BATCH) {
              rejected.push({
                relativePath,
                size: entry.originalSize,
                reason: `Package exceeds the ${HELIOS_MAX_UPLOAD_BATCH}-PDF limit.`,
              });
              return false;
            }
            expandedBytes += entry.originalSize;
            if (expandedBytes > HELIOS_MAX_ARCHIVE_EXPANDED_BYTES) {
              fatalError = new HeliosValidationError(
                "The expanded ZIP package exceeds the 1 GB safety limit.",
              );
              return false;
            }
            accepted.set(entry.name, {
              relativePath,
              size: entry.originalSize,
              index: accepted.size,
            });
            return true;
          },
        },
        (error, data) => {
          if (error) reject(error);
          else resolve(data);
        },
      );
    },
  );
  if (fatalError) throw fatalError;

  const extractedFiles = Array.from(accepted.entries()).map(
    ([archivePath, metadata]) => {
      const bytes = unzipped[archivePath];
      if (!bytes || bytes.byteLength !== metadata.size) {
        throw new HeliosValidationError(
          `ZIP entry could not be verified: ${metadata.relativePath}`,
        );
      }
      const fileName = metadata.relativePath.split("/").pop() || "document.pdf";
      const ownedBytes = new Uint8Array(bytes.byteLength);
      ownedBytes.set(bytes);
      return {
        id: packageFileId(metadata.relativePath, metadata.index),
        file: new File([ownedBytes.buffer], fileName, {
          type: "application/pdf",
        }),
        relativePath: metadata.relativePath,
      };
    },
  );
  if (!extractedFiles.length) {
    throw new HeliosValidationError("The ZIP package contains no valid PDFs.");
  }
  const files: PreparedPackageFile[] = [];
  for (const file of extractedFiles) {
    files.push({ ...file, sha256: await sha256File(file.file) });
  }
  return {
    envelopeId: envelopeId(),
    name: defaultPackageName("zip", archive.name),
    sourceType: "zip",
    files,
    writtenScopes: [],
    rejected,
  };
}

export async function prepareWrittenScope(input: {
  title: string;
  content: string;
  sourceLocation?: string;
}): Promise<PreparedBidPackage> {
  const title = input.title.trim();
  const content = input.content;
  if (!title || title.length > 160) {
    throw new HeliosValidationError(
      "Enter a written scope title up to 160 characters.",
    );
  }
  if (!content.trim()) {
    throw new HeliosValidationError("Enter the written scope.");
  }
  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength > HELIOS_MAX_WRITTEN_SCOPE_BYTES) {
    throw new HeliosValidationError("Written scope must be 128 KB or smaller.");
  }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const sha256 = Array.from(digest, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  const safeTitle = title
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_")
    .slice(0, 120);
  const writtenScope: PreparedWrittenScope = {
    id: `scope:${sha256}`,
    title,
    content,
    sourceLocation: input.sourceLocation?.trim() || undefined,
    relativePath: normalizePackagePath(`Written scope/${safeTitle}.txt`),
    size: bytes.byteLength,
    sha256,
  };
  return {
    envelopeId: envelopeId(),
    name: defaultPackageName("written_scope", title),
    sourceType: "written_scope",
    files: [],
    writtenScopes: [writtenScope],
    rejected: [],
  };
}
