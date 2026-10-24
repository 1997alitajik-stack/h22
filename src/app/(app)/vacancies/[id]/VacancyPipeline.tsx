'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { linkCandidacyAction, updateStageAction } from '@/app/actions/admin';
import { Modal } from '@/components/ui/Modal';
import { Button, EmptyState, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { CandidacyStageBadge, PriorityBadge } from '@/components/ui/Badges';
import { CANDIDACY_STAGE_LABELS } from '@/lib/domain/labels';
import { matchBreakdownText } from '@/lib/domain/match';
import { useServerAction } from '@/lib/useServerAction';
import { toPersianDigits } from '@/lib/persian';
import type { CandidacyStage, SessionUser, VacancyDetail } from '@/types';

const initial: { ok: boolean; error?: string; message?: string } = { ok: false };

const STAGE_ORDER: CandidacyStage[] = ['NEW', 'SCREENING', 'INTERVIEW', 'SHORTLIST', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

export function VacancyPipeline({
  user,
  vacancy,
  unlinkedApplicants,
}: {
  user: SessionUser;
  vacancy: VacancyDetail;
  unlinkedApplicants: {
    id: string;
    public_code: string;
    full_name: string;
    primary_job_title: string;
    residential_city: string | null;
    group_priority: string;
  }[];
}) {
  const router = useRouter();
  const isAdmin = user.role === 'ADMIN';
  const [linkOpen, setLinkOpen] = useState(false);

  const [linkState, linkFormAction, linkPending] = useServerAction(linkCandidacyAction, initial);
  function handleLinkAction(formData: FormData) {
    linkFormAction(formData);
    setLinkOpen(false);
    router.refresh();
  }

  const [stageState, stageFormAction, stagePending] = useServerAction(updateStageAction, initial);
  function handleStageAction(formData: FormData) {
    stageFormAction(formData);
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white" aria-label="داوطلبان این فرصت">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4 text-slate-400" aria-hidden />
            داوطلبان در حال بررسی ({toPersianDigits(vacancy.candidacies.length)} نفر)
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            ترتیب بررسی بر اساس اولویت سابقه خدمت تأییدشده در مجموعه سازمان
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setLinkOpen(true)} className="shrink-0 self-start">
            <Plus className="h-4 w-4" aria-hidden />
            معرفی متقاضی از استخر
          </Button>
        )}
      </div>

      {stageState.error && (
        <p role="alert" className="mx-5 mt-3 rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 text-xs font-medium text-rose-700">
          {stageState.error}
        </p>
      )}

      {vacancy.candidacies.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" aria-hidden />}
          title="هنوز متقاضی‌ای به این فرصت متصل نشده است"
          description={isAdmin ? 'از دکمه «معرفی متقاضی از استخر» استفاده کنید.' : undefined}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {vacancy.candidacies.map((c) => (
                <tr key={c.id} className="transition-soft hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link href={`/applicants/${c.applicant_id}`} className="hover:text-teal-800">
                      <div className="font-semibold text-slate-900">{c.applicant_name}</div>
                      <div className="num text-[10px] text-slate-400">{c.applicant_code}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3">{c.applicant_city ?? '—'}</td>
                  <td className="num px-3 py-3">{toPersianDigits(c.years_of_experience)} سال</td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={c.group_priority} withIcon={false} />
                  </td>
                  <td className="px-3 py-3">
                    {c.match_score !== null ? (
                      <span className="num cursor-help font-bold text-teal-800" title={c.match_breakdown ? matchBreakdownText(c.match_breakdown) : undefined}>
                        {toPersianDigits(c.match_score)}٪
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {isAdmin ? (
                      <form action={handleStageAction} className="flex items-center gap-2">
                        <input type="hidden" name="candidacyId" value={c.id} />
                        <select
                          name="stage"
                          defaultValue={c.stage}
                          disabled={stagePending}
                          className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50"
                          aria-label={`تغییر مرحله ${c.applicant_name}`}
                        >
                          {STAGE_ORDER.map((s) => (
                            <option key={s} value={s}>{CANDIDACY_STAGE_LABELS[s]}</option>
                          ))}
                        </select>
                        <Button type="submit" variant="secondary" loading={stagePending} className="px-2 py-1">
                          ثبت
                        </Button>
                      </form>
                    ) : (
                      <CandidacyStageBadge stage={c.stage} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {linkOpen && (
        <Modal open onClose={() => setLinkOpen(false)} title={`معرفی متقاضی به «${vacancy.title}»`}>
          <form action={handleLinkAction} className="space-y-4 text-xs">
            <input type="hidden" name="vacancyId" value={vacancy.id} />
            {linkState.error && (
              <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 font-medium text-rose-700">
                {linkState.error}
              </p>
            )}
            <Field label="انتخاب متقاضی از استخر رزومه" htmlFor="link-applicant" required>
              <select id="link-applicant" name="applicantId" required className={selectClass}>
                <option value="">— یک متقاضی را انتخاب کنید —</option>
                {unlinkedApplicants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name} ({a.primary_job_title}) — {a.residential_city ?? '—'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="توضیحات معرفی / توصیه ارزیاب" htmlFor="link-notes">
              <textarea id="link-notes" name="notes" rows={2} maxLength={2000} className={inputClass} />
            </Field>
            <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              شاخص تطابق به‌صورت خودکار و شفاف محاسبه می‌شود: تطابق شهر (+۱۵)، کفایت سابقه (+۱۵)، اولویت سازمانی (+۱۵/+۱۰) و پوشش مهارت‌های الزامی (حداکثر +۱۵).
            </p>
            <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" loading={linkPending}>
                اتصال به موقعیت شغلی
              </Button>
              <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>
                انصراف
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
