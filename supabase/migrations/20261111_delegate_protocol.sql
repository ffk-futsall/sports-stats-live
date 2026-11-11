-- Separate operational data from app_data so match reports never change standings.
-- API endpoints must authenticate the caller and scope access to the assigned delegate.
create table if not exists public.protocol_delegates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  first_name text not null check (length(trim(first_name)) between 1 and 100),
  last_name text not null check (length(trim(last_name)) between 1 and 100),
  city text not null check (length(trim(city)) between 1 and 100),
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.protocol_assignments (
  id uuid primary key default gen_random_uuid(),
  delegate_id uuid not null references public.protocol_delegates(id) on delete restrict,
  portal_match_id text not null,
  match_details jsonb not null default '{}'::jsonb,
  state text not null default 'pending' check (state in ('pending','accepted','rejected')),
  rejection_reason text,
  responded_at timestamptz,
  draft jsonb,
  draft_version integer not null default 0 check (draft_version >= 0),
  published boolean not null default false,
  public_snapshot jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (delegate_id, portal_match_id),
  check ((state = 'rejected' and length(trim(coalesce(rejection_reason,''))) between 1 and 1000) or (state <> 'rejected' and rejection_reason is null)),
  check (not published or (state = 'accepted' and public_snapshot is not null))
);
create index if not exists protocol_assignments_delegate_idx on public.protocol_assignments(delegate_id,created_at desc);
create index if not exists protocol_assignments_published_idx on public.protocol_assignments(updated_at desc) where published;
alter table public.protocol_delegates enable row level security;
alter table public.protocol_assignments enable row level security;
revoke all on public.protocol_delegates, public.protocol_assignments from anon, authenticated;
grant all on public.protocol_delegates, public.protocol_assignments to service_role;
