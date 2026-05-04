import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import type { BrandGuidelineFile, RunBrandGuidelines } from "@/lib/types";

const TXT_EXTENSIONS = new Set([".txt", ".md"]);
const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".pdf", ".docx"]);
const execFileAsync = promisify(execFile);
const BRAND_GUIDELINE_PARSER_SCRIPT = path.join(process.cwd(), "scripts", "brand-guideline-parser.mjs");

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function getChecksum(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function parsePdfBytes(bytes: Buffer) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "brand-guidelines-pdf-"));
  const tempPath = path.join(tempDir, "upload.pdf");
  try {
    await writeFile(tempPath, bytes);
    const { stdout } = await execFileAsync(process.execPath, [BRAND_GUIDELINE_PARSER_SCRIPT, tempPath, "pdf"], {
      maxBuffer: 16 * 1024 * 1024
    });
    return stdout;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function parseDocxBytes(bytes: Buffer) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "brand-guidelines-docx-"));
  const tempPath = path.join(tempDir, "upload.docx");
  try {
    await writeFile(tempPath, bytes);
    const { stdout } = await execFileAsync(process.execPath, [BRAND_GUIDELINE_PARSER_SCRIPT, tempPath, "docx"], {
      maxBuffer: 16 * 1024 * 1024
    });
    return stdout;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function parseFileBytes(fileName: string, mimeType: string, bytes: Buffer) {
  const extension = getExtension(fileName);
  const normalizedMimeType = mimeType.toLowerCase();

  if (TXT_EXTENSIONS.has(extension) || normalizedMimeType.startsWith("text/")) {
    return new TextDecoder().decode(bytes);
  }

  if (extension === ".pdf" || normalizedMimeType === "application/pdf") {
    return parsePdfBytes(bytes);
  }

  if (extension === ".docx" || normalizedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return parseDocxBytes(bytes);
  }

  throw new Error(`Unsupported brand guideline file type: ${fileName}`);
}

function buildSummary(files: BrandGuidelineFile[]) {
  if (files.length === 0) {
    return "No brand guideline files uploaded.";
  }

  const primarySentences = files
    .map((file) => file.extractedText.split(/(?<=[.!?])\s+/)[0]?.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (primarySentences.length > 0) {
    return primarySentences.join(" ");
  }

  return `Brand guidelines from ${files.length} file${files.length === 1 ? "" : "s"}.`;
}

export async function parseBrandGuidelineUpload(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported brand guideline file type: ${file.name}`);
  }

  const extractedText = normalizeText(await parseFileBytes(file.name, file.type || "", bytes));
  if (!extractedText) {
    throw new Error(`No text could be extracted from ${file.name}.`);
  }

  const uploadedAt = new Date().toISOString();
  return {
    fileId: `bgf-${randomUUID().slice(0, 8)}`,
    fileName: file.name,
    extension,
    mimeType: file.type || "application/octet-stream",
    checksum: getChecksum(bytes),
    byteLength: bytes.byteLength,
    extractedText,
    uploadedAt
  } satisfies BrandGuidelineFile;
}

export function formatBrandGuidelinesForPrompt(brandGuidelines: RunBrandGuidelines | null) {
  if (!brandGuidelines) {
    return "Brand guidelines: None uploaded.";
  }

  return [
    `Brand guidelines domain: ${brandGuidelines.domain}`,
    `Brand guidelines snapshot ID: ${brandGuidelines.snapshot.snapshotId}`,
    `Brand guidelines summary: ${brandGuidelines.snapshot.summary}`,
    "Uploaded files:",
    brandGuidelines.snapshot.files.map((file, index) => {
      const header = `${index + 1}. ${file.fileName} (${file.extension}, ${file.byteLength} bytes)`;
      return [header, file.extractedText].join("\n");
    }).join("\n\n"),
    "",
    "Brand guidelines guidance text:",
    brandGuidelines.snapshot.guidanceText
  ].join("\n");
}

export function summarizeBrandGuidelines(files: BrandGuidelineFile[]) {
  return buildSummary(files);
}
