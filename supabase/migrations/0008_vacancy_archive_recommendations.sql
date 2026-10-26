-- RASTA: preserve vacancy/candidacy history, recommend by role + organization,
-- archive stale early-stage opportunities, and define the missing stage RPC.

create table if not exists public.organization_settings (
  id smallint primary key default 1 check (id = 1),
  parent_name text not null default '',
  auto_archive_enabled boolean not null default true,
  auto_archive_days integer not null default 60 check (auto_archive_days between 15 and 365),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.organization_settings (id, parent_name, auto_archive_enabled, auto_archive_days)
values (1, '', true, 60)
on conflict (id) do nothing;

alter table public.vacancies
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

alter table public.candidacies
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

create index if not exists vacancies_archived_idx on public.vacancies (archived_at);
create index if not exists candidacies_active_vacancy_idx on public.candidacies (vacancy_id, updated_at)
  where archived_at is null;
create index if not exists candidacies_stale_idx on public.candidacies (updated_at)
  where archived_at is null and stage in ('NEW', 'SCREENING');

alter table public.organization_settings enable row level security;
create policy organization_settings_select on public.organization_settings
  for select to authenticated using (rasta.is_active_user());
create policy organization_settings_write on public.organization_settings
  for all to authenticated using (rasta.is_admin()) with check (rasta.is_admin());
revoke all on public.organization_settings from anon, authenticated;
grant select, insert, update on public.organization_settings to authenticated;

create trigger touch_organization_settings
  before update on public.organization_settings
  for each row execute function rasta.touch_updated_at();

-- This RPC records stage history atomically. The app already calls it, but the
-- original migrations did not define it, so changing stages could fail.
create or replace function public.set_candidacy_stage(
  p_candidacy_id uuid,
  p_new_stage public.candidacy_stage,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_stage public.candidacy_stage;
  v_old_notes text;
begin
  if not rasta.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select c.stage, c.notes
    into v_old_stage, v_old_notes
    from public.candidacies c
   where c.id = p_candidacy_id and c.archived_at is null
   for update;
  if not found then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  update public.candidacies c
     set stage = p_new_stage,
         notes = coalesce(nullif(trim(p_notes), ''), v_old_notes),
         updated_at = now()
   where c.id = p_candidacy_id;

  if v_old_stage is distinct from p_new_stage then
    insert into public.candidacy_history
      (candidacy_id, old_stage, new_stage, notes, changed_by)
    values
      (p_candidacy_id, v_old_stage, p_new_stage, nullif(trim(p_notes), ''), auth.uid());
  end if;
end;
$$;

revoke all on function public.set_candidacy_stage(uuid, public.candidacy_stage, text) from public, anon;
grant execute on function public.set_candidacy_stage(uuid, public.candidacy_stage, text) to authenticated;

-- Archive a vacancy and its linked candidacies in one transaction. Restoring
-- the vacancy does not automatically reactivate old candidacies: HR must
-- explicitly restore the candidates it still wants to consider.
create or replace function public.set_vacancy_archive(
  p_vacancy_id uuid,
  p_archived boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not rasta.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if p_archived then
    update public.vacancies
       set archived_at = coalesce(archived_at, now()),
           archive_reason = coalesce(nullif(trim(p_reason), ''), 'بایگانی دستی توسط مدیر')
     where id = p_vacancy_id;
    if not found then
      raise exception 'RECORD_NOT_FOUND';
    end if;

    update public.candidacies
       set archived_at = coalesce(archived_at, now()),
           archive_reason = coalesce(archive_reason, 'فرصت شغلی بایگانی شد'),
           updated_at = now()
     where vacancy_id = p_vacancy_id and archived_at is null;
  else
    update public.vacancies
       set archived_at = null, archive_reason = null
     where id = p_vacancy_id;
    if not found then
      raise exception 'RECORD_NOT_FOUND';
    end if;
  end if;
end;
$$;

revoke all on function public.set_vacancy_archive(uuid, boolean, text) from public, anon;
grant execute on function public.set_vacancy_archive(uuid, boolean, text) to authenticated;

-- Daily auto-archive only untouched NEW/SCREENING candidacies. Interviews,
-- shortlists and accepted candidates are intentionally never auto-archived.
create or replace function rasta.archive_stale_candidacies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_days integer;
  v_count integer := 0;
begin
  select s.auto_archive_enabled, s.auto_archive_days
    into v_enabled, v_days
    from public.organization_settings s
   where s.id = 1;

  if not found or not v_enabled then
    return 0;
  end if;

  with stale as (
    update public.candidacies c
       set archived_at = now(),
           archive_reason = 'عدم پیگیری پس از ' || v_days::text || ' روز',
           updated_at = now()
      from public.vacancies v
     where c.vacancy_id = v.id
       and c.archived_at is null
       and v.archived_at is null
       and v.status in ('OPEN', 'IN_PROGRESS')
       and c.stage in ('NEW', 'SCREENING')
       and c.updated_at < now() - make_interval(days => v_days)
    returning c.id, c.applicant_id, c.vacancy_id
  ),
  logged as (
    insert into public.audit_events
      (channel, category, actor_id, actor_name, actor_role, record_identifier, summary, details, severity, outcome)
    select
      'CLIENT_ACTIVITY',
      'CANDIDACY_ARCHIVE',
      null,
      'زمان‌بند سامانه',
      'SYSTEM',
      stale.id::text,
      'بایگانی خودکار معرفی متقاضی پس از پایان مهلت عدم فعالیت',
      jsonb_build_object('applicant_id', stale.applicant_id, 'vacancy_id', stale.vacancy_id, 'inactive_days', v_days)::text,
      'LOW',
      'SUCCESS'
    from stale
    returning id
  )
  select count(*) into v_count from stale;

  return v_count;
end;
$$;

revoke all on function rasta.archive_stale_candidacies() from public, anon, authenticated;

-- Enable and schedule pg_cron where the Supabase project permits it. If the
-- extension is unavailable, the migration still succeeds and can be scheduled
-- later from Supabase's Database > Extensions / Cron UI.
do $block$
declare
  v_job_id bigint;
begin
  begin
    if not exists (select 1 from pg_extension where extname = 'pg_cron') then
      execute 'create extension if not exists pg_cron';
    end if;
  exception when others then
    raise notice 'pg_cron could not be enabled automatically: %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and to_regprocedure('cron.schedule(text,text,text)') is not null then
    execute 'select jobid from cron.job where jobname = $1 limit 1'
      into v_job_id using 'rasta-auto-archive-stale-candidacies';
    if v_job_id is not null then
      execute 'select cron.unschedule($1)' using v_job_id;
    end if;
    execute 'select cron.schedule($1, $2, $3)'
      using 'rasta-auto-archive-stale-candidacies', '15 0 * * *', 'select rasta.archive_stale_candidacies();';
  end if;
end
$block$;
