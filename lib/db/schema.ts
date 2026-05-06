export const DEFAULT_VECTOR_DIMENSION = 1536;
export const DEFAULT_ORGANIZATION_ID = "workspace-default";
export const DEFAULT_ORGANIZATION_SLUG = "workspace";

export type TimestampedRow = {
  created_at: string;
  updated_at: string;
};

export type UserRow = TimestampedRow & {
  id: string;
  email: string;
  name: string | null;
};

export type OrganizationRow = TimestampedRow & {
  id: string;
  slug: string;
  name: string;
  owner_user_id: string | null;
};

export type MembershipRow = TimestampedRow & {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
};

export type BrandRow = TimestampedRow & {
  id: string;
  organization_id: string;
  domain: string;
  name: string;
  summary: string;
  guidance_text: string;
  source_run_id: string | null;
};

export type BrandDocumentRow = TimestampedRow & {
  id: string;
  brand_id: string;
  snapshot_id: string | null;
  source_type: string;
  file_name: string | null;
  mime_type: string | null;
  checksum: string | null;
  storage_url: string | null;
  extracted_text: string;
  snapshot: unknown | null;
  metadata: Record<string, unknown>;
};

export type BrandChunkRow = TimestampedRow & {
  id: string;
  brand_id: string;
  document_id: string | null;
  source_type: string;
  source_ref: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
};

export type RunRow = TimestampedRow & {
  id: string;
  organization_id: string;
  brand_id: string | null;
  status: "created" | "analyzed" | "topics" | "approved" | "publish_ready" | "needs_review";
  model: string;
  input: unknown;
  manifest: unknown;
};

export type RunArtifactRow = TimestampedRow & {
  id: string;
  run_id: string;
  artifact_type: string;
  payload: unknown;
  markdown_text: string | null;
};

export type SocialProjectRow = TimestampedRow & {
  id: string;
  organization_id: string;
  brand_id: string | null;
  title: string;
  source: unknown;
  research: unknown | null;
  notes: string;
};

export type SocialProjectPlatformRow = TimestampedRow & {
  id: string;
  project_id: string;
  platform: "instagram" | "linkedin" | "x";
  record: unknown;
};

export type OAuthConnectionRow = TimestampedRow & {
  id: string;
  organization_id: string | null;
  provider: "linkedin" | "instagram" | "x";
  account_name: string | null;
  handle: string | null;
  account_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  page_id: string | null;
  instagram_business_account_id: string | null;
  profile_url: string | null;
};

export type OAuthStateRow = TimestampedRow & {
  id: string;
  provider: "linkedin" | "instagram" | "x" | "social";
  state: string;
  entity_type: string;
  entity_id: string;
  redirect_uri: string;
  code_verifier: string | null;
  expires_at: string;
};
