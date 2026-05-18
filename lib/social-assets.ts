import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";

export type SocialAssetRecord = {
  assetPath: string;
  projectId: string;
  mimeType: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

export async function saveSocialAsset(params: {
  assetPath: string;
  projectId: string;
  mimeType: string;
  body: string;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required to store social assets.");
  }

  const timestamp = nowIso();
  await db`
    insert into social_assets (
      id, project_id, asset_path, mime_type, body, created_at, updated_at
    )
    values (
      ${`social_asset_${randomUUID().slice(0, 8)}`},
      ${params.projectId},
      ${params.assetPath},
      ${params.mimeType},
      ${params.body},
      ${timestamp},
      ${timestamp}
    )
    on conflict (asset_path) do update set
      project_id = excluded.project_id,
      mime_type = excluded.mime_type,
      body = excluded.body,
      updated_at = excluded.updated_at
  `;
}

export async function loadSocialAsset(assetPath: string) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required to load social assets.");
  }

  const rows = await db`
    select asset_path, project_id, mime_type, body, created_at, updated_at
    from social_assets
    where asset_path = ${assetPath}
    limit 1
  `;

  const row = rows[0] ?? null;
  if (!row) {
    return null;
  }

  return {
    assetPath: row.asset_path,
    projectId: row.project_id,
    mimeType: row.mime_type,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies SocialAssetRecord;
}
