import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";

const DEFAULT_ORGANIZATION_ID = "workspace-default";
const DEFAULT_ORGANIZATION_SLUG = "workspace";
const DEFAULT_ORGANIZATION_NAME = "Workspace";

type AuthUserRecord = {
  id: string;
  email: string;
  name: string | null;
};

async function ensureDefaultOrganization(userId: string) {
  const db = getDb();
  if (!db) {
    return;
  }

  const rows = await db`
    select owner_user_id
    from organizations
    where id = ${DEFAULT_ORGANIZATION_ID}
    limit 1
  `;
  const role = rows[0]?.owner_user_id ? "member" : "owner";

  await db`
    insert into organizations (id, slug, name, owner_user_id, created_at, updated_at)
    values (${DEFAULT_ORGANIZATION_ID}, ${DEFAULT_ORGANIZATION_SLUG}, ${DEFAULT_ORGANIZATION_NAME}, ${userId}, now(), now())
    on conflict (id) do update set
      owner_user_id = coalesce(organizations.owner_user_id, excluded.owner_user_id),
      updated_at = excluded.updated_at
  `;

  await db`
    insert into memberships (id, organization_id, user_id, role, created_at, updated_at)
    values (
      ${`membership_${DEFAULT_ORGANIZATION_ID}_${userId}`},
      ${DEFAULT_ORGANIZATION_ID},
      ${userId},
      ${role},
      now(),
      now()
    )
    on conflict (organization_id, user_id) do update set
      updated_at = excluded.updated_at
  `;
}

async function upsertUser(email: string, name: string | null) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required for authentication.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db`
    select id, email, name
    from users
    where email = ${normalizedEmail}
    limit 1
  `;

  if (existing[0]) {
    const user = existing[0] as AuthUserRecord;
    await db`
      update users
      set name = coalesce(${name}, name),
          updated_at = now()
      where id = ${user.id}
    `;
    return { ...user, name: name ?? user.name };
  }

  const userId = `user_${randomUUID()}`;
  await db`
    insert into users (id, email, name, created_at, updated_at)
    values (${userId}, ${normalizedEmail}, ${name}, now(), now())
  `;

  return { id: userId, email: normalizedEmail, name };
}

export async function upsertGoogleIdentity(params: {
  providerAccountId: string;
  email: string;
  name: string | null;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required for authentication.");
  }

  const user = await upsertUser(params.email, params.name);

  await db`
    insert into auth_accounts (id, user_id, provider, provider_account_id, email, name, created_at, updated_at)
    values (
      ${`auth_google_${params.providerAccountId}`},
      ${user.id},
      ${"google"},
      ${params.providerAccountId},
      ${user.email},
      ${user.name},
      now(),
      now()
    )
    on conflict (provider, provider_account_id) do update set
      user_id = excluded.user_id,
      email = excluded.email,
      name = excluded.name,
      updated_at = excluded.updated_at
  `;

  await ensureDefaultOrganization(user.id);
  return user;
}

export async function getUserByGoogleAccount(providerAccountId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`
    select u.id, u.email, u.name
    from auth_accounts a
    join users u on u.id = a.user_id
    where a.provider = ${"google"}
      and a.provider_account_id = ${providerAccountId}
    limit 1
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string | null
  };
}

export async function createMagicLinkRequest(params: {
  email: string;
  name?: string | null;
  tokenHash: string;
  nextPath: string;
  expiresAt: string;
  createdAt: string;
}) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required for authentication.");
  }

  const user = await upsertUser(params.email, params.name ?? null);

  await db`
    insert into auth_magic_links (
      id, user_id, email, token_hash, next_path, expires_at, consumed_at, created_at, updated_at
    )
    values (
      ${`magic_${params.tokenHash}`},
      ${user.id},
      ${user.email},
      ${params.tokenHash},
      ${params.nextPath.startsWith("/") ? params.nextPath : "/"},
      ${params.expiresAt},
      null,
      ${params.createdAt},
      ${params.createdAt}
    )
    on conflict (token_hash) do update set
      user_id = excluded.user_id,
      email = excluded.email,
      next_path = excluded.next_path,
      expires_at = excluded.expires_at,
      consumed_at = null,
      updated_at = excluded.updated_at
  `;

  await ensureDefaultOrganization(user.id);
  return user;
}

export async function consumeMagicLinkRequest(tokenHash: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db`
    update auth_magic_links
    set consumed_at = now(),
        updated_at = now()
    where token_hash = ${tokenHash}
      and consumed_at is null
      and expires_at > now()
    returning user_id, email, next_path
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  const userRows = await db`
    select id, email, name
    from users
    where id = ${row.user_id}
    limit 1
  `;
  const user = userRows[0];
  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string | null
    },
    nextPath: (row.next_path as string) || "/"
  };
}
