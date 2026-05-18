create table if not exists social_assets (
  id text primary key,
  project_id text not null references social_projects(id) on delete cascade,
  asset_path text not null unique,
  mime_type text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_assets_project_id_idx on social_assets (project_id);
