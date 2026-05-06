create extension if not exists vector;

create table if not exists users (
  id text primary key,
  email text not null unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organizations (
  id text primary key,
  slug text not null unique,
  name text not null,
  owner_user_id text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memberships (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists brands (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  domain text not null unique,
  name text not null,
  summary text not null default '',
  guidance_text text not null default '',
  source_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brand_documents (
  id text primary key,
  brand_id text not null references brands(id) on delete cascade,
  snapshot_id text,
  source_type text not null,
  file_name text,
  mime_type text,
  checksum text,
  storage_url text,
  extracted_text text not null default '',
  snapshot jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brand_chunks (
  id text primary key,
  brand_id text not null references brands(id) on delete cascade,
  document_id text references brand_documents(id) on delete cascade,
  source_type text not null,
  source_ref text not null,
  chunk_index integer not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, source_ref, chunk_index)
);

create index if not exists brand_chunks_brand_id_idx on brand_chunks (brand_id);
create index if not exists brand_chunks_source_type_idx on brand_chunks (source_type);

create table if not exists runs (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  brand_id text references brands(id) on delete set null,
  status text not null check (status in ('created', 'analyzed', 'topics', 'approved', 'publish_ready', 'needs_review')),
  model text not null,
  input jsonb not null,
  manifest jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists run_artifacts (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  artifact_type text not null,
  payload jsonb not null,
  markdown_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, artifact_type)
);

create index if not exists run_artifacts_run_id_idx on run_artifacts (run_id);
create index if not exists run_artifacts_type_idx on run_artifacts (artifact_type);

create table if not exists social_projects (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  brand_id text references brands(id) on delete set null,
  title text not null,
  source jsonb not null,
  research jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists social_project_platforms (
  id text primary key,
  project_id text not null references social_projects(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin', 'x')),
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, platform)
);

create index if not exists social_projects_org_id_idx on social_projects (organization_id);
create index if not exists social_project_platforms_project_id_idx on social_project_platforms (project_id);

create table if not exists oauth_connections (
  id text primary key,
  organization_id text references organizations(id) on delete cascade,
  provider text not null check (provider in ('linkedin', 'instagram', 'x')),
  account_name text,
  handle text,
  account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  page_id text,
  instagram_business_account_id text,
  profile_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists oauth_states (
  id text primary key,
  provider text not null check (provider in ('linkedin', 'instagram', 'x', 'social')),
  state text not null unique,
  entity_type text not null,
  entity_id text not null,
  redirect_uri text not null,
  code_verifier text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oauth_states_provider_idx on oauth_states (provider);
