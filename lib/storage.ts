import { randomUUID } from "node:crypto";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { del as deleteBlob, list as listBlobs } from "@vercel/blob";
import type { TransactionSql } from "postgres";
import { getDb } from "@/lib/db/client";
import {
  brandGuidelineFileSchema,
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
  socialConnectionSchema,
  socialProjectSchema,
  socialOAuthStateSchema,
  manifestSchema,
  pageSnapshotSchema,
  topicResearchSchema,
  topicSuggestionSchema,
  topicValidationSchema,
  regenerationNoteSchema,
  workflowProgressSchema,
  topicListSchema,
  workflowInputSchema,
  runBrandGuidelinesSchema
} from "@/lib/schemas";
import { ensureTopicKeywordCluster } from "@/lib/keyword-clusters";
import type {
  BrandAnalysis,
  BrandGuidelineFile,
  BrandGuidelinesSnapshot,
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
  LinkedInSchedule,
  SocialConnection,
  SocialPlatform,
  SocialProject,
  SocialOAuthState,
  RunBrandGuidelines,
  SocialProjectSummary
} from "@/lib/types";

const STORAGE_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : process.env.VERCEL === "1"
    ? path.join("/tmp", "blogify-data")
    : path.join(process.cwd(), "data");
const DATA_ROOT = path.join(STORAGE_ROOT, "runs");
const SOCIAL_ROOT = path.join(STORAGE_ROOT, "social");
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const USE_BLOB_STORAGE = Boolean(BLOB_TOKEN);
const SCHEMA_VERSION = "1" as const;
const DEFAULT_ORGANIZATION_ID = "workspace-default";
const DEFAULT_ORGANIZATION_SLUG = "workspace";
const BRAND_GUIDELINE_DOCUMENT_SOURCE_TYPE = "guideline_snapshot";
const RUN_BRAND_GUIDELINES_ARTIFACT_TYPE = "brand-guidelines";
const RUN_RESEARCH_ARTIFACT_TYPE = "research";
const RUN_EXISTING_TOPICS_ARTIFACT_TYPE = "existing-topics";
const RUN_ANALYSIS_ARTIFACT_TYPE = "analysis";
const RUN_TOPICS_ARTIFACT_TYPE = "topics";
const RUN_TOPIC_CANDIDATES_ARTIFACT_TYPE = "topic-candidates";
const RUN_TOPIC_VALIDATION_ARTIFACT_TYPE = "topic-validation";
const RUN_TOPIC_RESEARCH_ARTIFACT_TYPE = "topic-research";
const RUN_APPROVED_TOPIC_ARTIFACT_TYPE = "approved-topic";
const RUN_BLOG_ARTIFACT_TYPE = "blog";
const RUN_QUALITY_ARTIFACT_TYPE = "quality";
const RUN_REVISIONS_ARTIFACT_TYPE = "blog-revisions";
const RUN_APPROVALS_ARTIFACT_TYPE = "approvals";
const RUN_APPROVED_ARTICLES_ARTIFACT_TYPE = "approved-articles";
const RUN_REGENERATION_NOTES_ARTIFACT_TYPE = "regeneration-notes";
const RUN_LINKEDIN_ARTIFACT_TYPE = "linkedin";

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

export type RunTopicResearchRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  source: "dataforseo";
  evidence: string;
};

export type RunApprovedTopicRecord = {
  runId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  approvedTopic: TopicSuggestion;
};

export type RunBrandGuidelinesRecord = RunBrandGuidelines & {
  schemaVersion: typeof SCHEMA_VERSION;
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
  topicResearch: RunTopicResearchRecord | null;
  approvedTopic: RunApprovedTopicRecord | null;
  blog: RunBlogRecord | null;
  quality: RunQualityRecord | null;
  revisions: RunRevisionsRecord | null;
  approvals: RunApprovalsRecord | null;
  approvedArticles: RunApprovedArticlesRecord | null;
  regenerationNotes: RunRegenerationNotesRecord | null;
  linkedin: RunLinkedInArticlesRecord | null;
  brandGuidelines: RunBrandGuidelinesRecord | null;
};

function runDir(runId: string) {
  return path.join(DATA_ROOT, runId);
}

function blobPath(...segments: string[]) {
  return path.posix.join(...segments);
}

function blobOptions() {
  return BLOB_TOKEN ? { token: BLOB_TOKEN } : {};
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDbJson<T>(value: T | string | null | undefined): T | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return value;
}

function normalizeManifest(manifest: unknown) {
  const payload = normalizeDbJson(manifest);
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as Record<string, unknown>;
  const steps = (value.steps && typeof value.steps === "object" ? value.steps : {}) as Record<string, unknown>;

  const candidate = {
    ...value,
    steps: {
      input: Boolean(steps.input ?? false),
      research: Boolean(steps.research ?? false),
      analysis: Boolean(steps.analysis ?? false),
      topics: Boolean(steps.topics ?? false),
      approvedTopic: Boolean(steps.approvedTopic ?? false),
      blog: Boolean(steps.blog ?? false),
      linkedin: Boolean(steps.linkedin ?? false)
    }
  };

  const parsed = manifestSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function normalizeArtifactRecord<T>(value: unknown) {
  const payload = normalizeDbJson(value);
  return payload as T | null;
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function brandIdForDomain(domain: string) {
  return `brand_${normalizeDomain(domain).replace(/[^a-z0-9]+/g, "_")}`;
}

function brandDocumentIdForSnapshot(snapshotId: string) {
  return `branddoc_${snapshotId}`;
}

function runBrandGuidelinesArtifactId(runId: string) {
  return `brand_guidelines_${runId}`;
}

function normalizeArtifactTypeKey(artifactType: string) {
  const aliasMap: Record<string, string> = {
    "analysis.json": RUN_ANALYSIS_ARTIFACT_TYPE,
    "approved-articles.json": RUN_APPROVED_ARTICLES_ARTIFACT_TYPE,
    "approved-topic.json": RUN_APPROVED_TOPIC_ARTIFACT_TYPE,
    "approvals.json": RUN_APPROVALS_ARTIFACT_TYPE,
    "blog-revisions.json": RUN_REVISIONS_ARTIFACT_TYPE,
    "blog.json": RUN_BLOG_ARTIFACT_TYPE,
    "brand-guidelines.json": RUN_BRAND_GUIDELINES_ARTIFACT_TYPE,
    "existing-topics.json": RUN_EXISTING_TOPICS_ARTIFACT_TYPE,
    "linkedin.json": RUN_LINKEDIN_ARTIFACT_TYPE,
    "quality.json": RUN_QUALITY_ARTIFACT_TYPE,
    "regeneration-notes.json": RUN_REGENERATION_NOTES_ARTIFACT_TYPE,
    "research.json": RUN_RESEARCH_ARTIFACT_TYPE,
    "topic-candidates.json": RUN_TOPIC_CANDIDATES_ARTIFACT_TYPE,
    "topic-research.json": RUN_TOPIC_RESEARCH_ARTIFACT_TYPE,
    "topic-validation.json": RUN_TOPIC_VALIDATION_ARTIFACT_TYPE,
    "topics.json": RUN_TOPICS_ARTIFACT_TYPE
  };

  return aliasMap[artifactType] ?? (artifactType.endsWith(".json") ? artifactType.slice(0, -5) : artifactType);
}

async function ensureDefaultOrganization() {
  const db = getDb();
  if (!db) {
    return;
  }

  await db`
    insert into organizations (id, slug, name, owner_user_id, created_at, updated_at)
    values (${DEFAULT_ORGANIZATION_ID}, ${DEFAULT_ORGANIZATION_SLUG}, ${"Workspace"}, null, ${nowIso()}, ${nowIso()})
    on conflict (id) do update set
      slug = excluded.slug,
      name = excluded.name,
      updated_at = excluded.updated_at
  `;
}

async function loadLatestBrandGuidelinesFromDb(domain: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const normalizedDomain = normalizeDomain(domain);
  const rows = await db`
    select doc.snapshot
    from brands b
    join lateral (
      select snapshot
      from brand_documents
      where brand_id = b.id
        and source_type = ${BRAND_GUIDELINE_DOCUMENT_SOURCE_TYPE}
      order by updated_at desc, created_at desc
      limit 1
    ) doc on true
    where b.domain = ${normalizedDomain}
    limit 1
  `;

  const snapshot = normalizeDbJson(rows[0]?.snapshot) ?? null;
  return snapshot ? runBrandGuidelinesSchema.parse(snapshot) : null;
}

async function saveBrandGuidelinesSnapshotToDb(record: RunBrandGuidelinesRecord) {
  const db = getDb();
  if (!db) {
    return record;
  }

  await ensureDefaultOrganization();
  const brandId = brandIdForDomain(record.domain);

  await db`
    insert into brands (id, organization_id, domain, name, summary, guidance_text, source_run_id, created_at, updated_at)
    values (
      ${brandId},
      ${DEFAULT_ORGANIZATION_ID},
      ${record.domain},
      ${record.domain},
      ${record.snapshot.summary},
      ${record.snapshot.guidanceText},
      ${record.snapshot.sourceRunId},
      ${record.createdAt},
      ${record.updatedAt}
    )
    on conflict (domain) do update set
      name = excluded.name,
      summary = excluded.summary,
      guidance_text = excluded.guidance_text,
      source_run_id = excluded.source_run_id,
      updated_at = excluded.updated_at
  `;

  await db`
    insert into brand_documents (
      id, brand_id, snapshot_id, source_type, file_name, mime_type, checksum, storage_url,
      extracted_text, snapshot, metadata, created_at, updated_at
    )
    values (
      ${brandDocumentIdForSnapshot(record.snapshotId)},
      ${brandId},
      ${record.snapshotId},
      ${BRAND_GUIDELINE_DOCUMENT_SOURCE_TYPE},
      null,
      null,
      null,
      null,
      ${record.snapshot.guidanceText},
      ${JSON.stringify(record)},
      ${JSON.stringify({
        sourceRunId: record.snapshot.sourceRunId,
        fileCount: record.snapshot.files.length
      })},
      ${record.createdAt},
      ${record.updatedAt}
    )
    on conflict (id) do update set
      snapshot = excluded.snapshot,
      extracted_text = excluded.extracted_text,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `;

  return record;
}

async function saveRunBrandGuidelinesToDb(runId: string, brandGuidelines: RunBrandGuidelinesRecord) {
  const db = getDb();
  if (!db) {
    return brandGuidelines;
  }

  await db`
    insert into run_artifacts (id, run_id, artifact_type, payload, markdown_text, created_at, updated_at)
    values (
      ${runBrandGuidelinesArtifactId(runId)},
      ${runId},
      ${RUN_BRAND_GUIDELINES_ARTIFACT_TYPE},
      ${JSON.stringify(brandGuidelines)},
      null,
      ${brandGuidelines.createdAt},
      ${brandGuidelines.updatedAt}
    )
    on conflict (run_id, artifact_type) do update set
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `;

  return brandGuidelines;
}

async function loadRunBrandGuidelinesFromDb(runId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`
    select payload
    from run_artifacts
    where run_id = ${runId}
      and artifact_type = ${RUN_BRAND_GUIDELINES_ARTIFACT_TYPE}
    limit 1
  `;

  const payload = normalizeDbJson(rows[0]?.payload) ?? null;
  return payload ? runBrandGuidelinesSchema.parse(payload) : null;
}

async function upsertSocialProjectToDb(project: SocialProject) {
  const db = getDb();
  if (!db) {
    return project;
  }

  await ensureDefaultOrganization();
  const brandId = project.source.url ? brandIdForDomain(getDomainFromWebsiteUrl(project.source.url) || project.projectId) : null;

  await db`
    insert into social_projects (
      id, organization_id, brand_id, title, source, research, notes, created_at, updated_at
    )
    values (
      ${project.projectId},
      ${DEFAULT_ORGANIZATION_ID},
      ${brandId},
      ${project.title},
      ${JSON.stringify(project.source)},
      ${project.research ? JSON.stringify(project.research) : null},
      ${project.notes},
      ${project.createdAt},
      ${project.updatedAt}
    )
    on conflict (id) do update set
      brand_id = excluded.brand_id,
      title = excluded.title,
      source = excluded.source,
      research = excluded.research,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `;

  for (const platform of project.platforms) {
    await db`
      insert into social_project_platforms (
        id, project_id, platform, record, created_at, updated_at
      )
      values (
        ${`${project.projectId}_${platform.platform}`},
        ${project.projectId},
        ${platform.platform},
        ${JSON.stringify(platform)},
        ${project.createdAt},
        ${platform.updatedAt}
      )
      on conflict (project_id, platform) do update set
        record = excluded.record,
        updated_at = excluded.updated_at
    `;
  }

  return project;
}

async function loadSocialProjectFromDb(projectId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`
    select
      sp.id,
      sp.created_at,
      sp.updated_at,
      sp.title,
      sp.source,
      sp.research,
      sp.notes,
      coalesce(
        jsonb_agg(spp.record order by spp.platform) filter (where spp.platform is not null),
        '[]'::jsonb
      ) as platforms
    from social_projects sp
    left join social_project_platforms spp on spp.project_id = sp.id
    where sp.id = ${projectId}
    group by sp.id
    limit 1
  `;

  const row = rows[0] ?? null;
  if (!row) {
    return null;
  }

  return socialProjectSchema.parse({
    projectId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.title,
    source: normalizeDbJson(row.source) ?? row.source,
    research: normalizeDbJson(row.research) ?? row.research,
    notes: row.notes,
    platforms: normalizeDbJson(row.platforms) ?? row.platforms
  });
}

async function listSocialProjectIdsFromDb() {
  const db = getDb();
  if (!db) {
    return [];
  }

  const rows = await db`select id from social_projects order by updated_at desc`;
  return rows.map((row) => row.id as string);
}

async function loadSocialOAuthStateFromDb(state: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`
    select *
    from oauth_states
    where state = ${state}
      and provider = ${"social"}
    limit 1
  `;

  const row = rows[0] ?? null;
  if (!row) {
    return null;
  }

  return socialOAuthStateSchema.parse({
    state: row.state,
    projectId: row.entity_id,
    platform: row.entity_type,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    redirectUri: row.redirect_uri,
    codeVerifier: row.code_verifier
  });
}

async function saveSocialOAuthStateToDb(state: SocialOAuthState) {
  const db = getDb();
  if (!db) {
    return state;
  }

  await db`
    insert into oauth_states (
      id, provider, state, entity_type, entity_id, redirect_uri, code_verifier, expires_at, created_at, updated_at
    )
    values (
      ${`social_${state.state}`},
      ${"social"},
      ${state.state},
      ${state.platform},
      ${state.projectId},
      ${state.redirectUri},
      ${state.codeVerifier ?? null},
      ${state.expiresAt},
      ${state.createdAt},
      ${state.createdAt}
    )
    on conflict (state) do update set
      entity_type = excluded.entity_type,
      entity_id = excluded.entity_id,
      redirect_uri = excluded.redirect_uri,
      code_verifier = excluded.code_verifier,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  `;

  return state;
}

async function deleteSocialOAuthStateFromDb(state: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  await db`delete from oauth_states where state = ${state} and provider = ${"social"}`;
  return true;
}

async function deleteSocialProjectFromDb(projectId: string) {
  const db = getDb();
  if (!db) {
    return false;
  }

  await db`delete from social_projects where id = ${projectId}`;
  return true;
}

async function saveOAuthConnectionToDb(params: {
  provider: SocialPlatform | "linkedin";
  entityType: string;
  entityId: string;
  connection: SocialConnection | LinkedInConnection;
}) {
  const db = getDb();
  if (!db) {
    return params.connection;
  }

  await ensureDefaultOrganization();
  await db`
    insert into oauth_connections (
      id, organization_id, entity_type, entity_id, provider, account_name, handle, account_id,
      access_token, refresh_token, token_expires_at, scope, page_id, instagram_business_account_id,
      profile_url, created_at, updated_at
    )
    values (
      ${`${params.provider}_${params.entityType}_${params.entityId}`},
      ${DEFAULT_ORGANIZATION_ID},
      ${params.entityType},
      ${params.entityId},
      ${params.provider},
      ${(params.connection as SocialConnection).accountName ?? null},
      ${(params.connection as SocialConnection).handle ?? null},
      ${(params.connection as SocialConnection).accountId ?? null},
      ${(params.connection as SocialConnection).accessToken ?? null},
      ${(params.connection as SocialConnection).refreshToken ?? null},
      ${(params.connection as SocialConnection).tokenExpiresAt ?? null},
      ${(params.connection as SocialConnection).scope ?? null},
      ${(params.connection as SocialConnection).pageId ?? null},
      ${(params.connection as SocialConnection).instagramBusinessAccountId ?? null},
      ${(params.connection as SocialConnection).profileUrl ?? null},
      ${(params.connection as LinkedInConnection).connectedAt ?? (params.connection as SocialConnection).connectedAt ?? nowIso()},
      ${(params.connection as SocialConnection).updatedAt ?? nowIso()}
    )
    on conflict (provider, entity_type, entity_id) do update set
      account_name = excluded.account_name,
      handle = excluded.handle,
      account_id = excluded.account_id,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      scope = excluded.scope,
      page_id = excluded.page_id,
      instagram_business_account_id = excluded.instagram_business_account_id,
      profile_url = excluded.profile_url,
      updated_at = excluded.updated_at
  `;

  return params.connection;
}

async function loadOAuthConnectionFromDb(
  provider: SocialPlatform | "linkedin",
  entityType: string,
  entityId: string
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`
    select *
    from oauth_connections
    where provider = ${provider}
      and entity_type = ${entityType}
      and entity_id = ${entityId}
    limit 1
  `;

  const row = rows[0] ?? null;
  if (!row) {
    return null;
  }

  if (provider === "linkedin") {
    return linkedInConnectionSchema.parse({
      connected: Boolean(row.access_token),
      connectedAt: row.created_at,
      updatedAt: row.updated_at,
      memberUrn: row.account_id ?? null,
      memberName: row.account_name ?? null,
      accessToken: row.access_token ?? null,
      expiresAt: row.token_expires_at ?? null
    });
  }

  return socialConnectionSchema.parse({
    connected: Boolean(row.access_token),
    connectedAt: row.created_at,
    updatedAt: row.updated_at,
    accountName: row.account_name ?? null,
    handle: row.handle ?? null,
    provider: row.provider,
    accountId: row.account_id ?? null,
    accessToken: row.access_token ?? null,
    refreshToken: row.refresh_token ?? null,
    tokenExpiresAt: row.token_expires_at ?? null,
    scope: row.scope ?? null,
    pageId: row.page_id ?? null,
    instagramBusinessAccountId: row.instagram_business_account_id ?? null,
    profileUrl: row.profile_url ?? null
  });
}

async function deleteOAuthConnectionFromDb(provider: SocialPlatform | "linkedin", entityType: string, entityId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  await db`
    delete from oauth_connections
    where provider = ${provider}
      and entity_type = ${entityType}
      and entity_id = ${entityId}
  `;
  return true;
}

async function upsertRunRowToDb(params: {
  runId: string;
  model?: string;
  status?: RunManifest["status"];
  input?: RunInputRecord | null;
  manifest?: RunManifest | null;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  await ensureDefaultOrganization();
  await db`
    insert into runs (id, organization_id, brand_id, status, model, input, manifest, created_at, updated_at)
    values (
      ${params.runId},
      ${DEFAULT_ORGANIZATION_ID},
      ${null},
      ${params.status || "created"},
      ${params.model || process.env.OPENAI_MODEL || "gpt-5.4-mini"},
      ${JSON.stringify(params.input || null)},
      ${JSON.stringify(params.manifest || null)},
      ${params.input?.createdAt || params.manifest?.createdAt || nowIso()},
      ${params.manifest?.updatedAt || params.input?.updatedAt || nowIso()}
    )
    on conflict (id) do update set
      status = excluded.status,
      model = excluded.model,
      input = excluded.input,
      manifest = excluded.manifest,
      updated_at = excluded.updated_at
  `;

  return true;
}

async function upsertRunArtifactToDb(
  runId: string,
  artifactType: string,
  payload: unknown,
  options?: { markdownText?: string | null; createdAt?: string; updatedAt?: string }
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  await ensureDefaultOrganization();
  await db`
    insert into run_artifacts (id, run_id, artifact_type, payload, markdown_text, created_at, updated_at)
    values (
      ${`${runId}_${artifactType}`},
      ${runId},
      ${artifactType},
      ${JSON.stringify(payload)},
      ${options?.markdownText ?? null},
      ${options?.createdAt || nowIso()},
      ${options?.updatedAt || nowIso()}
    )
    on conflict (run_id, artifact_type) do update set
      payload = excluded.payload,
      markdown_text = excluded.markdown_text,
      updated_at = excluded.updated_at
  `;

  return true;
}

async function upsertRunArtifactToDbTx(
  tx: TransactionSql,
  runId: string,
  artifactType: string,
  payload: unknown,
  options?: { markdownText?: string | null; createdAt?: string; updatedAt?: string }
) {
  await ensureDefaultOrganization();
  await tx`
    insert into run_artifacts (id, run_id, artifact_type, payload, markdown_text, created_at, updated_at)
    values (
      ${`${runId}_${artifactType}`},
      ${runId},
      ${artifactType},
      ${JSON.stringify(payload)},
      ${options?.markdownText ?? null},
      ${options?.createdAt || nowIso()},
      ${options?.updatedAt || nowIso()}
    )
    on conflict (run_id, artifact_type) do update set
      payload = excluded.payload,
      markdown_text = excluded.markdown_text,
      updated_at = excluded.updated_at
  `;
}

async function loadRunArtifactsFromDb(runId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`
    select artifact_type, payload
    from run_artifacts
    where run_id = ${runId}
  `;

  const map = new Map<string, unknown>();
  for (const row of rows) {
    map.set(row.artifact_type, row.payload);
    const normalizedType = normalizeArtifactTypeKey(row.artifact_type);
    if (normalizedType !== row.artifact_type) {
      map.set(normalizedType, row.payload);
    }
  }

  return map;
}

async function loadRunArtifactFromDbTx<T>(tx: TransactionSql, runId: string, artifactType: string): Promise<T | null> {
  const rows = await tx`
    select payload
    from run_artifacts
    where run_id = ${runId}
      and artifact_type = ${artifactType}
    limit 1
  `;

  return normalizeDbJson(rows[0]?.payload) as T | null;
}

async function loadRunArtifactFromDb<T>(runId: string, artifactType: string): Promise<T | null> {
  const artifacts = await loadRunArtifactsFromDb(runId);
  return normalizeDbJson(artifacts?.get(artifactType)) as T | null;
}

async function withRunArtifactLock<T>(
  runId: string,
  artifactType: string,
  work: (tx: TransactionSql) => Promise<T>
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  await ensureDefaultOrganization();
  return db.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${runId}), hashtext(${artifactType}))`;
    return work(tx);
  });
}

async function loadRunRowFromDb(runId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`select * from runs where id = ${runId} limit 1`;
  return rows[0] ?? null;
}

function getDomainFromWebsiteUrl(websiteUrl?: string | null) {
  if (!websiteUrl) {
    return null;
  }

  try {
    return new URL(websiteUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getBrandNameFromAnalysisSummary(summary?: string | null) {
  if (!summary) {
    return null;
  }

  const trimmed = summary.trim();
  if (!trimmed) {
    return null;
  }

  const markers = [" appears to be ", " is an ", " is a ", " is the ", " is ", " – ", " — ", " - ", " | "];
  for (const marker of markers) {
    const index = trimmed.indexOf(marker);
    if (index > 0) {
      const candidate = trimmed.slice(0, index).trim();
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

function resolveBrandName(params: {
  companyName?: string | null;
  websiteUrl?: string | null;
  analysisSummary?: string | null;
}) {
  return (
    params.companyName?.trim() ||
    getBrandNameFromAnalysisSummary(params.analysisSummary) ||
    getDomainFromWebsiteUrl(params.websiteUrl) ||
    "Untitled brand"
  );
}

export async function loadLatestBrandGuidelines(domain: string) {
  const dbRecord = await loadLatestBrandGuidelinesFromDb(domain);
  return dbRecord;
}

export async function saveBrandGuidelinesSnapshot(
  domain: string,
  snapshot: Omit<BrandGuidelinesSnapshot, "snapshotId" | "createdAt" | "updatedAt" | "domain"> & {
    snapshotId?: string;
    createdAt?: string;
    updatedAt?: string;
    sourceRunId?: string | null;
  }
) {
  const timestamp = nowIso();
  const snapshotId = snapshot.snapshotId ?? `bg-${randomUUID().slice(0, 8)}`;
  const normalizedDomain = normalizeDomain(domain);
  const files = snapshot.files.map((file) => brandGuidelineFileSchema.parse(file));
  const record: RunBrandGuidelinesRecord = runBrandGuidelinesSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    runId: snapshot.sourceRunId ?? `guidelines-${normalizedDomain}`,
    domain: normalizedDomain,
    snapshotId,
    createdAt: snapshot.createdAt ?? timestamp,
    updatedAt: snapshot.updatedAt ?? timestamp,
    snapshot: {
      snapshotId,
      domain: normalizedDomain,
      createdAt: snapshot.createdAt ?? timestamp,
      updatedAt: snapshot.updatedAt ?? timestamp,
      sourceRunId: snapshot.sourceRunId ?? null,
      summary: snapshot.summary,
      guidanceText: snapshot.guidanceText,
      files
    }
  });

  await saveBrandGuidelinesSnapshotToDb(record);
  return record;
}

export async function saveRunBrandGuidelines(runId: string, brandGuidelines: RunBrandGuidelinesRecord | null) {
  if (!brandGuidelines) {
    return null;
  }

  const record = runBrandGuidelinesSchema.parse(brandGuidelines);
  await saveRunBrandGuidelinesToDb(runId, record);
  return record;
}

export async function loadRunBrandGuidelines(runId: string) {
  return loadRunBrandGuidelinesFromDb(runId);
}

export async function removeBrandGuidelineFile(domain: string, fileId: string) {
  const current = await loadLatestBrandGuidelines(domain);
  if (!current) {
    return null;
  }

  const nextFiles = current.snapshot.files.filter((file) => file.fileId !== fileId);
  if (nextFiles.length === current.snapshot.files.length) {
    return current;
  }

  const nextGuidanceText = nextFiles.map((file) => file.extractedText.trim()).filter(Boolean).join("\n\n");
  const nextSummary = nextFiles.length
    ? `Brand guidelines from ${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"}`
    : "No brand guideline files uploaded.";

  return saveBrandGuidelinesSnapshot(domain, {
    snapshotId: `bg-${randomUUID().slice(0, 8)}`,
    sourceRunId: current.snapshot.sourceRunId,
    summary: nextSummary,
    guidanceText: nextGuidanceText,
    files: nextFiles
  });
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
  return withRunArtifactLock(runId, RUN_APPROVED_ARTICLES_ARTIFACT_TYPE, async (tx) => {
    const current =
      (await loadRunArtifactFromDbTx<RunApprovedArticlesRecord>(tx, runId, RUN_APPROVED_ARTICLES_ARTIFACT_TYPE)) ?? {
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
      topic: {
        ...article.topic,
        ...ensureTopicKeywordCluster(article.topic)
      },
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

    await upsertRunArtifactToDbTx(tx, runId, RUN_APPROVED_ARTICLES_ARTIFACT_TYPE, record);
    return record;
  });
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

  await upsertRunRowToDb({
    runId,
    model,
    status: "created",
    input: inputRecord,
    manifest
  });

  const domain = getDomainFromWebsiteUrl(input.websiteUrl);
  if (domain) {
    const latestGuidelines = await loadLatestBrandGuidelines(domain);
    if (latestGuidelines) {
      await saveRunBrandGuidelines(runId, {
        ...latestGuidelines,
        runId
      });
    }
  }

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

  await upsertRunArtifactToDb(runId, RUN_RESEARCH_ARTIFACT_TYPE, record);
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

  await upsertRunArtifactToDb(runId, RUN_EXISTING_TOPICS_ARTIFACT_TYPE, record);
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

  await upsertRunArtifactToDb(runId, RUN_ANALYSIS_ARTIFACT_TYPE, record);
  return record;
}

export async function saveTopics(runId: string, topics: TopicSuggestion[]) {
  const timestamp = nowIso();
  const record: RunTopicsRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    topics: topicListSchema.parse(topics.map((topic) => ({ ...topic, ...ensureTopicKeywordCluster(topic) })))
  };

  await upsertRunArtifactToDb(runId, RUN_TOPICS_ARTIFACT_TYPE, record);
  return record;
}

export async function saveTopicCandidates(runId: string, topics: TopicSuggestion[]) {
  const timestamp = nowIso();
  const record: RunTopicCandidatesRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    topics: topicListSchema.parse(topics.map((topic) => ({ ...topic, ...ensureTopicKeywordCluster(topic) })))
  };

  await upsertRunArtifactToDb(runId, RUN_TOPIC_CANDIDATES_ARTIFACT_TYPE, record);
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

  await upsertRunArtifactToDb(runId, RUN_TOPIC_VALIDATION_ARTIFACT_TYPE, record);
  return record;
}

export async function saveTopicResearch(runId: string, evidence: string) {
  const timestamp = nowIso();
  const record: RunTopicResearchRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: "dataforseo",
    evidence: topicResearchSchema.parse({
      source: "dataforseo",
      evidence
    }).evidence
  };

  await upsertRunArtifactToDb(runId, RUN_TOPIC_RESEARCH_ARTIFACT_TYPE, record);
  return record;
}

export async function saveApprovedTopic(runId: string, approvedTopic: TopicSuggestion) {
  const timestamp = nowIso();
  const record: RunApprovedTopicRecord = {
    runId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    approvedTopic: topicSuggestionSchema.parse({
      ...approvedTopic,
      ...ensureTopicKeywordCluster(approvedTopic)
    })
  };

  await upsertRunArtifactToDb(runId, RUN_APPROVED_TOPIC_ARTIFACT_TYPE, record);
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

  await upsertRunArtifactToDb(runId, RUN_BLOG_ARTIFACT_TYPE, record, { markdownText: blog.markdown });
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

  await upsertRunArtifactToDb(runId, RUN_QUALITY_ARTIFACT_TYPE, record);
  return record;
}

export async function loadRevisions(runId: string) {
  return loadRunArtifactFromDb<RunRevisionsRecord>(runId, RUN_REVISIONS_ARTIFACT_TYPE);
}

export async function saveBlogRevision(
  runId: string,
  revision: Omit<BlogRevision, "revisionId" | "createdAt"> & { revisionId?: string; createdAt?: string }
) {
  return withRunArtifactLock(runId, RUN_REVISIONS_ARTIFACT_TYPE, async (tx) => {
    const current =
      (await loadRunArtifactFromDbTx<RunRevisionsRecord>(tx, runId, RUN_REVISIONS_ARTIFACT_TYPE)) ?? {
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

    await upsertRunArtifactToDbTx(tx, runId, RUN_REVISIONS_ARTIFACT_TYPE, record);
    return record;
  });
}

export async function saveRegenerationNote(runId: string, note: RegenerationNote) {
  return withRunArtifactLock(runId, RUN_REGENERATION_NOTES_ARTIFACT_TYPE, async (tx) => {
    const current =
      (await loadRunArtifactFromDbTx<RunRegenerationNotesRecord>(tx, runId, RUN_REGENERATION_NOTES_ARTIFACT_TYPE)) ?? {
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
      notes: [...current.notes, regenerationNoteSchema.parse(note)]
    };

    await upsertRunArtifactToDbTx(tx, runId, RUN_REGENERATION_NOTES_ARTIFACT_TYPE, record);
    return record;
  });
}

export async function saveApproval(
  runId: string,
  approval: Omit<BlogApproval, "approvalId" | "createdAt"> & { approvalId?: string; createdAt?: string }
) {
  return withRunArtifactLock(runId, RUN_APPROVALS_ARTIFACT_TYPE, async (tx) => {
    const current =
      (await loadRunArtifactFromDbTx<RunApprovalsRecord>(tx, runId, RUN_APPROVALS_ARTIFACT_TYPE)) ?? {
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

    await upsertRunArtifactToDbTx(tx, runId, RUN_APPROVALS_ARTIFACT_TYPE, record);
    return record;
  });
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
  const record = await upsertApprovedArticle(runId, article);
  await upsertRunArtifactToDb(runId, RUN_APPROVED_ARTICLES_ARTIFACT_TYPE, record);
  return record;
}

async function upsertLinkedInArticlesRecord(
  runId: string,
  articleSlug: string,
  patch: Partial<LinkedInRecord>
) {
  return withRunArtifactLock(runId, RUN_LINKEDIN_ARTIFACT_TYPE, async (tx) => {
    const current =
      (await loadRunArtifactFromDbTx<RunLinkedInArticlesRecord>(tx, runId, RUN_LINKEDIN_ARTIFACT_TYPE)) ?? {
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

    await upsertRunArtifactToDbTx(tx, runId, RUN_LINKEDIN_ARTIFACT_TYPE, record);
    return record;
  });
}

export async function saveLinkedInDraft(runId: string, draft: LinkedInDraft) {
  return upsertLinkedInArticlesRecord(runId, draft.articleSlug, { draft });
}

export async function saveLinkedInConnection(runId: string, articleSlug: string, connection: LinkedInConnection) {
  const record = await upsertLinkedInArticlesRecord(runId, articleSlug, {
    connection: linkedInConnectionSchema.parse(connection)
  });
  await saveOAuthConnectionToDb({
    provider: "linkedin",
    entityType: "run_article",
    entityId: `${runId}:${articleSlug}`,
    connection
  });
  return record;
}

export async function saveLinkedInApproval(runId: string, articleSlug: string, approval: LinkedInApproval) {
  const current = await loadRunArtifactFromDb<RunLinkedInArticlesRecord>(runId, RUN_LINKEDIN_ARTIFACT_TYPE);
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
  const current = await loadRunArtifactFromDb<RunLinkedInArticlesRecord>(runId, RUN_LINKEDIN_ARTIFACT_TYPE);
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
  const current = await loadRunArtifactFromDb<RunLinkedInArticlesRecord>(runId, RUN_LINKEDIN_ARTIFACT_TYPE);
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

async function listSocialProjectIdsFromBlobs() {
  const projectIds = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await listBlobs({
      prefix: "social/",
      mode: "expanded",
      cursor,
      ...blobOptions()
    });

    for (const blob of page.blobs) {
      const [, projectId] = blob.pathname.split("/");
      if (projectId) {
        projectIds.add(projectId);
      }
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return Array.from(projectIds);
}

async function deleteSocialProjectBlobs(projectId: string) {
  const paths: string[] = [];
  let cursor: string | undefined;
  const prefix = blobPath("social", projectId) + "/";

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

export function createSocialProjectId(topic?: string) {
  const slug = (topic || "social").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${new Date().toISOString().slice(0, 10)}_${slug || "social"}_${randomUUID().slice(0, 8)}`;
}

export async function saveSocialProject(project: SocialProject) {
  const record: SocialProject = socialProjectSchema.parse(project);
  await upsertSocialProjectToDb(record);
  for (const platform of record.platforms) {
    if (platform.connection) {
      await saveOAuthConnectionToDb({
        provider: platform.connection.provider,
        entityType: "social_project_platform",
        entityId: `${record.projectId}:${platform.platform}`,
        connection: platform.connection
      });
    } else {
      await deleteOAuthConnectionFromDb("instagram", "social_project_platform", `${record.projectId}:${platform.platform}`);
      await deleteOAuthConnectionFromDb("x", "social_project_platform", `${record.projectId}:${platform.platform}`);
      await deleteOAuthConnectionFromDb("linkedin", "social_project_platform", `${record.projectId}:${platform.platform}`);
    }
  }
  return record;
}

export async function loadSocialProject(projectId: string) {
  const dbRecord = await loadSocialProjectFromDb(projectId);
  if (dbRecord) {
    const hydratedPlatforms = await Promise.all(
      dbRecord.platforms.map(async (platform) => {
        if (platform.connection) {
          return platform;
        }

        const connection =
          (await loadOAuthConnectionFromDb("instagram", "social_project_platform", `${projectId}:${platform.platform}`)) ??
          (await loadOAuthConnectionFromDb("x", "social_project_platform", `${projectId}:${platform.platform}`));

        return connection ? { ...platform, connection: connection as SocialConnection } : platform;
      })
    );

    return {
      ...dbRecord,
      platforms: hydratedPlatforms
    };
  }

  return null;
}

export async function saveSocialOAuthState(state: SocialOAuthState) {
  await saveSocialOAuthStateToDb(state);
  return {
    states: [socialOAuthStateSchema.parse(state)]
  };
}

export async function loadSocialOAuthState(state: string) {
  return loadSocialOAuthStateFromDb(state);
}

export async function deleteSocialOAuthState(state: string) {
  await deleteSocialOAuthStateFromDb(state);
}

export async function deleteSocialProject(projectId: string) {
  const db = getDb();
  if (db) {
    await db`
      delete from oauth_connections
      where entity_type = ${"social_project_platform"}
        and entity_id like ${`${projectId}:%`}
    `;
  }

  await deleteSocialProjectFromDb(projectId);
  if (USE_BLOB_STORAGE) {
    await deleteSocialProjectBlobs(projectId);
  } else {
    await rm(path.join(SOCIAL_ROOT, projectId), { recursive: true, force: true });
  }
  return true;
}

export async function listSocialProjectSummaries(): Promise<SocialProjectSummary[]> {
  const dbProjectIds = await listSocialProjectIdsFromDb();
  const projectIds = dbProjectIds.length
    ? dbProjectIds
    : USE_BLOB_STORAGE
      ? await listSocialProjectIdsFromBlobs()
      : await listSocialProjectIds();
  const projects = await Promise.all(projectIds.map((projectId) => loadSocialProject(projectId)));

  return projects
    .filter((project): project is SocialProject => Boolean(project))
    .map((project) => {
      const platformCount = project.platforms.length;
      const readyCount = project.platforms.filter(
        (platform) => platform.variants.some((variant) => variant.callToAction && variant.body.trim().length > 0)
      ).length;
      const scheduledCount = project.platforms.filter((platform) => Boolean(platform.schedule)).length;
      return {
        projectId: project.projectId,
        title: project.title,
        updatedAt: project.updatedAt,
        sourceLabel:
          project.source.mode === "url"
            ? project.source.url || project.source.topic
            : project.source.topic || "Manual topic",
        sourceMode: project.source.mode,
        platformCount,
        readyCount,
        scheduledCount
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function updateManifest(
  runId: string,
  patch: Partial<Omit<RunManifest, "runId" | "schemaVersion" | "createdAt" | "steps">> & {
    steps?: Partial<RunManifest["steps"]>;
  }
) {
  const currentRow = await loadRunRowFromDb(runId);
  const current = normalizeManifest(currentRow?.manifest);
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
  const currentInput = currentRow?.input
    ? {
        runId,
        schemaVersion: SCHEMA_VERSION,
        createdAt: (currentRow as { created_at?: string })?.created_at ?? timestamp,
        updatedAt: (currentRow as { updated_at?: string })?.updated_at ?? timestamp,
        ...workflowInputSchema.parse(normalizeDbJson(currentRow.input) ?? currentRow.input)
      }
    : null;
  await upsertRunRowToDb({
    runId,
    model: parsed.model,
    status: parsed.status,
    input: currentInput,
    manifest: parsed
  });
  return parsed;
}

export async function loadRun(runId: string): Promise<RunBundle> {
  const db = getDb();
  if (!db) {
    return {
      manifest: null,
      input: null,
      research: null,
      existingTopics: null,
      analysis: null,
      topicCandidates: null,
      topics: null,
      topicValidation: null,
      topicResearch: null,
      approvedTopic: null,
      blog: null,
      quality: null,
      revisions: null,
      approvals: null,
      approvedArticles: null,
      regenerationNotes: null,
      linkedin: null,
      brandGuidelines: null
    };
  }

  const [runRows, artifacts, brandGuidelines] = await Promise.all([
    db`
      select r.*, b.name as brand_name, b.domain as brand_domain
      from runs r
      left join brands b on b.id = r.brand_id
      where r.id = ${runId}
      limit 1
    `,
    loadRunArtifactsFromDb(runId),
    loadRunBrandGuidelinesFromDb(runId)
  ]);

  const runRow = runRows[0] ?? null;
  if (!runRow) {
    return {
      manifest: null,
      input: null,
      research: null,
      existingTopics: null,
      analysis: null,
      topicCandidates: null,
      topics: null,
      topicValidation: null,
      topicResearch: null,
      approvedTopic: null,
      blog: null,
      quality: null,
      revisions: null,
      approvals: null,
      approvedArticles: null,
      regenerationNotes: null,
      linkedin: null,
      brandGuidelines: brandGuidelines
        ? runBrandGuidelinesSchema.parse(normalizeDbJson(brandGuidelines) ?? brandGuidelines)
        : null
    };
  }

  const createdAt = (runRow as { created_at: string }).created_at;
  const updatedAt = (runRow as { updated_at: string }).updated_at;
  const manifest = normalizeManifest(runRow.manifest);
  const input = runRow.input
    ? {
        runId: runRow.id,
        schemaVersion: SCHEMA_VERSION,
        createdAt,
        updatedAt,
        ...workflowInputSchema.parse(normalizeDbJson(runRow.input) ?? runRow.input)
      }
    : null;
  const research = normalizeArtifactRecord<RunResearchRecord>(artifacts?.get(RUN_RESEARCH_ARTIFACT_TYPE));
  const existingTopics = normalizeArtifactRecord<RunExistingTopicsRecord>(
    artifacts?.get(RUN_EXISTING_TOPICS_ARTIFACT_TYPE)
  );
  const analysis = normalizeArtifactRecord<RunAnalysisRecord>(artifacts?.get(RUN_ANALYSIS_ARTIFACT_TYPE));
  const topicCandidates = normalizeArtifactRecord<RunTopicCandidatesRecord>(
    artifacts?.get(RUN_TOPIC_CANDIDATES_ARTIFACT_TYPE)
  );
  const topics = normalizeArtifactRecord<RunTopicsRecord>(artifacts?.get(RUN_TOPICS_ARTIFACT_TYPE));
  const topicValidation = normalizeArtifactRecord<RunTopicValidationRecord>(
    artifacts?.get(RUN_TOPIC_VALIDATION_ARTIFACT_TYPE)
  );
  const topicResearch = normalizeArtifactRecord<RunTopicResearchRecord>(artifacts?.get(RUN_TOPIC_RESEARCH_ARTIFACT_TYPE));
  const approvedTopic = normalizeArtifactRecord<RunApprovedTopicRecord>(artifacts?.get(RUN_APPROVED_TOPIC_ARTIFACT_TYPE));
  const blog = normalizeArtifactRecord<RunBlogRecord>(artifacts?.get(RUN_BLOG_ARTIFACT_TYPE));
  const quality = normalizeArtifactRecord<RunQualityRecord>(artifacts?.get(RUN_QUALITY_ARTIFACT_TYPE));
  const revisions = normalizeArtifactRecord<RunRevisionsRecord>(artifacts?.get(RUN_REVISIONS_ARTIFACT_TYPE));
  const approvals = normalizeArtifactRecord<RunApprovalsRecord>(artifacts?.get(RUN_APPROVALS_ARTIFACT_TYPE));
  const approvedArticlesRaw = normalizeArtifactRecord<RunApprovedArticlesRecord>(
    artifacts?.get(RUN_APPROVED_ARTICLES_ARTIFACT_TYPE)
  );
  const regenerationNotes = normalizeArtifactRecord<RunRegenerationNotesRecord>(
    artifacts?.get(RUN_REGENERATION_NOTES_ARTIFACT_TYPE)
  );
  const linkedin = normalizeArtifactRecord<RunLinkedInArticlesRecord>(artifacts?.get(RUN_LINKEDIN_ARTIFACT_TYPE));
  const resolvedCompanyName = resolveBrandName({
    companyName: input?.companyName || (runRow as { brand_name?: string | null }).brand_name || null,
    websiteUrl: input?.websiteUrl || null,
    analysisSummary: analysis?.analysis?.companySummary
  });

  return {
    manifest,
    input: input
      ? {
          ...input,
          companyName: resolvedCompanyName
        }
      : null,
    research,
    existingTopics,
    analysis,
    topicCandidates,
    topics,
    topicValidation,
    topicResearch,
    approvedTopic,
    blog,
    quality,
    revisions,
    approvals,
    approvedArticles: approvedArticlesRaw ? approvedArticlesSchema.parse(approvedArticlesRaw) : null,
    regenerationNotes,
    linkedin: linkedin ? linkedInArticlesRecordSchema.parse(linkedin) : null,
    brandGuidelines: brandGuidelines ? runBrandGuidelinesSchema.parse(normalizeDbJson(brandGuidelines) ?? brandGuidelines) : null
  };
}

export async function saveLinkedInOAuthState(state: LinkedInOAuthState) {
  const db = getDb();
  if (db) {
    await ensureDefaultOrganization();
    await db`
      insert into oauth_states (
        id, provider, state, entity_type, entity_id, redirect_uri, code_verifier, expires_at, created_at, updated_at
      )
      values (
        ${`linkedin_${state.state}`},
        ${"linkedin"},
        ${state.state},
        ${"run_article"},
        ${`${state.runId}:${state.articleSlug}`},
        ${state.redirectUri},
        ${null},
        ${state.expiresAt},
        ${state.createdAt},
        ${state.createdAt}
      )
      on conflict (state) do update set
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        redirect_uri = excluded.redirect_uri,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `;
  }

  return {
    states: [state]
  };
}

export async function loadLinkedInOAuthState(state: string) {
  const db = getDb();
  if (db) {
    const rows = await db`
      select *
      from oauth_states
      where provider = ${"linkedin"}
        and state = ${state}
      limit 1
    `;

    const row = rows[0] ?? null;
    if (row) {
      return {
        state: row.state,
        runId: String(row.entity_id).split(":")[0] || "",
        articleSlug: String(row.entity_id).split(":")[1] || "",
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        redirectUri: row.redirect_uri
      } satisfies LinkedInOAuthState;
    }
  }
  return null;
}

export async function deleteLinkedInOAuthState(state: string) {
  const db = getDb();
  if (db) {
    await db`
      delete from oauth_states
      where provider = ${"linkedin"}
        and state = ${state}
    `;
  }
  return null;
}

export async function deleteLinkedInOAuthStatesForRun(runId: string) {
  const db = getDb();
  if (db) {
    await db`
      delete from oauth_states
      where provider = ${"linkedin"}
        and entity_id like ${`${runId}:%`}
    `;
  }
  return null;
}

export async function deleteRun(runId: string) {
  await deleteLinkedInOAuthStatesForRun(runId);
  const db = getDb();
  if (db) {
    await db`delete from runs where id = ${runId}`;
  }
  if (USE_BLOB_STORAGE) {
    await deleteRunBlobs(runId);
  } else {
    await rm(runDir(runId), { recursive: true, force: true });
  }
  return true;
}

export async function listRunSummaries(): Promise<RunSummary[]> {
  const db = getDb();
  if (db) {
    const rows = await db`
      select
        r.id as "runId",
        b.name as "brandName",
        coalesce((r.input->>'companyName'), '') as "companyName",
        coalesce((r.input->>'websiteUrl'), '') as "websiteUrl",
        (select (ra.payload->'analysis'->>'companySummary') from run_artifacts ra where ra.run_id = r.id and ra.artifact_type = ${RUN_ANALYSIS_ARTIFACT_TYPE} limit 1) as "analysisCompanySummary",
        r.updated_at as "updatedAt",
        r.status as "status",
        exists (
          select 1
          from run_artifacts ra
          where ra.run_id = r.id
            and ra.artifact_type = ${RUN_BLOG_ARTIFACT_TYPE}
        ) as "hasBlog",
        (select (ra.payload->'blog'->>'title') from run_artifacts ra where ra.run_id = r.id and ra.artifact_type = ${RUN_BLOG_ARTIFACT_TYPE} limit 1) as "blogTitle",
        (select (ra.payload->'blog'->>'slug') from run_artifacts ra where ra.run_id = r.id and ra.artifact_type = ${RUN_BLOG_ARTIFACT_TYPE} limit 1) as "blogSlug",
        (select (ra.payload->'quality'->>'score')::double precision from run_artifacts ra where ra.run_id = r.id and ra.artifact_type = ${RUN_QUALITY_ARTIFACT_TYPE} limit 1) as "qualityScore",
        (select (ra.payload->'quality'->>'publishStatus') from run_artifacts ra where ra.run_id = r.id and ra.artifact_type = ${RUN_QUALITY_ARTIFACT_TYPE} limit 1) as "publishStatus",
        (r.manifest->'progress'->>'percent')::double precision as "progressPercent",
        (r.manifest->'progress'->>'stageLabel') as "progressLabel",
        exists (
          select 1
          from run_artifacts ra
          where ra.run_id = r.id
            and ra.artifact_type = ${RUN_BRAND_GUIDELINES_ARTIFACT_TYPE}
        ) as "hasBrandGuidelines"
      from runs r
      left join brands b on b.id = r.brand_id
      order by r.updated_at desc
    `;

    return rows.map((row) => ({
      runId: row.runId,
      companyName: resolveBrandName({
        companyName: row.brandName || row.companyName,
        websiteUrl: row.websiteUrl,
        analysisSummary: row.analysisCompanySummary
      }),
      websiteUrl: row.websiteUrl,
      updatedAt: row.updatedAt,
      status: row.status,
      hasBlog: row.hasBlog,
      blogTitle: row.blogTitle ?? null,
      blogSlug: row.blogSlug ?? null,
      qualityScore: row.qualityScore ?? null,
      publishStatus: row.publishStatus ?? null,
      progressPercent: row.progressPercent ?? null,
      progressLabel: row.progressLabel ?? null,
      hasBrandGuidelines: row.hasBrandGuidelines
    }));
  }

  const runIds = await listRuns();
  const runs = await Promise.all(runIds.map((runId) => loadRun(runId)));

  return runs
    .map((run) => {
      const runId = run.manifest?.runId ?? run.input?.runId ?? "";
      return {
        runId,
        companyName: run.input?.companyName || getDomainFromWebsiteUrl(run.input?.websiteUrl) || "Untitled brand",
        websiteUrl: run.input?.websiteUrl || "",
        updatedAt: run.manifest?.updatedAt || run.input?.updatedAt || "",
        status: run.manifest?.status || "created",
        hasBlog: Boolean(run.blog?.blog),
        blogTitle: run.blog?.blog.title ?? null,
        blogSlug: run.blog?.blog.slug ?? null,
        qualityScore: run.quality?.quality.score ?? null,
        publishStatus: run.quality?.quality.publishStatus ?? null,
        progressPercent: run.manifest?.progress?.percent ?? null,
        progressLabel: run.manifest?.progress?.stageLabel ?? null,
        hasBrandGuidelines: Boolean(run.brandGuidelines)
      };
    })
    .filter((run) => Boolean(run.runId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function listSocialProjectIds() {
  try {
    const entries = await readdir(SOCIAL_ROOT, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function listRuns() {
  const db = getDb();
  if (db) {
    const rows = await db`select id from runs order by updated_at desc`;
    return rows.map((row) => row.id as string);
  }

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
