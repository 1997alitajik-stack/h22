import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DashboardMetrics, SessionUser } from '@/types';

const APPLICANT_LIST_COLUMNS = `
  id, public_code, full_name, primary_job_title, primary_job_category, residential_city,
  years_of_experience, highest_degree, highest_degree_title, group_priority,
  group_priority_reason, recruitment_status, completeness, created_at
`;
const VACANCY_LIST_COLUMNS = `
  id, code, title, category, organization_type, organization_name, project_name, city,
  open_positions_count, employment_type, min_years_experience, required_skills, status, opened_at
`;

function tally<T>(rows: T[] | null, pick: (row: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    const value = pick(row);
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}

/** Aggregated dashboard metrics — all under RLS, one query per dimension. */
export async function getDashboardMetrics(user: SessionUser): Promise<DashboardMetrics> {
  const supabase = await createSupabaseServerClient();

  const [
    { count: total },
    { count: newThisMonth },
    { data: priorityRows },
    { count: incomplete },
    { count: openVacancies },
    { data: categoryRows },
    { data: cityRows },
    { data: statusRows },
    { data: recent },
    { data: openList },
  ] = await Promise.all([
    supabase.from('applicants').select('id', { count: 'exact', head: true }),
    supabase
      .from('applicants')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfCurrentJalaliMonth()),
    supabase.from('applicants').select('group_priority'),
    supabase.from('applicants').select('id', { count: 'exact', head: true }).lt('completeness', 70),
    supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabase.from('applicants').select('primary_job_category'),
    supabase.from('applicants').select('residential_city'),
    supabase.from('applicants').select('recruitment_status'),
    supabase.from('applicants').select(APPLICANT_LIST_COLUMNS).order('created_at', { ascending: false }).limit(6),
    supabase.from('vacancies').select(VACANCY_LIST_COLUMNS).eq('status', 'OPEN').order('opened_at', { ascending: false }).limit(4),
  ]);

  const priority = tally(priorityRows, (r) => r.group_priority);
  const categories = tally(categoryRows, (r) => r.primary_job_category);
  const cities = tally(cityRows, (r) => r.residential_city);
  const statuses = tally(statusRows, (r) => r.recruitment_status);

  const STATUS_ORDER = [
    'NEW',
    'UNDER_REVIEW',
    'INTERVIEWING',
    'SHORTLISTED',
    'OFFERED',
    'HIRED',
    'REJECTED',
    'ARCHIVED',
  ] as const;

  return {
    total_applicants: total ?? 0,
    new_this_month: newThisMonth ?? 0,
    verified_parent: priority.get('VERIFIED_PARENT') ?? 0,
    verified_subsidiary: priority.get('VERIFIED_SUBSIDIARY') ?? 0,
    pending_verification: priority.get('PENDING_VERIFICATION') ?? 0,
    no_group_history: priority.get('NO_GROUP_HISTORY') ?? 0,
    insufficient_data: priority.get('INSUFFICIENT_DATA') ?? 0,
    incomplete_profiles: incomplete ?? 0,
    open_vacancies: openVacancies ?? 0,
    category_distribution: [...categories.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    city_distribution: [...cities.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 9),
    status_distribution: STATUS_ORDER.map((status) => ({
      status,
      count: statuses.get(status) ?? 0,
    })),
    recent_applicants: (recent ?? []) as DashboardMetrics['recent_applicants'],
    open_vacancy_list: (openList ?? []).map((v) => ({
      ...v,
      applicant_count: 0,
      shortlisted_count: 0,
    })),
  };
}

/**
 * Start of the current Jalali month as an ISO timestamp. Walks back at most
 * 31 days from today until the Persian calendar reports day-of-month == 1 —
 * deterministic, no external date library.
 */
function startOfCurrentJalaliMonth(): string {
  const formatter = new Intl.DateTimeFormat('en-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const now = new Date();
  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  const targetYear = get('year');
  const targetMonth = get('month');

  for (let i = 0; i < 32; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    const p = formatter.formatToParts(d);
    const y = Number(p.find((x) => x.type === 'year')?.value ?? '0');
    const m = Number(p.find((x) => x.type === 'month')?.value ?? '0');
    const day = Number(p.find((x) => x.type === 'day')?.value ?? '0');
    if (y === targetYear && m === targetMonth && day === 1) {
      return d.toISOString();
    }
  }
  return new Date(now.getTime() - 31 * 86400000).toISOString();
}
