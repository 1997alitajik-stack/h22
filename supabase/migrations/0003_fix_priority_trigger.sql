-- ============================================================================
-- RASTA — Fix the employment-to-applicant priority trigger.
--
-- Apply in the existing Supabase project after migration 0002. The baseline
-- defined compute_priority(uuid) with OUT columns (priority, reason), but the
-- trigger passed three positional arguments and therefore failed every time
-- an employment record was inserted, updated, or deleted.
-- ============================================================================

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
  if tg_op = 'DELETE' then
    v_applicant := old.applicant_id;
  else
    v_applicant := new.applicant_id;
  end if;

  if v_applicant is null then
    return null;
  end if;

  -- compute_priority has exactly one input argument. It returns the priority
  -- and explanation as output columns, rather than accepting them as inputs.
  select result.priority, result.reason
    into v_priority, v_reason
    from rasta.compute_priority(v_applicant) as result;

  update public.applicants
     set group_priority = v_priority,
         group_priority_reason = v_reason
   where id = v_applicant
     and (
       group_priority is distinct from v_priority
       or group_priority_reason is distinct from v_reason
     );

  return null;
end;
$$;

-- Recalculate existing applicant priority from their recorded employment
-- history as part of the repair. The conditional update avoids unnecessary
-- writes when values are already correct.
do $$
declare
  r record;
  v_priority public.group_priority;
  v_reason text;
begin
  for r in select a.id from public.applicants as a loop
    select result.priority, result.reason
      into v_priority, v_reason
      from rasta.compute_priority(r.id) as result;

    update public.applicants as a
       set group_priority = v_priority,
           group_priority_reason = v_reason
     where a.id = r.id
       and (
         a.group_priority is distinct from v_priority
         or a.group_priority_reason is distinct from v_reason
       );
  end loop;
end;
$$;
