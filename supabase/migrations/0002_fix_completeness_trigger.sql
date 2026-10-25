-- ============================================================================
-- RASTA — Fix completeness maintenance for existing installations.
--
-- Apply this migration in Supabase SQL Editor for databases that already ran
-- 0001_rasta_schema.sql. The original trigger tried to read applicant_id from
-- public.applicants (where the key is id) and updated the same table
-- unconditionally, which could recursively fire itself.
-- ============================================================================

create or replace function rasta.refresh_completeness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_applicant uuid;
  v_current integer;
  v_expected integer;
begin
  -- applicants stores its own key as id; child tables use applicant_id.
  -- Branch on the table before touching either record's fields.
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

  -- Updating completeness itself fires completeness_applicants. Avoid another
  -- update when the computed value is already stored.
  if found and v_current is distinct from v_expected then
    update public.applicants as a
       set completeness = v_expected
     where a.id = v_applicant;
  end if;

  return null;
end;
$$;

-- Recalculate any existing applicant rows once, with the corrected function.
-- The guarded trigger prevents recursive updates when the values already match.
do $$
declare
  r record;
begin
  for r in select a.id from public.applicants as a loop
    perform rasta.applicant_completeness(r.id);
    update public.applicants as a
       set completeness = rasta.applicant_completeness(r.id)
     where a.id = r.id
       and a.completeness is distinct from rasta.applicant_completeness(r.id);
  end loop;
end;
$$;
