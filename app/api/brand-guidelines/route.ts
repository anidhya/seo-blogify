export const runtime = "nodejs";

import { parseBrandGuidelineUpload, summarizeBrandGuidelines } from "@/lib/brand-guidelines";
import {
  loadLatestBrandGuidelines,
  loadRun,
  removeBrandGuidelineFile,
  saveBrandGuidelinesSnapshot,
  saveRunBrandGuidelines
} from "@/lib/storage";
import type { BrandGuidelineFile } from "@/lib/types";
import { NextResponse } from "next/server";

function getRunDomain(run: Awaited<ReturnType<typeof loadRun>>) {
  const websiteUrl = run.input?.websiteUrl;
  if (!websiteUrl) {
    return null;
  }

  try {
    return new URL(websiteUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function loadCurrentBrandGuidelines(runId: string) {
  const run = await loadRun(runId);
  const domain = getRunDomain(run);
  const current = run.brandGuidelines ?? (domain ? await loadLatestBrandGuidelines(domain) : null);
  return { run, domain, current };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  const { domain, current, run } = await loadCurrentBrandGuidelines(runId);
  return NextResponse.json({
    runId,
    domain,
    brandGuidelines: current,
    hasBrandGuidelines: Boolean(current),
    runBrandGuidelines: run.brandGuidelines
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const runId = String(formData.get("runId") ?? "").trim();
    if (!runId) {
      return NextResponse.json({ error: "runId is required." }, { status: 400 });
    }

    const { domain, current } = await loadCurrentBrandGuidelines(runId);
    if (!domain) {
      return NextResponse.json({ error: "A valid website domain is required before uploading guidelines." }, { status: 400 });
    }

    const uploadedFiles = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "At least one guideline file is required." }, { status: 400 });
    }

    const parsedFiles: BrandGuidelineFile[] = [];
    for (const file of uploadedFiles) {
      try {
        parsedFiles.push(await parseBrandGuidelineUpload(file));
      } catch (error) {
        console.error("[brand-guidelines] failed to parse upload", {
          runId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          error
        });
        throw error;
      }
    }

    const existingFiles = current?.snapshot.files ?? [];
    const nextFiles = [
      ...existingFiles.filter((file) => !parsedFiles.some((nextFile) => nextFile.fileName === file.fileName)),
      ...parsedFiles
    ];

    const guidanceText = nextFiles.map((file) => file.extractedText).join("\n\n");
    let snapshot;
    try {
      snapshot = await saveBrandGuidelinesSnapshot(domain, {
        sourceRunId: runId,
        summary: summarizeBrandGuidelines(nextFiles),
        guidanceText,
        files: nextFiles
      });
    } catch (error) {
      console.error("[brand-guidelines] failed to save snapshot", {
        runId,
        domain,
        fileCount: nextFiles.length,
        error
      });
      throw error;
    }

    try {
      await saveRunBrandGuidelines(runId, snapshot);
    } catch (error) {
      console.error("[brand-guidelines] failed to link snapshot to run", {
        runId,
        domain,
        snapshotId: snapshot.snapshotId,
        error
      });
      throw error;
    }

    return NextResponse.json({
      runId,
      domain,
      brandGuidelines: snapshot
    });
  } catch (error) {
    console.error("[brand-guidelines] POST failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload brand guidelines." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const runId = url.searchParams.get("runId") || "";
    const fileId = url.searchParams.get("fileId") || "";

    if (!runId || !fileId) {
      return NextResponse.json({ error: "runId and fileId are required." }, { status: 400 });
    }

    const { domain } = await loadCurrentBrandGuidelines(runId);
    if (!domain) {
      return NextResponse.json({ error: "No brand guidelines are associated with this run." }, { status: 400 });
    }

    const updated = await removeBrandGuidelineFile(domain, fileId);
    if (!updated) {
      return NextResponse.json({ error: "Unable to update brand guidelines." }, { status: 400 });
    }

    await saveRunBrandGuidelines(runId, updated);

    return NextResponse.json({
      runId,
      domain,
      brandGuidelines: updated
    });
  } catch (error) {
    console.error("[brand-guidelines] DELETE failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete brand guideline file." },
      { status: 400 }
    );
  }
}
