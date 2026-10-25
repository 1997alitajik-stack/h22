'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Database,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
} from 'lucide-react';
import { PriorityBadge, RecruitmentStatusBadge } from '@/components/ui/Badges';
import { seedDemoApplicantsAction } from '@/app/actions/admin';
import { useServerAction } from '@/lib/useServerAction';
import { Button, CompletenessMeter, EmptyState, inputClass, selectClass } from '@/components/ui/Primitives';
import { DEGREE_LABELS, PRIORITY_LABELS, RECRUITMENT_STATUS_LABELS } from '@/lib/domain/labels';
import { toPersianDigits } from '@/lib/persian';
import type {
  ApplicantFilters,
  ApplicantListRow,
  DegreeLevel,
  GroupPriority,
  Paginated,
  RecruitmentStatus,
  SessionUser,
} from '@/types';

interface Props {
  user: SessionUser;
  result: Paginated<ApplicantListRow>;
  filters: ApplicantFilters;
  cities: string[];
  categories: string[];
}

const DEGREE_OPTIONS = Object.entries(DEGREE_LABELS) as [DegreeLevel, string][];
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS) as [GroupPriority, string][];
const STATUS_OPTIONS = Object.entries(RECRUITMENT_STATUS_LABELS) as [RecruitmentStatus, string][];

export function ApplicantDirectory({ user, result, filters, cities, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q ?? '');
  const [demoSeedState, , demoSeedPending, submitDemoSeed] = useServerAction(
    seedDemoApplicantsAction,
    { ok: false },
  );

  async function handleDemoSeed() {
    try {
      const result = await submitDemoSeed(new FormData());
      if (result.ok) router.refresh();
    } catch (error) {
      console.error('[RASTA_DEMO_SEED] Demo data action failed in the client', error);
    }
  }

  // Debounced search push
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (searchInput === current) return;
    const timer = setTimeout(() => {
      pushParams({ q: searchInput || null, page: null });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function pushParams(patch: Record<string, string | number | boolean | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || value === false || value === 'ALL') params.delete(key);
      else params.set(key, String(value));
    }
    startTransition(() => router.push(`/applicants?${params.toString()}`));
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.city) count += 1;
    if (filters.category) count += 1;
    if (filters.priority) count += 1;
    if (filters.status) count += 1;
    if (filters.degree) count += 1;
    if (filters.minExp || filters.maxExp !== undefined) count += 1;
    if (filters.hasParent) count += 1;
    if (filters.hasSubsidiary) count += 1;
    return count;
  }, [filters]);

  const isAdmin = user.role === 'ADMIN';
  const exportHref = `/api/export/applicants?${searchParams.toString()}`;

  const sortColumns: { field: NonNullable<ApplicantFilters['sort']>; label: string }[] = [
    { field: 'fullName', label: 'شناسه و نام متقاضی' },
    { field: 'experience', label: 'سابقه کار' },
    { field: 'priority', label: 'اولویت استخدام سازمانی' },
    { field: 'completeness', label: 'تکمیل پرونده' },
  ];

  function toggleSort(field: NonNullable<ApplicantFilters['sort']>) {
    if (filters.sort === field) {
      pushParams({ dir: filters.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      pushParams({ sort: field, dir: 'desc' });
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">بانک متقاضیان</h1>
            <span className="num rounded-[var(--radius-sm)] border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {toPersianDigits(result.total)} پرونده
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            جستجو، فیلتر ترکیبی و اولویت‌بندی سوابق سازمانی در ستاد و شرکت‌های تابعه
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={exportHref}
            onClick={() => startTransition(() => undefined)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs transition-soft hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            خروجی اکسل (CSV)
          </a>
          {isAdmin && (
            <Link
              href="/applicants/new"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-soft hover:bg-[var(--color-accent-strong)]"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              ثبت متقاضی جدید
            </Link>
          )}
        </div>
      </div>

      {isAdmin && (
        <section className="space-y-2" aria-label="داده‌های آزمایشی">
          <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-dashed border-teal-300 bg-teal-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-teal-950">آزمایش سامانه با ۵۰ رزومهٔ نمونه</p>
              <p className="mt-1 max-w-3xl text-[11px] leading-6 text-teal-900/80">
                اطلاعات کاملاً ساختگی با سابقهٔ کاری، تحصیلی و مهارت‌هاست؛ شناسه‌ها با DEMO-RASTA شروع می‌شوند.
                هیچ شماره ملی، شماره تماس یا ایمیل قابل‌دسترسی ایجاد نمی‌شود. اجرای دوباره، رکورد تکراری نمی‌سازد.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => void handleDemoSeed()}
              loading={demoSeedPending}
              className="shrink-0 border-teal-300 bg-white text-teal-900 hover:bg-teal-100"
            >
              <Database className="h-3.5 w-3.5" aria-hidden />
              ایجاد ۵۰ رزومهٔ آزمایشی
            </Button>
          </div>
          {demoSeedState.error && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {demoSeedState.error}
            </p>
          )}
          {demoSeedState.message && (
            <p role="status" className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {demoSeedState.message}
            </p>
          )}
        </section>
      )}

      {/* Search + filters */}
      <div className="space-y-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="جستجو: نام، شناسه، تخصص، مهارت، کارفرمای پیشین…"
              aria-label="جستجوی متقاضیان"
              className={`${inputClass} pr-10`}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="پاک کردن جستجو"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
          <Button
            variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'secondary'}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={showFilters || activeFilterCount > 0 ? 'border-teal-300 bg-teal-50 text-teal-800' : ''}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            فیلترهای پیشرفته
            {activeFilterCount > 0 && (
              <span className="num flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-white">
                {toPersianDigits(activeFilterCount)}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1">
              <span className="font-medium text-slate-600">شهر محل سکونت</span>
              <select
                className={selectClass}
                value={filters.city ?? 'ALL'}
                onChange={(e) => pushParams({ city: e.target.value, page: null })}
              >
                <option value="ALL">همه شهرها</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-medium text-slate-600">حوزه شغلی</span>
              <select
                className={selectClass}
                value={filters.category ?? 'ALL'}
                onChange={(e) => pushParams({ category: e.target.value, page: null })}
              >
                <option value="ALL">همه حوزه‌ها</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-medium text-slate-600">اولویت سازمانی</span>
              <select
                className={selectClass}
                value={filters.priority ?? 'ALL'}
                onChange={(e) => pushParams({ priority: e.target.value, page: null })}
              >
                <option value="ALL">همه اولویت‌ها</option>
                {PRIORITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-medium text-slate-600">وضعیت استخدام</span>
              <select
                className={selectClass}
                value={filters.status ?? 'ALL'}
                onChange={(e) => pushParams({ status: e.target.value, page: null })}
              >
                <option value="ALL">همه وضعیت‌ها</option>
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-medium text-slate-600">مدرک تحصیلی</span>
              <select
                className={selectClass}
                value={filters.degree ?? 'ALL'}
                onChange={(e) => pushParams({ degree: e.target.value, page: null })}
              >
                <option value="ALL">همه مدارک</option>
                {DEGREE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <div className="space-y-1">
              <span className="font-medium text-slate-600">سابقه کار (سال)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={60}
                  placeholder="از"
                  aria-label="حداقل سابقه"
                  defaultValue={filters.minExp ?? ''}
                  onBlur={(e) => pushParams({ minExp: e.target.value === '' ? null : Number(e.target.value), page: null })}
                  className={`${inputClass} num`}
                />
                <input
                  type="number"
                  min={0}
                  max={60}
                  placeholder="تا"
                  aria-label="حداکثر سابقه"
                  defaultValue={filters.maxExp ?? ''}
                  onBlur={(e) => pushParams({ maxExp: e.target.value === '' ? null : Number(e.target.value), page: null })}
                  className={`${inputClass} num`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-5 lg:col-span-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.hasParent ?? false}
                  onChange={(e) => pushParams({ hasParent: e.target.checked ? 1 : null, page: null })}
                  className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span className="text-slate-700">فقط سابقه ستاد سازمان مادر</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.hasSubsidiary ?? false}
                  onChange={(e) => pushParams({ hasSubsidiary: e.target.checked ? 1 : null, page: null })}
                  className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span className="text-slate-700">فقط سابقه شرکت‌های تابعه</span>
              </label>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => startTransition(() => router.push('/applicants'))}
                  className="mr-auto text-xs font-medium text-rose-600 hover:text-rose-800"
                >
                  پاک کردن همه فیلترها
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white ${pending ? 'opacity-60' : ''}`}>
        {result.rows.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" aria-hidden />}
            title="هیچ متقاضی با این مشخصات یافت نشد"
            description="واژه جستجو را تغییر دهید یا فیلترهای فعال را پاک کنید."
            action={
              <Button variant="secondary" onClick={() => startTransition(() => router.push('/applicants'))}>
                بازنشانی فیلترها
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3.5">
                    <SortHeader label={sortColumns[0]!.label} onClick={() => toggleSort('fullName')} active={filters.sort === 'fullName'} dir={filters.dir} />
                  </th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">تخصص / عنوان شغلی</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">شهر</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">مدرک تحصیلی</th>
                  <th scope="col" className="px-3 py-3.5">
                    <SortHeader label={sortColumns[1]!.label} onClick={() => toggleSort('experience')} active={filters.sort === 'experience'} dir={filters.dir} />
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    <SortHeader label={sortColumns[2]!.label} onClick={() => toggleSort('priority')} active={filters.sort === 'priority'} dir={filters.dir} />
                  </th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">وضعیت جذب</th>
                  <th scope="col" className="px-3 py-3.5">
                    <SortHeader label={sortColumns[3]!.label} onClick={() => toggleSort('completeness')} active={filters.sort === 'completeness'} dir={filters.dir} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {result.rows.map((app) => (
                  <tr key={app.id} className="group transition-soft hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <Link href={`/applicants/${app.id}`} className="group-hover:text-teal-800">
                        <div className="font-semibold text-slate-900">{app.full_name}</div>
                        <div className="num text-[10px] text-slate-400">{app.public_code}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-[170px] truncate font-medium text-slate-900">{app.primary_job_title}</div>
                      <div className="max-w-[170px] truncate text-[10px] text-slate-500">{app.primary_job_category}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-700">{app.residential_city ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      <div>{app.highest_degree_title ?? 'ثبت نشده'}</div>
                      <div className="text-[10px] text-slate-400">{app.highest_degree ? DEGREE_LABELS[app.highest_degree] : ''}</div>
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                      {toPersianDigits(app.years_of_experience)} سال
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <PriorityBadge priority={app.group_priority} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <RecruitmentStatusBadge status={app.recruitment_status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <CompletenessMeter value={app.completeness} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {result.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50 p-4 text-xs text-slate-600 sm:flex-row">
            <div className="flex items-center gap-2">
              <span>تعداد در هر صفحه:</span>
              <select
                value={result.pageSize}
                onChange={(e) => pushParams({ pageSize: Number(e.target.value), page: null })}
                className="rounded-[var(--radius-sm)] border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                aria-label="تعداد سطر در صفحه"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{toPersianDigits(n)} سطر</option>
                ))}
              </select>
              <span className="num mr-2 text-slate-400">
                نمایش {toPersianDigits((result.page - 1) * result.pageSize + 1)} تا{' '}
                {toPersianDigits(Math.min(result.page * result.pageSize, result.total))} از{' '}
                {toPersianDigits(result.total)}
              </span>
            </div>
            <div className="num flex items-center gap-1">
              <button
                disabled={result.page <= 1}
                onClick={() => pushParams({ page: result.page - 1 })}
                className="rounded-[var(--radius-sm)] border border-slate-200 bg-white p-1.5 text-slate-600 transition-soft hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="صفحه قبلی"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <span className="px-3 font-semibold text-slate-800">
                صفحه {toPersianDigits(result.page)} از {toPersianDigits(result.totalPages)}
              </span>
              <button
                disabled={result.page >= result.totalPages}
                onClick={() => pushParams({ page: result.page + 1 })}
                className="rounded-[var(--radius-sm)] border border-slate-200 bg-white p-1.5 text-slate-600 transition-soft hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="صفحه بعدی"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  onClick,
  active,
  dir,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir?: 'asc' | 'desc';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 font-semibold transition-soft hover:text-teal-800 ${active ? 'text-teal-800' : ''}`}
      aria-label={`مرتب‌سازی بر اساس ${label}`}
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-3 w-3 ${active ? 'text-[var(--color-accent)]' : 'text-slate-400'}`} aria-hidden />
      {active && <span className="sr-only">{dir === 'asc' ? 'صعودی' : 'نزولی'}</span>}
    </button>
  );
}
