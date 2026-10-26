import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getVacancyApplicantOptions, getVacancyDetail } from '@/server/vacancies';
import { VacancyArchiveControl } from '../VacancyArchiveControl';
import { VacancyPipeline } from './VacancyPipeline';

export const metadata = { title: 'جزئیات فرصت شغلی' };
export const dynamic = 'force-dynamic';

export default async function VacancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('/vacancies');
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();

  const vacancy = await getVacancyDetail(user, id);
  if (!vacancy) notFound();

  const applicantOptions =
    user.role === 'ADMIN' && !vacancy.archived_at
      ? await getVacancyApplicantOptions(user, vacancy)
      : [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/vacancies" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-soft hover:text-teal-800">
          بازگشت به فهرست فرصت‌های شغلی
        </Link>
        {user.role === 'ADMIN' && (
          <VacancyArchiveControl vacancyId={vacancy.id} archived={Boolean(vacancy.archived_at)} archiveReason={vacancy.archive_reason} />
        )}
      </div>

      {vacancy.archived_at && (
        <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">این فرصت شغلی بایگانی شده است.</p>
          <p className="mt-1">پرونده فرصت و تاریخچه معرفی‌ها حفظ شده‌اند؛ معرفی جدید تا زمان بازگردانی غیرفعال است.</p>
          {vacancy.archive_reason && <p className="mt-1">علت بایگانی: {vacancy.archive_reason}</p>}
        </div>
      )}

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="dir-ltr rounded-[var(--radius-sm)] bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{vacancy.code}</span>
              {vacancy.archived_at && <span className="rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">بایگانی</span>}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{vacancy.title}</h1>
            <p className="text-xs text-slate-600">
              {vacancy.organization_name} · {vacancy.city} · {vacancy.open_positions_count} ردیف
              {vacancy.project_name ? ' · پروژه ' + vacancy.project_name : ''}
              {vacancy.salary_range ? ' · ' + vacancy.salary_range : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-4 text-xs md:grid-cols-2">
          <div>
            <h2 className="mb-2 font-bold text-slate-900">شرح شغل و انتظارات:</h2>
            <p className="leading-relaxed text-slate-600">{vacancy.description ?? '—'}</p>
          </div>
          <div>
            <h2 className="mb-2 font-bold text-slate-900">الزامات:</h2>
            <ul className="space-y-2 text-slate-600">
              <li>حوزه شغلی: <b className="text-slate-800">{vacancy.category}</b></li>
              <li className="num">حداقل سابقه کار: <b className="text-slate-800">{vacancy.min_years_experience} سال</b></li>
              <li className="num">حداقل مدرک: <b className="text-slate-800">{vacancy.required_degree ?? 'بدون الزام'}</b></li>
              <li>
                <div className="mb-1.5 font-medium text-slate-700">مهارت‌های الزامی:</div>
                <div className="flex flex-wrap gap-1.5">
                  {vacancy.required_skills.length === 0 && <span className="text-slate-400">—</span>}
                  {vacancy.required_skills.map((skill) => (
                    <span key={skill} className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">{skill}</span>
                  ))}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <VacancyPipeline user={user} vacancy={vacancy} applicantOptions={applicantOptions} />
    </div>
  );
}
