'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, Plus, Users } from 'lucide-react';
import { linkCandidacyAction, updateStageAction } from '@/app/actions/admin';
import { Modal } from '@/components/ui/Modal';
import { Button, EmptyState, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { CandidacyStageBadge, PriorityBadge } from '@/components/ui/Badges';
import { CANDIDACY_STAGE_LABELS } from '@/lib/domain/labels';
import { matchBreakdownText } from '@/lib/domain/match';
import { useServerAction } from '@/lib/useServerAction';
import { toPersianDigits } from '@/lib/persian';
import type { CandidacyStage, SessionUser, VacancyApplicantOption, VacancyDetail } from '@/types';
import { CandidacyArchiveControl } from './CandidacyArchiveControl';

const initial: { ok: boolean; error?: string; message?: string } = { ok: false };
const STAGE_ORDER: CandidacyStage[] = ['NEW', 'SCREENING', 'INTERVIEW', 'SHORTLIST', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

export function VacancyPipeline({user,vacancy,applicantOptions}:{
  user:SessionUser;
  vacancy:VacancyDetail;
  applicantOptions:VacancyApplicantOption[];
}) {
  const router = useRouter();
  const isAdmin = user.role === 'ADMIN';
  const [linkOpen, setLinkOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(Boolean(vacancy.archived_at));
  const [showAllApplicants, setShowAllApplicants] = useState(false);
  const activeCount = vacancy.candidacies.filter((candidate) => !candidate.archived_at).length;
  const archivedCount = vacancy.candidacies.length - activeCount;
  const visibleCandidates = vacancy.candidacies.filter((candidate) => showArchived ? Boolean(candidate.archived_at) : !candidate.archived_at);
  const visibleApplicants = showAllApplicants ? applicantOptions : applicantOptions.filter((applicant) => applicant.is_recommended);

  const [linkState, , linkPending, linkSubmitAndWait] = useServerAction(linkCandidacyAction, initial);
  async function handleLinkAction(formData: FormData) {
    const result = await linkSubmitAndWait(formData);
    if (result.ok) { setLinkOpen(false); router.refresh(); }
  }

  const [stageState, , stagePending, stageSubmitAndWait] = useServerAction(updateStageAction, initial);
  async function handleStageAction(formData: FormData) {
    const result = await stageSubmitAndWait(formData);
    if (result.ok) router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white" aria-label="داوطلبان این فرصت">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4 text-slate-400" aria-hidden />
            داوطلبان این فرصت ({toPersianDigits(activeCount)} فعال)
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            پیشنهادهای اولیه بر اساس حوزه شغلی، عنوان تخصصی، شهر، سابقه، مهارت، مدرک و سابقه تأییدشده در شرکت/پروژه مرتب می‌شوند؛ تصمیم نهایی با منابع انسانی است.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vacancy.candidacies.length > 0 && (
            <Button type="button" variant="secondary" className="shrink-0" onClick={() => setShowArchived(!showArchived)}>
              <Archive className="h-3.5 w-3.5" aria-hidden />
              {showArchived ? 'نمایش معرفی‌های فعال' : 'بایگانی معرفی‌ها (' + toPersianDigits(archivedCount) + ')'}
            </Button>
          )}
          {isAdmin && !vacancy.archived_at && (
            <Button onClick={() => { setShowAllApplicants(false); setLinkOpen(true); }} className="shrink-0">
              <Plus className="h-4 w-4" aria-hidden />معرفی متقاضی از استخر
            </Button>
          )}
        </div>
      </div>

      {(linkState.error || stageState.error) && (
        <p role="alert" className="mx-5 mt-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
          {linkState.error || stageState.error}
        </p>
      )}

      {visibleCandidates.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" aria-hidden />}
          title={showArchived ? 'معرفی بایگانی‌شده‌ای وجود ندارد' : 'هنوز متقاضی فعالی به این فرصت متصل نشده است'}
          description={showArchived
            ? 'معرفی‌های بایگانی‌شده در این بخش نمایش داده می‌شوند و در صورت نیاز می‌توان آن‌ها را بازگرداند.'
            : isAdmin && !vacancy.archived_at
              ? 'از دکمه «معرفی متقاضی از استخر» استفاده کنید؛ ابتدا پیشنهادهای هم‌حوزه نمایش داده می‌شوند.'
              : undefined}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">متقاضی</th>
                <th scope="col" className="px-3 py-3 font-semibold">شهر</th>
                <th scope="col" className="px-3 py-3 font-semibold">سابقه</th>
                <th scope="col" className="px-3 py-3 font-semibold">اولویت سازمانی</th>
                <th scope="col" className="px-3 py-3 font-semibold">شاخص تطابق</th>
                <th scope="col" className="px-3 py-3 font-semibold">مرحله ارزیابی</th>
                {isAdmin && <th scope="col" className="px-3 py-3 font-semibold">مدیریت</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {visibleCandidates.map((candidate) => (
                <tr key={candidate.id} className={candidate.archived_at ? 'bg-amber-50/50' : 'transition-soft hover:bg-slate-50/80'}>
                  <td className="px-4 py-3">
                    <Link href={'/applicants/' + candidate.applicant_id} className="hover:text-teal-800">
                      <div className="font-semibold text-slate-900">{candidate.applicant_name}</div>
                      <div className="num text-[10px] text-slate-400">{candidate.applicant_code}</div>
                    </Link>
                    {candidate.archived_at && (
                      <div className="mt-1 max-w-52 text-[10px] leading-4 text-amber-800">بایگانی: {candidate.archive_reason || 'علت ثبت نشده'}</div>
                    )}
                  </td>
                  <td className="px-3 py-3">{candidate.applicant_city ?? '—'}</td>
                  <td className="num px-3 py-3">{toPersianDigits(candidate.years_of_experience)} سال</td>
                  <td className="px-3 py-3"><PriorityBadge priority={candidate.group_priority} withIcon={false} /></td>
                  <td className="px-3 py-3">
                    {candidate.match_score !== null
                      ? <span className="num cursor-help font-bold text-teal-800" title={candidate.match_breakdown ? matchBreakdownText(candidate.match_breakdown) : undefined}>{toPersianDigits(candidate.match_score)}٪</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {isAdmin && !candidate.archived_at && !vacancy.archived_at ? (
                      <form action={handleStageAction} className="flex items-center gap-2">
                        <input type="hidden" name="candidacyId" value={candidate.id} />
                        <select name="stage" defaultValue={candidate.stage} disabled={stagePending} className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50" aria-label={'تغییر مرحله ' + candidate.applicant_name}>
                          {STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{CANDIDACY_STAGE_LABELS[stage]}</option>)}
                        </select>
                        <Button type="submit" variant="secondary" loading={stagePending} className="px-2 py-1">ثبت</Button>
                      </form>
                    ) : <CandidacyStageBadge stage={candidate.stage} />}
                  </td>
                  {isAdmin && <td className="px-3 py-3">
                    <CandidacyArchiveControl
                      candidacyId={candidate.id}
                      vacancyId={vacancy.id}
                      archived={Boolean(candidate.archived_at)}
                      archiveReason={candidate.archive_reason}
                      vacancyArchived={Boolean(vacancy.archived_at)}
                    />
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {linkOpen && (
        <Modal open onClose={() => setLinkOpen(false)} title={'معرفی متقاضی به «' + vacancy.title + '»'}>
          <form action={handleLinkAction} className="space-y-4 text-xs">
            <input type="hidden" name="vacancyId" value={vacancy.id} />
            {linkState.error && <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 font-medium text-rose-800">{linkState.error}</p>}
            <Field label="انتخاب متقاضی از استخر رزومه" htmlFor="link-applicant" required>
              <select id="link-applicant" name="applicantId" required className={selectClass} disabled={visibleApplicants.length === 0}>
                <option value="">— یک متقاضی را انتخاب کنید —</option>
                {visibleApplicants.map((applicant) => (
                  <option key={applicant.id} value={applicant.id}>
                    {(applicant.is_recommended ? '★ پیشنهاد · ' : '') + applicant.full_name + ' — ' + applicant.primary_job_title + ' · ' + applicant.primary_job_category + ' · ' + (applicant.residential_city ?? 'شهر نامشخص') + ' · تطابق ' + applicant.match_score + '٪'}
                  </option>
                ))}
              </select>
            </Field>

            <label className="flex items-start gap-2 rounded-[var(--radius-md)] border border-slate-200 p-3 text-[11px] leading-5 text-slate-600">
              <input type="checkbox" checked={showAllApplicants} onChange={(event) => setShowAllApplicants(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
              <span>
                نمایش همه متقاضیان استخر، حتی خارج از حوزه شغلی دقیق
                {applicantOptions.some((item) => item.is_recommended) ? ' (پیشنهادهای هم‌حوزه در ابتدا هستند)' : '؛ برای موارد استثنایی'}
              </span>
            </label>

            {!showAllApplicants && visibleApplicants.length === 0 && (
              <p role="status" className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                فردی با حوزه شغلی دقیقاً مطابق این فرصت پیدا نشد. گزینه «نمایش همه متقاضیان» را فعال کنید یا حوزه شغلی و اطلاعات پرونده‌ها را بررسی کنید.
              </p>
            )}
            {showAllApplicants && visibleApplicants.length === 0 && (
              <p role="status" className="rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
                متقاضی قابل معرفی وجود ندارد؛ همه افراد فعلی قبلاً به این فرصت معرفی شده‌اند یا پرونده‌شان در بایگانی است.
              </p>
            )}

            <Field label="توضیحات معرفی / توصیه ارزیاب" htmlFor="link-notes"><textarea id="link-notes" name="notes" rows={2} maxLength={2000} className={inputClass} /></Field>
            <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              امتیاز فقط برای مرتب‌سازی و پیشنهاد اولیه است، نه تصمیم خودکار استخدام. دلیل تطابق را با قرار دادن نشانگر روی درصد تطابق در جدول بررسی کنید.
            </p>
            <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" loading={linkPending} disabled={visibleApplicants.length === 0}>اتصال به موقعیت شغلی</Button>
              <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>انصراف</Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
