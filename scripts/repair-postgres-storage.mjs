import postgres from "postgres";
import process from "node:process";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to repair storage rows.");
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

const dryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

const artifactAliases = {
  "analysis.json": "analysis",
  "approved-articles.json": "approved-articles",
  "approved-topic.json": "approved-topic",
  "approvals.json": "approvals",
  "blog-revisions.json": "blog-revisions",
  "blog.json": "blog",
  "brand-guidelines.json": "brand-guidelines",
  "existing-topics.json": "existing-topics",
  "linkedin.json": "linkedin",
  "quality.json": "quality",
  "regeneration-notes.json": "regeneration-notes",
  "research.json": "research",
  "topic-candidates.json": "topic-candidates",
  "topic-research.json": "topic-research",
  "topic-validation.json": "topic-validation",
  "topics.json": "topics"
};

function parseJson(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

function normalizeArtifactType(artifactType) {
  return artifactAliases[artifactType] || artifactType.replace(/\.json$/, "");
}

function normalizeSteps(steps) {
  const current = steps && typeof steps === "object" && !Array.isArray(steps) ? steps : {};
  return {
    input: Boolean(current.input ?? false),
    research: Boolean(current.research ?? false),
    analysis: Boolean(current.analysis ?? false),
    topics: Boolean(current.topics ?? false),
    approvedTopic: Boolean(current.approvedTopic ?? false),
    blog: Boolean(current.blog ?? false),
    linkedin: Boolean(current.linkedin ?? false)
  };
}

function repairManifest(manifest) {
  const payload = parseJson(manifest);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { changed: false, repaired: null, reason: "not_an_object" };
  }

  const value = payload;
  const required = ["runId", "schemaVersion", "model", "createdAt", "updatedAt", "status"];
  for (const key of required) {
    if (typeof value[key] !== "string") {
      return { changed: false, repaired: null, reason: `missing_${key}` };
    }
  }

  const repaired = {
    ...value,
    steps: normalizeSteps(value.steps)
  };

  return {
    changed: JSON.stringify(repaired) !== JSON.stringify(value),
    repaired,
    reason: null
  };
}

async function repairArtifactTypes() {
  const rows = await sql`
    select id, run_id, artifact_type, payload, markdown_text
    from run_artifacts
    where artifact_type like ${"%.json"}
    order by run_id, artifact_type
  `;

  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const row of rows) {
    const canonicalType = normalizeArtifactType(row.artifact_type);
    if (canonicalType === row.artifact_type) {
      continue;
    }

    const canonicalRows = await sql`
      select id, payload, markdown_text
      from run_artifacts
      where run_id = ${row.run_id}
        and artifact_type = ${canonicalType}
      limit 1
    `;

    const canonicalRow = canonicalRows[0] ?? null;
    if (canonicalRow) {
      const samePayload = JSON.stringify(parseJson(canonicalRow.payload)) === JSON.stringify(parseJson(row.payload));
      const sameMarkdown = (canonicalRow.markdown_text ?? null) === (row.markdown_text ?? null);
      if (samePayload && sameMarkdown) {
        if (!dryRun) {
          await sql`delete from run_artifacts where id = ${row.id}`;
        }
        deleted += 1;
      } else {
        conflicts += 1;
      }
      continue;
    }

    if (!dryRun) {
      await sql`
        update run_artifacts
        set id = ${`${row.run_id}_${canonicalType}`},
            artifact_type = ${canonicalType},
            updated_at = now()
        where id = ${row.id}
      `;
    }
    updated += 1;
  }

  return { updated, deleted, skipped, conflicts };
}

async function repairRunManifests() {
  const rows = await sql`
    select id, manifest
    from runs
    where manifest is not null
  `;

  let repaired = 0;
  let skipped = 0;

  for (const row of rows) {
    const result = repairManifest(row.manifest);
    if (!result.repaired) {
      skipped += 1;
      continue;
    }

    if (result.changed && !dryRun) {
      await sql`
        update runs
        set manifest = ${JSON.stringify(result.repaired)},
            updated_at = now()
        where id = ${row.id}
      `;
    }

    if (result.changed) {
      repaired += 1;
    }
  }

  return { repaired, skipped };
}

await sql`select 1`;

const [artifactResult, manifestResult] = await Promise.all([
  repairArtifactTypes(),
  repairRunManifests()
]);

console.log(
  JSON.stringify(
    {
      dryRun,
      artifactResult,
      manifestResult
    },
    null,
    2
  )
);

await sql.end();
