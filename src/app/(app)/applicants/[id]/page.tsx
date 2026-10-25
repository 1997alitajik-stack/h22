import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getApplicantDetail } from '@/server/applicants';
import { toPersianDigits, formatJalali } from '@/lib/persian';
import { PriorityBadge, RecruitmentStatusBadge } from '@/components/ui/Badges';
import { UserRound } from 'lucide-react';
import { ApplicantProfileView } from './ApplicantProfileView';

export const metadata = { title: 'پرونده متقاضی' };
export const dynamic = 'force-dynamic';

export default async function ApplicantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser('/applicants');
  const { id } = await params;

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();

  const applicant = await getApplicantDetail(user, id);
  if (!applicant) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <Link href="/applicants" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-soft hover:text-teal-800">
        بازگشت به بانک متقاضیان
      </Link>

      {/* Profile header */}
      <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <div
              role={applicant.photo_url ? 'img' : 'presentation'}
              aria-label={applicant.photo_url ? `تصویر ${applicant.full_name}` : undefined}
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 bg-cover bg-center text-slate-400 sm:h-24 sm:w-24"
              style={applicant.photo_url ? { backgroundImage: `url(${JSON.stringify(applicant.photo_url)})` } : undefined}
            >
              {!applicant.photo_url && <UserRound className="h-8 w-8" aria-hidden />}
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">{applicant.full_name}</h1>
              <span className="num rounded-[var(--radius-sm)] border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                {applicant.public_code}
              </span>
              <RecruitmentStatusBadge status={applicant.recruitment_status} />
            </div>
            <p className="text-xs font-medium text-slate-600">
              {applicant.primary_job_title}
              <span className="mx-1.5 text-slate-400">·</span>
              <span className="text-slate-500">{applicant.primary_job_category}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
              <span>{applicant.residential_city ?? '—'}</span>
              <span aria-hidden>·</span>
              <span className="num">سابقه: {toPersianDigits(applicant.years_of_experience)} سال</span>
              <span aria-hidden>·</span>
              <span className="num">تاریخ ثبت: {formatJalali(applicant.created_at)}</span>
            </div>
            <div className="pt-2">
              <PriorityBadge priority={applicant.group_priority} />
            </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:w-52">
            {user.role === 'ADMIN' && (
              <Link
                href={`/applicants/${applicant.id}/edit`}
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-soft hover:bg-[var(--color-accent-strong)]"
              >
                ویرایش اطلاعات پرونده
              </Link>
            )}
            <div className="rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-slate-500">تکمیل پرونده:</span>
                <span className="num font-bold text-slate-900">{toPersianDigits(applicant.completeness)}٪</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    applicant.completeness >= 85
                      ? 'bg-emerald-600'
                      : applicant.completeness >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${applicant.completeness}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Explainable priority reason (mission §4.3) */}
        <div className="mt-5 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-slate-200/90 bg-slate-50 p-3 text-xs">
          <p className="text-slate-700">
            <span className="font-semibold text-slate-900">وضعیت سابقه در مجموعه: </span>
            {applicant.group_priority_reason}
          </p>
        </div>
      </section>

      <ApplicantProfileView user={user} applicant={applicant} />
    </div>
  );
}
