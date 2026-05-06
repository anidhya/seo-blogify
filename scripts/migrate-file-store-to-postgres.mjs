import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to backfill data.");
  process.exit(1);
}

function shouldUseSsl(url) {
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }

  try {
    const parsed = new URL(url);
    return !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return true;
  }
}

const sql = postgres(databaseUrl, {
  max: Number(process.env.DATABASE_POOL_SIZE || 5),
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: shouldUseSsl(databaseUrl) ? "require" : undefined,
  prepare: false
});

const openaiKey = process.env.OPENAI_API_KEY;
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

const dataRoot = path.join(process.cwd(), "data");
const runsRoot = path.join(dataRoot, "runs");
const socialRoot = path.join(dataRoot, "social");
const brandGuidelinesRoot = path.join(dataRoot, "brand-guidelines");

const DEFAULT_ORG_ID = "workspace-default";
const DEFAULT_ORG_SLUG = "workspace";

function nowIso() {
  return new Date().toISOString();
}

function normalizeDomain(domain) {
  return domain.trim().toLowerCase();
}

function readJsonFile(filePath) {
  return readFile(filePath, "utf8").then((content) => JSON.parse(content));
}

function chunkText(text, maxLength = 1200) {
  const paragraphs = String(text || "")
    .split(/\n\s*\n/g)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      pushCurrent();
      const sentences = paragraph.split(/(?<=[.!?])\s+/g);
      let sentenceChunk = "";
      for (const sentence of sentences) {
        if (!sentenceChunk) {
          sentenceChunk = sentence;
          continue;
        }
        if (`${sentenceChunk} ${sentence}`.length > maxLength) {
          chunks.push(sentenceChunk.trim());
          sentenceChunk = sentence;
        } else {
          sentenceChunk = `${sentenceChunk} ${sentence}`;
        }
      }
      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxLength) {
      pushCurrent();
      current = paragraph;
    } else {
      current = next;
    }
  }

  pushCurrent();
  return chunks;
}

function embeddingToPgVector(embedding) {
  return `[${embedding.join(",")}]`;
}

async function ensureOrg() {
  await sql`
    insert into organizations (id, slug, name, owner_user_id, created_at, updated_at)
    values (${DEFAULT_ORG_ID}, ${DEFAULT_ORG_SLUG}, ${"Workspace"}, null, ${nowIso()}, ${nowIso()})
    on conflict (id) do update set
      slug = excluded.slug,
      name = excluded.name,
      updated_at = excluded.updated_at
  `;
}

async function ensureBrand(domain, sourceRunId, guidanceText, summary) {
  const id = `brand_${normalizeDomain(domain).replace(/[^a-z0-9]+/g, "_")}`;
  await sql`
    insert into brands (id, organization_id, domain, name, summary, guidance_text, source_run_id, created_at, updated_at)
    values (${id}, ${DEFAULT_ORG_ID}, ${normalizeDomain(domain)}, ${domain}, ${summary || ""}, ${guidanceText || ""}, ${sourceRunId || null}, ${nowIso()}, ${nowIso()})
    on conflict (domain) do update set
      name = excluded.name,
      summary = excluded.summary,
      guidance_text = excluded.guidance_text,
      source_run_id = excluded.source_run_id,
      updated_at = excluded.updated_at
  `;
  return id;
}

async function createEmbeddings(texts) {
  if (!openai || !texts.length) {
    return texts.map(() => null);
  }

  const response = await openai.embeddings.create({
    model: embeddingModel,
    input: texts
  });

  return response.data.map((entry) => entry.embedding);
}

async function backfillBrandGuidelines() {
  let imported = 0;

  try {
    const domains = await readdir(brandGuidelinesRoot, { withFileTypes: true });

    for (const domainEntry of domains) {
      if (!domainEntry.isDirectory()) {
        continue;
      }

      const domainDir = path.join(brandGuidelinesRoot, domainEntry.name);
      const currentPath = path.join(domainDir, "current.json");
      try {
        const current = await readJsonFile(currentPath);
        const snapshot = current?.snapshot;
        if (!snapshot) {
          continue;
        }

        const brandId = await ensureBrand(snapshot.domain || domainEntry.name, snapshot.sourceRunId, snapshot.guidanceText, snapshot.summary);
        const documentId = `branddoc_${snapshot.snapshotId}`;

        await sql`
          insert into brand_documents (
            id, brand_id, snapshot_id, source_type, file_name, mime_type, checksum, storage_url,
            extracted_text, snapshot, metadata, created_at, updated_at
          )
          values (
            ${documentId}, ${brandId}, ${snapshot.snapshotId}, ${"guideline_snapshot"}, null, null, null, null,
            ${snapshot.guidanceText || ""}, ${JSON.stringify(snapshot)}, ${JSON.stringify({ sourceRunId: snapshot.sourceRunId })},
            ${snapshot.createdAt || nowIso()}, ${snapshot.updatedAt || nowIso()}
          )
          on conflict (id) do update set
            snapshot = excluded.snapshot,
            extracted_text = excluded.extracted_text,
            metadata = excluded.metadata,
            updated_at = excluded.updated_at
        `;

        const chunks = chunkText(snapshot.guidanceText || "");
        const embeddings = await createEmbeddings(chunks);
        for (let index = 0; index < chunks.length; index += 1) {
          await sql`
            insert into brand_chunks (
              id, brand_id, document_id, source_type, source_ref, chunk_index, content, metadata, embedding, created_at, updated_at
            )
            values (
              ${`chunk_${snapshot.snapshotId}_${index}`}, ${brandId}, ${documentId}, ${"guideline_snapshot"}, ${snapshot.snapshotId}, ${index},
              ${chunks[index]}, ${JSON.stringify({ snapshotId: snapshot.snapshotId })},
              ${embeddings[index] ? embeddingToPgVector(embeddings[index]) : null}, ${nowIso()}, ${nowIso()}
            )
            on conflict (brand_id, source_ref, chunk_index) do update set
              content = excluded.content,
              metadata = excluded.metadata,
              embedding = excluded.embedding,
              updated_at = excluded.updated_at
          `;
        }

        imported += 1;
      } catch (error) {
        console.warn(`Skipping brand guidelines for ${domainEntry.name}:`, error?.message || error);
      }
    }
  } catch {
    return imported;
  }

  return imported;
}

async function backfillRuns() {
  let importedRuns = 0;
  let importedArtifacts = 0;

  try {
    const runDirs = await readdir(runsRoot, { withFileTypes: true });
    for (const runEntry of runDirs) {
      if (!runEntry.isDirectory()) {
        continue;
      }

      const runDir = path.join(runsRoot, runEntry.name);
      const manifestPath = path.join(runDir, "manifest.json");
      const inputPath = path.join(runDir, "input.json");

      try {
        const [manifest, input] = await Promise.all([
          readJsonFile(manifestPath).catch(() => null),
          readJsonFile(inputPath).catch(() => null)
        ]);

        if (!manifest && !input) {
          continue;
        }

        const websiteUrl = input?.websiteUrl || null;
        let brandId = null;
        if (websiteUrl) {
          try {
            const domain = new URL(websiteUrl).hostname.toLowerCase();
            brandId = await ensureBrand(domain, runEntry.name, "", input?.companyName || domain);
          } catch {
            brandId = null;
          }
        }

        await sql`
          insert into runs (id, organization_id, brand_id, status, model, input, manifest, created_at, updated_at)
          values (
            ${runEntry.name},
            ${DEFAULT_ORG_ID},
            ${brandId},
            ${manifest?.status || "created"},
            ${manifest?.model || process.env.OPENAI_MODEL || "gpt-5.4-mini"},
            ${JSON.stringify(input || {})},
            ${JSON.stringify(manifest || {})},
            ${manifest?.createdAt || input?.createdAt || nowIso()},
            ${manifest?.updatedAt || input?.updatedAt || nowIso()}
          )
          on conflict (id) do update set
            brand_id = excluded.brand_id,
            status = excluded.status,
            model = excluded.model,
            input = excluded.input,
            manifest = excluded.manifest,
            updated_at = excluded.updated_at
        `;

        importedRuns += 1;

        const artifactFiles = await readdir(runDir, { withFileTypes: true });
        for (const artifactFile of artifactFiles) {
          if (!artifactFile.isFile() || !artifactFile.name.endsWith(".json")) {
            continue;
          }

          const artifactPath = path.join(runDir, artifactFile.name);
          const payload = await readJsonFile(artifactPath).catch(() => null);
          if (!payload) {
            continue;
          }

          const markdownPath = artifactFile.name === "blog.json" ? path.join(runDir, "blog.md") : null;
          let markdownText = null;
          if (markdownPath) {
            try {
              markdownText = await readFile(markdownPath, "utf8");
            } catch {
              markdownText = null;
            }
          }

          await sql`
            insert into run_artifacts (id, run_id, artifact_type, payload, markdown_text, created_at, updated_at)
            values (
              ${`${runEntry.name}_${artifactFile.name}`},
              ${runEntry.name},
              ${artifactFile.name},
              ${JSON.stringify(payload)},
              ${markdownText},
              ${payload.createdAt || nowIso()},
              ${payload.updatedAt || nowIso()}
            )
            on conflict (run_id, artifact_type) do update set
              payload = excluded.payload,
              markdown_text = excluded.markdown_text,
              updated_at = excluded.updated_at
          `;
          importedArtifacts += 1;
        }
      } catch (error) {
        console.warn(`Skipping run ${runEntry.name}:`, error?.message || error);
      }
    }
  } catch {
    return { importedRuns, importedArtifacts };
  }

  return { importedRuns, importedArtifacts };
}

async function backfillSocialProjects() {
  let importedProjects = 0;
  let importedPlatforms = 0;

  try {
    const projectDirs = await readdir(socialRoot, { withFileTypes: true });
    for (const projectEntry of projectDirs) {
      if (!projectEntry.isDirectory()) {
        continue;
      }

      const projectPath = path.join(socialRoot, projectEntry.name, "project.json");
      try {
        const project = await readJsonFile(projectPath);
        await sql`
          insert into social_projects (id, organization_id, brand_id, title, source, research, notes, created_at, updated_at)
          values (
            ${project.projectId}, ${DEFAULT_ORG_ID}, ${null}, ${project.title},
            ${JSON.stringify(project.source)}, ${project.research ? JSON.stringify(project.research) : null},
            ${project.notes || ""}, ${project.createdAt || nowIso()}, ${project.updatedAt || nowIso()}
          )
          on conflict (id) do update set
            title = excluded.title,
            source = excluded.source,
            research = excluded.research,
            notes = excluded.notes,
            updated_at = excluded.updated_at
        `;
        importedProjects += 1;

        for (const platform of project.platforms || []) {
          await sql`
            insert into social_project_platforms (id, project_id, platform, record, created_at, updated_at)
            values (
              ${`${project.projectId}_${platform.platform}`},
              ${project.projectId},
              ${platform.platform},
              ${JSON.stringify(platform)},
              ${platform.createdAt || nowIso()},
              ${platform.updatedAt || nowIso()}
            )
            on conflict (project_id, platform) do update set
              record = excluded.record,
              updated_at = excluded.updated_at
          `;
          importedPlatforms += 1;
        }
      } catch (error) {
        console.warn(`Skipping social project ${projectEntry.name}:`, error?.message || error);
      }
    }
  } catch {
    return { importedProjects, importedPlatforms };
  }

  return { importedProjects, importedPlatforms };
}

async function ensureOAuthStates() {
  const linkedInStatesPath = path.join(dataRoot, "linkedin", "oauth-states.json");
  const socialStatesPath = path.join(dataRoot, "social", "oauth-states.json");

  try {
    const linkedInStates = await readJsonFile(linkedInStatesPath);
    for (const state of linkedInStates?.states || []) {
      await sql`
        insert into oauth_states (
          id, provider, state, entity_type, entity_id, redirect_uri, code_verifier, expires_at, created_at, updated_at
        )
        values (
          ${`oauth_${state.state}`}, ${"linkedin"}, ${state.state}, ${"run"}, ${state.runId},
          ${state.redirectUri}, ${null}, ${state.expiresAt}, ${state.createdAt || nowIso()}, ${nowIso()}
        )
        on conflict (state) do update set
          entity_id = excluded.entity_id,
          redirect_uri = excluded.redirect_uri,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `;
    }
  } catch {
    // ignore missing file
  }

  try {
    const socialStates = await readJsonFile(socialStatesPath);
    for (const state of socialStates?.states || []) {
      await sql`
        insert into oauth_states (
          id, provider, state, entity_type, entity_id, redirect_uri, code_verifier, expires_at, created_at, updated_at
        )
        values (
          ${`oauth_${state.state}`}, ${state.platform || "social"}, ${state.state}, ${"social_project"}, ${state.projectId},
          ${state.redirectUri}, ${state.codeVerifier || null}, ${state.expiresAt}, ${state.createdAt || nowIso()}, ${nowIso()}
        )
        on conflict (state) do update set
          entity_id = excluded.entity_id,
          redirect_uri = excluded.redirect_uri,
          code_verifier = excluded.code_verifier,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `;
    }
  } catch {
    // ignore missing file
  }
}

await ensureOrg();

const brandCount = await backfillBrandGuidelines();
const { importedRuns, importedArtifacts } = await backfillRuns();
const { importedProjects, importedPlatforms } = await backfillSocialProjects();
await ensureOAuthStates();

console.log(
  JSON.stringify(
    {
      brandCount,
      importedRuns,
      importedArtifacts,
      importedProjects,
      importedPlatforms
    },
    null,
    2
  )
);

await sql.end();
