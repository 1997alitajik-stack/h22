import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { computeMatchScore } from '@/lib/domain/match';
import { splitList } from '@/lib/persian';
import type { SessionUser, VacancyDetail, VacancyListRow } from '@/types';

const BASE_COLUMNS = `
  id, code, title, category, organization_type, organization_name, project_name, city,
  open_positions_count, employment_type, min_years_experience, required_skills, status, opened_at
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
    );
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
      `id, applicant_id, stage, notes, match_score, match_breakdown, applied_at,
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
      };
    }) ?? [];

  const shortlisted = rows.filter((r) => r.stage === 'SHORTLIST' || r.stage === 'INTERVIEW').length;

  return {
    ...vacancy,
    applicant_count: rows.length,
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
  projectName?: string;
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

  const { data, error } = await supabase
    .from('vacancies')
    .insert({
      code,
      title: input.title,
      category: input.category,
      organization_type: input.organizationType,
      organization_id: input.organizationId ?? null,
      organization_name: input.organizationName,
      project_name: input.projectName || null,
      city: input.city,
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
      .select('city, min_years_experience, required_skills, title')
      .eq('id', vacancyId)
      .single(),
    supabase
      .from('applicants')
      .select('residential_city, years_of_experience, group_priority')
      .eq('id', applicantId)
      .single(),
  ]);
  if (vacancyError) throw new Error(`بازیابی فرصت شغلی ناموفق بود: ${vacancyError.message}`);
  if (applicantError) throw new Error(`بازیابی پرونده متقاضی ناموفق بود: ${applicantError.message}`);
  if (!vacancy || !applicant) throw new Error('متقاضی یا فرصت شغلی یافت نشد');

  const { data: skills, error: skillsError } = await supabase
    .from('applicant_skills')
    .select('name')
    .eq('applicant_id', applicantId);
  if (skillsError) throw new Error(`بازیابی مهارت‌های متقاضی ناموفق بود: ${skillsError.message}`);

  const breakdown = computeMatchScore(
    {
      residentialCity: applicant.residential_city,
      yearsOfExperience: applicant.years_of_experience,
      groupPriority: applicant.group_priority,
      skillNames: (skills ?? []).map((s) => s.name),
    },
    {
      city: vacancy.city,
      minYearsExperience: vacancy.min_years_experience,
      requiredSkills: vacancy.required_skills ?? [],
    },
  );

  const { error } = await supabase.from('candidacies').upsert(
    {
      applicant_id: applicantId,
      vacancy_id: vacancyId,
      stage: 'NEW',
      notes: notes || null,
      match_score: breakdown.total,
      match_breakdown: breakdown,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'applicant_id,vacancy_id' },
  );
  if (error) throw new Error(error.message);
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
      : `خطا در تغییر مرحله: ${error.message}`;
    throw new Error(message);
  }
}
