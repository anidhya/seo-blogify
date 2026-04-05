import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del as deleteBlob, get as getBlob, list as listBlobs, put as putBlob } from "@vercel/blob";
import {
  approvedArticleSchema,
  approvedArticlesSchema,
  brandAnalysisSchema,
  blogApprovalSchema,
  blogQualitySchema,
  blogRevisionSchema,
  existingTopicSchema,
  generatedBlogSchema,
  linkedInApprovalSchema,
  linkedInConnectionSchema,
  linkedInDraftSchema,
  linkedInPublicationSchema,
  linkedInRecordSchema,
  linkedInArticlesRecordSchema,
  linkedInScheduleSchema,
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
  WorkflowInput,
  LinkedInApproval,
  LinkedInConnection,
  LinkedInDraft,
  LinkedInPublication,
  LinkedInRecord,
  LinkedInArticlesRecord,
  LinkedInSchedule
} from "@/lib/types";

const STORAGE_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : process.env.VERCEL === "1"
    ? path.join("/tmp", "blogify-data")
    : path.join(process.cwd(), "data");
const DATA_ROOT = path.join(STORAGE_ROOT, "runs");
const LINKEDIN_ROOT = path.join(STORAGE_ROOT, "linkedin");
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const USE_BLOB_STORAGE = Boolean(BLOB_TOKEN);
const SCHEMA_VERSION = "1" as const;

type LinkedInOAuthState = {
  state: string;
  runId: string;
  articleSlug: string;
  createdAt: string;
  expiresAt: string;
  redirectUri: string;
};

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
    linkedin: boolean;
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

export type RunLinkedInArticlesRecord = LinkedInArticlesRecord;

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
  linkedin: RunLinkedInArticlesRecord | null;
};

function runDir(runId: string) {
  return path.join(DATA_ROOT, runId);
}

function filePath(runId: string, fileName: string) {
  return path.join(runDir(runId), fileName);
}

function blobPath(...segments: string[]) {
  return path.posix.join(...segments);
}

function blobOptions() {
  return BLOB_TOKEN ? { token: BLOB_TOKEN } : {};
}

async function ensureRunDir(runId: string) {
  await mkdir(runDir(runId), { recursive: true });
}

async function writeJson(runId: string, fileName: string, value: unknown) {
  const payload = JSON.stringify(value, null, 2);

  if (USE_BLOB_STORAGE) {
    await putBlob(blobPath("runs", runId, fileName), payload, {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      ...blobOptions()
    });
    return;
  }

  await ensureRunDir(runId);
  await writeFile(filePath(runId, fileName), payload, "utf8");
}

async function readJson<T>(runId: string, fileName: string): Promise<T | null> {
  if (USE_BLOB_STORAGE) {
    try {
      const blob = await getBlob(blobPath("runs", runId, fileName), {
        access: "private",
        useCache: false,
        ...blobOptions()
      });

      if (!blob || blob.statusCode !== 200 || !blob.stream) {
        return null;
      }

      const content = await new Response(blob.stream).text();
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

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

async function ensureLinkedInDir() {
  await mkdir(LINKEDIN_ROOT, { recursive: true });
}

async function writeLinkedInJson(fileName: string, value: unknown) {
  const payload = JSON.stringify(value, null, 2);

  if (USE_BLOB_STORAGE) {
    await putBlob(blobPath("linkedin", fileName), payload, {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      ...blobOptions()
    });
    return;
  }

  await ensureLinkedInDir();
  await writeFile(path.join(LINKEDIN_ROOT, fileName), payload, "utf8");
}

async function readLinkedInJson<T>(fileName: string): Promise<T | null> {
  if (USE_BLOB_STORAGE) {
    try {
      const blob = await getBlob(blobPath("linkedin", fileName), {
        access: "private",
        useCache: false,
        ...blobOptions()
      });

      if (!blob || blob.statusCode !== 200 || !blob.stream) {
        return null;
      }

      const content = await new Response(blob.stream).text();
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  try {
    const content = await readFile(path.join(LINKEDIN_ROOT, fileName), "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeTextFile(runId: string, fileName: string, value: string) {
  if (USE_BLOB_STORAGE) {
    await putBlob(blobPath("runs", runId, fileName), value, {
      access: "private",
      allowOverwrite: true,
      contentType: "text/markdown; charset=utf-8",
      ...blobOptions()
    });
    return;
  }

  await ensureRunDir(runId);
  await writeFile(filePath(runId, fileName), value, "utf8");
}

async function listRunIdsFromBlobs() {
  const runIds = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await listBlobs({
      prefix: "runs/",
      mode: "expanded",
      cursor,
      ...blobOptions()
    });

    for (const blob of page.blobs) {
      const [, runId] = blob.pathname.split("/");
      if (runId) {
        runIds.add(runId);
      }
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return Array.from(runIds);
}

async function deleteRunBlobs(runId: string) {
  const paths: string[] = [];
  let cursor: string | undefined;
  const prefix = blobPath("runs", runId) + "/";

  do {
    const page = await listBlobs({
      prefix,
      mode: "expanded",
      cursor,
      ...blobOptions()
    });

    paths.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (paths.length) {
    await deleteBlob(paths, blobOptions());
  }
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
      blog: false,
      linkedin: false
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
  await writeTextFile(runId, "blog.md", blog.markdown);
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

async function upsertLinkedInArticlesRecord(
  runId: string,
  articleSlug: string,
  patch: Partial<LinkedInRecord>
) {
  const current = (await readJson<RunLinkedInArticlesRecord>(runId, "linkedin.json")) ?? {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    articles: []
  };

  const existingArticle =
    current.articles.find((entry) => entry.articleSlug === articleSlug) ??
    ({
      articleSlug,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      draft: null,
      connection: null,
      approvals: [],
      schedule: null,
      publication: null
    } satisfies LinkedInRecord);

  const nextArticle: LinkedInRecord = linkedInRecordSchema.parse({
    articleSlug,
    createdAt: existingArticle.createdAt,
    updatedAt: nowIso(),
    draft: patch.draft ?? existingArticle.draft,
    connection: patch.connection ?? existingArticle.connection,
    approvals: patch.approvals ?? existingArticle.approvals,
    schedule: patch.schedule ?? existingArticle.schedule,
    publication: patch.publication ?? existingArticle.publication
  });

  const record: RunLinkedInArticlesRecord = linkedInArticlesRecordSchema.parse({
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
    articles: [...current.articles.filter((entry) => entry.articleSlug !== articleSlug), nextArticle]
  });

  await writeJson(runId, "linkedin.json", record);
  return record;
}

export async function saveLinkedInDraft(runId: string, draft: LinkedInDraft) {
  return upsertLinkedInArticlesRecord(runId, draft.articleSlug, { draft });
}

export async function saveLinkedInConnection(runId: string, articleSlug: string, connection: LinkedInConnection) {
  return upsertLinkedInArticlesRecord(runId, articleSlug, {
    connection: linkedInConnectionSchema.parse(connection)
  });
}

export async function saveLinkedInApproval(runId: string, articleSlug: string, approval: LinkedInApproval) {
  const current = await readJson<RunLinkedInArticlesRecord>(runId, "linkedin.json");
  const existing = current?.articles.find((entry) => entry.articleSlug === articleSlug);
  const approvals = [
    ...(existing?.approvals ?? []).filter((entry) => entry.approvalId !== approval.approvalId),
    linkedInApprovalSchema.parse(approval)
  ];

  return upsertLinkedInArticlesRecord(runId, articleSlug, {
    approvals,
    draft: existing?.draft
      ? {
          ...existing.draft,
          reviewStatus: approval.approved ? "approved" : "needs_revision",
          publishStatus: approval.approved ? "ready" : existing.draft.publishStatus
        }
      : null
  });
}

export async function saveLinkedInSchedule(runId: string, articleSlug: string, schedule: LinkedInSchedule) {
  const current = await readJson<RunLinkedInArticlesRecord>(runId, "linkedin.json");
  const existing = current?.articles.find((entry) => entry.articleSlug === articleSlug);

  return upsertLinkedInArticlesRecord(runId, articleSlug, {
    schedule: linkedInScheduleSchema.parse(schedule),
    draft: existing?.draft
      ? {
          ...existing.draft,
          publishStatus: "scheduled"
        }
      : null
  });
}

export async function saveLinkedInPublication(runId: string, articleSlug: string, publication: LinkedInPublication) {
  const current = await readJson<RunLinkedInArticlesRecord>(runId, "linkedin.json");
  const existing = current?.articles.find((entry) => entry.articleSlug === articleSlug);

  return upsertLinkedInArticlesRecord(runId, articleSlug, {
    publication: linkedInPublicationSchema.parse(publication),
    draft: existing?.draft
      ? {
          ...existing.draft,
          publishStatus: publication.status === "published" ? "published" : existing.draft.publishStatus
        }
      : null
  });
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
      linkedin: current?.steps.linkedin ?? false,
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
  const linkedin = await readJson<RunLinkedInArticlesRecord>(runId, "linkedin.json");

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
    regenerationNotes,
    linkedin: linkedin ? linkedInArticlesRecordSchema.parse(linkedin) : null
  };
}

export async function saveLinkedInOAuthState(state: LinkedInOAuthState) {
  const current = (await readLinkedInJson<{ states: LinkedInOAuthState[] }>("oauth-states.json")) ?? {
    states: []
  };

  const record = {
    states: [...current.states.filter((entry) => entry.state !== state.state), state]
  };

  await writeLinkedInJson("oauth-states.json", record);
  return record;
}

export async function loadLinkedInOAuthState(state: string) {
  const current = await readLinkedInJson<{ states: LinkedInOAuthState[] }>("oauth-states.json");
  return current?.states.find((entry) => entry.state === state) ?? null;
}

export async function deleteLinkedInOAuthState(state: string) {
  const current = await readLinkedInJson<{ states: LinkedInOAuthState[] }>("oauth-states.json");
  if (!current) {
    return null;
  }

  const next = { states: current.states.filter((entry) => entry.state !== state) };
  await writeLinkedInJson("oauth-states.json", next);
  return next;
}

export async function deleteLinkedInOAuthStatesForRun(runId: string) {
  const current = await readLinkedInJson<{ states: LinkedInOAuthState[] }>("oauth-states.json");
  if (!current) {
    return null;
  }

  const next = { states: current.states.filter((entry) => entry.runId !== runId) };
  await writeLinkedInJson("oauth-states.json", next);
  return next;
}

export async function deleteRun(runId: string) {
  await deleteLinkedInOAuthStatesForRun(runId);
  if (USE_BLOB_STORAGE) {
    await deleteRunBlobs(runId);
  } else {
    await rm(runDir(runId), { recursive: true, force: true });
  }
  return true;
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
  if (USE_BLOB_STORAGE) {
    return listRunIdsFromBlobs();
  }

  try {
    const entries = await readdir(DATA_ROOT, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}
