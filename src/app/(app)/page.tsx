import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getDashboardMetrics } from '@/server/dashboard';
import { toPersianDigits } from '@/lib/persian';
import { PriorityBadge, RecruitmentStatusBadge } from '@/components/ui/Badges';
import { RECRUITMENT_STATUS_LABELS } from '@/lib/domain/labels';
import { BrandMark } from '@/components/layout/BrandMark';
import { ApplicantLiveSearch } from '@/components/applicants/ApplicantLiveSearch';
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  Clock,
  HelpCircle,
  Layers,
  MinusCircle,
  Users,
} from 'lucide-react';

export const metadata = { title: 'داشبورد' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const metrics = await getDashboardMetrics(user);

  const verifiedTotal = metrics.verified_parent + metrics.verified_subsidiary;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Compact identity strip — the oversized decorative hero was removed. */}
      <section data-tour="dashboard-overview" className="flex flex-col justify-between gap-4 rounded-[var(--radius-lg)] border border-slate-200 bg-[var(--color-structure)] p-5 text-white sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <BrandMark size="md" theme="dark" withText />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">داشبورد مدیریت</h1>
            <p className="text-xs text-teal-300/90">
              بانک متقاضیان، اولویت‌های سازمانی و پایپ‌لاین جذب در یک نما
            </p>
          </div>
        </div>
        <Link
          href="/applicants"
          className="inline-flex items-center gap-1.5 self-start rounded-[var(--radius-md)] bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 transition-soft hover:bg-slate-700 sm:self-auto"
        >
          مشاهده بانک متقاضیان
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>

      {/* Quick live applicant search */}
      <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4 sm:p-5" aria-label="جستجوی سریع متقاضیان">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">جستجوی سریع متقاضی</h2>
            <p className="mt-1 text-xs text-slate-500">هنگام تایپ، متقاضیان مرتبط بر اساس نام، شناسه، تخصص، مهارت و سابقه کاری نمایش داده می‌شوند.</p>
          </div>
          <div className="w-full sm:max-w-xl sm:flex-1">
            <ApplicantLiveSearch
              placeholder={user.role === 'ADMIN'
                ? 'نام، شناسه، تخصص، مهارت، سابقه کاری یا کد ملی…'
                : 'نام، شناسه، تخصص، مهارت یا سابقه کاری…'}
            />
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <section data-tour="dashboard-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="شاخص‌های کلیدی">
        <KpiCard
          title="کل پرونده‌های ثبت‌شده"
          value={toPersianDigits(metrics.total_applicants)}
          unit="متقاضی"
          hint={`${toPersianDigits(metrics.new_this_month)} پرونده جدید در ماه جاری`}
          icon={<Users className="h-4 w-4" aria-hidden />}
        />
        <KpiCard
          title="سابقه تأییدشده در گروه"
          value={toPersianDigits(verifiedTotal)}
          unit="دارای اولویت"
          hint={`${toPersianDigits(metrics.verified_parent)} ستاد · ${toPersianDigits(metrics.verified_subsidiary)} تابعه`}
          tone="success"
          icon={<Building2 className="h-4 w-4" aria-hidden />}
        />
        <KpiCard
          title="در انتظار استعلام سابقه"
          value={toPersianDigits(metrics.pending_verification)}
          unit="پرونده"
          hint="نیازمند بررسی مستندات کارگزینی"
          tone="warning"
          icon={<Clock className="h-4 w-4" aria-hidden />}
        />
        <KpiCard
          title="فرصت‌های شغلی باز"
          value={toPersianDigits(metrics.open_vacancies)}
          unit="ردیف فعال جذب"
          hint={`${toPersianDigits(metrics.incomplete_profiles)} پرونده ناقص (زیر ۷۰٪)`}
          icon={<Layers className="h-4 w-4" aria-hidden />}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category distribution */}
        <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 lg:col-span-2" aria-label="توزیع حوزه تخصصی">
          <SectionHeader
            title="توزیع متقاضیان بر اساس حوزه تخصصی"
            hint={`${toPersianDigits(metrics.total_applicants)} پرونده`}
          />
          <div className="space-y-3">
            {metrics.category_distribution.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">داده‌ای برای نمایش وجود ندارد.</p>
            )}
            {metrics.category_distribution.map((cat) => {
              const pct = metrics.total_applicants > 0 ? Math.round((cat.count / metrics.total_applicants) * 100) : 0;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{cat.category}</span>
                    <span className="num text-slate-500">
                      {toPersianDigits(cat.count)} نفر ({toPersianDigits(pct)}٪)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(pct, 4)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Priority breakdown — explains the 5 classes */}
        <section data-tour="dashboard-priority" className="flex flex-col rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5" aria-label="وضعیت اولویت سازمانی">
          <SectionHeader title="وضعیت اولویت سازمانی در استخر" hint="بر مبنای سیاست تقدم سابقه خدمت" />
          <div className="space-y-3">
            <PriorityRow icon={<Building2 className="h-4 w-4 text-emerald-700" aria-hidden />} label="سابقه تأییدشده سازمان مادر" sub="اولویت عالی جذب" value={metrics.verified_parent} tone="emerald" />
            <PriorityRow icon={<Layers className="h-4 w-4 text-teal-700" aria-hidden />} label="سابقه تأییدشده شرکت‌های تابعه" sub="اولویت گروهی دوم" value={metrics.verified_subsidiary} tone="teal" />
            <PriorityRow icon={<Clock className="h-4 w-4 text-amber-700" aria-hidden />} label="در انتظار استعلام کارگزینی" sub="سابقه اعلام‌شده، تأییدنشده" value={metrics.pending_verification} tone="amber" />
            <PriorityRow icon={<MinusCircle className="h-4 w-4 text-slate-500" aria-hidden />} label="فاقد سابقه تأییدشده در مجموعه" sub="ارزیابی بر مبنای شایستگی" value={metrics.no_group_history} tone="slate" />
            <PriorityRow icon={<HelpCircle className="h-4 w-4 text-rose-600" aria-hidden />} label="اطلاعات ناکافی برای تعیین وضعیت" sub="بدون سابقه کاری ثبت‌شده" value={metrics.insufficient_data} tone="rose" />
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
            طبقه‌بندی اولویت از سوابق همکاری تأییدشده در ستاد و شرکت‌های تابعه محاسبه می‌شود؛ دلیل هر رتبه در پرونده هر متقاضی نمایش داده می‌شود.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* City distribution */}
        <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5" aria-label="توزیع جغرافیایی">
          <SectionHeader title="توزیع جغرافیایی متقاضیان" hint="بر اساس شهر سکونت" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {metrics.city_distribution.length === 0 && (
              <p className="col-span-full py-6 text-center text-xs text-slate-400">داده‌ای برای نمایش وجود ندارد.</p>
            )}
            {metrics.city_distribution.map((c) => (
              <div key={c.city} className="flex items-center justify-between rounded-[var(--radius-md)] border border-slate-100 bg-slate-50 p-3 text-xs">
                <span className="text-slate-700">{c.city}</span>
                <span className="num font-bold text-slate-900">{toPersianDigits(c.count)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recruitment pipeline */}
        <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5" aria-label="وضعیت پایپ‌لاین استخدام">
          <SectionHeader title="وضعیت پرونده‌ها در پایپ‌لاین استخدام" hint="وضعیت‌های استاندارد فرآیند جذب" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {metrics.status_distribution.map((st) => (
              <div key={st.status} className="rounded-[var(--radius-md)] border border-slate-100 bg-slate-50 p-3 text-center">
                <div className="mb-1 text-[11px] text-slate-500">{RECRUITMENT_STATUS_LABELS[st.status]}</div>
                <div className="num text-lg font-bold text-slate-900">{toPersianDigits(st.count)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent applicants */}
        <section data-tour="dashboard-recent" className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white lg:col-span-2" aria-label="متقاضیان اخیر">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <SectionHeader title="متقاضیان اخیراً ثبت‌شده" hint="آخرین پرونده‌های ورودی" inline />
            <Link href="/applicants" className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900">
              مشاهده همه
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">متقاضی</th>
                  <th scope="col" className="px-3 py-3 font-semibold">تخصص</th>
                  <th scope="col" className="px-3 py-3 font-semibold">اولویت سازمانی</th>
                  <th scope="col" className="px-3 py-3 font-semibold">وضعیت</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">پرونده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.recent_applicants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      هنوز متقاضی‌ای ثبت نشده است.
                    </td>
                  </tr>
                )}
                {metrics.recent_applicants.map((app) => (
                  <tr key={app.id} className="transition-soft hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{app.full_name}</div>
                      <div className="num text-[10px] text-slate-400">{app.public_code}</div>
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-3 text-slate-600">{app.primary_job_title}</td>
                    <td className="px-3 py-3"><PriorityBadge priority={app.group_priority} withIcon={false} /></td>
                    <td className="px-3 py-3"><RecruitmentStatusBadge status={app.recruitment_status} /></td>
                    <td className="px-4 py-3 text-left">
                      <Link href={`/applicants/${app.id}`} className="font-semibold text-teal-700 hover:text-teal-900">
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Open vacancies */}
        <section data-tour="dashboard-open-vacancies" className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5" aria-label="موقعیت‌های استخدامی فعال">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <SectionHeader title="موقعیت‌های استخدامی فعال" hint="آخرین ردیف‌های باز" inline />
            <Link href="/vacancies" className="text-xs font-medium text-teal-700 hover:text-teal-900">
              مشاهده همه
            </Link>
          </div>
          <div className="space-y-3 pt-3">
            {metrics.open_vacancy_list.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">فرصت شغلی بازی وجود ندارد.</p>
            )}
            {metrics.open_vacancy_list.map((vac) => (
              <Link
                key={vac.id}
                href={`/vacancies/${vac.id}`}
                className="block rounded-[var(--radius-md)] border border-slate-100 p-3 transition-soft hover:border-slate-300 hover:bg-slate-50/60"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="truncate text-xs font-semibold text-slate-900">{vac.title}</h3>
                  <span className="num shrink-0 rounded-[var(--radius-sm)] bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
                    {toPersianDigits(vac.open_positions_count)} ردیف
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-500">
                  {vac.organization_name} · {vac.city}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  unit,
  hint,
  icon,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  unit: string;
  hint: string;
  icon: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const toneClasses = {
    neutral: 'border-slate-200 text-slate-500',
    success: 'border-emerald-200 text-emerald-800',
    warning: 'border-amber-200 text-amber-800',
  }[tone];
  return (
    <div className={`rounded-[var(--radius-lg)] border bg-white p-5 transition-soft hover:border-slate-300 ${toneClasses}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium">{title}</span>
        <div className="rounded-[var(--radius-md)] bg-slate-100 p-2 text-slate-600">{icon}</div>
      </div>
      <div className="num text-2xl font-bold text-slate-900">
        {value}
        <span className="mr-1.5 text-xs font-normal text-slate-500">{unit}</span>
      </div>
      <div className="mt-2 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

function SectionHeader({ title, hint, inline = false }: { title: string; hint: string; inline?: boolean }) {
  return (
    <div className={inline ? '' : 'mb-4 border-b border-slate-100 pb-3'}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

function PriorityRow({
  icon,
  label,
  sub,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: number;
  tone: 'emerald' | 'teal' | 'amber' | 'slate' | 'rose';
}) {
  const bg = {
    emerald: 'bg-emerald-50/70 border-emerald-100',
    teal: 'bg-teal-50/70 border-teal-100',
    amber: 'bg-amber-50/70 border-amber-100',
    slate: 'bg-slate-50 border-slate-200',
    rose: 'bg-rose-50/70 border-rose-100',
  }[tone];
  return (
    <div className={`flex items-start justify-between gap-2 rounded-[var(--radius-md)] border p-3 ${bg}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <div className="text-xs font-semibold text-slate-900">{label}</div>
          <div className="text-[10px] text-slate-500">{sub}</div>
        </div>
      </div>
      <span className="num text-sm font-bold text-slate-900">{toPersianDigits(value)}</span>
    </div>
  );
}
