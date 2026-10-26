import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { computeMatchScore, type MatchCandidate, type MatchVacancy } from '@/lib/domain/match';
import { splitList } from '@/lib/persian';
import type {
  SessionUser,
  VacancyApplicantOption,
  VacancyDetail,
  VacancyListRow,
} from '@/types';

const BASE_COLUMNS = `
  id, code, title, category, organization_type, organization_id, organization_name, project_name, city,
  open_positions_count, employment_type, min_years_experience, required_skills, status, opened_at,
  archived_at, archive_reason
`;

export async function listVacancies(
  user: SessionUser,
  opts: { q?: string; status?: string; city?: string } = {},
): Promise<VacancyListRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data: vacancies, error: vacanciesError } = await supabase
    .from('vacancies')
    .select(`${BASE_COLUMNS}, candidacies(count)`, { count: 'exact' })
    .order('opened_at', { ascending: false });
  if (vacanciesError) throw new Error(`بارگذاری فرصت‌های شغلی ناموفق بود: ${vacanciesError.message}`);
  if (!vacancies) return [];

  // Candidacy stage counts per vacancy (single grouped query, no N+1).
  const { data: stageCounts, error: stageCountsError } = await supabase
    .from('candidacies')
    .select('vacancy_id, stage')
    .in(
      'vacancy_id',
      vacancies.map((v) => v.id),
    )
    .is('archived_at', null);
  if (stageCountsError) throw new Error(`بارگذاری مراحل جذب ناموفق بود: ${stageCountsError.message}`);

  const counts = new Map<string, { total: number; shortlisted: number }>();
  for (const row of stageCounts ?? []) {
    const entry = counts.get(row.vacancy_id) ?? { total: 0, shortlisted: 0 };
    entry.total += 1;
    if (row.stage === 'SHORTLIST' || row.stage === 'INTERVIEW') entry.shortlisted += 1;
    counts.set(row.vacancy_id, entry);
  }

  const q = (opts.q ?? '').trim();
  const rows: VacancyListRow[] = vacancies.map((v) => ({
    ...v,
    applicant_count: counts.get(v.id)?.total ?? 0,
    shortlisted_count: counts.get(v.id)?.shortlisted ?? 0,
  }));

  return rows.filter((v) => {
    const matchesQ =
      q === '' ||
      [v.title, v.organization_name, v.category, v.code, v.city, v.project_name ?? '']
        .some((f) => f.toLowerCase().includes(q.toLowerCase()));
    const matchesStatus = !opts.status || opts.status === 'ALL' || v.status === opts.status;
    const matchesCity = !opts.city || opts.city === 'ALL' || v.city === opts.city;
    return matchesQ && matchesStatus && matchesCity;
  });
}

export async function getVacancyDetail(
  user: SessionUser,
  id: string,
): Promise<VacancyDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: vacancy, error: vacancyError } = await supabase
    .from('vacancies')
    .select(
      `${BASE_COLUMNS}, required_degree, preferred_skills, description, responsibilities, salary_range`,
    )
    .eq('id', id)
    .maybeSingle();
  if (vacancyError) throw new Error(`بارگذاری فرصت شغلی ناموفق بود: ${vacancyError.message}`);
  if (!vacancy) return null;

  const { data: candidacies, error: candidaciesError } = await supabase
    .from('candidacies')
    .select(
      `id, applicant_id, stage, notes, match_score, match_breakdown, applied_at, archived_at, archive_reason,
       applicants(full_name, public_code, residential_city, years_of_experience, group_priority)`,
    )
    .eq('vacancy_id', id)
    .order('applied_at', { ascending: false });
  if (candidaciesError) throw new Error(`بارگذاری داوطلبان فرصت ناموفق بود: ${candidaciesError.message}`);

  const rows =
    candidacies?.map((c) => {
      const a = (c.applicants ?? {}) as {
        full_name?: string;
        public_code?: string;
        residential_city?: string | null;
        years_of_experience?: number;
        group_priority?: VacancyDetail['candidacies'][number]['group_priority'];
      };
      return {
        id: c.id,
        applicant_id: c.applicant_id,
        applicant_name: a.full_name ?? '',
        applicant_code: a.public_code ?? '',
        applicant_city: a.residential_city ?? null,
        years_of_experience: a.years_of_experience ?? 0,
        group_priority: a.group_priority ?? 'INSUFFICIENT_DATA',
        stage: c.stage,
        notes: c.notes,
        match_score: c.match_score,
        match_breakdown: c.match_breakdown,
        archived_at: c.archived_at,
        archive_reason: c.archive_reason,
      };
    }) ?? [];

  const activeRows = rows.filter((r) => !r.archived_at);
  const shortlisted = activeRows.filter((r) => r.stage === 'SHORTLIST' || r.stage === 'INTERVIEW').length;

  return {
    ...vacancy,
    applicant_count: activeRows.length,
    shortlisted_count: shortlisted,
    candidacies: rows,
  };
}

export interface VacancyFormInput {
  title: string;
  code?: string;
  category: string;
  organizationType: 'PARENT' | 'SUBSIDIARY';
  organizationId?: string | null;
  organizationName: string;
  projectId?: string | null;
  city: string;
  openPositionsCount: number;
  employmentType: VacancyListRow['employment_type'];
  requiredDegree?: string | null;
  minYearsExperience: number;
  requiredSkillsCsv: string;
  preferredSkillsCsv: string;
  description?: string;
  salaryRange?: string;
  status: VacancyListRow['status'];
}

export async function createVacancy(user: SessionUser, input: VacancyFormInput): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const code =
    input.code?.trim() ||
    `VAC-${Date.now().toString(36).toUpperCase()}`;

  let organizationId = input.organizationId ?? null;
  let organizationName = input.organizationName.trim();
  let projectName: string | null = null;
  let city = input.city.trim();

  if (input.organizationType === 'PARENT') {
    if (organizationId || input.projectId) {
      throw new Error('فرصت هلدینگ مادر نمی‌تواند به شرکت یا پروژه زیرمجموعه متصل باشد.');
    }
    const { data: settings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('parent_name')
      .eq('id', 1)
      .maybeSingle();
    if (settingsError) throw new Error('بررسی نام هلدینگ مادر ناموفق بود: ' + settingsError.message);
    if (!settings?.parent_name?.trim()) {
      throw new Error('ابتدا نام واقعی هلدینگ مادر را در بخش «ساختار سازمانی» ثبت کنید.');
    }
    organizationName = settings.parent_name.trim();
  } else {
    if (!organizationId) {
      throw new Error('برای ثبت فرصت شرکت زیرمجموعه، ابتدا شرکت را انتخاب کنید.');
    }

    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id, name_fa, status')
      .eq('id', organizationId)
      .maybeSingle();

    if (organizationError) {
      throw new Error(`بررسی شرکت انتخاب‌شده ناموفق بود: ${organizationError.message}`);
    }
    if (!organization || organization.status !== 'ACTIVE') {
      throw new Error('شرکت انتخاب‌شده وجود ندارد یا غیرفعال است. فهرست شرکت‌ها را تازه‌سازی کنید.');
    }

    // The authoritative organization label comes from the database, not the browser.
    organizationName = organization.name_fa;

    if (input.projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, organization_id, city, status')
        .eq('id', input.projectId)
        .maybeSingle();

      if (projectError) {
        throw new Error(`بررسی پروژه انتخاب‌شده ناموفق بود: ${projectError.message}`);
      }
      if (!project || project.organization_id !== organizationId) {
        throw new Error('پروژه انتخاب‌شده متعلق به این شرکت نیست. شرکت و پروژه را دوباره انتخاب کنید.');
      }
      if (project.status !== 'ACTIVE' && project.status !== 'PLANNING') {
        throw new Error('فقط پروژه‌های فعال یا در حال برنامه‌ریزی برای فرصت جدید قابل انتخاب هستند.');
      }

      projectName = project.name;
      // Prefer the registered project city so a vacancy cannot accidentally be
      // attached to a project in one city while being advertised in another.
      if (project.city?.trim()) city = project.city.trim();
    }
  }

  const { data, error } = await supabase
    .from('vacancies')
    .insert({
      code,
      title: input.title,
      category: input.category,
      organization_type: input.organizationType,
      organization_id: organizationId,
      organization_name: organizationName,
      project_name: projectName,
      city,
      open_positions_count: input.openPositionsCount,
      employment_type: input.employmentType,
      required_degree: (input.requiredDegree || null) as VacancyDetail['required_degree'],
      min_years_experience: input.minYearsExperience,
      required_skills: splitList(input.requiredSkillsCsv),
      preferred_skills: splitList(input.preferredSkillsCsv),
      description: input.description || null,
      salary_range: input.salaryRange || null,
      status: input.status,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'خطا در ایجاد فرصت شغلی');
  return data.id;
}

export async function updateVacancyStatus(
  user: SessionUser,
  id: string,
  status: VacancyListRow['status'],
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('vacancies')
    .update({ status, closed_at: status === 'FILLED' || status === 'CANCELLED' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function archiveVacancy(
  user: SessionUser,
  vacancyId: string,
  archived: boolean,
  reason = '',
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('اجازه بایگانی فرصت شغلی را ندارید.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_vacancy_archive', {
    p_vacancy_id: vacancyId,
    p_archived: archived,
    p_reason: reason.trim() || null,
  });
  if (error) {
    const message = error.message.includes('FORBIDDEN') ? 'اجازه بایگانی این فرصت را ندارید.'
      : error.message.includes('RECORD_NOT_FOUND') ? 'فرصت شغلی موردنظر پیدا نشد.'
      : 'بایگانی فرصت شغلی ناموفق بود: ' + error.message;
    throw new Error(message);
  }
}

/** Archives one candidate's application to this vacancy, not their talent-pool profile. */
export async function archiveCandidacy(
  user: SessionUser,
  candidacyId: string,
  vacancyId: string,
  archived: boolean,
  reason = '',
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('اجازه تغییر وضعیت معرفی متقاضی را ندارید.');
  const supabase = await createSupabaseServerClient();

  const { data: candidacy, error: candidacyError } = await supabase
    .from('candidacies')
    .select('id, vacancy_id, archived_at')
    .eq('id', candidacyId)
    .eq('vacancy_id', vacancyId)
    .maybeSingle();
  if (candidacyError) throw new Error('بررسی معرفی متقاضی ناموفق بود: ' + candidacyError.message);
  if (!candidacy) throw new Error('معرفی متقاضی موردنظر پیدا نشد.');

  if (!archived) {
    const { data: vacancy, error: vacancyError } = await supabase
      .from('vacancies')
      .select('archived_at')
      .eq('id', vacancyId)
      .maybeSingle();
    if (vacancyError) throw new Error('بررسی فرصت شغلی ناموفق بود: ' + vacancyError.message);
    if (vacancy?.archived_at) throw new Error('ابتدا خود فرصت شغلی را از بایگانی بازگردانی کنید.');
  }

  const { data, error } = await supabase
    .from('candidacies')
    .update(archived
      ? { archived_at: new Date().toISOString(), archive_reason: reason.trim() || 'بایگانی دستی توسط مدیر', updated_at: new Date().toISOString() }
      : { archived_at: null, archive_reason: null, updated_at: new Date().toISOString() })
    .eq('id', candidacyId)
    .eq('vacancy_id', vacancyId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error('تغییر وضعیت بایگانی معرفی ناموفق بود: ' + error.message);
  if (!data) throw new Error('معرفی متقاضی به‌روزرسانی نشد.');
}

/**
 * Returns the talent-pool candidates that are not already linked to a vacancy,
 * ranked by an explainable fit score. Exact category matches are the default
 * recommendation; HR can switch to the full pool for manual exceptions.
 */
export async function getVacancyApplicantOptions(
  user: SessionUser,
  vacancy: VacancyDetail,
): Promise<VacancyApplicantOption[]> {
  if (user.role !== 'ADMIN' || vacancy.archived_at) return [];
  const supabase = await createSupabaseServerClient();
  const alreadyLinked = new Set(vacancy.candidacies.map((item) => item.applicant_id));

  const { data: applicants, error: applicantsError } = await supabase
    .from('applicants')
    .select('id, public_code, full_name, primary_job_title, primary_job_category, residential_city, years_of_experience, group_priority, highest_degree, recruitment_status')
    .neq('recruitment_status', 'ARCHIVED')
    .order('full_name')
    .limit(1000);
  if (applicantsError) throw new Error('بارگذاری متقاضیان استخر ناموفق بود: ' + applicantsError.message);
  const eligible = (applicants ?? []).filter((applicant) => !alreadyLinked.has(applicant.id));
  const ids = eligible.map((applicant) => applicant.id);
  if (ids.length === 0) return [];

  const [
    { data: skills, error: skillsError },
    { data: preferences, error: preferencesError },
    { data: employment, error: employmentError },
  ] = await Promise.all([
    supabase.from('applicant_skills').select('applicant_id, name').in('applicant_id', ids),
    supabase.from('job_preferences').select('applicant_id, preferred_titles, preferred_cities').in('applicant_id', ids),
    supabase.from('employment_records').select('applicant_id, organization_id, project_name').eq('verification_status', 'VERIFIED').in('applicant_id', ids),
  ]);
  if (skillsError) throw new Error('بارگذاری مهارت‌ها برای پیشنهاد متقاضی ناموفق بود: ' + skillsError.message);
  if (preferencesError) throw new Error('بارگذاری ترجیحات شغلی ناموفق بود: ' + preferencesError.message);
  if (employmentError) throw new Error('بارگذاری سوابق مرتبط سازمانی ناموفق بود: ' + employmentError.message);

  const skillsByApplicant = new Map<string, string[]>();
  for (const row of skills ?? []) {
    const list = skillsByApplicant.get(row.applicant_id) ?? [];
    list.push(row.name);
    skillsByApplicant.set(row.applicant_id, list);
  }
  const preferencesByApplicant = new Map<string, { preferred_titles: string[]; preferred_cities: string[] }>();
  for (const row of preferences ?? []) {
    preferencesByApplicant.set(row.applicant_id, {
      preferred_titles: row.preferred_titles ?? [],
      preferred_cities: row.preferred_cities ?? [],
    });
  }
  const employmentByApplicant = new Map<string, { organizationIds: string[]; projectNames: string[] }>();
  for (const row of employment ?? []) {
    const current = employmentByApplicant.get(row.applicant_id) ?? { organizationIds: [], projectNames: [] };
    if (row.organization_id) current.organizationIds.push(row.organization_id);
    if (row.project_name) current.projectNames.push(row.project_name);
    employmentByApplicant.set(row.applicant_id, current);
  }

  return eligible.map((applicant) => {
    const preferences = preferencesByApplicant.get(applicant.id);
    const previousEmployment = employmentByApplicant.get(applicant.id);
    const candidate: MatchCandidate = {
      residentialCity: applicant.residential_city,
      yearsOfExperience: applicant.years_of_experience ?? 0,
      groupPriority: applicant.group_priority,
      skillNames: skillsByApplicant.get(applicant.id) ?? [],
      primaryJobTitle: applicant.primary_job_title,
      primaryJobCategory: applicant.primary_job_category,
      preferredTitles: preferences?.preferred_titles ?? [],
      preferredCities: preferences?.preferred_cities ?? [],
      previousOrganizationIds: previousEmployment?.organizationIds ?? [],
      previousProjectNames: previousEmployment?.projectNames ?? [],
      highestDegree: applicant.highest_degree,
    };
    const target: MatchVacancy = {
      title: vacancy.title,
      category: vacancy.category,
      city: vacancy.city,
      minYearsExperience: vacancy.min_years_experience,
      requiredSkills: vacancy.required_skills ?? [],
      organizationType: vacancy.organization_type,
      organizationId: vacancy.organization_id,
      projectName: vacancy.project_name,
      requiredDegree: vacancy.required_degree,
    };
    const breakdown = computeMatchScore(candidate, target);
    return {
      id: applicant.id,
      public_code: applicant.public_code,
      full_name: applicant.full_name,
      primary_job_title: applicant.primary_job_title,
      primary_job_category: applicant.primary_job_category,
      residential_city: applicant.residential_city,
      years_of_experience: applicant.years_of_experience ?? 0,
      group_priority: applicant.group_priority,
      match_score: breakdown.total,
      match_breakdown: breakdown,
      is_recommended: breakdown.categoryMatch === 25 && breakdown.total >= 40,
    };
  }).sort((a, b) => Number(b.is_recommended) - Number(a.is_recommended) || b.match_score - a.match_score || a.full_name.localeCompare(b.full_name, 'fa'));
}

/** Links an applicant to a vacancy; re-computes the transparent match score. */
export async function linkCandidacy(
  user: SessionUser,
  vacancyId: string,
  applicantId: string,
  notes?: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const [{ data: vacancy, error: vacancyError }, { data: applicant, error: applicantError }] = await Promise.all([
    supabase
      .from('vacancies')
      .select('city, min_years_experience, required_skills, title, category, organization_type, organization_id, project_name, required_degree, archived_at, status')
      .eq('id', vacancyId)
      .maybeSingle(),
    supabase
      .from('applicants')
      .select('residential_city, years_of_experience, group_priority, primary_job_title, primary_job_category, highest_degree, recruitment_status')
      .eq('id', applicantId)
      .maybeSingle(),
  ]);
  if (vacancyError) throw new Error('بازیابی فرصت شغلی ناموفق بود: ' + vacancyError.message);
  if (applicantError) throw new Error('بازیابی پرونده متقاضی ناموفق بود: ' + applicantError.message);
  if (!vacancy) throw new Error('فرصت شغلی موردنظر پیدا نشد.');
  if (!applicant) throw new Error('متقاضی موردنظر پیدا نشد.');
  if (vacancy.archived_at) throw new Error('این فرصت بایگانی شده است؛ ابتدا آن را بازگردانی کنید.');
  if (vacancy.status === 'FILLED' || vacancy.status === 'CANCELLED') {
    throw new Error('برای فرصت تکمیل‌شده یا لغوشده نمی‌توان متقاضی جدید معرفی کرد.');
  }
  if (applicant.recruitment_status === 'ARCHIVED') {
    throw new Error('پرونده این فرد در بایگانی متقاضیان است؛ ابتدا وضعیت پرونده را بررسی کنید.');
  }

  const [
    { data: skills, error: skillsError },
    { data: preferences, error: preferencesError },
    { data: employment, error: employmentError },
  ] = await Promise.all([
    supabase.from('applicant_skills').select('name').eq('applicant_id', applicantId),
    supabase.from('job_preferences').select('preferred_titles, preferred_cities').eq('applicant_id', applicantId).maybeSingle(),
    supabase.from('employment_records').select('organization_id, project_name').eq('applicant_id', applicantId).eq('verification_status', 'VERIFIED'),
  ]);
  if (skillsError) throw new Error('بازیابی مهارت‌های متقاضی ناموفق بود: ' + skillsError.message);
  if (preferencesError) throw new Error('بازیابی ترجیحات شغلی ناموفق بود: ' + preferencesError.message);
  if (employmentError) throw new Error('بازیابی سوابق سازمانی ناموفق بود: ' + employmentError.message);

  const candidate: MatchCandidate = {
    residentialCity: applicant.residential_city,
    yearsOfExperience: applicant.years_of_experience ?? 0,
    groupPriority: applicant.group_priority,
    skillNames: (skills ?? []).map((skill) => skill.name),
    primaryJobTitle: applicant.primary_job_title,
    primaryJobCategory: applicant.primary_job_category,
    preferredTitles: preferences?.preferred_titles ?? [],
    preferredCities: preferences?.preferred_cities ?? [],
    previousOrganizationIds: (employment ?? []).map((row) => row.organization_id).filter((id): id is string => Boolean(id)),
    previousProjectNames: (employment ?? []).map((row) => row.project_name).filter((name): name is string => Boolean(name)),
    highestDegree: applicant.highest_degree,
  };
  const target: MatchVacancy = {
    title: vacancy.title,
    category: vacancy.category,
    city: vacancy.city,
    minYearsExperience: vacancy.min_years_experience,
    requiredSkills: vacancy.required_skills ?? [],
    organizationType: vacancy.organization_type,
    organizationId: vacancy.organization_id,
    projectName: vacancy.project_name,
    requiredDegree: vacancy.required_degree,
  };
  const breakdown = computeMatchScore(candidate, target);

  const { error } = await supabase.from('candidacies').insert({
    applicant_id: applicantId,
    vacancy_id: vacancyId,
    stage: 'NEW',
    notes: notes || null,
    match_score: breakdown.total,
    match_breakdown: breakdown,
    created_by: user.id,
  });
  if (error) {
    if (error.code === '23505') throw new Error('این متقاضی قبلاً به همین فرصت شغلی معرفی شده است. برای بازگردانی، بخش بایگانی نامزدها را بررسی کنید.');
    if (error.code === '42501') throw new Error('دسترسی کافی برای معرفی متقاضی وجود ندارد.');
    throw new Error('ثبت معرفی متقاضی ناموفق بود: ' + error.message);
  }
}

export async function updateCandidacyStage(
  user: SessionUser,
  candidacyId: string,
  stage: VacancyDetail['candidacies'][number]['stage'],
  notes?: string,
): Promise<void> {
  void user; // authorization enforced inside the RPC + RLS
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_candidacy_stage', {
    p_candidacy_id: candidacyId,
    p_new_stage: stage,
    p_notes: notes ?? null,
  });
  if (error) {
    const message =
      error.message.includes('FORBIDDEN') ? 'اجازه انجام این عملیات را ندارید.'
      : error.message.includes('RECORD_NOT_FOUND') ? 'داوطلبی یافت نشد.'
      : error.message.includes('VACANCY_ARCHIVED') ? 'این فرصت قبلاً بایگانی شده است؛ مرحله داوطلب قابل تغییر نیست.'
      : `خطا در تغییر مرحله: ${error.message}`;
    throw new Error(message);
  }
}
