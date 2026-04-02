export const runtime = "nodejs";

import { collectResearch } from "@/lib/content";
import {
  generateApprovedBlog,
  evaluateBlogQuality,
  generateStructuredAnalysis,
  generateTopicSuggestions,
  rewriteBlogDraft
} from "@/lib/openai";
import {
  deriveExistingTopics,
  formatExistingTopicsForPrompt,
  formatRejectedTopicsForPrompt,
  validateTopicCandidates
} from "@/lib/topic-dedup";
import type { BlogQuality, BrandAnalysis, TopicSuggestion, WorkflowInput, WorkflowStep } from "@/lib/types";
import { NextResponse } from "next/server";
import {
  createRun,
  loadRun,
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

type RequestBody = {
  step: WorkflowStep;
  runId?: string;
  comments?: string;
  approved?: boolean;
  markdown?: string;
  payload?: WorkflowInput & {
    analysis?: BrandAnalysis;
    selectedTopic?: TopicSuggestion;
  };
};

function formatResearchBlock(input: WorkflowInput, homepageText: string, blogText: string) {
  return [
    `Company name hint: ${input.companyName || "Not provided"}`,
    `Vision hint: ${input.vision || "Not provided"}`,
    `Priority keywords: ${input.keywords || "Not provided"}`,
    "",
    "Homepage research:",
    homepageText,
    "",
    "Blog research:",
    blogText
  ].join("\n");
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
    formatResearchBlock(params.input, params.homepageText, params.blogText)
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

  await saveBlog(params.runId, params.blog);
  const qualityPayload: BlogQuality = {
    score: quality.score,
    publishStatus: quality.score >= 80 ? "publish_ready" : "needs_review",
    evaluation: quality.evaluation,
    issues: quality.issues,
    rewriteAttempts: params.rewriteAttempts,
    notes: quality.notes
  };
  await saveQuality(params.runId, qualityPayload);

  if (params.comments) {
    await saveBlogRevision(params.runId, {
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

  const existingTopics = run.existingTopics?.existingTopics ?? deriveExistingTopics(run.research.homepage, run.research.blogs);
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
      "Return only new topics.",
      "",
      `Existing coverage:\n${coverageBlock}`,
      "",
      `Already accepted topics:\n${acceptedTopics.length ? acceptedTopics.map((topic, index) => `${index + 1}. ${topic.title} | ${topic.primaryKeyword}`).join("\n") : "None yet."}`,
      "",
      `Brand analysis:\n${JSON.stringify(run.analysis.analysis, null, 2)}`,
      "",
      formatResearchBlock(run.input, homepageText, blogText)
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
      await setProgress(runId, "analyze", 40, "Deriving existing blog coverage");
      const existingTopics = deriveExistingTopics(research.homepage, research.blogs);
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
        "Respond using the provided JSON schema.",
        "",
        formatResearchBlock(payload, homepageText, blogText)
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

      await setProgress(runId, "generate-blog", 10, "Assembling blog prompt");
      const homepageText = `URL: ${run.research.homepage.url}\nTitle: ${run.research.homepage.title}\nExcerpt: ${run.research.homepage.excerpt}\nContent:\n${run.research.homepage.content}`;
      const blogText = run.research.blogs
        .map(
          (blog, index) =>
            `Blog ${index + 1}\nURL: ${blog.url}\nTitle: ${blog.title}\nExcerpt: ${blog.excerpt}\nContent:\n${blog.content}`
        )
        .join("\n\n");

      await saveApprovedTopic(runId, payload.selectedTopic);

      const blogPrompt = formatBlogStructurePrompt({
        topic: payload.selectedTopic,
        analysis: run.analysis.analysis,
        input: run.input,
        homepageText,
        blogText,
        internalLinkHints: formatInternalLinkHints(run)
      });

      await setProgress(runId, "generate-blog", 35, "Drafting article and SEO assets");
      let blog = await generateApprovedBlog(blogPrompt);
      await setProgress(runId, "generate-blog", 60, "Running quality review");
      let quality = await evaluateBlogQuality(
        formatBlogQualityPrompt({
          blog,
          analysis: run.analysis.analysis,
          topic: payload.selectedTopic
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
            topic: payload.selectedTopic,
            attempt: attempts
          })
        );
        await setProgress(runId, "generate-blog", 82 + attempts * 4, "Rechecking quality");
        quality = await evaluateBlogQuality(
          formatBlogQualityPrompt({
            blog,
            analysis: run.analysis.analysis,
            topic: payload.selectedTopic
          })
        );
      }

      const qualityStatus = await scoreAndPersistBlog({
        runId,
        run,
        blog,
        topic: payload.selectedTopic,
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
        rewriteAttempts: attempts,
        comments
      });
      await setProgress(runId, "regenerate-blog", 100, "Regeneration complete", true);

      await saveRegenerationNote(runId, {
        revisionId,
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

      if (approved && (score === null || score < 80)) {
        return NextResponse.json(
          { error: "The blog must pass the quality gate before it can be approved." },
          { status: 400 }
        );
      }

      await setProgress(runId, "approve-blog", 25, "Recording approval decision");
      const publishStatus = approved ? "approved" : "needs_review";
      await saveApproval(runId, {
        approved,
        notes,
        score,
        publishStatus
      });
      await updateManifest(runId, {
        status: approved ? "approved" : "needs_review",
        steps: { blog: true }
      });
      await setProgress(runId, "approve-blog", 100, approved ? "Approved" : "Marked for revision", true);

      return NextResponse.json({
        runId,
        approved,
        status: publishStatus,
        score
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
