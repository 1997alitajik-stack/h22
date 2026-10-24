import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getVacancyDetail } from '@/server/vacancies';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { VacancyPipeline } from './VacancyPipeline';

export const metadata = { title: 'جزئیات فرصت شغلی' };
export const dynamic = 'force-dynamic';

export default async function VacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser('/vacancies');
  const { id } = await params;

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();

  const vacancy = await getVacancyDetail(user, id);
  if (!vacancy) notFound();

  // Unlinked applicants for the link modal (admin only needs this).
  const unlinked =
    user.role === 'ADMIN'
      ? await (async () => {
          const supabase = await createSupabaseServerClient();
          const { data } = await supabase
            .from('applicants')
            .select('id, public_code, full_name, primary_job_title, residential_city, group_priority')
            .order('full_name')
            .limit(500);
          return (data ?? []).filter((a) => !vacancy.candidacies.some((c) => c.applicant_id === a.id));
        })()
      : [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <Link href="/vacancies" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-soft hover:text-teal-800">
        بازگشت به فهرست فرصت‌های شغلی
      </Link>

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="dir-ltr rounded-[var(--radius-sm)] bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                {vacancy.code}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{vacancy.title}</h1>
            <p className="text-xs text-slate-600">
              {vacancy.organization_name} · {vacancy.city} · {vacancy.open_positions_count} ردیف
              {vacancy.project_name ? ` · پروژه ${vacancy.project_name}` : ''}
              {vacancy.salary_range ? ` · ${vacancy.salary_range}` : ''}
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
              <li className="num">
                حداقل سابقه کار: <b className="text-slate-800">{vacancy.min_years_experience} سال</b>
              </li>
              <li className="num">
                حداقل مدرک: <b className="text-slate-800">{vacancy.required_degree ?? 'بدون الزام'}</b>
              </li>
              <li>
                <div className="mb-1.5 font-medium text-slate-700">مهارت‌های الزامی:</div>
                <div className="flex flex-wrap gap-1.5">
                  {vacancy.required_skills.length === 0 && <span className="text-slate-400">—</span>}
                  {vacancy.required_skills.map((s) => (
                    <span key={s} className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">
                      {s}
                    </span>
                  ))}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <VacancyPipeline user={user} vacancy={vacancy} unlinkedApplicants={unlinked} />
    </div>
  );
}
