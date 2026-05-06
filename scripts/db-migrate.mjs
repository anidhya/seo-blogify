import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
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

const migrationsDir = path.join(process.cwd(), "db", "migrations");

await sql`
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`;

const appliedRows = await sql`select filename from schema_migrations order by filename`;
const applied = new Set(appliedRows.map((row) => row.filename));

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  if (applied.has(file)) {
    continue;
  }

  const migrationPath = path.join(migrationsDir, file);
  const migrationSql = await readFile(migrationPath, "utf8");
  console.log(`Applying ${file}`);

  await sql.begin(async (tx) => {
    await tx.unsafe(migrationSql);
    await tx`
      insert into schema_migrations (filename)
      values (${file})
      on conflict (filename) do nothing
    `;
  });
}

await sql.end();
