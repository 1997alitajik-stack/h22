-- ============================================================================
-- RASTA: transactional applicant update RPC and strict ID-photo constraints.
-- Apply this migration to existing projects after 0001-0004.
-- ============================================================================

create or replace function public.update_applicant_full(
  p_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_requested_id uuid;
  v_employment_id uuid;
  v_education_id uuid;
  v_employment_ids uuid[] := '{}'::uuid[];
  v_education_ids uuid[] := '{}'::uuid[];
  v_sort_order integer;
begin
  if auth.uid() is null or not rasta.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid applicant payload' using errcode = '22023';
  end if;

  perform 1
    from public.applicants as a
   where a.id = p_id
   for update;
  if not found then
    raise exception 'Applicant not found' using errcode = 'P0002';
  end if;

  update public.applicants
     set first_name = pg_catalog.btrim(p_payload ->> 'first_name'),
         last_name = pg_catalog.btrim(p_payload ->> 'last_name'),
         father_name = nullif(pg_catalog.btrim(p_payload ->> 'father_name'), ''),
         birth_date_jalali = nullif(pg_catalog.btrim(p_payload ->> 'birth_date'), ''),
         birth_place = nullif(pg_catalog.btrim(p_payload ->> 'birth_place'), ''),
         residential_city = nullif(pg_catalog.btrim(p_payload ->> 'residential_city'), ''),
         email = nullif(pg_catalog.btrim(p_payload ->> 'email'), ''),
         primary_job_title = pg_catalog.btrim(p_payload ->> 'primary_job_title'),
         primary_job_category = pg_catalog.btrim(p_payload ->> 'primary_job_category'),
         years_of_experience = coalesce(nullif(p_payload ->> 'years_of_experience', '')::integer, 0),
         highest_degree = nullif(p_payload ->> 'highest_degree', '')::public.degree_level,
         highest_degree_title = nullif(pg_catalog.btrim(p_payload ->> 'highest_degree_title'), ''),
         highest_field_of_study = nullif(pg_catalog.btrim(p_payload ->> 'highest_field_of_study'), '')
   where id = p_id;

  insert into public.applicant_sensitive
    (applicant_id, national_id, home_address, phone, alternative_phone, updated_by)
  values (
    p_id,
    nullif(pg_catalog.btrim(p_payload ->> 'national_id'), ''),
    nullif(pg_catalog.btrim(p_payload ->> 'home_address'), ''),
    nullif(pg_catalog.btrim(p_payload ->> 'phone'), ''),
    nullif(pg_catalog.btrim(p_payload ->> 'alternative_phone'), ''),
    auth.uid()
  )
  on conflict (applicant_id) do update
    set national_id = excluded.national_id,
        home_address = excluded.home_address,
        phone = excluded.phone,
        alternative_phone = excluded.alternative_phone,
        updated_by = auth.uid(),
        updated_at = now();

  -- Employment records are upserted only when the submitted id belongs to this
  -- applicant. New group-entity experience starts in the verification queue.
  for v_item in
    select value
      from pg_catalog.jsonb_array_elements(coalesce(p_payload -> 'employment', '[]'::jsonb)) as items(value)
  loop
    v_requested_id := nullif(v_item ->> 'id', '')::uuid;
    v_employment_id := null;

    if v_requested_id is not null then
      select e.id
        into v_employment_id
        from public.employment_records as e
       where e.id = v_requested_id
         and e.applicant_id = p_id;
    end if;

    if v_employment_id is null then
      insert into public.employment_records (
        applicant_id, employer_name, is_group_entity, group_entity_type,
        organization_id, project_name, city, job_title, start_date_jalali,
        end_date_jalali, is_current, responsibilities, verification_status
      ) values (
        p_id,
        pg_catalog.btrim(v_item ->> 'employerName'),
        coalesce(nullif(v_item ->> 'isGroupEntity', '')::boolean, false),
        coalesce(nullif(v_item ->> 'groupEntityType', '')::public.group_entity_type, 'EXTERNAL'::public.group_entity_type),
        nullif(v_item ->> 'organizationId', '')::uuid,
        nullif(pg_catalog.btrim(v_item ->> 'projectName'), ''),
        nullif(pg_catalog.btrim(v_item ->> 'city'), ''),
        pg_catalog.btrim(v_item ->> 'jobTitle'),
        pg_catalog.btrim(v_item ->> 'startDate'),
        nullif(pg_catalog.btrim(v_item ->> 'endDate'), ''),
        coalesce(nullif(v_item ->> 'isCurrent', '')::boolean, false),
        nullif(pg_catalog.btrim(v_item ->> 'responsibilities'), ''),
        case
          when coalesce(nullif(v_item ->> 'isGroupEntity', '')::boolean, false)
            then 'PENDING'::public.verification_status
          else 'NOT_APPLICABLE'::public.verification_status
        end
      )
      returning id into v_employment_id;
    else
      update public.employment_records
         set employer_name = pg_catalog.btrim(v_item ->> 'employerName'),
             is_group_entity = coalesce(nullif(v_item ->> 'isGroupEntity', '')::boolean, false),
             group_entity_type = coalesce(nullif(v_item ->> 'groupEntityType', '')::public.group_entity_type, 'EXTERNAL'::public.group_entity_type),
             organization_id = coalesce(nullif(v_item ->> 'organizationId', '')::uuid, organization_id),
             project_name = nullif(pg_catalog.btrim(v_item ->> 'projectName'), ''),
             city = nullif(pg_catalog.btrim(v_item ->> 'city'), ''),
             job_title = pg_catalog.btrim(v_item ->> 'jobTitle'),
             start_date_jalali = pg_catalog.btrim(v_item ->> 'startDate'),
             end_date_jalali = nullif(pg_catalog.btrim(v_item ->> 'endDate'), ''),
             is_current = coalesce(nullif(v_item ->> 'isCurrent', '')::boolean, false),
             responsibilities = nullif(pg_catalog.btrim(v_item ->> 'responsibilities'), '')
       where id = v_employment_id
         and applicant_id = p_id;
    end if;

    v_employment_ids := pg_catalog.array_append(v_employment_ids, v_employment_id);

    insert into public.employment_sensitive
      (employment_record_id, last_salary, reason_for_leaving, updated_by)
    values (
      v_employment_id,
      nullif(pg_catalog.btrim(v_item ->> 'lastSalary'), ''),
      nullif(pg_catalog.btrim(v_item ->> 'reasonForLeaving'), ''),
      auth.uid()
    )
    on conflict (employment_record_id) do update
      set last_salary = excluded.last_salary,
          reason_for_leaving = excluded.reason_for_leaving,
          updated_by = auth.uid(),
          updated_at = now();
  end loop;

  delete from public.employment_records as e
   where e.applicant_id = p_id
     and not (e.id = any(v_employment_ids));

  -- Education rows follow the same ownership-safe upsert + remove workflow.
  v_sort_order := 0;
  for v_item in
    select value
      from pg_catalog.jsonb_array_elements(coalesce(p_payload -> 'education', '[]'::jsonb)) as items(value)
  loop
    v_requested_id := nullif(v_item ->> 'id', '')::uuid;
    v_education_id := null;

    if v_requested_id is not null then
      select ed.id
        into v_education_id
        from public.education_records as ed
       where ed.id = v_requested_id
         and ed.applicant_id = p_id;
    end if;

    if v_education_id is null then
      insert into public.education_records (
        applicant_id, degree_level, degree_title, field_of_study,
        institution_name, city, start_date_jalali, end_date_jalali,
        is_studying, gpa, sort_order
      ) values (
        p_id,
        coalesce(nullif(v_item ->> 'degreeLevel', '')::public.degree_level, 'BACHELOR'::public.degree_level),
        nullif(pg_catalog.btrim(v_item ->> 'degreeTitle'), ''),
        nullif(pg_catalog.btrim(v_item ->> 'fieldOfStudy'), ''),
        nullif(pg_catalog.btrim(v_item ->> 'institutionName'), ''),
        nullif(pg_catalog.btrim(v_item ->> 'city'), ''),
        nullif(pg_catalog.btrim(v_item ->> 'startDate'), ''),
        nullif(pg_catalog.btrim(v_item ->> 'endDate'), ''),
        coalesce(nullif(v_item ->> 'isStudying', '')::boolean, false),
        nullif(pg_catalog.btrim(v_item ->> 'gpa'), ''),
        coalesce(nullif(v_item ->> 'sortOrder', '')::integer, v_sort_order)
      )
      returning id into v_education_id;
    else
      update public.education_records
         set degree_level = coalesce(nullif(v_item ->> 'degreeLevel', '')::public.degree_level, 'BACHELOR'::public.degree_level),
             degree_title = nullif(pg_catalog.btrim(v_item ->> 'degreeTitle'), ''),
             field_of_study = nullif(pg_catalog.btrim(v_item ->> 'fieldOfStudy'), ''),
             institution_name = nullif(pg_catalog.btrim(v_item ->> 'institutionName'), ''),
             city = nullif(pg_catalog.btrim(v_item ->> 'city'), ''),
             start_date_jalali = nullif(pg_catalog.btrim(v_item ->> 'startDate'), ''),
             end_date_jalali = nullif(pg_catalog.btrim(v_item ->> 'endDate'), ''),
             is_studying = coalesce(nullif(v_item ->> 'isStudying', '')::boolean, false),
             gpa = nullif(pg_catalog.btrim(v_item ->> 'gpa'), ''),
             sort_order = coalesce(nullif(v_item ->> 'sortOrder', '')::integer, v_sort_order)
       where id = v_education_id
         and applicant_id = p_id;
    end if;

    v_education_ids := pg_catalog.array_append(v_education_ids, v_education_id);
    v_sort_order := v_sort_order + 1;
  end loop;

  delete from public.education_records as ed
   where ed.applicant_id = p_id
     and not (ed.id = any(v_education_ids));

  -- The form edits skill names, so retain the same simple/consistent semantics:
  -- replace the set, using default skill category and level for newly supplied names.
  delete from public.applicant_skills where applicant_id = p_id;
  insert into public.applicant_skills (applicant_id, name)
  select p_id, pg_catalog.btrim(skill_name)
    from pg_catalog.jsonb_array_elements_text(coalesce(p_payload -> 'skills', '[]'::jsonb)) as skills(skill_name)
   where pg_catalog.btrim(skill_name) <> ''
  on conflict (applicant_id, name_norm) do nothing;

  insert into public.job_preferences (
    applicant_id, preferred_titles, preferred_cities, willing_to_relocate,
    willing_to_travel_sites, employment_types, expected_salary_min, availability_timeline
  ) values (
    p_id,
    coalesce(array(select pg_catalog.jsonb_array_elements_text(coalesce(p_payload -> 'preferred_titles', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select pg_catalog.jsonb_array_elements_text(coalesce(p_payload -> 'preferred_cities', '[]'::jsonb))), '{}'::text[]),
    coalesce(nullif(p_payload ->> 'willing_to_relocate', '')::boolean, false),
    coalesce(nullif(p_payload ->> 'willing_to_travel_sites', '')::boolean, false),
    coalesce(array(select pg_catalog.jsonb_array_elements_text(coalesce(p_payload -> 'employment_types', '[]'::jsonb))), '{}'::text[]),
    nullif(pg_catalog.btrim(p_payload ->> 'expected_salary_min'), ''),
    nullif(pg_catalog.btrim(p_payload ->> 'availability_timeline'), '')
  )
  on conflict (applicant_id) do update
    set preferred_titles = excluded.preferred_titles,
        preferred_cities = excluded.preferred_cities,
        willing_to_relocate = excluded.willing_to_relocate,
        willing_to_travel_sites = excluded.willing_to_travel_sites,
        employment_types = excluded.employment_types,
        expected_salary_min = excluded.expected_salary_min,
        availability_timeline = excluded.availability_timeline,
        updated_at = now();
end;
$function$;

revoke all on function public.update_applicant_full(uuid, jsonb) from public, anon;
grant execute on function public.update_applicant_full(uuid, jsonb) to authenticated;

-- Database-level guard for new/updated photo rows. NOT VALID intentionally
-- leaves any existing legacy photos untouched while enforcing all new writes.
alter table public.attachments
  drop constraint if exists attachments_photo_max_500kb;

alter table public.attachments
  add constraint attachments_photo_max_500kb
  check (category <> 'ID_PHOTO'::public.attachment_category or size_bytes <= 512000)
  not valid;

notify pgrst, 'reload schema';
