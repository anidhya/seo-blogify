alter table oauth_connections
  add column if not exists entity_type text not null default 'social_project_platform';

alter table oauth_connections
  add column if not exists entity_id text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'oauth_connections_provider_entity_unique'
  ) then
    alter table oauth_connections
      add constraint oauth_connections_provider_entity_unique unique (provider, entity_type, entity_id);
  end if;
end $$;
