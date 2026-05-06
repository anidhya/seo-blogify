import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to verify migrations.");
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

const dataRoot = path.join(process.cwd(), "data");
const runsRoot = path.join(dataRoot, "runs");
const socialRoot = path.join(dataRoot, "social");
const brandGuidelinesRoot = path.join(dataRoot, "brand-guidelines");

const fileCounts = {
  runs: 0,
  social: 0,
  brandGuidelines: 0
};

async function countJsonFiles(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    let total = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        total += await countJsonFiles(path.join(root, entry.name));
      } else if (entry.name.endsWith(".json")) {
        total += 1;
      }
    }

    return total;
  } catch {
    return 0;
  }
}

fileCounts.runs = await countJsonFiles(runsRoot);
fileCounts.social = await countJsonFiles(socialRoot);
fileCounts.brandGuidelines = await countJsonFiles(brandGuidelinesRoot);

const dbCounts = {
  runs: Number((await sql`select count(*)::int as count from runs`)[0]?.count || 0),
  runArtifacts: Number((await sql`select count(*)::int as count from run_artifacts`)[0]?.count || 0),
  socialProjects: Number((await sql`select count(*)::int as count from social_projects`)[0]?.count || 0),
  brands: Number((await sql`select count(*)::int as count from brands`)[0]?.count || 0),
  brandDocuments: Number((await sql`select count(*)::int as count from brand_documents`)[0]?.count || 0),
  brandChunks: Number((await sql`select count(*)::int as count from brand_chunks`)[0]?.count || 0)
};

console.log(JSON.stringify({ fileCounts, dbCounts }, null, 2));

await sql.end();
