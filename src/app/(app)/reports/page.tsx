import { requireUser } from '@/lib/auth';
import { listApplicants } from '@/server/applicants';
import { getVocabularies } from '@/server/misc';
import { toPersianDigits } from '@/lib/persian';
import { PRIORITY_LABELS } from '@/lib/domain/labels';
import type { ApplicantFilters, GroupPriority } from '@/types';
import { ReportToolbar } from './ReportToolbar';

export const metadata = { title: 'گزارش‌ها و آمار' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser('/reports');
  const sp = await searchParams;
  const pick = (key: string): string | undefined => {
    const v = sp[key];
    return typeof v === 'string' && v !== '' && v !== 'ALL' ? v : undefined;
  };

  const filters: ApplicantFilters = {
    city: pick('city'),
    category: pick('category'),
    priority: pick('priority') as ApplicantFilters['priority'],
    pageSize: 100,
    sort: 'priority',
    dir: 'desc',
  };

  const [vocab, result] = await Promise.all([getVocabularies(user), listApplicants(user, filters)]);

  // Fetch all pages of the filtered scope for aggregation (bounded at 10k).
  const all = [...result.rows];
  let page = 2;
  while (all.length < Math.min(result.total, 10000) && page <= 100) {
    const next = await listApplicants(user, { ...filters, page });
    if (next.rows.length === 0) break;
    all.push(...next.rows);
    page += 1;
  }

  const priorityCounts = new Map<GroupPriority, number>();
  const categoryCounts = new Map<string, number>();
  const degreeCounts = new Map<string, number>();
  for (const row of all) {
    priorityCounts.set(row.group_priority, (priorityCounts.get(row.group_priority) ?? 0) + 1);
    categoryCounts.set(row.primary_job_category, (categoryCounts.get(row.primary_job_category) ?? 0) + 1);
    if (row.highest_degree_title) {
      degreeCounts.set(row.highest_degree_title, (degreeCounts.get(row.highest_degree_title) ?? 0) + 1);
    }
  }

  const total = all.length;
  const distribution = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const exportQuery = new URLSearchParams();
  for (const key of ['city', 'category', 'priority'] as const) {
    if (filters[key]) exportQuery.set(key, String(filters[key]));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="no-print flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">گزارش‌ها و تحلیل آماری</h1>
          <p className="mt-1 text-xs text-slate-500">
            آمار سوابق تأییدشده، فراوانی تخصص‌ها و پراکندگی جغرافیایی در دامنه انتخابی
          </p>
        </div>
      </div>

      <ReportToolbar cities={vocab.cities} categories={vocab.job_categories} exportQuery={exportQuery.toString()} />

      {/* KPI summary */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="خلاصه گزارش">
        <Kpi label="متقاضیان در دامنه گزارش" value={toPersianDigits(total)} tone="neutral" />
        <Kpi label="سابقه تأییدشده سازمان مادر" value={toPersianDigits(priorityCounts.get('VERIFIED_PARENT') ?? 0)} tone="success" />
        <Kpi label="سابقه تأییدشده شرکت‌های تابعه" value={toPersianDigits(priorityCounts.get('VERIFIED_SUBSIDIARY') ?? 0)} tone="teal" />
        <Kpi label="در انتظار استعلام کارگزینی" value={toPersianDigits(priorityCounts.get('PENDING_VERIFICATION') ?? 0)} tone="warning" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5" aria-label="تفکیک حوزه‌های شغلی">
          <h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            تفکیک حوزه‌های شغلی
          </h2>
          <div className="space-y-3">
            {distribution(categoryCounts).map(([cat, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{cat}</span>
                    <span className="num text-slate-500">{toPersianDigits(count)} نفر ({toPersianDigits(pct)}٪)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(pct, 5)}%` }} />
                  </div>
                </div>
              );
            })}
            {total === 0 && <p className="py-6 text-center text-xs text-slate-400">داده‌ای در این دامنه یافت نشد.</p>}
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5" aria-label="تفکیک مقاطع تحصیلی">
          <h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            تفکیک بر مبنای مقطع تحصیلی
          </h2>
          <div className="space-y-3">
            {distribution(degreeCounts).map(([deg, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={deg} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{deg}</span>
                    <span className="num text-slate-500">{toPersianDigits(count)} نفر ({toPersianDigits(pct)}٪)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[var(--color-accent-strong)]" style={{ width: `${Math.max(pct, 5)}%` }} />
                  </div>
                </div>
              );
            })}
            {total === 0 && <p className="py-6 text-center text-xs text-slate-400">داده‌ای در این دامنه یافت نشد.</p>}
          </div>
        </section>
      </div>

      {/* Detail table */}
      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white" aria-label="فهرست متقاضیان گزارش">
        <h2 className="border-b border-slate-100 p-4 text-sm font-semibold text-slate-900">
          فهرست متقاضیان منتخب ({toPersianDigits(total)} سطر)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">شناسه</th>
                <th scope="col" className="px-3 py-3 font-semibold">نام و نام خانوادگی</th>
                <th scope="col" className="px-3 py-3 font-semibold">شهر</th>
                <th scope="col" className="px-3 py-3 font-semibold">عنوان شغلی</th>
                <th scope="col" className="px-3 py-3 font-semibold">سابقه</th>
                <th scope="col" className="px-4 py-3 font-semibold">وضعیت اولویت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {all.slice(0, 50).map((app) => (
                <tr key={app.id} className="transition-soft hover:bg-slate-50/80">
                  <td className="num px-4 py-2.5 text-slate-500">{app.public_code}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{app.full_name}</td>
                  <td className="px-3 py-2.5">{app.residential_city ?? '—'}</td>
                  <td className="px-3 py-2.5">{app.primary_job_title}</td>
                  <td className="num px-3 py-2.5">{toPersianDigits(app.years_of_experience)} سال</td>
                  <td className="px-4 py-2.5 text-slate-600">{PRIORITY_LABELS[app.group_priority]}</td>
                </tr>
              ))}
              {total === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">موردی یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 50 && (
          <p className="border-t border-slate-100 bg-slate-50 p-3 text-center text-[11px] text-slate-500">
            نمایش ۵۰ سطر نخست؛ فهرست کامل در خروجی اکسل ارائه می‌شود.
          </p>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'success' | 'teal' | 'warning' }) {
  const border = {
    neutral: 'border-slate-200',
    success: 'border-emerald-200',
    teal: 'border-teal-200',
    warning: 'border-amber-200',
  }[tone];
  return (
    <div className={`rounded-[var(--radius-lg)] border bg-white p-4 ${border}`}>
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <div className="num text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
