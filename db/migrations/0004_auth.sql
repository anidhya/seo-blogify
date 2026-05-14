create table if not exists auth_accounts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  provider_account_id text not null,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);

create index if not exists auth_accounts_user_id_idx on auth_accounts (user_id);
create index if not exists auth_accounts_email_idx on auth_accounts (email);

create table if not exists auth_magic_links (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  next_path text not null default '/',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_magic_links_user_id_idx on auth_magic_links (user_id);
create index if not exists auth_magic_links_email_idx on auth_magic_links (email);
create index if not exists auth_magic_links_expires_at_idx on auth_magic_links (expires_at);
