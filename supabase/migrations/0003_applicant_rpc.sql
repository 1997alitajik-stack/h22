-- ============================================================================
-- RASTA — transactional applicant write paths (mission §4.1: multi-write
-- operations must succeed or fail together; supabase-js has no client-side
-- transactions, so the whole create/update runs in one SECURITY DEFINER
-- function with an explicit BEGIN/EXCEPTION rollback).
-- ============================================================================

create or replace function rasta.create_applicant_full(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_emp jsonb;
  v_edu jsonb;
  v_skill text;
  v_title text;
begin
  if not rasta.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  begin
    insert into public.applicants (
      first_name, last_name, father_name, birth_date_jalali, birth_place,
      residential_city, email, primary_job_title, primary_job_category,
      years_of_experience, highest_degree, highest_degree_title, highest_field_of_study,
      created_by
    ) values (
      p_payload->>'first_name',
      p_payload->>'last_name',
      nullif(p_payload->>'father_name', ''),
      nullif(p_payload->>'birth_date', ''),
      nullif(p_payload->>'birth_place', ''),
      p_payload->>'residential_city',
      nullif(p_payload->>'email', ''),
      p_payload->>'primary_job_title',
      p_payload->>'primary_job_category',
      coalesce((p_payload->>'years_of_experience')::int, 0),
      nullif(p_payload->>'highest_degree', '')::public.degree_level,
      nullif(p_payload->>'highest_degree_title', ''),
      nullif(p_payload->>'highest_field_of_study', ''),
      auth.uid()
    )
    returning id into v_id;

    if p_payload ? 'national_id' or p_payload ? 'home_address'
       or p_payload ? 'phone' or p_payload ? 'alternative_phone' then
      insert into public.applicant_sensitive
        (applicant_id, national_id, home_address, phone, alternative_phone, updated_by)
      values (
        v_id,
        nullif(p_payload->>'national_id', ''),
        nullif(p_payload->>'home_address', ''),
        nullif(p_payload->>'phone', ''),
        nullif(p_payload->>'alternative_phone', ''),
        auth.uid()
      );
    end if;

    for v_emp in select * from jsonb_array_elements(coalesce(p_payload->'employment', '[]'::jsonb)) loop
      insert into public.employment_records (
        applicant_id, employer_name, is_group_entity, group_entity_type, organization_id,
        project_name, city, job_title, start_date_jalali, end_date_jalali, is_current,
        responsibilities, verification_status
      ) values (
        v_id,
        v_emp->>'employerName',
        coalesce((v_emp->>'isGroupEntity')::boolean, false),
        coalesce((v_emp->>'groupEntityType')::text, 'EXTERNAL')::public.group_entity_type,
        nullif(v_emp->>'organizationId', '')::uuid,
        nullif(v_emp->>'projectName', ''),
        nullif(v_emp->>'city', ''),
        v_emp->>'jobTitle',
        v_emp->>'startDate',
        nullif(v_emp->>'endDate', ''),
        coalesce((v_emp->>'isCurrent')::boolean, false),
        nullif(v_emp->>'responsibilities', ''),
        case when coalesce((v_emp->>'isGroupEntity')::boolean, false)
             then 'PENDING'::public.verification_status
             else 'NOT_APPLICABLE'::public.verification_status end
      );
      if v_emp ? 'lastSalary' or v_emp ? 'reasonForLeaving' then
        insert into public.employment_sensitive (employment_record_id, last_salary, reason_for_leaving, updated_by)
        select id, nullif(v_emp->>'lastSalary', ''), nullif(v_emp->>'reasonForLeaving', ''), auth.uid()
          from public.employment_records
         where applicant_id = v_id and job_title = v_emp->>'jobTitle'
           and employer_name = v_emp->>'employerName'
         order by created_at desc limit 1;
      end if;
    end loop;

    for v_edu in select * from jsonb_array_elements(coalesce(p_payload->'education', '[]'::jsonb)) loop
      insert into public.education_records (
        applicant_id, degree_level, degree_title, field_of_study, institution_name,
        city, start_date_jalali, end_date_jalali, is_studying, gpa, sort_order
      ) values (
        v_id,
        (v_edu->>'degreeLevel')::public.degree_level,
        nullif(v_edu->>'degreeTitle', ''),
        nullif(v_edu->>'fieldOfStudy', ''),
        nullif(v_edu->>'institutionName', ''),
        nullif(v_edu->>'city', ''),
        nullif(v_edu->>'startDate', ''),
        nullif(v_edu->>'endDate', ''),
        coalesce((v_edu->>'isStudying')::boolean, false),
        nullif(v_edu->>'gpa', ''),
        coalesce((v_edu->>'sortOrder')::int, 0)
      );
    end loop;

    for v_skill in select jsonb_array_elements_text(coalesce(p_payload->'skills', '[]'::jsonb)) loop
      insert into public.applicant_skills (applicant_id, name, category)
      values (v_id, v_skill, 'TECHNICAL')
      on conflict (applicant_id, name_norm) do nothing;
    end loop;

    insert into public.job_preferences (
      applicant_id, preferred_titles, preferred_cities,
      willing_to_relocate, willing_to_travel_sites,
      employment_types, expected_salary_min, availability_timeline
    ) values (
      v_id,
      coalesce(p_payload->'preferred_titles', '[]'::jsonb)::text[],
      coalesce(p_payload->'preferred_cities', '[]'::jsonb)::text[],
      coalesce((p_payload->>'willing_to_relocate')::boolean, false),
      coalesce((p_payload->>'willing_to_travel_sites')::boolean, false),
      coalesce(p_payload->'employment_types', '["FULL_TIME"]'::jsonb)::text[],
      nullif(p_payload->>'expected_salary_min', ''),
      nullif(p_payload->>'availability_timeline', '')
    );

    return v_id;
  exception when others then
    raise;
  end;
end;
$$;

create or replace function rasta.update_applicant_full(p_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emp jsonb;
  v_edu jsonb;
  v_skill text;
  v_kept_emp_ids uuid[] := '{}';
  v_kept_edu_ids uuid[] := '{}';
  v_emp_id uuid;
  v_edu_id uuid;
begin
  if not rasta.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  begin
    update public.applicants set
      first_name             = p_payload->>'first_name',
      last_name              = p_payload->>'last_name',
      father_name            = nullif(p_payload->>'father_name', ''),
      birth_date_jalali      = nullif(p_payload->>'birth_date', ''),
      birth_place            = nullif(p_payload->>'birth_place', ''),
      residential_city       = p_payload->>'residential_city',
      email                  = nullif(p_payload->>'email', ''),
      primary_job_title      = p_payload->>'primary_job_title',
      primary_job_category   = p_payload->>'primary_job_category',
      years_of_experience    = coalesce((p_payload->>'years_of_experience')::int, 0),
      highest_degree         = nullif(p_payload->>'highest_degree', '')::public.degree_level,
      highest_degree_title   = nullif(p_payload->>'highest_degree_title', ''),
      highest_field_of_study = nullif(p_payload->>'highest_field_of_study', '')
    where id = p_id;

    if not found then
      raise exception 'RECORD_NOT_FOUND';
    end if;

    -- Sensitive upsert (1:1)
    insert into public.applicant_sensitive
      (applicant_id, national_id, home_address, phone, alternative_phone, updated_by)
    values (
      p_id,
      nullif(p_payload->>'national_id', ''),
      nullif(p_payload->>'home_address', ''),
      nullif(p_payload->>'phone', ''),
      nullif(p_payload->>'alternative_phone', ''),
      auth.uid()
    )
    on conflict (applicant_id) do update set
      national_id       = excluded.national_id,
      home_address      = excluded.home_address,
      phone             = excluded.phone,
      alternative_phone = excluded.alternative_phone,
      updated_by        = excluded.updated_by,
      updated_at        = now();

    -- Employment: update kept (the invalidation trigger guards verified edits),
    -- insert new, delete removed.
    for v_emp in select * from jsonb_array_elements(coalesce(p_payload->'employment', '[]'::jsonb)) loop
      if nullif(v_emp->>'id', '') is not null then
        v_emp_id := (v_emp->>'id')::uuid;
        update public.employment_records set
          employer_name     = v_emp->>'employerName',
          is_group_entity   = coalesce((v_emp->>'isGroupEntity')::boolean, false),
          group_entity_type = coalesce(nullif(v_emp->>'groupEntityType', ''), 'EXTERNAL')::public.group_entity_type,
          organization_id   = nullif(v_emp->>'organizationId', '')::uuid,
          project_name      = nullif(v_emp->>'projectName', ''),
          city              = nullif(v_emp->>'city', ''),
          job_title         = v_emp->>'jobTitle',
          start_date_jalali = v_emp->>'startDate',
          end_date_jalali   = nullif(v_emp->>'endDate', ''),
          is_current        = coalesce((v_emp->>'isCurrent')::boolean, false),
          responsibilities  = nullif(v_emp->>'responsibilities', '')
        where id = v_emp_id and applicant_id = p_id;

        if v_emp ? 'lastSalary' or v_emp ? 'reasonForLeaving' then
          insert into public.employment_sensitive (employment_record_id, last_salary, reason_for_leaving, updated_by)
          values (v_emp_id, nullif(v_emp->>'lastSalary', ''), nullif(v_emp->>'reasonForLeaving', ''), auth.uid())
          on conflict (employment_record_id) do update set
            last_salary        = excluded.last_salary,
            reason_for_leaving = excluded.reason_for_leaving,
            updated_by         = excluded.updated_by,
            updated_at         = now();
        end if;

        v_kept_emp_ids := v_kept_emp_ids || v_emp_id;
      else
        insert into public.employment_records (
          applicant_id, employer_name, is_group_entity, group_entity_type, organization_id,
          project_name, city, job_title, start_date_jalali, end_date_jalali, is_current,
          responsibilities, verification_status
        ) values (
          p_id,
          v_emp->>'employerName',
          coalesce((v_emp->>'isGroupEntity')::boolean, false),
          coalesce(nullif(v_emp->>'groupEntityType', ''), 'EXTERNAL')::public.group_entity_type,
          nullif(v_emp->>'organizationId', '')::uuid,
          nullif(v_emp->>'projectName', ''),
          nullif(v_emp->>'city', ''),
          v_emp->>'jobTitle',
          v_emp->>'startDate',
          nullif(v_emp->>'endDate', ''),
          coalesce((v_emp->>'isCurrent')::boolean, false),
          nullif(v_emp->>'responsibilities', ''),
          case when coalesce((v_emp->>'isGroupEntity')::boolean, false)
               then 'PENDING'::public.verification_status
               else 'NOT_APPLICABLE'::public.verification_status end
        ) returning id into v_emp_id;
        if v_emp ? 'lastSalary' or v_emp ? 'reasonForLeaving' then
          insert into public.employment_sensitive (employment_record_id, last_salary, reason_for_leaving, updated_by)
          values (v_emp_id, nullif(v_emp->>'lastSalary', ''), nullif(v_emp->>'reasonForLeaving', ''), auth.uid());
        end if;
        v_kept_emp_ids := v_kept_emp_ids || v_emp_id;
      end if;
    end loop;

    delete from public.employment_records
     where applicant_id = p_id and not (id = any(v_kept_emp_ids));

    for v_edu in select * from jsonb_array_elements(coalesce(p_payload->'education', '[]'::jsonb)) loop
      if nullif(v_edu->>'id', '') is not null then
        v_edu_id := (v_edu->>'id')::uuid;
        update public.education_records set
          degree_level      = (v_edu->>'degreeLevel')::public.degree_level,
          degree_title      = nullif(v_edu->>'degreeTitle', ''),
          field_of_study    = nullif(v_edu->>'fieldOfStudy', ''),
          institution_name  = nullif(v_edu->>'institutionName', ''),
          city              = nullif(v_edu->>'city', ''),
          start_date_jalali = nullif(v_edu->>'startDate', ''),
          end_date_jalali   = nullif(v_edu->>'endDate', ''),
          is_studying       = coalesce((v_edu->>'isStudying')::boolean, false),
          gpa               = nullif(v_edu->>'gpa', '')
        where id = v_edu_id and applicant_id = p_id;
        v_kept_edu_ids := v_kept_edu_ids || v_edu_id;
      else
        insert into public.education_records (
          applicant_id, degree_level, degree_title, field_of_study, institution_name,
          city, start_date_jalali, end_date_jalali, is_studying, gpa, sort_order
        ) values (
          p_id,
          (v_edu->>'degreeLevel')::public.degree_level,
          nullif(v_edu->>'degreeTitle', ''),
          nullif(v_edu->>'fieldOfStudy', ''),
          nullif(v_edu->>'institutionName', ''),
          nullif(v_edu->>'city', ''),
          nullif(v_edu->>'startDate', ''),
          nullif(v_edu->>'endDate', ''),
          coalesce((v_edu->>'isStudying')::boolean, false),
          nullif(v_edu->>'gpa', ''),
          coalesce((v_edu->>'sortOrder')::int, 0)
        ) returning id into v_edu_id;
        v_kept_edu_ids := v_kept_edu_ids || v_edu_id;
      end if;
    end loop;

    delete from public.education_records
     where applicant_id = p_id and not (id = any(v_kept_edu_ids));

    delete from public.applicant_skills where applicant_id = p_id;
    for v_skill in select jsonb_array_elements_text(coalesce(p_payload->'skills', '[]'::jsonb)) loop
      insert into public.applicant_skills (applicant_id, name, category)
      values (p_id, v_skill, 'TECHNICAL')
      on conflict (applicant_id, name_norm) do nothing;
    end loop;

    insert into public.job_preferences (
      applicant_id, preferred_titles, preferred_cities,
      willing_to_relocate, willing_to_travel_sites,
      employment_types, expected_salary_min, availability_timeline
    ) values (
      p_id,
      coalesce(p_payload->'preferred_titles', '[]'::jsonb)::text[],
      coalesce(p_payload->'preferred_cities', '[]'::jsonb)::text[],
      coalesce((p_payload->>'willing_to_relocate')::boolean, false),
      coalesce((p_payload->>'willing_to_travel_sites')::boolean, false),
      coalesce(p_payload->'employment_types', '["FULL_TIME"]'::jsonb)::text[],
      nullif(p_payload->>'expected_salary_min', ''),
      nullif(p_payload->>'availability_timeline', '')
    )
    on conflict (applicant_id) do update set
      preferred_titles        = excluded.preferred_titles,
      preferred_cities        = excluded.preferred_cities,
      willing_to_relocate     = excluded.willing_to_relocate,
      willing_to_travel_sites = excluded.willing_to_travel_sites,
      employment_types        = excluded.employment_types,
      expected_salary_min     = excluded.expected_salary_min,
      availability_timeline   = excluded.availability_timeline,
      updated_at              = now();

  exception when others then
    raise;
  end;
end;
$$;

-- Masked PII for non-admin consumers (mission §5.3): the full values stay in
-- the admin-only table; everyone else receives only the masked rendering.
create or replace function rasta.get_masked_pii(p_applicant uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'national_id_masked', rasta.mask_national_id(s.national_id),
    'phone_masked',      rasta.mask_phone(s.phone),
    'has_national_id',   s.national_id is not null,
    'has_phone',         s.phone is not null,
    'has_address',       coalesce(s.home_address, '') <> ''
  )
  from public.applicant_sensitive s
  where s.applicant_id = p_applicant
  union all
  select jsonb_build_object(
    'national_id_masked', null, 'phone_masked', null,
    'has_national_id', false, 'has_phone', false, 'has_address', false
  )
  where not exists (select 1 from public.applicant_sensitive s where s.applicant_id = p_applicant)
$$;

grant execute on function rasta.create_applicant_full(jsonb) to authenticated;
grant execute on function rasta.update_applicant_full(uuid, jsonb) to authenticated;
grant execute on function rasta.get_masked_pii(uuid) to authenticated;

-- Candidacy stage transition: updates the row, appends history and an audit
-- event atomically. Clients have no direct INSERT grant on candidacy_history.
create or replace function rasta.set_candidacy_stage(
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
  v_old public.candidacy_stage;
  v_applicant_name text;
  v_vacancy_title text;
begin
  if not rasta.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select c.stage into v_old from public.candidacies c where c.id = p_candidacy_id for update;
  if not found then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  update public.candidacies
     set stage = p_new_stage,
         notes = coalesce(nullif(trim(p_notes), ''), notes),
         updated_at = now()
   where id = p_candidacy_id;

  if v_old is distinct from p_new_stage then
    insert into public.candidacy_history (candidacy_id, old_stage, new_stage, notes, changed_by)
    values (p_candidacy_id, v_old, p_new_stage, nullif(trim(p_notes), ''), auth.uid());
  end if;

  select a.full_name, v.title
    into v_applicant_name, v_vacancy_title
    from public.candidacies c
    join public.applicants a on a.id = c.applicant_id
    join public.vacancies v on v.id = c.vacancy_id
   where c.id = p_candidacy_id;

  perform rasta.log_audit(
    'ADMIN_SECURITY', 'VACANCY',
    'تغییر مرحله بررسی ' || coalesce(v_applicant_name, 'داوطلب') || ' در «' || coalesce(v_vacancy_title, 'ردیف شغلی') || '»',
    p_candidacy_id::text, nullif(trim(p_notes), ''), 'LOW'
  );
end;
$$;

grant execute on function rasta.set_candidacy_stage(uuid, public.candidacy_stage, text) to authenticated;
