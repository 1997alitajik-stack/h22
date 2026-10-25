-- ============================================================================
-- RASTA — سامانه راستا — Initial schema (mission §4, security_spec v2.0)
-- Target: Supabase PostgreSQL. Applied via SQL editor or supabase CLI in order.
-- Conventions:
--   * Business tables live in schema `public`; helper/security functions in `rasta`.
--   * All timestamps are timestamptz (UTC). Jalali dates that users enter as text
--     (e.g. «۱۳۷۰/۰۵/۱۴») are stored as validated text columns with a _jalali
--     suffix — the product UI is Jalali-first; lexical order of the canonical
--     zero-padded format matches chronological order (used in CHECKs).
--   * PII isolation: full national ID / address / unmasked phone live in
--     applicant_sensitive; last salary / reason-for-leaving in employment_sensitive.
--     Both tables are ADMIN-only at the RLS level (security_spec §1).
--   * Audit is append-only: inserts only through rasta.log_audit / rasta.log_audit_client.
-- ============================================================================

create extension if not exists pg_trgm;
create extension if not exists citext;

create schema if not exists rasta;

grant usage on schema rasta to authenticated;
revoke all on schema rasta from anon;

-- ----------------------------------------------------------------------------
-- 1. Enumerated domain types (values follow FRONTEND_DATA_CONTRACT.md)
-- ----------------------------------------------------------------------------
create type public.user_role             as enum ('ADMIN', 'VIEWER');
create type public.account_status        as enum ('ACTIVE', 'INACTIVE');
create type public.verification_status   as enum ('VERIFIED', 'PENDING', 'REJECTED', 'NOT_APPLICABLE');
create type public.group_entity_type     as enum ('PARENT', 'SUBSIDIARY', 'EXTERNAL');
create type public.group_priority        as enum ('VERIFIED_PARENT', 'VERIFIED_SUBSIDIARY', 'PENDING_VERIFICATION', 'NO_GROUP_HISTORY', 'INSUFFICIENT_DATA');
create type public.recruitment_status    as enum ('NEW', 'UNDER_REVIEW', 'INTERVIEWING', 'SHORTLISTED', 'OFFERED', 'HIRED', 'REJECTED', 'ARCHIVED');
create type public.degree_level          as enum ('UNDER_DIPLOMA', 'DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE');
create type public.candidacy_stage       as enum ('NEW', 'SCREENING', 'INTERVIEW', 'SHORTLIST', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
create type public.vacancy_status        as enum ('OPEN', 'IN_PROGRESS', 'FILLED', 'CANCELLED');
create type public.employment_type       as enum ('FULL_TIME', 'PART_TIME', 'CONTRACTUAL', 'PROJECT_BASED');
create type public.attachment_category   as enum ('PRIMARY_RESUME', 'PREVIOUS_RESUME', 'SUPPLEMENTARY_RESUME', 'ID_PHOTO', 'DEGREE_CERTIFICATE', 'TRANSCRIPT', 'TRAINING_CERTIFICATE', 'TECHNICAL_CERTIFICATE', 'ORGANIZATION_RECORD', 'OTHER');
create type public.skill_category        as enum ('TECHNICAL', 'MANAGERIAL', 'GENERAL', 'TOOL_SOFTWARE');
create type public.skill_level           as enum ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
create type public.org_type              as enum ('PARENT', 'SUBSIDIARY');
create type public.org_status            as enum ('ACTIVE', 'INACTIVE');
create type public.project_status        as enum ('ACTIVE', 'COMPLETED', 'PLANNING');
create type public.audit_channel         as enum ('ADMIN_SECURITY', 'CLIENT_ACTIVITY');
create type public.audit_outcome         as enum ('SUCCESS', 'WARNING', 'FAILED');

-- ----------------------------------------------------------------------------
-- 2. Persian normalization + masking helpers (mirror src/lib/persianUtils.ts)
-- ----------------------------------------------------------------------------
create or replace function rasta.normalize_fa(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  -- translate source/target are positionally aligned: يىكةآأإ -> ییکهااا, then
  -- Arabic digits -> ASCII; the trailing diacritics/tatweel have no target and
  -- are therefore deleted by translate().
  select trim(
    regexp_replace(
      regexp_replace(
        translate(
          lower(coalesce(input, '')),
          'يىكةآأإ٠١٢٣٤٥٦٧٨٩' || chr(1611) || chr(1612) || chr(1613) || chr(1614) || chr(1615) || chr(1616) || chr(1617) || chr(1618) || chr(1600),
          'ییکهااا0123456789'
        ),
        chr(8204), ' ', 'g'
      ), '\s+', ' ', 'g'
    )
  );
$$;

create or replace function rasta.mask_national_id(v text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when v is null or length(v) < 4 then null
    else substr(v, 1, 3) || '-******-' || substr(v, -1)
  end;
$$;

create or replace function rasta.mask_phone(v text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when v is null or length(v) < 7 then null
    else substr(v, 1, 4) || '-***-' || substr(v, -4)
  end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Profiles (identity + role). auth.users is the credential source.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        citext not null unique,
  full_name    text not null default '',
  username     text unique,
  role         public.user_role not null default 'VIEWER',
  status       public.account_status not null default 'ACTIVE',
  department   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9._-]{3,60}$')
);

create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);

-- ----------------------------------------------------------------------------
-- 4. Organization structure
-- ----------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name_fa     text not null check (char_length(name_fa) <= 200),
  name_en     text,
  field       text,
  city        text,
  status      public.org_status not null default 'ACTIVE',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  name            text not null,
  city            text,
  type            text,
  status          public.project_status not null default 'ACTIVE',
  start_date      date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index projects_org_idx on public.projects (organization_id);

-- ----------------------------------------------------------------------------
-- 5. Applicants (general profile — no full PII columns by construction)
-- ----------------------------------------------------------------------------
create table public.applicants (
  id                     uuid primary key default gen_random_uuid(),
  seq                    bigint generated always as identity,
  public_code            text unique,
  first_name             text not null check (char_length(first_name) between 1 and 80),
  last_name              text not null check (char_length(last_name) between 1 and 80),
  full_name              text generated always as (first_name || ' ' || last_name) stored,
  father_name            text,
  birth_date_jalali      text check (birth_date_jalali is null or birth_date_jalali ~ '^1[2-5][0-9]{2}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'),
  birth_place            text,
  residential_city       text,
  email                  citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  primary_job_title      text not null check (char_length(primary_job_title) between 2 and 150),
  primary_job_category   text not null,
  years_of_experience    int not null default 0 check (years_of_experience between 0 and 60),
  highest_degree         public.degree_level,
  highest_degree_title   text,
  highest_field_of_study text,
  recruitment_status     public.recruitment_status not null default 'NEW',
  group_priority         public.group_priority not null default 'INSUFFICIENT_DATA',
  group_priority_reason  text not null default '',
  completeness           int not null default 0 check (completeness between 0 and 100),
  full_name_norm         text generated always as (rasta.normalize_fa(first_name || ' ' || last_name)) stored,
  job_title_norm         text generated always as (rasta.normalize_fa(primary_job_title)) stored,
  search_norm            text generated always as (rasta.normalize_fa(
                           first_name || ' ' || last_name || ' ' ||
                           primary_job_title || ' ' || primary_job_category || ' ' ||
                           coalesce(residential_city, '') || ' ' || coalesce(public_code, '')
                         )) stored,
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index applicants_full_name_trgm  on public.applicants using gin (full_name_norm gin_trgm_ops);
create index applicants_job_title_trgm  on public.applicants using gin (job_title_norm gin_trgm_ops);
create index applicants_search_trgm     on public.applicants using gin (search_norm gin_trgm_ops);
create index applicants_city_idx        on public.applicants (residential_city);
create index applicants_category_idx    on public.applicants (primary_job_category);
create index applicants_priority_idx    on public.applicants (group_priority);
create index applicants_recstatus_idx   on public.applicants (recruitment_status);
create index applicants_created_idx     on public.applicants (created_at desc);

-- Isolated PII (security_spec §1.2) — ADMIN only via RLS
create table public.applicant_sensitive (
  applicant_id      uuid primary key references public.applicants (id) on delete cascade,
  national_id       text unique check (national_id is null or national_id ~ '^[0-9]{10}$'),
  home_address      text,
  phone             text check (phone is null or phone ~ '^[0-9]{8,14}$'),
  alternative_phone text check (alternative_phone is null or alternative_phone ~ '^[0-9]{8,14}$'),
  updated_by        uuid references public.profiles (id) on delete set null,
  updated_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. Employment history + isolated salary data + verification history
-- ----------------------------------------------------------------------------
create table public.employment_records (
  id                   uuid primary key default gen_random_uuid(),
  applicant_id         uuid not null references public.applicants (id) on delete cascade,
  employer_name        text not null check (char_length(employer_name) between 1 and 200),
  is_group_entity      boolean not null default false,
  group_entity_type    public.group_entity_type not null default 'EXTERNAL',
  organization_id      uuid references public.organizations (id) on delete set null,
  project_name         text,
  city                 text,
  job_title            text not null check (char_length(job_title) between 1 and 150),
  start_date_jalali    text not null check (start_date_jalali ~ '^1[2-5][0-9]{2}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'),
  end_date_jalali      text check (end_date_jalali is null or end_date_jalali ~ '^1[2-5][0-9]{2}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'),
  is_current           boolean not null default false,
  responsibilities     text,
  search_norm          text generated always as (rasta.normalize_fa(
                         employer_name || ' ' || job_title || ' ' ||
                         coalesce(project_name, '') || ' ' || coalesce(city, '')
                       )) stored,
  verification_status  public.verification_status not null default 'NOT_APPLICABLE',
  verification_notes   text,
  verified_at          timestamptz,
  verified_by          uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint employment_date_order check (
    is_current or end_date_jalali is null or start_date_jalali <= end_date_jalali
  ),
  constraint employment_group_consistency check (
    (is_group_entity and group_entity_type in ('PARENT', 'SUBSIDIARY')) or
    (not is_group_entity and group_entity_type = 'EXTERNAL')
  )
);

create index employment_applicant_idx on public.employment_records (applicant_id);
create index employment_group_idx     on public.employment_records (is_group_entity, group_entity_type);
create index employment_verif_idx     on public.employment_records (verification_status);
create index employment_search_trgm   on public.employment_records using gin (search_norm gin_trgm_ops);

create table public.employment_sensitive (
  employment_record_id uuid primary key references public.employment_records (id) on delete cascade,
  last_salary          text,
  reason_for_leaving   text,
  updated_by           uuid references public.profiles (id) on delete set null,
  updated_at           timestamptz not null default now()
);

-- Append-only verification history (mission §4.3).
-- employment_record_id is nullable ON DELETE SET NULL: removing an employment
-- row must never destroy the historical verification trail.
create table public.verification_history (
  id                   uuid primary key default gen_random_uuid(),
  employment_record_id uuid references public.employment_records (id) on delete set null,
  applicant_id         uuid not null references public.applicants (id) on delete cascade,
  old_status           public.verification_status,
  new_status           public.verification_status not null,
  notes                text,
  changed_by           uuid references public.profiles (id) on delete set null,
  changed_at           timestamptz not null default now()
);

create index verification_history_record_idx on public.verification_history (employment_record_id);
create index verification_history_applicant_idx on public.verification_history (applicant_id);

-- ----------------------------------------------------------------------------
-- 7. Education, certificates, skills, preferences, notes
-- ----------------------------------------------------------------------------
create table public.education_records (
  id               uuid primary key default gen_random_uuid(),
  applicant_id     uuid not null references public.applicants (id) on delete cascade,
  degree_level     public.degree_level not null,
  degree_title     text,
  field_of_study   text,
  institution_name text,
  city             text,
  start_date_jalali text check (start_date_jalali is null or start_date_jalali ~ '^1[2-5][0-9]{2}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'),
  end_date_jalali  text check (end_date_jalali is null or end_date_jalali ~ '^1[2-5][0-9]{2}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'),
  is_studying      boolean not null default false,
  gpa              text,
  notes            text,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index education_applicant_idx on public.education_records (applicant_id);

create table public.certificates (
  id                   uuid primary key default gen_random_uuid(),
  applicant_id         uuid not null references public.applicants (id) on delete cascade,
  title                text not null,
  issuing_organization text,
  issue_date_jalali    text,
  expiry_date_jalali   text,
  certificate_type     text,
  verification_status  public.verification_status not null default 'PENDING',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index certificates_applicant_idx on public.certificates (applicant_id);

create table public.applicant_skills (
  id           uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 100),
  name_norm    text generated always as (rasta.normalize_fa(name)) stored,
  category     public.skill_category not null default 'TECHNICAL',
  level        public.skill_level not null default 'INTERMEDIATE',
  created_at   timestamptz not null default now(),
  constraint applicant_skills_unique_per_applicant unique (applicant_id, name_norm)
);

create index applicant_skills_applicant_idx on public.applicant_skills (applicant_id);
create index applicant_skills_norm_idx on public.applicant_skills using gin (name_norm gin_trgm_ops);

create table public.job_preferences (
  applicant_id           uuid primary key references public.applicants (id) on delete cascade,
  preferred_titles       text[] not null default '{}',
  preferred_cities       text[] not null default '{}',
  willing_to_relocate    boolean not null default false,
  willing_to_travel_sites boolean not null default false,
  employment_types       text[] not null default '{}',
  expected_salary_min    text,
  availability_timeline  text,
  updated_at             timestamptz not null default now()
);

create table public.internal_notes (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid not null references public.applicants (id) on delete cascade,
  author_id       uuid references public.profiles (id) on delete set null,
  author_name     text not null,
  author_role     text not null default '',
  content         text not null check (char_length(content) between 1 and 4000),
  is_confidential boolean not null default false,
  created_at      timestamptz not null default now()
);

create index internal_notes_applicant_idx on public.internal_notes (applicant_id);

-- ----------------------------------------------------------------------------
-- 8. Documents (metadata; binaries in private storage bucket applicant-documents)
-- ----------------------------------------------------------------------------
create table public.attachments (
  id                uuid primary key default gen_random_uuid(),
  applicant_id      uuid not null references public.applicants (id) on delete cascade,
  title             text not null,
  category          public.attachment_category not null,
  original_filename text not null,
  storage_path      text not null unique,
  mime_type         text not null,
  size_bytes        bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  is_primary_resume boolean not null default false,
  version_number    int,
  notes             text,
  uploaded_by       uuid references public.profiles (id) on delete set null,
  uploader_name     text,
  uploaded_at       timestamptz not null default now(),
  constraint attachments_version_positive check (version_number is null or version_number >= 1)
);

create index attachments_applicant_idx on public.attachments (applicant_id);
create index attachments_primary_idx   on public.attachments (applicant_id, is_primary_resume) where is_primary_resume;

-- ----------------------------------------------------------------------------
-- 9. Vacancies + candidacies
-- ----------------------------------------------------------------------------
create table public.vacancies (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique,
  title                  text not null check (char_length(title) between 2 and 200),
  category               text not null,
  organization_type      public.org_type not null default 'SUBSIDIARY',
  organization_id        uuid references public.organizations (id) on delete set null,
  organization_name      text not null default '',
  project_name           text,
  city                   text not null,
  open_positions_count   int not null default 1 check (open_positions_count between 1 and 100),
  employment_type        public.employment_type not null default 'FULL_TIME',
  required_degree        public.degree_level,
  min_years_experience   int not null default 0 check (min_years_experience between 0 and 40),
  required_skills        text[] not null default '{}',
  preferred_skills       text[] not null default '{}',
  description            text,
  responsibilities       text[] not null default '{}',
  salary_range           text,
  search_norm            text generated always as (rasta.normalize_fa(
                           title || ' ' || code || ' ' || category || ' ' ||
                           organization_name || ' ' || city || ' ' || coalesce(project_name, '')
                         )) stored,
  status                 public.vacancy_status not null default 'OPEN',
  opened_at              timestamptz not null default now(),
  closed_at              timestamptz,
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index vacancies_status_idx on public.vacancies (status);
create index vacancies_city_idx   on public.vacancies (city);
create index vacancies_search_trgm on public.vacancies using gin (search_norm gin_trgm_ops);

create table public.candidacies (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid not null references public.applicants (id) on delete cascade,
  vacancy_id      uuid not null references public.vacancies (id) on delete cascade,
  stage           public.candidacy_stage not null default 'NEW',
  notes           text,
  match_score     int check (match_score is null or match_score between 0 and 100),
  match_breakdown jsonb,
  applied_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null,
  constraint candidacies_unique_pair unique (applicant_id, vacancy_id)
);

create index candidacies_vacancy_idx   on public.candidacies (vacancy_id);
create index candidacies_applicant_idx on public.candidacies (applicant_id);
create index candidacies_stage_idx     on public.candidacies (stage);

create table public.candidacy_history (
  id           uuid primary key default gen_random_uuid(),
  candidacy_id uuid not null references public.candidacies (id) on delete cascade,
  old_stage    public.candidacy_stage,
  new_stage    public.candidacy_stage not null,
  notes        text,
  changed_by   uuid references public.profiles (id) on delete set null,
  changed_at   timestamptz not null default now()
);

create index candidacy_history_candidacy_idx on public.candidacy_history (candidacy_id);

-- ----------------------------------------------------------------------------
-- 10. Controlled vocabularies + audit events
-- ----------------------------------------------------------------------------
create table public.vocabularies (
  key        text primary key check (key in ('cities', 'job_categories', 'skill_categories')),
  values     jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  channel           public.audit_channel not null,
  category          text not null,
  actor_id          uuid references public.profiles (id) on delete set null,
  actor_name        text not null default '',
  actor_role        text not null default '',
  record_identifier text,
  summary           text not null,
  details           text,
  severity          text not null default 'LOW' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  outcome           public.audit_outcome not null default 'SUCCESS'
);

create index audit_created_idx   on public.audit_events (created_at desc);
create index audit_category_idx  on public.audit_events (category);
create index audit_actor_idx     on public.audit_events (actor_id);

-- ============================================================================
-- 11. Core functions
-- ============================================================================

-- Current profile helpers. SECURITY DEFINER so RLS on profiles cannot recurse.
create or replace function rasta.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function rasta.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'ACTIVE'
  )
$$;

create or replace function rasta.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ADMIN' and p.status = 'ACTIVE'
  )
$$;

create or replace function rasta.profile_label()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.full_name, p.email, '') || ' (' ||
    case p.role when 'ADMIN' then 'مدیر سامانه' else 'کاربر مشاهده‌گر منابع انسانی' end || ')'
  from public.profiles p where p.id = auth.uid()
$$;

-- updated_at maintenance
create or replace function rasta.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Public code generation: APP-{JalaliYear}-{seq}
create or replace function rasta.set_applicant_public_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.public_code is null then
    new.public_code := 'APP-' ||
      ((to_char(now() at time zone 'Asia/Tehran', 'YYYY')::int) - 621)::text ||
      '-' || new.seq::text;
  end if;
  return new;
end;
$$;

create trigger applicants_public_code
  before insert on public.applicants
  for each row execute function rasta.set_applicant_public_code();

-- New auth user -> profile (default VIEWER; promotion only by admin)
create or replace function rasta.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function rasta.handle_new_user();

-- Deterministic, explainable priority computation (mission §4.3)
create or replace function rasta.compute_priority(
  p_applicant uuid,
  out priority public.group_priority,
  out reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_verified_parent boolean;
  v_verified_sub    boolean;
  v_pending         boolean;
  v_rejected_group  boolean;
  v_any_record      boolean;
begin
  select
    bool_or(e.is_group_entity and e.group_entity_type = 'PARENT' and e.verification_status = 'VERIFIED'),
    bool_or(e.is_group_entity and e.group_entity_type = 'SUBSIDIARY' and e.verification_status = 'VERIFIED'),
    bool_or(e.is_group_entity and e.verification_status = 'PENDING'),
    bool_or(e.is_group_entity and e.verification_status = 'REJECTED'),
    count(*) > 0
  into v_verified_parent, v_verified_sub, v_pending, v_rejected_group, v_any_record
  from public.employment_records e
  where e.applicant_id = p_applicant;

  if v_verified_parent then
    priority := 'VERIFIED_PARENT';
    reason := 'دارای سابقه همکاری تأییدشده در ستاد سازمان مادر';
  elsif v_verified_sub then
    priority := 'VERIFIED_SUBSIDIARY';
    reason := 'دارای سابقه همکاری تأییدشده در شرکت‌های زیرمجموعه سازمان';
  elsif v_pending then
    priority := 'PENDING_VERIFICATION';
    reason := 'سوابق سازمانی در انتظار بررسی و استعلام کارگزینی است';
  elsif v_any_record then
    priority := 'NO_GROUP_HISTORY';
    if v_rejected_group then
      reason := 'سوابق سازمانی اعلام‌شده تأیید نشده است؛ فاقد سابقه تأییدشده در مجموعه';
    else
      reason := 'فاقد سابقه همکاری تأییدشده در مجموعه سازمان';
    end if;
  else
    priority := 'INSUFFICIENT_DATA';
    reason := 'اطلاعات سوابق کاری برای تعیین وضعیت اولویت ناقص است';
  end if;
end;
$$;

create or replace function rasta.refresh_applicant_priority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_applicant uuid;
  v_priority public.group_priority;
  v_reason text;
begin
  v_applicant := coalesce(new.applicant_id, old.applicant_id);

  -- compute_priority has one input argument and returns priority/reason as OUT
  -- columns. Calling it with three arguments raises an undefined-function error.
  select result.priority, result.reason
    into v_priority, v_reason
    from rasta.compute_priority(v_applicant) as result;

  update public.applicants
     set group_priority = v_priority, group_priority_reason = v_reason
   where id = v_applicant;
  return null;
end;
$$;

create trigger employment_priority_refresh
  after insert or update or delete on public.employment_records
  for each row execute function rasta.refresh_applicant_priority();

-- Editing a verified record invalidates its verification until re-review (§4.3)
create or replace function rasta.invalidate_verification_on_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.verification_status = 'VERIFIED'
     and (
       new.employer_name      is distinct from old.employer_name
       or new.job_title       is distinct from old.job_title
       or new.project_name    is distinct from old.project_name
       or new.city            is distinct from old.city
       or new.start_date_jalali is distinct from old.start_date_jalali
       or new.end_date_jalali   is distinct from old.end_date_jalali
       or new.is_current      is distinct from old.is_current
       or new.is_group_entity is distinct from old.is_group_entity
       or new.group_entity_type is distinct from old.group_entity_type
       or new.responsibilities is distinct from old.responsibilities
     ) then
    new.verification_status := 'PENDING';
    new.verified_at := null;
    new.verified_by := null;
    insert into public.verification_history
      (employment_record_id, applicant_id, old_status, new_status, notes, changed_by)
    values
      (new.id, new.applicant_id, 'VERIFIED', 'PENDING',
       'سابقه تأییدشده ویرایش شد؛ نیازمند بررسی مجدد کارگزینی', auth.uid());
  end if;
  return new;
end;
$$;

create trigger employment_invalidate_on_edit
  before update on public.employment_records
  for each row execute function rasta.invalidate_verification_on_edit();

-- Audit writer. Only path with INSERT privilege on audit_events.
create or replace function rasta.log_audit(
  p_channel           public.audit_channel,
  p_category          text,
  p_summary           text,
  p_record_identifier text default null,
  p_details           text default null,
  p_severity          text default 'LOW',
  p_outcome           public.audit_outcome default 'SUCCESS'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.status <> 'ACTIVE' then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_channel = 'ADMIN_SECURITY' and v_profile.role <> 'ADMIN' then
    raise exception 'FORBIDDEN';
  end if;
  if p_channel = 'CLIENT_ACTIVITY' then
    if p_severity <> 'LOW' or p_category not in ('VIEW_RESUME', 'SEARCH_DIRECTORY', 'EXPORT_LIST') then
      raise exception 'INVALID_CLIENT_EVENT';
    end if;
  end if;

  insert into public.audit_events
    (channel, category, actor_id, actor_name, actor_role, record_identifier, summary, details, severity, outcome)
  values
    (p_channel, p_category, v_profile.id, coalesce(nullif(v_profile.full_name, ''), v_profile.email::text),
     case v_profile.role when 'ADMIN' then 'مدیر سامانه' else 'کاربر مشاهده‌گر منابع انسانی' end,
     p_record_identifier, p_summary, p_details, p_severity, p_outcome);
end;
$$;

-- Atomic verification transition (concurrency-safe, admin-only)
create or replace function rasta.set_verification(
  p_record_id uuid,
  p_new_status public.verification_status,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.verification_status;
  v_applicant uuid;
  v_full_name text;
begin
  if not rasta.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_new_status not in ('VERIFIED', 'PENDING', 'REJECTED') then
    raise exception 'INVALID_STATUS';
  end if;
  if p_new_status = 'REJECTED' and coalesce(trim(p_notes), '') = '' then
    raise exception 'REJECTION_REQUIRES_REASON';
  end if;

  select verification_status, applicant_id into v_old, v_applicant
    from public.employment_records where id = p_record_id for update;
  if not found then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  update public.employment_records
     set verification_status = p_new_status,
         verification_notes  = nullif(trim(p_notes), ''),
         verified_at         = case when p_new_status = 'PENDING' then null else now() end,
         verified_by         = case when p_new_status = 'PENDING' then null else auth.uid() end,
         updated_at          = now()
   where id = p_record_id;

  if v_old is distinct from p_new_status then
    insert into public.verification_history
      (employment_record_id, applicant_id, old_status, new_status, notes, changed_by)
    values (p_record_id, v_applicant, v_old, p_new_status, nullif(trim(p_notes), ''), auth.uid());
  end if;

  select a.full_name into v_full_name from public.applicants a where a.id = v_applicant;
  perform rasta.log_audit(
    'ADMIN_SECURITY', 'VERIFICATION',
    'تغییر وضعیت استعلام سابقه شغلی «' || v_full_name || '» به ' ||
      case p_new_status when 'VERIFIED' then 'تأییدشده' when 'PENDING' then 'در انتظار استعلام' else 'ردشده' end,
    p_record_id, nullif(trim(p_notes), ''), 'MEDIUM'
  );
end;
$$;

-- Profile completeness: deterministic share of present key data (mission §4.2)
create or replace function rasta.applicant_completeness(p_applicant uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  with f as (
    select
      (a.father_name is not null and a.father_name <> '')::int
      + (exists (select 1 from public.applicant_sensitive s where s.applicant_id = a.id and s.national_id is not null))::int
      + (a.birth_date_jalali is not null)::int
      + (a.birth_place is not null and a.birth_place <> '')::int
      + (a.residential_city is not null and a.residential_city <> '')::int
      + (exists (select 1 from public.applicant_sensitive s where s.applicant_id = a.id and coalesce(s.home_address, '') <> ''))::int
      + (exists (select 1 from public.applicant_sensitive s where s.applicant_id = a.id and s.phone is not null))::int
      + (a.email is not null)::int
      + (exists (select 1 from public.employment_records e where e.applicant_id = a.id))::int
      + (exists (select 1 from public.education_records ed where ed.applicant_id = a.id))::int
      + (exists (select 1 from public.applicant_skills sk where sk.applicant_id = a.id))::int
      + (exists (select 1 from public.attachments at where at.applicant_id = a.id))::int
      as filled
    from public.applicants a where a.id = p_applicant
  )
  select coalesce(round(filled::numeric / 12 * 100), 0)::int from f
$$;

-- Persisted profile completeness, recomputed whenever any of its 12 inputs
-- changes (mission §4.2). Keeping it a real column lets SQL sort/filter on it.
create or replace function rasta.refresh_completeness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
declare
  v_applicant uuid;
  v_current integer;
  v_expected integer;
begin
  -- applicants stores its own key as id; child tables use applicant_id.
  -- Branch on the table before touching either record's fields, because PL/pgSQL
  -- records only expose columns belonging to their triggering table.
  if tg_table_name = 'applicants' then
    if tg_op = 'DELETE' then
      v_applicant := old.id;
    else
      v_applicant := new.id;
    end if;
  else
    if tg_op = 'DELETE' then
      v_applicant := old.applicant_id;
    else
      v_applicant := new.applicant_id;
    end if;
  end if;

  if v_applicant is null then
    return null;
  end if;

  v_expected := rasta.applicant_completeness(v_applicant);

  select a.completeness
    into v_current
    from public.applicants as a
   where a.id = v_applicant;

  -- This guard is essential: updating completeness fires the applicants trigger
  -- too. A conditional UPDATE lets that nested trigger stop once values match.
  if found and v_current is distinct from v_expected then
    update public.applicants as a
       set completeness = v_expected
     where a.id = v_applicant;
  end if;

  return null;
end;
$;

create trigger completeness_applicants   after insert or update on public.applicants          for each row execute function rasta.refresh_completeness();
create trigger completeness_sensitive    after insert or update on public.applicant_sensitive for each row execute function rasta.refresh_completeness();
create trigger completeness_employment   after insert or update on public.employment_records  for each row execute function rasta.refresh_completeness();
create trigger completeness_education    after insert or update on public.education_records   for each row execute function rasta.refresh_completeness();
create trigger completeness_skills       after insert or update on public.applicant_skills    for each row execute function rasta.refresh_completeness();
create trigger completeness_attachments  after insert or update on public.attachments         for each row execute function rasta.refresh_completeness();

-- ============================================================================
-- 12. RLS + grants
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.organizations       enable row level security;
alter table public.projects            enable row level security;
alter table public.applicants          enable row level security;
alter table public.applicant_sensitive enable row level security;
alter table public.employment_records  enable row level security;
alter table public.employment_sensitive enable row level security;
alter table public.verification_history enable row level security;
alter table public.education_records   enable row level security;
alter table public.certificates        enable row level security;
alter table public.applicant_skills    enable row level security;
alter table public.job_preferences     enable row level security;
alter table public.internal_notes      enable row level security;
alter table public.attachments         enable row level security;
alter table public.vacancies           enable row level security;
alter table public.candidacies         enable row level security;
alter table public.candidacy_history   enable row level security;
alter table public.vocabularies        enable row level security;
alter table public.audit_events        enable row level security;

-- profiles: read own + admins read all; no client-side write at all
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid() or rasta.is_admin());

-- Reference data
create policy orgs_select on public.organizations
  for select to authenticated using (rasta.is_active_user());
create policy orgs_write on public.organizations
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

create policy projects_select on public.projects
  for select to authenticated using (rasta.is_active_user());
create policy projects_write on public.projects
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

create policy vocab_select on public.vocabularies
  for select to authenticated using (rasta.is_active_user());
create policy vocab_write on public.vocabularies
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

-- Applicants: read active users; write admin
create policy applicants_select on public.applicants
  for select to authenticated using (rasta.is_active_user());
create policy applicants_insert on public.applicants
  for insert to authenticated with check (rasta.is_admin());
create policy applicants_update on public.applicants
  for update to authenticated using (rasta.is_admin()) with check (rasta.is_admin());
create policy applicants_delete on public.applicants
  for delete to authenticated using (rasta.is_admin());

-- Sensitive PII: admin only
create policy sensitive_admin on public.applicant_sensitive
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

-- Employment
create policy employment_select on public.employment_records
  for select to authenticated using (rasta.is_active_user());
create policy employment_insert on public.employment_records
  for insert to authenticated with check (rasta.is_admin());
create policy employment_update on public.employment_records
  for update to authenticated using (rasta.is_admin()) with check (rasta.is_admin());
create policy employment_delete on public.employment_records
  for delete to authenticated using (rasta.is_admin());

create policy employment_sensitive_admin on public.employment_sensitive
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

-- Histories: admin read, inserts only via triggers/functions
create policy verification_history_select on public.verification_history
  for select to authenticated using (rasta.is_admin());

-- Education / certificates / skills / preferences
create policy education_select on public.education_records
  for select to authenticated using (rasta.is_active_user());
create policy education_write on public.education_records
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

create policy certificates_select on public.certificates
  for select to authenticated using (rasta.is_active_user());
create policy certificates_write on public.certificates
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

create policy skills_select on public.applicant_skills
  for select to authenticated using (rasta.is_active_user());
create policy skills_write on public.applicant_skills
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

create policy preferences_select on public.job_preferences
  for select to authenticated using (rasta.is_active_user());
create policy preferences_write on public.job_preferences
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

-- Notes: confidential rows admin-only even for SELECT
create policy notes_select on public.internal_notes
  for select to authenticated
  using (rasta.is_admin() or not is_confidential);
create policy notes_insert on public.internal_notes
  for insert to authenticated with check (rasta.is_admin());

-- Attachments
create policy attachments_select on public.attachments
  for select to authenticated using (rasta.is_active_user());
create policy attachments_insert on public.attachments
  for insert to authenticated with check (rasta.is_admin());
create policy attachments_delete on public.attachments
  for delete to authenticated using (rasta.is_admin());

-- Vacancies / candidacies
create policy vacancies_select on public.vacancies
  for select to authenticated using (rasta.is_active_user());
create policy vacancies_write on public.vacancies
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

create policy candidacies_select on public.candidacies
  for select to authenticated using (rasta.is_active_user());
create policy candidacies_insert on public.candidacies
  for insert to authenticated with check (rasta.is_admin());
create policy candidacies_update on public.candidacies
  for update to authenticated using (rasta.is_admin()) with check (rasta.is_admin());

create policy candidacy_history_select on public.candidacy_history
  for select to authenticated using (rasta.is_admin());

-- Audit: immutable; admins read everything (security_spec §2; AuditLogView is
-- an admin screen — documented decision in docs/audit/AUDIT.md §5)
create policy audit_select on public.audit_events
  for select to authenticated using (rasta.is_admin());

-- Lock down table privileges: anon gets nothing; authenticated gets only
-- the operations above (RLS governs rows; DML grants govern statements).
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.organizations, public.projects, public.vocabularies,
  public.applicants, public.employment_records, public.education_records,
  public.certificates, public.applicant_skills, public.job_preferences,
  public.internal_notes, public.attachments, public.vacancies, public.candidacies,
  public.profiles
  to authenticated;

grant insert, update, delete on public.organizations, public.projects, public.vocabularies,
  public.applicants, public.employment_records, public.education_records,
  public.certificates, public.applicant_skills, public.job_preferences,
  public.vacancies, public.candidacies
  to authenticated;

grant insert on public.internal_notes, public.attachments to authenticated;
grant delete on public.applicants, public.attachments to authenticated;
grant select on public.applicant_sensitive, public.employment_sensitive,
  public.verification_history, public.candidacy_history, public.audit_events
  to authenticated;

grant execute on function rasta.log_audit(public.audit_channel, text, text, text, text, text, public.audit_outcome) to authenticated;
grant execute on function rasta.set_verification(uuid, public.verification_status, text) to authenticated;
grant execute on all functions in schema rasta to authenticated;

-- Audit table is INSERT-proof from clients: no INSERT grant anywhere.
revoke insert, update, delete on public.audit_events from authenticated, anon;
revoke insert, update, delete on public.verification_history from authenticated, anon;
revoke insert, update, delete on public.candidacy_history from authenticated, anon;
revoke update, delete on public.internal_notes from authenticated, anon;

-- ============================================================================
-- 13. updated_at triggers
-- ============================================================================
create trigger touch_profiles        before update on public.profiles        for each row execute function rasta.touch_updated_at();
create trigger touch_organizations   before update on public.organizations   for each row execute function rasta.touch_updated_at();
create trigger touch_projects        before update on public.projects        for each row execute function rasta.touch_updated_at();
create trigger touch_applicants      before update on public.applicants      for each row execute function rasta.touch_updated_at();
create trigger touch_applicant_sensitive before update on public.applicant_sensitive for each row execute function rasta.touch_updated_at();
create trigger touch_employment      before update on public.employment_records for each row execute function rasta.touch_updated_at();
create trigger touch_employment_sensitive before update on public.employment_sensitive for each row execute function rasta.touch_updated_at();
create trigger touch_education       before update on public.education_records for each row execute function rasta.touch_updated_at();
create trigger touch_certificates    before update on public.certificates    for each row execute function rasta.touch_updated_at();
create trigger touch_preferences     before update on public.job_preferences for each row execute function rasta.touch_updated_at();
create trigger touch_vacancies       before update on public.vacancies       for each row execute function rasta.touch_updated_at();
create trigger touch_candidacies     before update on public.candidacies     for each row execute function rasta.touch_updated_at();
