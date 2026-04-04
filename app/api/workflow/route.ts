export const runtime = "nodejs";

import { collectResearch } from "@/lib/content";
import {
  generateApprovedBlog,
  evaluateBlogQuality,
  generateStructuredAnalysis,
  generateLinkedInDraft,
  generateTopicSuggestions,
  rewriteBlogDraft
} from "@/lib/openai";
import { generateLinkedInCarouselImages } from "@/lib/google-ai";
import {
  deriveExistingTopics,
  deriveExistingTopicsFromUrls,
  formatExistingTopicsForPrompt,
  formatRejectedTopicsForPrompt,
  mergeExistingTopics,
  validateTopicCandidates
} from "@/lib/topic-dedup";
import type {
  BlogQuality,
  BrandAnalysis,
  GeneratedBlog,
  LinkedInGeneratedImage,
  TopicSuggestion,
  WorkflowInput,
  WorkflowStep,
  LinkedInDraft
} from "@/lib/types";
import { NextResponse } from "next/server";
import {
  createRun,
  loadRun,
  saveLinkedInDraft,
  saveLinkedInApproval,
  saveLinkedInPublication,
  saveLinkedInSchedule,
  saveApprovedArticle,
  saveExistingTopics,
  saveApprovedTopic,
  saveApproval,
  saveAnalysis,
  saveBlog,
  saveBlogRevision,
  saveRegenerationNote,
  saveQuality,
  saveTopicCandidates,
  saveTopicValidation,
  saveResearch,
  saveTopics,
  updateManifest
} from "@/lib/storage";
import { publishLinkedInPost } from "@/lib/linkedin";

type RequestBody = {
  step: WorkflowStep;
  runId?: string;
  articleSlug?: string;
  slideNumber?: number;
  comments?: string;
  approved?: boolean;
  markdown?: string;
  payload?: WorkflowInput & {
    analysis?: BrandAnalysis;
    selectedTopic?: TopicSuggestion;
  };
};

function formatResearchBlock(
  input: WorkflowInput,
  homepageText: string,
  blogText: string,
  sitemapUrls: string[] = [],
  resolvedSitemapUrl: string | null = null
) {
  return [
    `Company name hint: ${input.companyName || "Not provided"}`,
    `Vision hint: ${input.vision || "Not provided"}`,
    `Priority keywords: ${input.keywords || "Not provided"}`,
    "",
    "Homepage research:",
    homepageText,
    "",
    "Blog research:",
    blogText,
    "",
    formatSitemapBlock(sitemapUrls, resolvedSitemapUrl)
  ].join("\n");
}

function formatSitemapBlock(urls: string[], resolvedSitemapUrl: string | null = null) {
  return urls.length > 0
    ? [
        resolvedSitemapUrl ? `Resolved sitemap URL: ${resolvedSitemapUrl}` : "Resolved sitemap URL: Not available",
        `Sitemap URLs:\n${urls.map((url, index) => `${index + 1}. ${url}`).join("\n")}`
      ].join("\n")
    : "Sitemap URLs: None discovered.";
}

function formatInternalLinkHints(run: Awaited<ReturnType<typeof loadRun>>) {
  const hints: string[] = [];

  if (run.research?.homepage) {
    hints.push(`Homepage: ${run.research.homepage.url} | ${run.research.homepage.title}`);
  }

  for (const blog of run.research?.blogs ?? []) {
    hints.push(`Existing blog: ${blog.url} | ${blog.title}`);
  }

  for (const topic of run.topics?.topics ?? []) {
    hints.push(`Topic cluster: ${topic.primaryKeyword} | ${topic.title}`);
  }

  for (const coverage of run.existingTopics?.existingTopics ?? []) {
    hints.push(`Coverage: ${coverage.sourceUrl} | ${coverage.title}`);
  }

  return hints.length > 0 ? hints.join("\n") : "No link targets available.";
}

function buildLinkedInPrompt(params: {
  blog: GeneratedBlog;
  analysis: BrandAnalysis;
  topic: TopicSuggestion;
  input: WorkflowInput;
}) {
  return [
    "Create a LinkedIn publishing pack from this approved article.",
    "Return exactly 4 carousel-ready slide prompts.",
    "Keep one coherent visual system across all slides: same palette, same typography style, same art direction, and consistent layout logic.",
    "Each slide should be useful on its own and collectively tell one clear story.",
    "Also return a LinkedIn suggested title and suggested description for the post.",
    "The suggested description should sound natural on LinkedIn, not like a blog excerpt.",
    "The carousel prompts should be ready to hand off to a design or image generation workflow later.",
    "Use the article's thesis, key takeaways, and FAQ themes as the source of truth.",
    "",
    `Article title: ${params.blog.title}`,
    `Article slug: ${params.blog.slug}`,
    `Article summary: ${params.blog.summary}`,
    `Article markdown:\n${params.blog.markdown}`,
    "",
    `Approved topic:\n${JSON.stringify(params.topic, null, 2)}`,
    "",
    `Brand analysis:\n${JSON.stringify(params.analysis, null, 2)}`,
    "",
    `Workflow input:\n${JSON.stringify(params.input, null, 2)}`
  ].join("\n");
}

function buildFallbackLinkedInDraft(params: {
  blog: GeneratedBlog;
  topic: TopicSuggestion;
}): LinkedInDraft {
  const focus = params.topic.primaryKeyword || params.blog.meta.keywords[0] || params.blog.title;
  const suggestedTitle = `${params.blog.title}`;
  const suggestedDescription = `${params.blog.summary}\n\nIf you're building around ${focus}, this carousel breaks the idea into a simple, usable framework.`;

  return {
    articleSlug: params.blog.slug,
    suggestedTitle,
    suggestedDescription,
    carouselPrompts: [
      {
        slideNumber: 1,
        title: `Hook: ${params.topic.title}`,
        prompt: `Design a bold LinkedIn carousel cover for the article "${params.blog.title}". Use a strong hook about ${focus}, premium editorial styling, high contrast typography, and one central concept only.`,
        designNotes: "Use the same palette and typography across all slides."
      },
      {
        slideNumber: 2,
        title: "Why it matters",
        prompt: `Create a slide that frames the problem and why ${focus} matters right now. Keep the layout clean, one statistic or insight, and a strong visual hierarchy.`,
        designNotes: "Use a concise subhead and one supporting callout."
      },
      {
        slideNumber: 3,
        title: "Framework",
        prompt: `Create a process slide that breaks ${params.blog.title} into 3 simple steps or pillars. Make it easy to scan, with numbered blocks and lots of whitespace.`,
        designNotes: "Match the cover palette and spacing rhythm."
      },
      {
        slideNumber: 4,
        title: "CTA",
        prompt: "Create a closing slide with a clear takeaway and a subtle call-to-action to read the full article. Keep it polished, minimal, and consistent with the rest of the carousel.",
        designNotes: "Finish with the same visual system and a strong CTA zone."
      }
    ],
    generatedImages: [],
    failedSlides: [],
    imageGenerationStatus: "idle",
    imageModel: null,
    hashtags: [focus, params.topic.seoAngle, "LinkedInMarketing", "ContentStrategy"].map((item) =>
      item.toLowerCase().replace(/\s+/g, "")
    ),
    callToAction: `Read the full article for the complete breakdown of ${focus}.`,
    publishStatus: "draft",
    reviewStatus: "pending_review"
  };
}

function getLinkedInArticleRecord(run: Awaited<ReturnType<typeof loadRun>>, articleSlug: string) {
  return run.linkedin?.articles.find((article) => article.articleSlug === articleSlug) ?? null;
}

async function generateLinkedInDraftForRun(params: {
  run: Awaited<ReturnType<typeof loadRun>>;
  articleSlug: string;
}) {
  if (!params.run.analysis || !params.run.input) {
    throw new Error("Saved run data is incomplete.");
  }

  const approvedArticle = params.run.approvedArticles?.articles.find((article) => article.articleSlug === params.articleSlug) ?? null;
  const articleBlog =
    approvedArticle?.blog ?? (params.run.blog?.blog?.slug === params.articleSlug ? params.run.blog.blog : null);

  if (!articleBlog) {
    throw new Error("LinkedIn source article is not available.");
  }

  const topic =
    approvedArticle?.topic ?? params.run.approvedTopic?.approvedTopic ?? {
      title: articleBlog.title,
      primaryKeyword: articleBlog.meta.keywords[0] ?? articleBlog.title,
      searchIntent: "LinkedIn promotion",
      rankingRationale: "Approved article from the current run.",
      seoAngle: "Social distribution",
      outline: []
    };

  try {
    const draft = await generateLinkedInDraft(
      buildLinkedInPrompt({
        blog: articleBlog,
        analysis: params.run.analysis.analysis,
        topic,
        input: params.run.input
      })
    );

    return draft;
  } catch {
    return buildFallbackLinkedInDraft({
      blog: articleBlog,
      topic
    });
  }
}

async function queueLinkedInImagesForArticle(params: {
  runId: string;
  articleSlug: string;
  slideNumber?: number;
}) {
  const run = await loadRun(params.runId);
  const linkedInRecord = getLinkedInArticleRecord(run, params.articleSlug);
  const draft = linkedInRecord?.draft ?? null;

  if (!draft) {
    throw new Error("LinkedIn draft is not available.");
  }

  const existingImages = draft.generatedImages ?? [];
  const slideNumber = typeof params.slideNumber === "number" ? params.slideNumber : null;
  const baseImages = slideNumber
    ? existingImages.filter((image) => image.slideNumber !== slideNumber)
    : [];

  await setProgress(
    params.runId,
    "queue-linkedin-images",
    5,
    slideNumber ? `Queued slide ${slideNumber} for Google image generation` : "Queued carousel images for Google image generation"
  );
  const queuedDraft: LinkedInDraft = {
    ...draft,
    imageGenerationStatus: "queued",
    generatedImages: slideNumber ? baseImages : [],
    failedSlides: slideNumber
      ? (draft.failedSlides ?? []).filter((failure) => failure.slideNumber !== slideNumber)
      : [],
    imageModel: draft.imageModel ?? null
  };
  await saveLinkedInDraft(params.runId, queuedDraft);

  let generatedImagesInProgress: LinkedInGeneratedImage[] = [...baseImages];
  await setProgress(
    params.runId,
    "queue-linkedin-images",
    18,
    slideNumber ? `Starting slide ${slideNumber}` : "Starting first slide"
  );

  try {
    const generatedImages = await generateLinkedInCarouselImages({
      draft: queuedDraft,
      slideNumber: slideNumber ?? undefined,
      retriesPerSlide: 4,
      baseDelayMs: 1500,
      onSlideGenerated: async ({ slideNumber: generatedSlideNumber, generatedCount, total, image, model }) => {
        generatedImagesInProgress = [
          ...generatedImagesInProgress.filter((existing) => existing.slideNumber !== generatedSlideNumber),
          image
        ].sort((left, right) => left.slideNumber - right.slideNumber);
        const failedSlides = (queuedDraft.failedSlides ?? []).filter(
          (failure) => failure.slideNumber !== generatedSlideNumber
        );
        const percent = 18 + Math.round((generatedCount / total) * 72);
        await setProgress(
          params.runId,
          "queue-linkedin-images",
          percent,
          `Generating slide ${generatedSlideNumber}`
        );
        await saveLinkedInDraft(params.runId, {
          ...queuedDraft,
          generatedImages: generatedImagesInProgress,
          failedSlides,
          imageGenerationStatus:
            slideNumber
              ? generatedImagesInProgress.length >= draft.carouselPrompts.length
                ? "ready"
                : "partial"
              : generatedCount < total
                ? "generating"
                : "ready",
          imageModel: model
        });
      }
    });

    const enrichedDraft: LinkedInDraft = {
      ...queuedDraft,
      generatedImages: slideNumber ? generatedImagesInProgress : generatedImages,
      imageGenerationStatus:
        (slideNumber ? generatedImagesInProgress : generatedImages).length === draft.carouselPrompts.length
          ? "ready"
          : "partial",
      imageModel: generatedImages[0]?.model ?? process.env.GOOGLE_IMAGE_MODEL ?? "gemini-2.5-flash-image"
    };

    await setProgress(params.runId, "queue-linkedin-images", 95, "Saving generated images");
    await saveLinkedInDraft(params.runId, enrichedDraft);
    await updateManifest(params.runId, { steps: { linkedin: true } });
    await setProgress(params.runId, "queue-linkedin-images", 100, "LinkedIn images ready", true);

    return enrichedDraft;
  } catch (error) {
    const partialStatus = generatedImagesInProgress.length > baseImages.length ? "partial" : "failed";
    const failedSlideNumber = slideNumber;
    const partialDraft: LinkedInDraft = {
      ...queuedDraft,
      generatedImages: generatedImagesInProgress.sort((left, right) => left.slideNumber - right.slideNumber),
      failedSlides:
        failedSlideNumber !== null
          ? [
              ...(queuedDraft.failedSlides ?? []).filter((failure) => failure.slideNumber !== failedSlideNumber),
              {
                slideNumber: failedSlideNumber,
                reason: error instanceof Error ? error.message : "Google image generation failed.",
                failedAt: new Date().toISOString()
              }
            ]
          : queuedDraft.failedSlides ?? [],
      imageGenerationStatus: partialStatus
    };

    await saveLinkedInDraft(params.runId, partialDraft);
    await setProgress(
      params.runId,
      "queue-linkedin-images",
      generatedImagesInProgress.length > baseImages.length ? 82 : 100,
      partialStatus === "partial"
        ? "Some images generated before a throttle or error"
        : "Image generation failed",
      partialStatus !== "partial"
    );

    throw error;
  }
}

async function setProgress(
  runId: string,
  action: WorkflowStep | null,
  percent: number,
  stageLabel: string,
  isComplete = false
) {
  await updateManifest(runId, {
    progress: {
      action,
      percent,
      stageLabel,
      updatedAt: new Date().toISOString(),
      isComplete
    }
  });
}

function formatBlogQualityPrompt(params: {
  blog: Awaited<ReturnType<typeof generateApprovedBlog>>;
  analysis: BrandAnalysis;
  topic: TopicSuggestion;
}) {
  return [
    "Score this blog draft on how human, specific, and publication-ready it feels.",
    "Treat 80 as the minimum pass threshold.",
    "Return a score from 0 to 100 and identify the weakest areas.",
    "Evaluate sentence variety, specificity, transitions, repetition, concrete examples, AI fluff, brand consistency, structure, and bloat.",
    "",
    `Blog draft:\n${JSON.stringify(params.blog, null, 2)}`,
    "",
    `Brand analysis:\n${JSON.stringify(params.analysis, null, 2)}`,
    "",
    `Approved topic:\n${JSON.stringify(params.topic, null, 2)}`
  ].join("\n");
}

function formatBlogStructurePrompt(params: {
  topic: TopicSuggestion;
  analysis: BrandAnalysis;
  input: WorkflowInput;
  homepageText: string;
  blogText: string;
  sitemapUrls: string[];
  internalLinkHints: string;
}) {
  return [
    "Write a clean, structured, editorial blog post with no bloat or spam.",
    "Follow this structure: hook, answer-first intro, short orientation section like 'In this article', 3 to 6 strong H2 sections, concise takeaway block, FAQ, SEO meta, image prompts, and internal links.",
    "Keep paragraphs short and concrete.",
    "Avoid generic AI phrasing, repeated claims, and filler transitions.",
    "Use the primary keyword naturally and support it with semantically related terms.",
    "Stay under 1200 words for the main article body.",
    "Use a consistent visual system for the 3 image prompts: same style, palette, lighting, and level of realism.",
    "Return exactly 3 image prompts.",
    "Return 3 to 5 internal link suggestions tied to the available site URLs and existing blog coverage.",
    "Each internal link suggestion must include anchorText, targetUrl, placement, and rationale.",
    "Respond using the provided JSON schema.",
    "",
    `Brand analysis:\n${JSON.stringify(params.analysis, null, 2)}`,
    "",
    `Approved topic:\n${JSON.stringify(params.topic, null, 2)}`,
    "",
    `Existing site content and link targets:\n${params.internalLinkHints}`,
    "",
    formatResearchBlock(
      params.input,
      params.homepageText,
      params.blogText,
      params.sitemapUrls,
      null
    )
  ].join("\n");
}

function formatRewritePrompt(params: {
  blog: Awaited<ReturnType<typeof generateApprovedBlog>>;
  quality: Awaited<ReturnType<typeof evaluateBlogQuality>>;
  analysis: BrandAnalysis;
  topic: TopicSuggestion;
  attempt: number;
}) {
  return [
    `Rewrite attempt ${params.attempt}. Improve only the weak sections while preserving the approved topic and SEO intent.`,
    "Make the prose feel more human, less repetitive, more specific, and more naturally editorial.",
    "Keep the same structure unless a section is causing the quality issues.",
    "Keep the post under 1200 words.",
    "Preserve the 3 image prompts and internal link suggestions unless they are clearly off-topic.",
    "Return the full blog object in the same schema.",
    "",
    `Quality issues:\n${JSON.stringify(params.quality, null, 2)}`,
    "",
    `Current blog:\n${JSON.stringify(params.blog, null, 2)}`,
    "",
    `Brand analysis:\n${JSON.stringify(params.analysis, null, 2)}`,
    "",
    `Approved topic:\n${JSON.stringify(params.topic, null, 2)}`
  ].join("\n");
}

async function scoreAndPersistBlog(params: {
  runId: string;
  run: Awaited<ReturnType<typeof loadRun>>;
  blog: Awaited<ReturnType<typeof generateApprovedBlog>>;
  topic: TopicSuggestion;
  articleSlug: string;
  rewriteAttempts: number;
  comments?: string;
}): Promise<{
  quality: BlogQuality;
  publishStatus: "publish_ready" | "needs_review";
}> {
  if (!params.run.analysis) {
    throw new Error("Saved run data is incomplete.");
  }

  const quality = await evaluateBlogQuality(
    formatBlogQualityPrompt({
      blog: params.blog,
      analysis: params.run.analysis.analysis,
      topic: params.topic
    })
  );

  const savedBlog = await saveBlog(params.runId, params.blog);
  const qualityPayload: BlogQuality = {
    score: quality.score,
    publishStatus: quality.score >= 80 ? "publish_ready" : "needs_review",
    evaluation: quality.evaluation,
    issues: quality.issues,
    rewriteAttempts: params.rewriteAttempts,
    notes: quality.notes
  };
  await saveQuality(params.runId, qualityPayload);
  await saveApprovedArticle(params.runId, {
    articleSlug: params.articleSlug,
    topic: params.topic,
    blog: params.blog,
    quality: qualityPayload,
    wordCount: savedBlog.wordCount,
    approvalStatus: quality.score >= 80 ? "pending" : "needs_revision",
    feedbackCount: params.comments ? 1 : 0
  });

  if (params.comments) {
    await saveBlogRevision(params.runId, {
      articleSlug: params.articleSlug,
      comments: params.comments,
      blog: params.blog,
      quality: qualityPayload
    });
  }

  await updateManifest(params.runId, {
    status: quality.score >= 80 ? "publish_ready" : "needs_review",
    steps: { approvedTopic: true, blog: true }
  });

  return { quality: qualityPayload, publishStatus: quality.score >= 80 ? "publish_ready" : "needs_review" };
}

async function generateValidatedTopicSet(run: Awaited<ReturnType<typeof loadRun>>, targetCount = 10) {
  if (!run.input || !run.research || !run.analysis) {
    throw new Error("Saved run data is incomplete.");
  }

  const existingTopics = mergeExistingTopics(
    run.existingTopics?.existingTopics ?? [],
    deriveExistingTopics(run.research.homepage, run.research.blogs),
    deriveExistingTopicsFromUrls(run.research.sitemapUrls ?? [])
  );
  const acceptedTopics: TopicSuggestion[] = [];
  const rejectedTopics: Array<{
    topic: TopicSuggestion;
    reason: string;
    matchedExistingTitle: string;
    score: number;
    similarTerms: string[];
  }> = [];
  const candidateTopics: TopicSuggestion[] = [];
  const coveragePool = [...existingTopics];
  const coverageBlock = formatExistingTopicsForPrompt(existingTopics);
  const homepageText = `URL: ${run.research.homepage.url}\nTitle: ${run.research.homepage.title}\nExcerpt: ${run.research.homepage.excerpt}\nContent:\n${run.research.homepage.content}`;
  const blogText = run.research.blogs
    .map(
      (blog, index) =>
        `Blog ${index + 1}\nURL: ${blog.url}\nTitle: ${blog.title}\nExcerpt: ${blog.excerpt}\nContent:\n${blog.content}`
    )
    .join("\n\n");

  for (let round = 0; round < 3 && acceptedTopics.length < targetCount; round += 1) {
    const missing = targetCount - acceptedTopics.length;
    const promptParts = [
      round === 0
        ? `Suggest exactly ${targetCount} fresh blog topics for approval.`
        : `Suggest exactly ${missing} replacement topics to fill the remaining slots.`,
      "Do not rewrite existing articles with only new wording.",
      "Each topic must target a distinct intent, keyword cluster, or content angle.",
      "Avoid topics that are semantically similar to any existing article or any previously accepted topic in this run.",
      "Treat sitemap URLs as existing content coverage even when no page snapshot is available.",
      "Return only new topics.",
      "",
      `Existing coverage:\n${coverageBlock}`,
      "",
      `Already accepted topics:\n${acceptedTopics.length ? acceptedTopics.map((topic, index) => `${index + 1}. ${topic.title} | ${topic.primaryKeyword}`).join("\n") : "None yet."}`,
      "",
      `Brand analysis:\n${JSON.stringify(run.analysis.analysis, null, 2)}`,
      "",
      formatResearchBlock(
        run.input,
        homepageText,
        blogText,
        run.research.sitemapUrls ?? [],
        run.research.resolvedSitemapUrl ?? null
      )
    ];

    if (rejectedTopics.length > 0) {
      promptParts.push("", `Rejected topics to avoid:\n${formatRejectedTopicsForPrompt(rejectedTopics)}`);
    }

    const proposedTopics = await generateTopicSuggestions(promptParts.join("\n"), missing);
    candidateTopics.push(...proposedTopics);

    const validation = validateTopicCandidates(coveragePool, proposedTopics);
    acceptedTopics.push(...validation.accepted);
    rejectedTopics.push(...validation.rejected);
    coveragePool.push(
      ...validation.accepted.map((topic) => ({
        sourceUrl: `generated:${topic.primaryKeyword}`,
        sourceTitle: topic.title,
        title: topic.title,
        primaryKeyword: topic.primaryKeyword,
        summary: topic.searchIntent,
        keywords: [topic.title, topic.primaryKeyword, topic.searchIntent, topic.seoAngle]
      }))
    );
  }

  const finalAccepted = acceptedTopics.slice(0, targetCount);

  if (finalAccepted.length < targetCount) {
    throw new Error(`Could not generate ${targetCount} unique topics without overlap.`);
  }

  return { existingTopics, candidateTopics, finalAccepted, finalRejected: rejectedTopics };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { step, payload } = body;

    if (step === "analyze") {
      if (!payload?.websiteUrl) {
        return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
      }
      const { runId, manifest } = await createRun(payload, process.env.OPENAI_MODEL || "gpt-5.4-mini");
      await setProgress(runId, "analyze", 5, "Scanning homepage and supporting blog URLs");
      const research = await collectResearch(payload.websiteUrl, payload.blogUrls);
      await setProgress(runId, "analyze", 25, "Building the research snapshot");
      const researchRecord = await saveResearch(runId, research);
      await setProgress(runId, "analyze", 40, "Reading sitemap.xml and expanding coverage");
      const existingTopics = mergeExistingTopics(
        deriveExistingTopics(research.homepage, research.blogs),
        deriveExistingTopicsFromUrls(research.sitemapUrls ?? [])
      );
      await saveExistingTopics(runId, existingTopics);
      await updateManifest(runId, { status: "created", steps: { research: true } });
      await setProgress(runId, "analyze", 55, "Analyzing brand voice and audience");

      const homepageText = `URL: ${research.homepage.url}\nTitle: ${research.homepage.title}\nExcerpt: ${research.homepage.excerpt}\nContent:\n${research.homepage.content}`;
      const blogText = research.blogs
        .map(
          (blog, index) =>
            `Blog ${index + 1}\nURL: ${blog.url}\nTitle: ${blog.title}\nExcerpt: ${blog.excerpt}\nContent:\n${blog.content}`
        )
        .join("\n\n");

      const analysisPrompt = [
        "Analyze the company's brand, products, vision, target audience, and blog writing style.",
        "Infer voice and style from the homepage and blogs.",
        "Highlight SEO opportunities and content gaps.",
        "Consider sitemap coverage as part of the site's existing content inventory.",
        "Respond using the provided JSON schema.",
        "",
        formatResearchBlock(
          payload,
          homepageText,
          blogText,
          research.sitemapUrls ?? [],
          research.resolvedSitemapUrl ?? null
        )
      ].join("\n");

      const analysis = await generateStructuredAnalysis(analysisPrompt);
      await setProgress(runId, "analyze", 85, "Saving brand analysis");
      await saveAnalysis(runId, analysis);
      await updateManifest(runId, { status: "analyzed", steps: { analysis: true } });
      await setProgress(runId, "analyze", 100, "Analysis complete", true);
      return NextResponse.json({ runId, manifest, research: researchRecord, analysis });
    }

    if (step === "suggest-topics") {
      const runId = body.runId;
      if (!runId) {
        return NextResponse.json({ error: "Run ID is required for topic suggestions." }, { status: 400 });
      }

      const run = await loadRun(runId);
      if (!run.input || !run.research || !run.analysis) {
        return NextResponse.json({ error: "Saved run data is incomplete." }, { status: 400 });
      }

      await setProgress(runId, "suggest-topics", 10, "Preparing topic discovery prompts");
      const topicSet = await generateValidatedTopicSet(run, 10);
      await setProgress(runId, "suggest-topics", 55, "Validating topic overlap");
      const topicsRecord = await saveTopics(runId, topicSet.finalAccepted);
      await saveTopicCandidates(runId, topicSet.candidateTopics);
      await saveExistingTopics(runId, topicSet.existingTopics);
      await saveTopicValidation(runId, {
        existingTopics: topicSet.existingTopics,
        accepted: topicSet.finalAccepted,
        rejected: topicSet.finalRejected
      });
      await updateManifest(runId, { status: "topics", steps: { topics: true } });
      await setProgress(runId, "suggest-topics", 100, "Topics ready", true);
      return NextResponse.json({ runId, topics: topicsRecord.topics });
    }

    if (step === "generate-blog") {
      const runId = body.runId;
      if (!runId || !payload?.selectedTopic) {
        return NextResponse.json(
          { error: "Run ID and selected topic are required for blog generation." },
          { status: 400 }
        );
      }

      const run = await loadRun(runId);
      if (!run.input || !run.research || !run.analysis) {
        return NextResponse.json({ error: "Saved run data is incomplete." }, { status: 400 });
      }

      const selectedTopic = payload.selectedTopic;
      if (!selectedTopic) {
        return NextResponse.json({ error: "Selected topic is required for blog generation." }, { status: 400 });
      }

      await setProgress(runId, "generate-blog", 10, "Assembling blog prompt");
      const homepageText = `URL: ${run.research.homepage.url}\nTitle: ${run.research.homepage.title}\nExcerpt: ${run.research.homepage.excerpt}\nContent:\n${run.research.homepage.content}`;
      const blogText = run.research.blogs
        .map(
          (blog, index) =>
            `Blog ${index + 1}\nURL: ${blog.url}\nTitle: ${blog.title}\nExcerpt: ${blog.excerpt}\nContent:\n${blog.content}`
        )
        .join("\n\n");

      await saveApprovedTopic(runId, selectedTopic);
      const remainingTopics = (run.topics?.topics ?? []).filter((topic) => {
        const sameTitle = topic.title === selectedTopic.title;
        const sameKeyword = topic.primaryKeyword === selectedTopic.primaryKeyword;
        const sameIntent = topic.searchIntent === selectedTopic.searchIntent;
        return !(sameTitle || sameKeyword || sameIntent);
      });
      await saveTopics(runId, remainingTopics);

      const blogPrompt = formatBlogStructurePrompt({
        topic: selectedTopic,
        analysis: run.analysis.analysis,
        input: run.input,
        homepageText,
        blogText,
        sitemapUrls: run.research.sitemapUrls ?? [],
        internalLinkHints: formatInternalLinkHints(run)
      });

      await setProgress(runId, "generate-blog", 35, "Drafting article and SEO assets");
      let blog = await generateApprovedBlog(blogPrompt);
      await setProgress(runId, "generate-blog", 60, "Running quality review");
      let quality = await evaluateBlogQuality(
        formatBlogQualityPrompt({
          blog,
          analysis: run.analysis.analysis,
          topic: selectedTopic
        })
      );

      let attempts = 0;
      while (quality.score < 80 && attempts < 2) {
        attempts += 1;
        await setProgress(runId, "generate-blog", 70 + attempts * 5, `Rewrite pass ${attempts}`);
        blog = await rewriteBlogDraft(
          formatRewritePrompt({
            blog,
            quality,
            analysis: run.analysis.analysis,
            topic: selectedTopic,
            attempt: attempts
          })
        );
        await setProgress(runId, "generate-blog", 82 + attempts * 4, "Rechecking quality");
        quality = await evaluateBlogQuality(
          formatBlogQualityPrompt({
            blog,
            analysis: run.analysis.analysis,
            topic: selectedTopic
          })
        );
      }

      const qualityStatus = await scoreAndPersistBlog({
        runId,
        run,
        blog,
        topic: selectedTopic,
        articleSlug: blog.slug,
        rewriteAttempts: attempts
      });
      await setProgress(runId, "generate-blog", 100, "Blog ready", true);
      return NextResponse.json({
        runId,
        blog,
        wordCount: blog.markdown.split(/\s+/).filter(Boolean).length,
        quality: qualityStatus.quality
      });
    }

    if (step === "update-blog") {
      const runId = body.runId;
      const markdown = body.markdown?.trim();

      if (!runId || !markdown) {
        return NextResponse.json({ error: "Run ID and markdown are required for updates." }, { status: 400 });
      }

      const run = await loadRun(runId);
      if (!run.input || !run.research || !run.analysis || !run.blog?.blog || !run.approvedTopic) {
        return NextResponse.json({ error: "Saved run data is incomplete." }, { status: 400 });
      }

      await setProgress(runId, "update-blog", 15, "Saving editor changes");
      const updatedBlog = {
        ...run.blog.blog,
        markdown
      };

      await setProgress(runId, "update-blog", 55, "Re-scoring edited article");
      const result = await scoreAndPersistBlog({
        runId,
        run,
        blog: updatedBlog,
        topic: run.approvedTopic.approvedTopic,
        articleSlug: body.articleSlug ?? updatedBlog.slug,
        rewriteAttempts: run.quality?.quality.rewriteAttempts ?? 0,
        comments: body.comments?.trim() || "Manual edit via preview editor"
      });
      await setProgress(runId, "update-blog", 100, "Edit saved", true);

      return NextResponse.json({
        runId,
        blog: updatedBlog,
        quality: result.quality
      });
    }

    if (step === "prepare-linkedin") {
      const runId = body.runId;
      const articleSlug = body.articleSlug;

      if (!runId || !articleSlug) {
        return NextResponse.json({ error: "Run ID and article slug are required." }, { status: 400 });
      }

      const run = await loadRun(runId);
      if (!run.analysis || !run.input) {
        return NextResponse.json({ error: "Saved run data is incomplete." }, { status: 400 });
      }

      await setProgress(runId, "prepare-linkedin", 20, "Preparing LinkedIn carousel prompts");
      const linkedinDraft = await generateLinkedInDraftForRun({ run, articleSlug });
      await setProgress(runId, "prepare-linkedin", 70, "Saving LinkedIn draft");
      await saveLinkedInDraft(runId, linkedinDraft);
      await updateManifest(runId, { steps: { linkedin: true } });
      await setProgress(runId, "prepare-linkedin", 100, "LinkedIn draft ready", true);

      return NextResponse.json({
        runId,
        draft: linkedinDraft
      });
    }

    if (step === "queue-linkedin-images" || step === "generate-linkedin-images") {
      const runId = body.runId;
      const articleSlug = body.articleSlug;
      const slideNumber =
        typeof body.slideNumber === "number" && Number.isFinite(body.slideNumber)
          ? body.slideNumber
          : undefined;

      if (!runId || !articleSlug) {
        return NextResponse.json({ error: "Run ID and article slug are required." }, { status: 400 });
      }

      const enrichedDraft = await queueLinkedInImagesForArticle({ runId, articleSlug, slideNumber });

      return NextResponse.json({
        runId,
        draft: enrichedDraft
      });
    }

    if (step === "approve-linkedin") {
      const runId = body.runId;
      const articleSlug = body.articleSlug;
      if (!runId || !articleSlug) {
        return NextResponse.json({ error: "Run ID and article slug are required." }, { status: 400 });
      }

      const run = await loadRun(runId);
      const linkedInRecord = getLinkedInArticleRecord(run, articleSlug);
      if (!linkedInRecord?.draft) {
        return NextResponse.json({ error: "LinkedIn draft is not available." }, { status: 400 });
      }

      const approved = Boolean(body.approved);
      const notes = body.comments?.trim() ?? "";
      await setProgress(runId, "approve-linkedin", 25, "Recording LinkedIn approval");
      const approval = await saveLinkedInApproval(runId, articleSlug, {
        approvalId: `li-approval-${Date.now()}`,
        createdAt: new Date().toISOString(),
        approved,
        notes
      });
      await setProgress(runId, "approve-linkedin", 100, approved ? "LinkedIn content approved" : "LinkedIn content needs revision", true);

      return NextResponse.json({
        runId,
        approved,
        approval
      });
    }

    if (step === "schedule-linkedin") {
      const runId = body.runId;
      const articleSlug = body.articleSlug;
      const scheduledFor = (body.payload as { scheduledFor?: string } | undefined)?.scheduledFor;
      const notes = body.comments?.trim() ?? "";

      if (!runId || !articleSlug || !scheduledFor) {
        return NextResponse.json(
          { error: "Run ID, article slug, and scheduled time are required." },
          { status: 400 }
        );
      }

      const run = await loadRun(runId);
      const linkedInRecord = getLinkedInArticleRecord(run, articleSlug);
      if (!linkedInRecord?.draft) {
        return NextResponse.json({ error: "LinkedIn draft is not available." }, { status: 400 });
      }

      if (linkedInRecord.draft.reviewStatus !== "approved") {
        return NextResponse.json({ error: "Approve the LinkedIn content before scheduling." }, { status: 400 });
      }

      await setProgress(runId, "schedule-linkedin", 20, "Saving LinkedIn schedule");
      const schedule = await saveLinkedInSchedule(runId, articleSlug, {
        scheduleId: `li-schedule-${Date.now()}`,
        createdAt: new Date().toISOString(),
        scheduledFor,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        status: "scheduled",
        publishedAt: null,
        notes
      });
      await setProgress(runId, "schedule-linkedin", 100, "LinkedIn scheduled", true);

      return NextResponse.json({
        runId,
        schedule
      });
    }

    if (step === "publish-linkedin") {
      const runId = body.runId;
      const articleSlug = body.articleSlug;

      if (!runId || !articleSlug) {
        return NextResponse.json({ error: "Run ID and article slug are required." }, { status: 400 });
      }

      const run = await loadRun(runId);
      const linkedInRecord = getLinkedInArticleRecord(run, articleSlug);
      if (!linkedInRecord?.draft) {
        return NextResponse.json({ error: "LinkedIn draft is not available." }, { status: 400 });
      }

      if (linkedInRecord.draft.reviewStatus !== "approved") {
        return NextResponse.json({ error: "Approve the LinkedIn content before publishing." }, { status: 400 });
      }

      const connection = linkedInRecord.connection;
      if (!connection?.connected || !connection.accessToken || !connection.memberUrn) {
        return NextResponse.json(
          { error: "Connect a LinkedIn account before publishing now." },
          { status: 400 }
        );
      }

      await setProgress(runId, "publish-linkedin", 20, "Publishing to LinkedIn");
      const published = await publishLinkedInPost({
        accessToken: connection.accessToken,
        authorUrn: connection.memberUrn,
        text: `${linkedInRecord.draft.suggestedTitle}\n\n${linkedInRecord.draft.suggestedDescription}`,
        articleUrl: run.input?.websiteUrl || undefined
      });
      await saveLinkedInPublication(runId, articleSlug, {
        publicationId: `li-publication-${Date.now()}`,
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        postUrn: published.postUrn,
        externalUrl: published.externalUrl,
        status: "published",
        error: null
      });
      await setProgress(runId, "publish-linkedin", 100, "LinkedIn post published", true);

      return NextResponse.json({
        runId,
        published
      });
    }

    if (step === "regenerate-blog") {
      const runId = body.runId;
      const comments = (body as RequestBody & { comments?: string }).comments?.trim();

      if (!runId || !comments) {
        return NextResponse.json(
          { error: "Run ID and regeneration comments are required." },
          { status: 400 }
        );
      }

      const run = await loadRun(runId);
      if (!run.input || !run.research || !run.analysis || !run.blog?.blog || !run.approvedTopic) {
        return NextResponse.json({ error: "Saved run data is incomplete." }, { status: 400 });
      }

      const priorScore = run.quality?.quality.score ?? null;
      await setProgress(runId, "regenerate-blog", 10, "Preparing regeneration notes");
      const homepageText = `URL: ${run.research.homepage.url}\nTitle: ${run.research.homepage.title}\nExcerpt: ${run.research.homepage.excerpt}\nContent:\n${run.research.homepage.content}`;
      const blogText = run.research.blogs
        .map(
          (blog, index) =>
            `Blog ${index + 1}\nURL: ${blog.url}\nTitle: ${blog.title}\nExcerpt: ${blog.excerpt}\nContent:\n${blog.content}`
        )
        .join("\n\n");

      const revisionId = `rev-${Date.now()}`;

      await saveBlogRevision(runId, {
        articleSlug: body.articleSlug ?? run.blog.blog.slug,
        comments: `Previous version before regeneration: ${comments}`,
        blog: run.blog.blog,
        quality: run.quality?.quality ?? {
          score: priorScore ?? 0,
          publishStatus: "needs_review",
          evaluation: {
            sentenceVariety: 0,
            specificity: 0,
            naturalTransitions: 0,
            reducedRepetition: 0,
            concreteExamples: 0,
            absenceOfAIFluff: 0,
            brandConsistency: 0
          },
          issues: [],
          rewriteAttempts: 0,
          notes: []
        }
      });

      const regenPrompt = [
        "Regenerate the existing blog with the editor comments applied.",
        "Preserve the approved topic, primary keyword, and SEO intent.",
        "Keep the article under 1200 words.",
        "Preserve the 3 image prompts and internal link suggestions unless they need correction.",
        "Return the full blog object and markdown in the provided schema.",
        "Respond using the provided JSON schema.",
        "",
        `Editor comments:\n${comments}`,
        "",
        `Current blog:\n${JSON.stringify(run.blog.blog, null, 2)}`,
        "",
        `Brand analysis:\n${JSON.stringify(run.analysis.analysis, null, 2)}`,
        "",
        `Approved topic:\n${JSON.stringify(run.approvedTopic.approvedTopic, null, 2)}`,
        "",
        formatBlogStructurePrompt({
          topic: run.approvedTopic.approvedTopic,
          analysis: run.analysis.analysis,
        input: run.input,
        homepageText,
        blogText,
        sitemapUrls: run.research.sitemapUrls ?? [],
        internalLinkHints: formatInternalLinkHints(run)
      })
      ].join("\n");

      await setProgress(runId, "regenerate-blog", 35, "Regenerating blog draft");
      let blog = await rewriteBlogDraft(regenPrompt);
      await setProgress(runId, "regenerate-blog", 60, "Checking quality");
      let quality = await evaluateBlogQuality(
        formatBlogQualityPrompt({
          blog,
          analysis: run.analysis.analysis,
          topic: run.approvedTopic.approvedTopic
        })
      );

      let attempts = 0;
      while (quality.score < 80 && attempts < 2) {
        attempts += 1;
        await setProgress(runId, "regenerate-blog", 70 + attempts * 5, `Rewrite pass ${attempts}`);
        blog = await rewriteBlogDraft(
          formatRewritePrompt({
            blog,
            quality,
            analysis: run.analysis.analysis,
            topic: run.approvedTopic.approvedTopic,
            attempt: attempts
          })
        );
        await setProgress(runId, "regenerate-blog", 82 + attempts * 4, "Rechecking quality");
        quality = await evaluateBlogQuality(
          formatBlogQualityPrompt({
            blog,
            analysis: run.analysis.analysis,
            topic: run.approvedTopic.approvedTopic
          })
        );
      }

      const result = await scoreAndPersistBlog({
        runId,
        run,
        blog,
        topic: run.approvedTopic.approvedTopic,
        articleSlug: run.blog.blog.slug,
        rewriteAttempts: attempts,
        comments
      });
      await setProgress(runId, "regenerate-blog", 100, "Regeneration complete", true);

      await saveRegenerationNote(runId, {
        revisionId,
        articleSlug: body.articleSlug ?? run.blog.blog.slug,
        createdAt: new Date().toISOString(),
        comments,
        priorScore,
        resultingScore: result.quality.score,
        publishStatus: result.publishStatus
      });

      return NextResponse.json({
        runId,
        blog,
        quality: {
          score: quality.score,
          publishStatus: quality.score >= 80 ? "publish_ready" : "needs_review"
        }
      });
    }

    if (step === "approve-blog") {
      const runId = body.runId;
      if (!runId) {
        return NextResponse.json({ error: "Run ID is required for approval." }, { status: 400 });
      }

      const run = await loadRun(runId);
      if (!run.blog?.blog) {
        return NextResponse.json({ error: "Saved blog data is incomplete." }, { status: 400 });
      }

      const approved = Boolean(body.approved);
      const notes = body.comments?.trim() ?? "";
      const score = run.quality?.quality.score ?? null;
      const articleSlug = body.articleSlug ?? run.blog.blog.slug;
      const articleBlog = run.blog.blog;

      if (approved && (score === null || score < 80)) {
        return NextResponse.json(
          { error: "The blog must pass the quality gate before it can be approved." },
          { status: 400 }
        );
      }

      await setProgress(runId, "approve-blog", 25, "Recording approval decision");
      const publishStatus = approved ? "approved" : "needs_review";
      await saveApproval(runId, {
        articleSlug,
        approved,
        notes,
        score,
        publishStatus
      });
      await saveApprovedArticle(runId, {
        articleSlug,
        topic: run.approvedTopic?.approvedTopic ?? {
          title: run.blog.blog.title,
          primaryKeyword: run.blog.blog.meta.keywords[0] ?? run.blog.blog.title,
          searchIntent: "Approval flow",
          rankingRationale: "Approved article from the current run.",
          seoAngle: "Article review",
          outline: []
        },
        blog: run.blog.blog,
        quality: run.quality?.quality ?? {
          score: score ?? 0,
          publishStatus: approved ? "publish_ready" : "needs_review",
          evaluation: {
            sentenceVariety: 0,
            specificity: 0,
            naturalTransitions: 0,
            reducedRepetition: 0,
            concreteExamples: 0,
            absenceOfAIFluff: 0,
            brandConsistency: 0
          },
          issues: [],
          rewriteAttempts: 0,
          notes: []
        },
        wordCount: run.blog.wordCount,
        approvalStatus: approved ? "approved" : "needs_revision",
        feedbackCount: run.revisions?.revisions.filter((revision) => revision.articleSlug === articleSlug).length ?? 0
      });

      if (approved) {
        await setProgress(runId, "approve-blog", 55, "Generating LinkedIn carousel prompts");
        const linkedinDraft = await generateLinkedInDraftForRun({ run, articleSlug });
        await saveLinkedInDraft(runId, linkedinDraft);
        await updateManifest(runId, { steps: { blog: true, linkedin: true } });
      }

      await updateManifest(runId, {
        status: approved ? "approved" : "needs_review",
        steps: { blog: true, linkedin: approved }
      });
      await setProgress(runId, "approve-blog", 100, approved ? "Approved" : "Marked for revision", true);

      return NextResponse.json({
        runId,
        approved,
        status: publishStatus,
        score,
        linkedinUrl: approved ? `/runs/${runId}/blog/${articleSlug}/linkedin` : null
      });
    }

    return NextResponse.json({ error: "Unsupported workflow step." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown workflow error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  const run = await loadRun(runId);
  return NextResponse.json({ runId, run });
}
