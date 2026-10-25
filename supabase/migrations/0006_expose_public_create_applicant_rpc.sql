-- ============================================================================
-- RASTA: make admin helper and create-applicant RPC available in projects
-- where the RASTA helper schema was not present when earlier migrations ran.
-- Safe to re-run. Apply after 0005 in existing Supabase projects.
-- ============================================================================

create schema if not exists rasta;
grant usage on schema rasta to authenticated;

create or replace function rasta.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
      from public.profiles as p
     where p.id = auth.uid()
       and p.role = 'ADMIN'::public.user_role
       and p.status = 'ACTIVE'
  );
$function$;

revoke all on function rasta.is_admin() from public, anon;
grant execute on function rasta.is_admin() to authenticated;

create or replace function public.create_applicant_full(p_payload jsonb)
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

revoke all on function public.create_applicant_full(jsonb) from public, anon;
grant execute on function public.create_applicant_full(jsonb) to authenticated;

-- Tell PostgREST to discover the public RPC right away.
notify pgrst, 'reload schema';
