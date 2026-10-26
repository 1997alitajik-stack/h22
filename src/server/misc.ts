import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  AuditRow,
  OrganizationRow,
  OrganizationSettings,
  SessionUser,
  Vocabularies,
} from '@/types';

export async function listOrganizations(user: SessionUser): Promise<OrganizationRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: orgs, error: orgsError }, { data: projects, error: projectsError }] = await Promise.all([
    supabase.from('organizations').select('*').order('name_fa'),
    supabase.from('projects').select('id, organization_id, name, city, status'),
  ]);
  if (orgsError) throw new Error(`بارگذاری ساختار سازمانی ناموفق بود: ${orgsError.message}`);
  if (projectsError) throw new Error(`بارگذاری پروژه‌های سازمانی ناموفق بود: ${projectsError.message}`);

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

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('organization_settings')
    .select('id, parent_name, auto_archive_enabled, auto_archive_days, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error('بارگذاری تنظیمات هلدینگ ناموفق بود: ' + error.message);
  return data ?? {
    id: 1,
    parent_name: '',
    auto_archive_enabled: true,
    auto_archive_days: 60,
    updated_at: null,
  };
}

export async function updateOrganizationSettings(
  user: SessionUser,
  input: { parentName: string; autoArchiveEnabled: boolean; autoArchiveDays: number },
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('اجازه تغییر تنظیمات ساختار سازمانی را ندارید.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('organization_settings').upsert({
    id: 1,
    parent_name: input.parentName.trim(),
    auto_archive_enabled: input.autoArchiveEnabled,
    auto_archive_days: input.autoArchiveDays,
    updated_by: user.id,
  }, { onConflict: 'id' });
  if (error) throw new Error('ذخیره تنظیمات هلدینگ ناموفق بود: ' + error.message);
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
  const { data, error } = await supabase.from('vocabularies').select('key, values').in('key', ['cities', 'job_categories']);
  if (error) throw new Error(`بارگذاری اطلاعات پایه ناموفق بود: ${error.message}`);
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

  const { data: row, error: readError } = await supabase.from('vocabularies').select('values').eq('key', key).single();
  if (readError || !row) throw new Error(`خواندن اطلاعات پایه ناموفق بود: ${readError?.message ?? 'رکورد یافت نشد'}`);
  const current = (row.values as string[]).slice();
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

export async function updateOrganization(
  user: SessionUser,
  input: { organizationId: string; nameFa: string; code: string; field?: string; city?: string; status: 'ACTIVE' | 'INACTIVE' },
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('organizations')
    .update({
      name_fa: input.nameFa,
      code: input.code,
      field: input.field || null,
      city: input.city || null,
      status: input.status,
    })
    .eq('id', input.organizationId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.code === '23505' ? 'کد سازمانی واردشده قبلاً استفاده شده است.' : `ویرایش شرکت ناموفق بود: ${error.message}`);
  }
  if (!data) throw new Error('شرکت موردنظر پیدا نشد.');
}

export async function deleteOrganization(user: SessionUser, organizationId: string): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();

  const [
    { count: projectCount, error: projectError },
    { count: employmentCount, error: employmentError },
    { count: vacancyCount, error: vacancyError },
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('employment_records').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
  ]);

  const queryError = projectError || employmentError || vacancyError;
  if (queryError) throw new Error(`بررسی ارتباطات شرکت ناموفق بود: ${queryError.message}`);
  if ((projectCount ?? 0) > 0 || (employmentCount ?? 0) > 0 || (vacancyCount ?? 0) > 0) {
    throw new Error('این شرکت هنوز در پروژه‌ها، سوابق کاری یا فرصت‌های شغلی استفاده شده است. برای حفظ سوابق تاریخی، ابتدا آن را غیرفعال کنید و فقط شرکت بدون وابستگی را حذف کنید.');
  }

  const { data, error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', organizationId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`حذف شرکت ناموفق بود: ${error.message}`);
  if (!data) throw new Error('شرکت موردنظر پیدا نشد.');
}

export async function createProject(
  user: SessionUser,
  input: { organizationId: string; name: string; city?: string; status: 'ACTIVE' | 'COMPLETED' | 'PLANNING' },
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('projects').insert({
    organization_id: input.organizationId,
    name: input.name,
    city: input.city || null,
    status: input.status,
  });
  if (error) throw new Error(`ثبت پروژه ناموفق بود: ${error.message}`);
}

export async function updateProject(
  user: SessionUser,
  input: { projectId: string; name: string; city?: string; status: 'ACTIVE' | 'COMPLETED' | 'PLANNING' },
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .update({ name: input.name, city: input.city || null, status: input.status })
    .eq('id', input.projectId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`ویرایش پروژه ناموفق بود: ${error.message}`);
  if (!data) throw new Error('پروژه موردنظر پیدا نشد.');
}

export async function deleteProject(user: SessionUser, projectId: string): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`حذف پروژه ناموفق بود: ${error.message}`);
  if (!data) throw new Error('پروژه موردنظر پیدا نشد.');
}

