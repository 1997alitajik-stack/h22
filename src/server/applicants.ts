import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizePersianText } from '@/lib/persian';
import { maskNationalId, maskPhone } from '@/lib/persian';
import type {
  ApplicantDetail,
  ApplicantFilters,
  ApplicantListRow,
  EmploymentRow,
  Paginated,
  SessionUser,
} from '@/types';

const LIST_COLUMNS = `
  id, public_code, full_name, primary_job_title, primary_job_category,
  residential_city, years_of_experience, highest_degree, highest_degree_title,
  group_priority, group_priority_reason, recruitment_status, completeness, created_at
`;

/** Strips characters that would break a PostgREST `or()` filter expression. */
function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,*()."']/g, ' ').trim();
}

/**
 * Server-side search + filter + sort + pagination (mission §4.5).
 * Runs entirely under the caller's RLS context; totals come from the same
 * filtered query as the rows.
 */
export async function listApplicants(
  user: SessionUser,
  filters: ApplicantFilters,
): Promise<Paginated<ApplicantListRow>> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 10));

  let query = supabase.from('applicants').select(LIST_COLUMNS, { count: 'exact' });

  const q = sanitizeSearchTerm(filters.q ?? '');
  if (q) {
    const nq = normalizePersianText(q);
    query = query.or(
      [
        `search_norm.ilike.%${nq}%`,
        `employment_records.search_norm.ilike.%${nq}%`,
        `applicant_skills.name_norm.ilike.%${nq}%`,
      ].join(','),
    );
  }

  if (filters.city) query = query.eq('residential_city', filters.city);
  if (filters.category) query = query.eq('primary_job_category', filters.category);
  if (filters.priority) query = query.eq('group_priority', filters.priority);
  if (filters.status) query = query.eq('recruitment_status', filters.status);
  if (filters.degree) query = query.eq('highest_degree', filters.degree);
  if (filters.minExp !== undefined && filters.minExp > 0) query = query.gte('years_of_experience', filters.minExp);
  if (filters.maxExp !== undefined && filters.maxExp < 60) query = query.lte('years_of_experience', filters.maxExp);
  if (filters.hasParent) query = query.eq('group_priority', 'VERIFIED_PARENT');
  if (filters.hasSubsidiary) query = query.eq('group_priority', 'VERIFIED_SUBSIDIARY');

  // Enum declaration order == priority weight order (VERIFIED_PARENT first).
  const sort = filters.sort ?? 'priority';
  const dir = filters.dir ?? 'desc';
  if (sort === 'priority') {
    // weight desc == enum asc; tie-break by experience in the same direction.
    query = query
      .order('group_priority', { ascending: true })
      .order('years_of_experience', { ascending: dir === 'asc' });
  } else if (sort === 'experience') {
    query = query.order('years_of_experience', { ascending: dir === 'asc' });
  } else if (sort === 'registeredAt') {
    query = query.order('created_at', { ascending: dir === 'asc' });
  } else if (sort === 'fullName') {
    query = query.order('full_name', { ascending: dir === 'asc' });
  } else {
    query = query.order('completeness', { ascending: dir === 'asc' });
  }
  query = query.order('id', { ascending: true }); // stable pagination

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(`خطا در بازیابی فهرست متقاضیان: ${error.message}`);

  const total = count ?? 0;
  return {
    rows: (data ?? []) as ApplicantListRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Full applicant detail. Masked PII comes from rasta.get_masked_pii (SECURITY
 * DEFINER returning masked values only). Full PII is fetched exclusively by
 * getSensitiveForAdmin — the admin unmask action — never for viewers.
 */
export async function getApplicantDetail(
  user: SessionUser,
  id: string,
): Promise<ApplicantDetail | null> {
  const supabase = await createSupabaseServerClient();

  const [{ data: applicant, error: appErr }, { data: masked }] = await Promise.all([
    supabase
      .from('applicants')
      .select(
        `${LIST_COLUMNS}, first_name, last_name, father_name, birth_date_jalali, birth_place,
         email, highest_field_of_study, updated_at`,
      )
      .eq('id', id)
      .single(),
    supabase.rpc('get_masked_pii', { p_applicant: id }),
  ]);

  if (appErr || !applicant) return null;

  const [
    { data: employment },
    { data: education },
    { data: certificates },
    { data: skills },
    { data: preferences },
    { data: attachments },
    { data: candidacies },
    { data: notes },
  ] = await Promise.all([
    supabase
      .from('employment_records')
      .select(
        `id, applicant_id, employer_name, is_group_entity, group_entity_type, project_name, city,
         job_title, start_date_jalali, end_date_jalali, is_current, responsibilities,
         verification_status, verification_notes, verified_at,
         employment_sensitive(last_salary, reason_for_leaving)`,
      )
      .eq('applicant_id', id)
      .order('start_date_jalali', { ascending: false }),
    supabase
      .from('education_records')
      .select(
        `id, degree_level, degree_title, field_of_study, institution_name, city,
         start_date_jalali, end_date_jalali, is_studying, gpa`,
      )
      .eq('applicant_id', id)
      .order('start_date_jalali', { ascending: false }),
    supabase.from('certificates').select(`id, title, issuing_organization, issue_date_jalali, expiry_date_jalali, certificate_type, verification_status`).eq('applicant_id', id),
    supabase.from('applicant_skills').select('id, name, category, level').eq('applicant_id', id).order('name'),
    supabase.from('job_preferences').select('*').eq('applicant_id', id).maybeSingle(),
    supabase
      .from('attachments')
      .select('id, applicant_id, title, category, original_filename, mime_type, size_bytes, is_primary_resume, version_number, notes, uploaded_at, uploader_name')
      .eq('applicant_id', id)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('candidacies')
      .select('id, applicant_id, vacancy_id, stage, notes, match_score, match_breakdown, applied_at, vacancies(title, code)')
      .eq('applicant_id', id)
      .order('applied_at', { ascending: false }),
    // Confidential notes are filtered out by RLS for non-admins.
    supabase
      .from('internal_notes')
      .select('id, author_name, author_role, content, is_confidential, created_at')
      .eq('applicant_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const m = (masked ?? {}) as {
    national_id_masked?: string | null;
    phone_masked?: string | null;
  };

  interface RawEmployment extends Omit<EmploymentRow, 'last_salary' | 'reason_for_leaving'> {
    employment_sensitive?: { last_salary: string | null; reason_for_leaving: string | null }[] | null;
  }

  interface RawCandidacy {
    id: string;
    applicant_id: string;
    vacancy_id: string;
    stage: ApplicantDetail['candidacies'][number]['stage'];
    notes: string | null;
    match_score: number | null;
    match_breakdown: ApplicantDetail['candidacies'][number]['match_breakdown'];
    applied_at: string;
    vacancies?: { title?: string; code?: string }[] | { title?: string; code?: string } | null;
  }

  const embed = (v: RawCandidacy['vacancies']): { title: string; code: string } => {
    if (Array.isArray(v)) return { title: v[0]?.title ?? '', code: v[0]?.code ?? '' };
    return { title: v?.title ?? '', code: v?.code ?? '' };
  };

  return {
    ...(applicant as unknown as ApplicantDetail),
    national_id_masked: m.national_id_masked ?? null,
    phone_masked: m.phone_masked ?? null,
    employment: ((employment ?? []) as unknown as RawEmployment[]).map((e) => {
      const sens = Array.isArray(e.employment_sensitive) ? e.employment_sensitive[0] : undefined;
      return {
        ...e,
        last_salary: user.role === 'ADMIN' && sens ? sens.last_salary : null,
        reason_for_leaving: user.role === 'ADMIN' && sens ? sens.reason_for_leaving : null,
      };
    }),
    education: education ?? [],
    certificates: certificates ?? [],
    skills: skills ?? [],
    preferences: preferences ?? null,
    attachments: attachments ?? [],
    candidacies: ((candidacies ?? []) as unknown as RawCandidacy[]).map((c) => ({
      id: c.id,
      applicant_id: c.applicant_id,
      vacancy_id: c.vacancy_id,
      stage: c.stage,
      notes: c.notes,
      match_score: c.match_score,
      match_breakdown: c.match_breakdown,
      applied_at: c.applied_at,
      vacancy_title: embed(c.vacancies).title,
      vacancy_code: embed(c.vacancies).code,
    })),
    notes: notes ?? [],
  };
}

/**
 * ADMIN-ONLY unmask: returns full PII for an explicit, audited reveal.
 * RLS would already deny a viewer here; the role check keeps intent explicit.
 */
export async function getSensitiveForAdmin(
  user: SessionUser,
  applicantId: string,
): Promise<{ national_id: string | null; phone: string | null; home_address: string | null; alternative_phone: string | null } | null> {
  if (user.role !== 'ADMIN') return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('applicant_sensitive')
    .select('national_id, phone, home_address, alternative_phone')
    .eq('applicant_id', applicantId)
    .maybeSingle();
  return data ?? null;
}

export { maskNationalId, maskPhone };
