export const runtime = "nodejs";

import { collectResearch } from "@/lib/content";
import { generateSocialContentPack } from "@/lib/openai";
import {
  buildFallbackSocialPack,
  buildSocialGenerationPrompt,
  createSocialProjectFromPack,
  createSocialSourceLabel
} from "@/lib/social-workflow";
import { createSocialProjectId, loadRun, listSocialProjectSummaries, saveSocialProject } from "@/lib/storage";
import type { SocialPlatform, SocialProject, SocialSource } from "@/lib/types";
import { NextResponse } from "next/server";

type CreateSource = {
  mode: "url" | "manual";
  url?: string;
  topic?: string;
  audience?: string;
  notes?: string;
};

type CreateBody = {
  source?: CreateSource;
  seedRunId?: string;
  seedArticleSlug?: string;
};

function trim(value?: string | null) {
  return value?.trim() ?? "";
}

function formatSourceMaterial(payload: unknown) {
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

async function resolveSeedSource(body: CreateBody) {
  if (body.seedRunId && body.seedArticleSlug) {
    const run = await loadRun(body.seedRunId);
    const approvedArticle = run.approvedArticles?.articles.find((article) => article.articleSlug === body.seedArticleSlug);
    const blog = approvedArticle?.blog ?? (run.blog?.blog?.slug === body.seedArticleSlug ? run.blog.blog : null);

    if (!blog) {
      throw new Error("Seed article was not found.");
    }

    const source: SocialSource = {
      mode: "manual",
      url: null,
      topic: blog.title,
      audience: run.analysis?.analysis.audience || "Brand followers",
      notes: body.source?.notes?.trim() || blog.summary,
      seedRunId: body.seedRunId,
      seedArticleSlug: body.seedArticleSlug,
      seedArticleTitle: blog.title,
      seedArticleSummary: blog.summary
    };

    return {
      source,
      sourceMaterial: [
        `Approved article title: ${blog.title}`,
        `Approved article summary: ${blog.summary}`,
        `Approved article markdown:\n${blog.markdown}`,
        `Key takeaways: ${blog.keyTakeaways.join(" | ")}`,
        `FAQ count: ${blog.faqs.length}`
      ].join("\n")
    };
  }

  const sourceInput = body.source;
  if (!sourceInput) {
    throw new Error("A source or seeded article is required.");
  }

  if (sourceInput.mode === "url") {
    const url = trim(sourceInput.url);
    if (!url) {
      throw new Error("A URL is required for URL-based social projects.");
    }

    let sourceMaterial: unknown = { url, fetched: false };
    try {
      const research = await collectResearch(url, []);
      sourceMaterial = research;
    } catch {
      sourceMaterial = { url, fetched: false };
    }

    const source: SocialSource = {
      mode: "url",
      url,
      topic: trim(sourceInput.topic) || url,
      audience: trim(sourceInput.audience) || "Social audience",
      notes: trim(sourceInput.notes),
      seedRunId: null,
      seedArticleSlug: null,
      seedArticleTitle: null,
      seedArticleSummary: null
    };

    return { source, sourceMaterial: formatSourceMaterial(sourceMaterial) };
  }

  const source: SocialSource = {
    mode: "manual",
    url: null,
    topic: trim(sourceInput.topic),
    audience: trim(sourceInput.audience) || "Social audience",
    notes: trim(sourceInput.notes),
    seedRunId: null,
    seedArticleSlug: null,
    seedArticleTitle: null,
    seedArticleSummary: null
  };

  if (!source.topic) {
    throw new Error("Please enter a topic.");
  }

  return {
    source,
    sourceMaterial: [
      `Topic: ${source.topic}`,
      `Audience: ${source.audience}`,
      `Notes: ${source.notes || "None"}`,
      "No URL was provided. Research should be inferred from the topic and the open web."
    ].join("\n")
  };
}

async function generatePack(params: {
  source: SocialSource;
  sourceMaterial: string;
  comments: string[];
  existingResearch?: SocialProject["research"];
  existingDrafts?: SocialProject["platforms"];
  focusPlatform?: SocialPlatform | null;
}) {
  const prompt = buildSocialGenerationPrompt({
    source: params.source,
    sourceMaterial: params.sourceMaterial,
    comments: params.comments,
    existingResearch: params.existingResearch,
    existingDrafts: params.existingDrafts?.map((platform) => ({
      platform: platform.platform,
      platformLabel: platform.platform,
      researchSummary: params.existingResearch?.sourceSummary ?? "",
      recommendedAngles: params.existingResearch?.recommendedAngles ?? [],
      variants: platform.variants.map((variant) => ({
        variantId: variant.variantId,
        label: variant.label,
        format: variant.format,
        title: variant.title,
        body: variant.body,
        segments: variant.segments,
        hashtags: variant.hashtags,
        callToAction: variant.callToAction,
        designNotes: variant.designNotes
      }))
    })),
    focusPlatform: params.focusPlatform
  });

  try {
    return await generateSocialContentPack(prompt);
  } catch {
    return buildFallbackSocialPack({
      source: params.source,
      sourceMaterial: params.sourceMaterial,
      comments: params.comments,
      focusPlatform: params.focusPlatform
    });
  }
}

export async function GET() {
  const projects = await listSocialProjectSummaries();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBody;
    const { source, sourceMaterial } = await resolveSeedSource(body);
    const pack = await generatePack({
      source,
      sourceMaterial,
      comments: source.notes ? [source.notes] : [],
      focusPlatform: null
    });
    const projectId = createSocialProjectId(source.topic || pack.projectTitle);
    const project = createSocialProjectFromPack({
      projectId,
      source,
      research: pack.research,
      pack,
      notes: source.notes || pack.research.sourceSummary
    });
    await saveSocialProject(project);
    return NextResponse.json({ projectId, project, sourceLabel: createSocialSourceLabel(source) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create social project." },
      { status: 400 }
    );
  }
}
