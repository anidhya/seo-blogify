import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  approvedArticleSchema,
  approvedArticlesSchema,
  brandAnalysisSchema,
  blogApprovalSchema,
  blogQualitySchema,
  blogRevisionSchema,
  existingTopicSchema,
  generatedBlogSchema,
  manifestSchema,
  pageSnapshotSchema,
  researchSchema,
  topicSuggestionSchema,
  topicValidationSchema,
  regenerationNoteSchema,
  workflowProgressSchema,
  topicListSchema,
  workflowInputSchema
} from "@/lib/schemas";
import type {
  BrandAnalysis,
  ApprovedArticle,
  BlogRevision,
  BlogQuality,
  BlogApproval,
  ExistingTopic,
  GeneratedBlog,
  PageSnapshot,
  RegenerationNote,
  RunSummary,
  TopicSuggestion,
  TopicValidation,
  WorkflowProgress,
  WorkflowInput
} from "@/lib/types";

const DATA_ROOT = path.join(process.cwd(), "data", "runs");
const SCHEMA_VERSION = "1" as const;

type RunManifest = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  model: string;
  createdAt: string;
  updatedAt: string;
  status: "created" | "analyzed" | "topics" | "approved" | "publish_ready" | "needs_review";
  progress?: WorkflowProgress;
  steps: {
    input: boolean;
    research: boolean;
    analysis: boolean;
    topics: boolean;
    approvedTopic: boolean;
    blog: boolean;
  };
};

export type RunInputRecord = WorkflowInput & {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
};

export type RunResearchRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  homepage: PageSnapshot;
  blogs: PageSnapshot[];
  sitemapUrls: string[];
  sitemapBlogUrls: string[];
  resolvedSitemapUrl: string | null;
};

export type RunExistingTopicsRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  existingTopics: ExistingTopic[];
};

export type RunAnalysisRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  analysis: BrandAnalysis;
};

export type RunTopicsRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  topics: TopicSuggestion[];
};

export type RunTopicCandidatesRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  topics: TopicSuggestion[];
};

export type RunTopicValidationRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  validation: TopicValidation;
};

export type RunApprovedTopicRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  approvedTopic: TopicSuggestion;
};

export type RunBlogRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  blog: GeneratedBlog;
};

export type RunQualityRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  quality: BlogQuality;
};

export type RunRevisionsRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  revisions: BlogRevision[];
};

export type RunApprovalsRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  approvals: BlogApproval[];
};

export type RunApprovedArticlesRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  articles: ApprovedArticle[];
};

export type RunRegenerationNotesRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  notes: RegenerationNote[];
};

export type RunBundle = {
  manifest: RunManifest | null;
  input: RunInputRecord | null;
  research: RunResearchRecord | null;
  existingTopics: RunExistingTopicsRecord | null;
  analysis: RunAnalysisRecord | null;
  topicCandidates: RunTopicCandidatesRecord | null;
  topics: RunTopicsRecord | null;
  topicValidation: RunTopicValidationRecord | null;
  approvedTopic: RunApprovedTopicRecord | null;
  blog: RunBlogRecord | null;
  quality: RunQualityRecord | null;
  revisions: RunRevisionsRecord | null;
  approvals: RunApprovalsRecord | null;
  approvedArticles: RunApprovedArticlesRecord | null;
  regenerationNotes: RunRegenerationNotesRecord | null;
};

function runDir(runId: string) {
  return path.join(DATA_ROOT, runId);
}

function filePath(runId: string, fileName: string) {
  return path.join(runDir(runId), fileName);
}

async function ensureRunDir(runId: string) {
  await mkdir(runDir(runId), { recursive: true });
}

async function writeJson(runId: string, fileName: string, value: unknown) {
  await ensureRunDir(runId);
  await writeFile(filePath(runId, fileName), JSON.stringify(value, null, 2), "utf8");
}

async function readJson<T>(runId: string, fileName: string): Promise<T | null> {
  try {
    const content = await readFile(filePath(runId, fileName), "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function countWords(markdown: string) {
  return markdown
    .replace(/[`*_>#\-]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

async function upsertApprovedArticle(
  runId: string,
  article: Omit<ApprovedArticle, "articleId" | "createdAt" | "updatedAt" | "feedbackCount"> & {
    articleId?: string;
    createdAt?: string;
    updatedAt?: string;
    feedbackCount?: number;
  }
) {
  const current = (await readJson<RunApprovedArticlesRecord>(runId, "approved-articles.json")) ?? {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    articles: []
  };

  const timestamp = nowIso();
  const existingArticle = current.articles.find((entry) => entry.articleSlug === article.articleSlug);
  const nextArticle = approvedArticleSchema.parse({
    articleId: article.articleId ?? article.articleSlug,
    articleSlug: article.articleSlug,
    createdAt: article.createdAt ?? timestamp,
    updatedAt: article.updatedAt ?? timestamp,
    topic: article.topic,
    blog: article.blog,
    quality: article.quality,
    wordCount: article.wordCount,
    approvalStatus: article.approvalStatus,
    feedbackCount: article.feedbackCount ?? existingArticle?.feedbackCount ?? 0
  });

  const record: RunApprovedArticlesRecord = approvedArticlesSchema.parse({
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: current.createdAt,
    updatedAt: timestamp,
    articles: [...current.articles.filter((entry) => entry.articleSlug !== nextArticle.articleSlug), nextArticle]
  });

  await writeJson(runId, "approved-articles.json", record);
  return record;
}

export function createRunId(companyName?: string) {
  const slug = (companyName || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${new Date().toISOString().slice(0, 10)}_${slug || "brand"}_${randomUUID().slice(0, 8)}`;
}

export async function createRun(input: WorkflowInput, model: string) {
  const runId = createRunId(input.companyName);
  const timestamp = nowIso();

  const inputRecord: RunInputRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...workflowInputSchema.parse(input)
  };

  const manifest: RunManifest = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    model,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "created",
    progress: {
      action: null,
      percent: 0,
      stageLabel: "Queued",
      updatedAt: timestamp,
      isComplete: false
    },
    steps: {
      input: true,
      research: false,
      analysis: false,
      topics: false,
      approvedTopic: false,
      blog: false
    }
  };

  await writeJson(runId, "input.json", inputRecord);
  await writeJson(runId, "manifest.json", manifest);

  return { runId, input: inputRecord, manifest };
}

export async function saveResearch(
  runId: string,
  research: {
    homepage: PageSnapshot;
    blogs: PageSnapshot[];
    sitemapUrls?: string[];
    sitemapBlogUrls?: string[];
    resolvedSitemapUrl?: string | null;
  }
) {
  const timestamp = nowIso();
  const record: RunResearchRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    homepage: pageSnapshotSchema.parse(research.homepage),
    blogs: research.blogs.map((page) => pageSnapshotSchema.parse(page)),
    sitemapUrls: Array.from(new Set((research.sitemapUrls ?? []).filter(Boolean))),
    sitemapBlogUrls: Array.from(new Set((research.sitemapBlogUrls ?? []).filter(Boolean))),
    resolvedSitemapUrl: research.resolvedSitemapUrl ?? null
  };

  await writeJson(runId, "research.json", record);
  return record;
}

export async function saveExistingTopics(runId: string, existingTopics: ExistingTopic[]) {
  const timestamp = nowIso();
  const record: RunExistingTopicsRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    existingTopics: existingTopicSchema.array().parse(existingTopics)
  };

  await writeJson(runId, "existing-topics.json", record);
  return record;
}

export async function saveAnalysis(runId: string, analysis: BrandAnalysis) {
  const timestamp = nowIso();
  const record: RunAnalysisRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    analysis: brandAnalysisSchema.parse(analysis)
  };

  await writeJson(runId, "analysis.json", record);
  return record;
}

export async function saveTopics(runId: string, topics: TopicSuggestion[]) {
  const timestamp = nowIso();
  const record: RunTopicsRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    topics: topicListSchema.parse(topics)
  };

  await writeJson(runId, "topics.json", record);
  return record;
}

export async function saveTopicCandidates(runId: string, topics: TopicSuggestion[]) {
  const timestamp = nowIso();
  const record: RunTopicCandidatesRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    topics: topicListSchema.parse(topics)
  };

  await writeJson(runId, "topic-candidates.json", record);
  return record;
}

export async function saveTopicValidation(runId: string, validation: TopicValidation) {
  const timestamp = nowIso();
  const record: RunTopicValidationRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    validation: topicValidationSchema.parse(validation)
  };

  await writeJson(runId, "topic-validation.json", record);
  return record;
}

export async function saveApprovedTopic(runId: string, approvedTopic: TopicSuggestion) {
  const timestamp = nowIso();
  const record: RunApprovedTopicRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    approvedTopic: topicSuggestionSchema.parse(approvedTopic)
  };

  await writeJson(runId, "approved-topic.json", record);
  return record;
}

export async function saveBlog(runId: string, blog: GeneratedBlog) {
  const timestamp = nowIso();
  const record: RunBlogRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    wordCount: countWords(blog.markdown),
    blog: generatedBlogSchema.parse(blog)
  };

  await writeJson(runId, "blog.json", record);
  await writeFile(filePath(runId, "blog.md"), blog.markdown, "utf8");
  return record;
}

export async function saveQuality(runId: string, quality: BlogQuality) {
  const timestamp = nowIso();
  const record: RunQualityRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    quality: blogQualitySchema.parse(quality)
  };

  await writeJson(runId, "quality.json", record);
  return record;
}

export async function loadRevisions(runId: string) {
  return readJson<RunRevisionsRecord>(runId, "blog-revisions.json");
}

export async function saveBlogRevision(
  runId: string,
  revision: Omit<BlogRevision, "revisionId" | "createdAt"> & { revisionId?: string; createdAt?: string }
) {
  const current = (await readJson<RunRevisionsRecord>(runId, "blog-revisions.json")) ?? {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    revisions: []
  };

  const record: RunRevisionsRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
    revisions: [
      ...current.revisions,
      blogRevisionSchema.parse({
        revisionId: revision.revisionId ?? `rev-${randomUUID().slice(0, 8)}`,
        articleSlug: revision.articleSlug,
        createdAt: revision.createdAt ?? nowIso(),
        comments: revision.comments,
        blog: revision.blog,
        quality: revision.quality
      })
    ]
  };

  await writeJson(runId, "blog-revisions.json", record);
  return record;
}

export async function saveRegenerationNote(runId: string, note: RegenerationNote) {
  const current = (await readJson<RunRegenerationNotesRecord>(runId, "regeneration-notes.json")) ?? {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    notes: []
  };

  const record: RunRegenerationNotesRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
    notes: [
      ...current.notes,
      regenerationNoteSchema.parse(note)
    ]
  };

  await writeJson(runId, "regeneration-notes.json", record);
  return record;
}

export async function saveApproval(
  runId: string,
  approval: Omit<BlogApproval, "approvalId" | "createdAt"> & { approvalId?: string; createdAt?: string }
) {
  const current = (await readJson<RunApprovalsRecord>(runId, "approvals.json")) ?? {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    approvals: []
  };

  const record: RunApprovalsRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
    approvals: [
      ...current.approvals,
      blogApprovalSchema.parse({
        approvalId: approval.approvalId ?? `approval-${randomUUID().slice(0, 8)}`,
        articleSlug: approval.articleSlug,
        createdAt: approval.createdAt ?? nowIso(),
        approved: approval.approved,
        notes: approval.notes,
        score: approval.score,
        publishStatus: approval.publishStatus
      })
    ]
  };

  await writeJson(runId, "approvals.json", record);
  return record;
}

export async function saveApprovedArticle(
  runId: string,
  article: Omit<ApprovedArticle, "articleId" | "createdAt" | "updatedAt" | "feedbackCount"> & {
    articleId?: string;
    createdAt?: string;
    updatedAt?: string;
    feedbackCount?: number;
  }
) {
  return upsertApprovedArticle(runId, article);
}

export async function updateManifest(
  runId: string,
  patch: Partial<Omit<RunManifest, "runId" | "schemaVersion" | "createdAt" | "steps">> & {
    steps?: Partial<RunManifest["steps"]>;
  }
) {
  const current = await readJson<RunManifest>(runId, "manifest.json");
  const timestamp = nowIso();
  const manifest: RunManifest = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    model: patch.model ?? current?.model ?? "gpt-5.4-mini",
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
    status: patch.status ?? current?.status ?? "created",
    progress: patch.progress
      ? workflowProgressSchema.parse(patch.progress)
      : current?.progress
        ? workflowProgressSchema.parse(current.progress)
        : undefined,
    steps: {
      input: current?.steps.input ?? false,
      research: current?.steps.research ?? false,
      analysis: current?.steps.analysis ?? false,
      topics: current?.steps.topics ?? false,
      approvedTopic: current?.steps.approvedTopic ?? false,
      blog: current?.steps.blog ?? false,
      ...patch.steps
    }
  };

  const parsed = manifestSchema.parse(manifest);
  await writeJson(runId, "manifest.json", parsed);
  return parsed;
}

export async function loadRun(runId: string): Promise<RunBundle> {
  const manifest = await readJson<RunManifest>(runId, "manifest.json");
  const input = await readJson<RunInputRecord>(runId, "input.json");
  const research = await readJson<RunResearchRecord>(runId, "research.json");
  const analysis = await readJson<RunAnalysisRecord>(runId, "analysis.json");
  const existingTopics = await readJson<RunExistingTopicsRecord>(runId, "existing-topics.json");
  const topicCandidates = await readJson<RunTopicCandidatesRecord>(runId, "topic-candidates.json");
  const topics = await readJson<RunTopicsRecord>(runId, "topics.json");
  const topicValidation = await readJson<RunTopicValidationRecord>(runId, "topic-validation.json");
  const approvedTopic = await readJson<RunApprovedTopicRecord>(runId, "approved-topic.json");
  const blog = await readJson<RunBlogRecord>(runId, "blog.json");
  const quality = await readJson<RunQualityRecord>(runId, "quality.json");
  const revisions = await readJson<RunRevisionsRecord>(runId, "blog-revisions.json");
  const approvals = await readJson<RunApprovalsRecord>(runId, "approvals.json");
  const approvedArticlesRaw = await readJson<RunApprovedArticlesRecord>(runId, "approved-articles.json");
  const regenerationNotes = await readJson<RunRegenerationNotesRecord>(runId, "regeneration-notes.json");

  return {
    manifest,
    input,
    research,
    existingTopics,
    analysis,
    topicCandidates,
    topics,
    topicValidation,
    approvedTopic,
    blog,
    quality,
    revisions,
    approvals,
    approvedArticles: approvedArticlesRaw ? approvedArticlesSchema.parse(approvedArticlesRaw) : null,
    regenerationNotes
  };
}

export async function listRunSummaries(): Promise<RunSummary[]> {
  const runIds = await listRuns();
  const runs = await Promise.all(runIds.map((runId) => loadRun(runId)));

  return runs
    .map((run) => {
      const runId = run.manifest?.runId ?? run.input?.runId ?? "";
      return {
        runId,
        companyName: run.input?.companyName || "Untitled brand",
        websiteUrl: run.input?.websiteUrl || "",
        updatedAt: run.manifest?.updatedAt || run.input?.updatedAt || "",
        status: run.manifest?.status || "created",
        hasBlog: Boolean(run.blog?.blog),
        blogTitle: run.blog?.blog.title ?? null,
        blogSlug: run.blog?.blog.slug ?? null,
        qualityScore: run.quality?.quality.score ?? null,
        publishStatus: run.quality?.quality.publishStatus ?? null,
        progressPercent: run.manifest?.progress?.percent ?? null,
        progressLabel: run.manifest?.progress?.stageLabel ?? null
      };
    })
    .filter((run) => Boolean(run.runId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listRuns() {
  try {
    const entries = await readdir(DATA_ROOT, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}
