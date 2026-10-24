import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  AuditRow,
  OrganizationRow,
  SessionUser,
  Vocabularies,
} from '@/types';

export async function listOrganizations(user: SessionUser): Promise<OrganizationRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: orgs }, { data: projects }] = await Promise.all([
    supabase.from('organizations').select('*').order('name_fa'),
    supabase.from('projects').select('id, organization_id, name, city, status'),
  ]);

  const byOrg = new Map<string, OrganizationRow['projects']>();
  for (const p of projects ?? []) {
    if (!p.organization_id) continue;
    const list = byOrg.get(p.organization_id) ?? [];
    list.push({ id: p.id, name: p.name, city: p.city, status: p.status });
    byOrg.set(p.organization_id, list);
  }

  return (orgs ?? []).map((o) => ({
    ...o,
    project_count: byOrg.get(o.id)?.length ?? 0,
    projects: byOrg.get(o.id) ?? [],
  }));
}

export async function createOrganization(
  user: SessionUser,
  input: { nameFa: string; code: string; field?: string; city?: string; isSubsidiary: boolean },
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('organizations').insert({
    code: input.code,
    name_fa: input.nameFa,
    field: input.field || null,
    city: input.city || null,
    status: 'ACTIVE',
  });
  if (error) {
    throw new Error(
      error.message.includes('duplicate key')
        ? 'شرکتی با این کد از قبل ثبت شده است.'
        : `خطا در ثبت شرکت: ${error.message}`,
    );
  }
}

export async function getVocabularies(user: SessionUser): Promise<Vocabularies> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('vocabularies').select('key, values').in('key', ['cities', 'job_categories']);
  const map = new Map((data ?? []).map((row) => [row.key, row.values as string[]]));
  return {
    cities: map.get('cities') ?? [],
    job_categories: map.get('job_categories') ?? [],
  };
}

export async function updateVocabulary(
  user: SessionUser,
  key: 'cities' | 'job_categories',
  action: 'add' | 'remove',
  value: string,
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase.from('vocabularies').select('values').eq('key', key).single();
  const current = ((row?.values as string[] | undefined) ?? []).slice();
  const next = action === 'add'
    ? current.includes(value) ? current : [...current, value]
    : current.filter((v) => v !== value);

  const { error } = await supabase
    .from('vocabularies')
    .update({ values: next, updated_by: user.id })
    .eq('key', key);
  if (error) throw new Error(error.message);
}

export interface AuditFilters {
  category?: string;
  q?: string;
  page?: number;
}

export async function listAuditEvents(
  user: SessionUser,
  filters: AuditFilters = {},
): Promise<AuditRow[]> {
  // RLS denies non-admins entirely; this is an admin screen.
  if (user.role !== 'ADMIN') return [];
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('audit_events')
    .select('id, created_at, channel, category, actor_name, actor_role, record_identifier, summary, details, outcome')
    .order('created_at', { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);

  if (filters.category && filters.category !== 'ALL') {
    query = query.eq('category', filters.category);
  }
  const q = filters.q?.trim();
  if (q) {
    query = query.or(`summary.ilike.%${q}%,actor_name.ilike.%${q}%,record_identifier.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
