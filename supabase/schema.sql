-- ============================================================================
-- PACKVEDA — Supabase schema prep (mirrors prisma/schema.prisma)
-- ============================================================================
-- Run this in the Supabase SQL editor when the project is created. It mirrors
-- the six Prisma models the app uses today, adds an `owner_id` column on
-- user-data tables for row-level security, and installs RLS policies that
-- replicate the server-side role scoping already enforced by the API routes:
--
--   Buyer  → only their own analyses / saved items / trials / requests
--   Seller → only their own listings; can respond to requests addressed to them
--   Public → read access to active supplier listings only
--
-- NOTE: policies use auth.jwt() ->> 'email' to match PackVeda's lightweight
-- email identity. Once Supabase Auth is wired, the same claim is populated
-- automatically for authenticated users. The service-role key bypasses RLS
-- and is intended for trusted server jobs only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper: email claim of the current Supabase Auth session
create or replace function public.auth_email()
returns text
language sql
stable
as $$
  select nullif(lower(trim(auth.jwt() ->> 'email')), '');
$$;

-- ---------------------------------------------------------------------------
-- profiles — lightweight identity (buyer | seller). Maps to future auth users.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id         text primary key default gen_random_uuid()::text,
  role       text not null check (role in ('buyer', 'seller')),
  name       text not null,
  email      text not null unique,
  company    text not null default '',
  phone      text not null default '',
  location   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth_email() = lower(email));

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth_email() = lower(email));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth_email() = lower(email));

-- ---------------------------------------------------------------------------
-- analyses — one completed analysis run (inputs + engine result snapshot)
-- ---------------------------------------------------------------------------

create table if not exists public.analyses (
  id          text primary key default gen_random_uuid()::text,
  label       text not null,
  commodity   text not null default '',
  inputs_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  owner_id    uuid references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists analyses_owner_idx on public.analyses (owner_id, created_at desc);

drop trigger if exists analyses_updated_at on public.analyses;
create trigger analyses_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

alter table public.analyses enable row level security;

drop policy if exists "analyses: owner full access" on public.analyses;
create policy "analyses: owner full access" on public.analyses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- saved_candidates — packaging candidates saved by the buyer
-- ---------------------------------------------------------------------------

create table if not exists public.saved_candidates (
  id            text primary key default gen_random_uuid()::text,
  analysis_id   text references public.analyses (id) on delete set null,
  material_id   text not null,
  material_name text not null,
  commodity     text not null default '',
  score         double precision,
  notes         text,
  owner_id      uuid references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists saved_candidates_owner_idx on public.saved_candidates (owner_id, created_at desc);

drop trigger if exists saved_candidates_updated_at on public.saved_candidates;
create trigger saved_candidates_updated_at
  before update on public.saved_candidates
  for each row execute function public.set_updated_at();

alter table public.saved_candidates enable row level security;

drop policy if exists "saved_candidates: owner full access" on public.saved_candidates;
create policy "saved_candidates: owner full access" on public.saved_candidates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- trials — user-entered validation records (distinct from AI output)
-- ---------------------------------------------------------------------------

create table if not exists public.trials (
  id                 text primary key default gen_random_uuid()::text,
  saved_candidate_id text references public.saved_candidates (id) on delete set null,
  material_id        text not null,
  material_name      text not null,
  commodity          text not null default '',
  status             text not null default 'not_tested'
                     check (status in ('not_tested', 'planned', 'in_progress', 'validated', 'rejected')),
  data_json          jsonb not null default '{}'::jsonb,
  notes              text,
  owner_id           uuid references auth.users (id) on delete cascade,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists trials_owner_idx on public.trials (owner_id, created_at desc);

drop trigger if exists trials_updated_at on public.trials;
create trigger trials_updated_at
  before update on public.trials
  for each row execute function public.set_updated_at();

alter table public.trials enable row level security;

drop policy if exists "trials: owner full access" on public.trials;
create policy "trials: owner full access" on public.trials
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- supplier_materials — packaging listings published by sellers.
-- Barrier values are SELLER-DECLARED: null => "verification required".
-- They never overwrite the knowledge-base engine data.
-- ---------------------------------------------------------------------------

create table if not exists public.supplier_materials (
  id                     text primary key default gen_random_uuid()::text,
  supplier_email         text not null,
  company_name           text not null,
  material_name          text not null,
  structure              text not null default '',
  form                   text not null default 'film_flexible'
                         check (form in ('film_flexible', 'laminate_flexible', 'semi_rigid', 'rigid', 'paper_based')),
  thickness_micron       double precision,
  otr                    double precision,
  wvtr                   double precision,
  co2tr                  double precision,
  otr_provided           boolean not null default false,
  wvtr_provided          boolean not null default false,
  co2tr_provided         boolean not null default false,
  tensile_strength_mpa   double precision,
  sealability            text not null default 'moderate'
                         check (sealability in ('none', 'low', 'moderate', 'high', 'very_high')),
  aroma_barrier          text not null default 'low',
  light_blocking         text not null default 'low',
  temp_min_c             double precision,
  temp_max_c             double precision,
  food_contact_suitable  boolean not null default true,
  food_applications      text not null default '',
  moq                    text not null default '',
  price_range            text not null default '',
  formats                text not null default '',
  sustainability_note    text not null default '',
  documents_note         text not null default '',
  location               text not null default '',
  contact_info           text not null default '',
  status                 text not null default 'active' check (status in ('active', 'paused')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists supplier_materials_email_idx on public.supplier_materials (supplier_email);
create index if not exists supplier_materials_status_idx on public.supplier_materials (status);

drop trigger if exists supplier_materials_updated_at on public.supplier_materials;
create trigger supplier_materials_updated_at
  before update on public.supplier_materials
  for each row execute function public.set_updated_at();

alter table public.supplier_materials enable row level security;

drop policy if exists "supplier_materials: public read active listings" on public.supplier_materials;
create policy "supplier_materials: public read active listings" on public.supplier_materials
  for select using (status = 'active' or auth_email() = lower(supplier_email));

drop policy if exists "supplier_materials: seller insert own" on public.supplier_materials;
create policy "supplier_materials: seller insert own" on public.supplier_materials
  for insert with check (auth_email() = lower(supplier_email));

drop policy if exists "supplier_materials: seller update own" on public.supplier_materials;
create policy "supplier_materials: seller update own" on public.supplier_materials
  for update using (auth_email() = lower(supplier_email));

drop policy if exists "supplier_materials: seller delete own" on public.supplier_materials;
create policy "supplier_materials: seller delete own" on public.supplier_materials
  for delete using (auth_email() = lower(supplier_email));

-- ---------------------------------------------------------------------------
-- pack_requests — sample / quote requests between buyers and sellers
-- ---------------------------------------------------------------------------

create table if not exists public.pack_requests (
  id                   text primary key default gen_random_uuid()::text,
  type                 text not null check (type in ('sample', 'quote')),
  status               text not null default 'pending' check (status in ('pending', 'responded', 'closed')),
  buyer_email          text not null,
  buyer_name           text not null,
  buyer_company        text not null default '',
  supplier_email       text not null,
  supplier_material_id text not null,
  material_name        text not null,
  company_name         text not null,
  commodity            text not null default '',
  message              text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists pack_requests_buyer_idx on public.pack_requests (buyer_email);
create index if not exists pack_requests_supplier_idx on public.pack_requests (supplier_email);

drop trigger if exists pack_requests_updated_at on public.pack_requests;
create trigger pack_requests_updated_at
  before update on public.pack_requests
  for each row execute function public.set_updated_at();

alter table public.pack_requests enable row level security;

drop policy if exists "pack_requests: participants read" on public.pack_requests;
create policy "pack_requests: participants read" on public.pack_requests
  for select using (auth_email() in (lower(buyer_email), lower(supplier_email)));

drop policy if exists "pack_requests: buyer creates" on public.pack_requests;
create policy "pack_requests: buyer creates" on public.pack_requests
  for insert with check (auth_email() = lower(buyer_email));

drop policy if exists "pack_requests: owning seller updates" on public.pack_requests;
create policy "pack_requests: owning seller updates" on public.pack_requests
  for update using (auth_email() = lower(supplier_email));

-- ---------------------------------------------------------------------------
-- analysis_sources — Evidence & Sources traceability layer (Task 16)
-- One row per (source, evidenced claim) attached to an analysis. Structured
-- citations instead of plain AI text; mirrors the Prisma AnalysisSource model.
-- ADDITIVE ONLY — existing tables and policies are untouched.
-- ---------------------------------------------------------------------------

create table if not exists public.analysis_sources (
  id                  text primary key default gen_random_uuid()::text,
  analysis_id         text not null references public.analyses (id) on delete cascade,
  source_type         text not null, -- regulatory | standards | scientific | technical | database | validation
  source_name         text not null, -- full authority / publication name
  title               text not null default '',
  description         text not null default '',
  url                 text,          -- null => source unavailable (never a fabricated link)
  publication_year    integer,
  source_version      text,
  parameter_supported text not null default '',
  confidence_level    text not null default 'medium', -- high | medium | low
  parameter           text not null default '',       -- claim this row evidences (e.g. 'OTR')
  claim               text not null default '',
  value               text,          -- null => value not available
  origin              text not null default 'source_derived', -- source_derived | ai_inferred | user_provided | estimated
  accessed_at         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists analysis_sources_analysis_idx
  on public.analysis_sources (analysis_id, created_at);

-- Owner access follows the parent analysis row (same ownership rule — no
-- changes to any existing policy).
alter table public.analysis_sources enable row level security;

drop policy if exists "analysis_sources: owner of analysis full access" on public.analysis_sources;
create policy "analysis_sources: owner of analysis full access" on public.analysis_sources
  for all
  using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id and a.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Done. When wiring the app to Supabase, keep the anon key in the browser
-- (RLS-enforced) and the service-role key strictly in server API routes.
-- ============================================================================
