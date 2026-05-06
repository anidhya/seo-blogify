import postgres, { type Sql } from "postgres";

let client: Sql | null = null;

function shouldUseSsl(databaseUrl: string) {
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }

  try {
    const url = new URL(databaseUrl);
    return !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  if (!client) {
    client = postgres(databaseUrl, {
      max: Number(process.env.DATABASE_POOL_SIZE || 5),
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: shouldUseSsl(databaseUrl) ? "require" : undefined,
      prepare: false
    });
  }

  return client;
}

export async function closeDb() {
  if (!client) {
    return;
  }

  await client.end();
  client = null;
}
