-- Extend low-severity, actor-bound activity audit events to support tickets and
-- serialize candidate-stage changes on the vacancy row before locking a candidacy.
-- Apply after 0009_support_and_vacancy_finalization.sql.

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
    if p_severity <> 'LOW' or p_category not in (
      'VIEW_RESUME', 'SEARCH_DIRECTORY', 'EXPORT_LIST',
      'SUPPORT_TICKET', 'SUPPORT_REPLY'
    ) then
      raise exception 'INVALID_CLIENT_EVENT';
    end if;
  end if;

  insert into public.audit_events
    (channel, category, actor_id, actor_name, actor_role, record_identifier, summary, details, severity, outcome)
  values
    (p_channel, p_category, v_profile.id,
     coalesce(nullif(v_profile.full_name, ''), v_profile.email::text),
     case v_profile.role when 'ADMIN' then 'مدیر سامانه' else 'کاربر مشاهده‌گر منابع انسانی' end,
     p_record_identifier, p_summary, p_details, p_severity, p_outcome);
end;
$$;

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
  v_vacancy_id uuid;
  v_vacancy_archived_at timestamptz;
  v_vacancy_status public.vacancy_status;
  v_applicant_name text;
begin
  if not rasta.is_admin() then raise exception 'FORBIDDEN'; end if;
  if char_length(coalesce(p_notes, '')) > 2000 then raise exception 'INVALID_INPUT'; end if;

  -- Discover the parent without locking the candidate. Locking the vacancy
  -- first serializes simultaneous decisions for two different candidates
  -- competing for the same single vacancy.
  select c.vacancy_id into v_vacancy_id
    from public.candidacies c
   where c.id = p_candidacy_id
     and c.archived_at is null;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;

  select v.archived_at, v.status
    into v_vacancy_archived_at, v_vacancy_status
    from public.vacancies v
   where v.id = v_vacancy_id
   for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_vacancy_archived_at is not null
     or v_vacancy_status in ('FILLED', 'CANCELLED') then
    raise exception 'VACANCY_ARCHIVED';
  end if;

  -- Re-check the candidacy after acquiring the parent lock in case it changed
  -- while this transaction waited.
  select c.stage, c.notes, a.full_name
    into v_old_stage, v_old_notes, v_applicant_name
    from public.candidacies c
    join public.applicants a on a.id = c.applicant_id
   where c.id = p_candidacy_id
     and c.vacancy_id = v_vacancy_id
     and c.archived_at is null
   for update of c;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;

  update public.candidacies c
     set stage = p_new_stage,
         notes = coalesce(nullif(btrim(p_notes), ''), v_old_notes),
         updated_at = now()
   where c.id = p_candidacy_id;

  if v_old_stage is distinct from p_new_stage then
    insert into public.candidacy_history
      (candidacy_id, old_stage, new_stage, notes, changed_by)
    values
      (p_candidacy_id, v_old_stage, p_new_stage, nullif(btrim(p_notes), ''), auth.uid());
  end if;

  if p_new_stage = 'ACCEPTED' then
    update public.vacancies
       set status = 'FILLED',
           closed_at = coalesce(closed_at, now()),
           archived_at = coalesce(archived_at, now()),
           archive_reason = 'تخصیص نهایی به: ' || coalesce(nullif(btrim(v_applicant_name), ''), 'متقاضی انتخاب‌شده')
     where id = v_vacancy_id;

    update public.candidacies c
       set archived_at = coalesce(c.archived_at, now()),
           archive_reason = coalesce(c.archive_reason,
             'فرصت با تخصیص نهایی به ' || coalesce(nullif(btrim(v_applicant_name), ''), 'متقاضی انتخاب‌شده') || ' بایگانی شد'),
           updated_at = now()
     where c.vacancy_id = v_vacancy_id
       and c.id <> p_candidacy_id
       and c.archived_at is null;
  end if;
end;
$$;

revoke all on function public.set_candidacy_stage(uuid, public.candidacy_stage, text) from public, anon;
grant execute on function public.set_candidacy_stage(uuid, public.candidacy_stage, text) to authenticated;
