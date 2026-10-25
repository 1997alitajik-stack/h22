'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Eye, EyeOff, Briefcase, GraduationCap, Award } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { VerificationBadge } from '@/components/ui/Badges';
import { Button, EmptyState, Field, inputClass } from '@/components/ui/Primitives';
import { formatJalali, toPersianDigits } from '@/lib/persian';
import { logSensitiveRevealAction, addNoteAction } from '@/app/actions/applicants';
import { VerificationModal } from './VerificationModal';
import { AttachmentCenter } from './AttachmentCenter';
import { NotesSection } from './NotesSection';
import type { ApplicantDetail, SessionUser } from '@/types';

export function ApplicantProfileView({ user, applicant }: { user: SessionUser; applicant: ApplicantDetail }) {
  const router = useRouter();
  const [unmasked, setUnmasked] = useState(false);
  const [revealed, setRevealed] = useState<{ nationalId: string | null; phone: string | null; address: string | null } | null>(null);
  const [verification, setVerification] = useState<{ recordId: string; status: string; notes: string } | null>(null);
  const [, startReveal] = useTransition();

  const isAdmin = user.role === 'ADMIN';

  async function handleUnmask() {
    if (unmasked) {
      setUnmasked(false);
      setRevealed(null);
      return;
    }
    if (!revealed) {
      const res = await fetch(`/api/applicants/${applicant.id}/sensitive`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setRevealed(data);
    }
    setUnmasked(true);
    startReveal(() => {
      void logSensitiveRevealAction(applicant.id).then(() => router.refresh());
    });
  }

  const employmentTab = (
    <div className="space-y-4">
      <section className="space-y-3 rounded-[var(--radius-lg)] border border-teal-200 bg-teal-50/60 p-4" aria-label="راهنمای روند استعلام سوابق">
        <h3 className="text-xs font-bold text-teal-950">روند بررسی و استعلام سابقه به چه صورت است؟</h3>
        <ol className="grid grid-cols-1 gap-3 text-[11px] leading-6 text-teal-950 sm:grid-cols-3">
          <li className="rounded-[var(--radius-md)] border border-teal-100 bg-white/80 p-3">
            <span className="mb-1 block font-bold">۱. ثبت سابقه</span>
            مدیر پرونده، نام کارفرما، سمت، بازهٔ زمانی و مستندات را ثبت می‌کند. اگر سابقه مربوط به ستاد یا شرکت تابعه است، نوع همکاری سازمانی باید درست انتخاب شود.
          </li>
          <li className="rounded-[var(--radius-md)] border border-teal-100 bg-white/80 p-3">
            <span className="mb-1 block font-bold">۲. استعلام و بررسی</span>
            در نبود مدرک کافی، وضعیت «در حال استعلام» بماند. کارشناس می‌تواند شماره نامه، سوابق بیمه یا توضیح پیگیری را در یادداشت استعلام ثبت کند.
          </li>
          <li className="rounded-[var(--radius-md)] border border-teal-100 bg-white/80 p-3">
            <span className="mb-1 block font-bold">۳. ثبت نتیجه</span>
            مدیر از «بررسی و تأیید سابقه» نتیجه را روی تأییدشده، در انتظار یا ردشده می‌گذارد. برای رد سابقه، نوشتن دلیل الزامی است.
          </li>
        </ol>
        <p className="text-[11px] leading-6 text-teal-900">
          <strong>اولویت سازمانی خودکار محاسبه می‌شود:</strong> سابقهٔ تأییدشده در ستاد اولویت اول و سابقهٔ تأییدشده در شرکت تابعه اولویت دوم دارد. وضعیت در انتظار هنوز اولویت تأییدشده نمی‌گیرد؛ سابقهٔ ردشده نیز به‌عنوان سابقهٔ تأییدشده شمرده نمی‌شود. این امتیاز جایگزین تصمیم استخدامی نهایی نیست.
        </p>
      </section>
      {applicant.employment.length === 0 ? (
        <EmptyState icon={<Briefcase className="h-5 w-5" aria-hidden />} title="هیچ سابقه کاری ثبت نشده است" />
      ) : (
        applicant.employment.map((emp) => (
          <article
            key={emp.id}
            className={`space-y-2.5 rounded-[var(--radius-lg)] border p-4 ${
              emp.is_group_entity ? 'border-teal-200 bg-teal-50/20' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{emp.job_title}</h3>
                  {emp.is_current && (
                    <span className="rounded-[var(--radius-sm)] bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      شاغل در حال حاضر
                    </span>
                  )}
                  {emp.is_group_entity && (
                    <span className="rounded-[var(--radius-sm)] bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {emp.group_entity_type === 'PARENT' ? 'ستاد سازمان مادر' : 'شرکت زیرمجموعه'}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-slate-700">
                  {emp.employer_name}
                  {emp.project_name ? ` · پروژه ${emp.project_name}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <VerificationBadge status={emp.verification_status} />
                {isAdmin && emp.is_group_entity && (
                  <Button
                    variant="secondary"
                    className="border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                    onClick={() =>
                      setVerification({
                        recordId: emp.id,
                        status: emp.verification_status === 'NOT_APPLICABLE' ? 'PENDING' : emp.verification_status,
                        notes: emp.verification_notes ?? '',
                      })
                    }
                  >
                    بررسی و تأیید سابقه
                  </Button>
                )}
              </div>
            </div>

            <p className="num text-xs text-slate-500">
              دوره همکاری: {emp.start_date_jalali} تا {emp.is_current ? 'اکنون' : emp.end_date_jalali ?? '—'}
              <span className="mx-2" aria-hidden>·</span>
              شهر: {emp.city ?? '—'}
            </p>

            {isAdmin && unmasked && emp.last_salary && (
              <p className="num rounded-[var(--radius-sm)] border border-rose-100 bg-[var(--color-status-danger-bg)] p-2 text-xs font-medium text-rose-700">
                آخرین حقوق دریافتی: {emp.last_salary}
                {emp.reason_for_leaving ? ` · دلیل خروج: ${emp.reason_for_leaving}` : ''}
              </p>
            )}

            {emp.responsibilities && (
              <p className="rounded-[var(--radius-md)] border border-slate-100 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-700">
                <span className="mb-1 block font-medium text-slate-900">شرح وظایف:</span>
                {emp.responsibilities}
              </p>
            )}

            {emp.verification_notes && emp.verification_status !== 'NOT_APPLICABLE' && (
              <p className="rounded-[var(--radius-md)] border border-teal-200 bg-teal-50 p-2.5 text-xs text-teal-900">
                <span className="font-semibold">یادداشت استعلام کارگزینی: </span>
                {emp.verification_notes}
                {emp.verified_at && (
                  <span className="num mt-0.5 block text-[11px] text-teal-700">
                    (آخرین بررسی: {formatJalali(emp.verified_at, true)})
                  </span>
                )}
              </p>
            )}
          </article>
        ))
      )}
    </div>
  );

  const educationTab = (
    <div className="space-y-4">
      {applicant.education.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-5 w-5" aria-hidden />} title="سابقه تحصیلی ثبت نشده است" />
      ) : (
        applicant.education.map((edu) => (
          <article key={edu.id} className="space-y-2 rounded-[var(--radius-lg)] border border-slate-200 p-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {edu.degree_title || edu.degree_level} — {edu.field_of_study || '—'}
              </h3>
              {edu.gpa && (
                <span className="num rounded-[var(--radius-sm)] bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                  معدل: {toPersianDigits(edu.gpa)}
                </span>
              )}
            </div>
            <p className="font-medium text-slate-600">
              {edu.institution_name ?? '—'}
              {edu.city ? ` · شهر ${edu.city}` : ''}
            </p>
            <p className="num text-slate-400">
              دوره: {edu.start_date_jalali ?? '—'} تا{' '}
              {edu.is_studying ? 'در حال تحصیل' : edu.end_date_jalali ?? '—'}
            </p>
          </article>
        ))
      )}
    </div>
  );

  return (
    <>
      <div className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 sm:p-6">
        <Tabs
          items={[
            {
              id: 'identity',
              label: 'اطلاعات هویتی و تماس',
              content: (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">مشخصات هویتی و ارتباطی</h3>
                    {isAdmin && (
                      <Button variant="secondary" onClick={handleUnmask}>
                        {unmasked ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                        {unmasked ? 'ماسک کردن اطلاعات حساس' : 'نمایش کامل اطلاعات حساس'}
                      </Button>
                    )}
                  </div>
                  <IdentityGrid
                    applicant={applicant}
                    isAdmin={isAdmin}
                    unmasked={unmasked}
                    revealed={revealed}
                  />
                </div>
              ),
            },
            { id: 'employment', label: 'سوابق شغلی', count: applicant.employment.length, content: employmentTab },
            { id: 'education', label: 'سوابق تحصیلی', count: applicant.education.length, content: educationTab },
            {
              id: 'skills',
              label: 'مهارت‌ها و مدارک',
              count: applicant.skills.length + applicant.certificates.length,
              content: (
                <div className="space-y-6">
                  <section>
                    <h3 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">مهارت‌ها</h3>
                    {applicant.skills.length === 0 ? (
                      <EmptyState icon={<Award className="h-5 w-5" aria-hidden />} title="مهارتی ثبت نشده است" />
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {applicant.skills.map((skill) => (
                          <li
                            key={skill.id}
                            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800"
                          >
                            {skill.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h3 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">گواهینامه‌ها</h3>
                    {applicant.certificates.length === 0 ? (
                      <p className="rounded-[var(--radius-md)] bg-slate-50 p-4 text-center text-xs text-slate-400">گواهینامه‌ای ثبت نشده است.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {applicant.certificates.map((cert) => (
                          <li key={cert.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 p-3 text-xs">
                            <div>
                              <p className="font-semibold text-slate-900">{cert.title}</p>
                              <p className="num mt-0.5 text-[11px] text-slate-500">
                                {cert.issuing_organization ?? '—'} · صدور: {cert.issue_date_jalali ?? '—'}
                              </p>
                            </div>
                            <VerificationBadge status={cert.verification_status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              ),
            },
            {
              id: 'preferences',
              label: 'ترجیحات شغلی',
              content: (
                <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                  <PrefItem label="عناوین شغلی مورد علاقه" value={applicant.preferences?.preferred_titles.join(' · ') || 'ثبت نشده'} />
                  <PrefItem label="شهرهای مورد نظر" value={applicant.preferences?.preferred_cities.join(' · ') || 'ثبت نشده'} />
                  <PrefItem
                    label="آمادگی اعزام به کارگاه"
                    value={applicant.preferences?.willing_to_travel_sites ? 'بله، آماده مأموریت پروژه‌ای' : 'خیر'}
                  />
                  <PrefItem label="حداقل حقوق درخواستی" value={applicant.preferences?.expected_salary_min || 'طبق ضوابط سازمان'} />
                </div>
              ),
            },
            {
              id: 'attachments',
              label: 'رزومه و پیوست‌ها',
              count: applicant.attachments.length,
              content: (
                <AttachmentCenter
                  applicantId={applicant.id}
                  attachments={applicant.attachments}
                  isAdmin={isAdmin}
                />
              ),
            },
            {
              id: 'candidacies',
              label: 'فرصت‌های مرتبط',
              count: applicant.candidacies.length,
              content: (
                <div className="space-y-3 text-xs">
                  {applicant.candidacies.length === 0 ? (
                    <EmptyState icon={<Briefcase className="h-5 w-5" aria-hidden />} title="این متقاضی به ردیف شغلی خاصی متصل نشده است" />
                  ) : (
                    applicant.candidacies.map((c) => (
                      <div key={c.id} className="flex flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-slate-200 p-4 sm:flex-row sm:items-center">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{c.vacancy_title}</h4>
                          <p className="num mt-1 text-slate-500">
                            تاریخ اتصال: {formatJalali(c.applied_at)}
                            {c.match_score !== null && (
                              <span title="شاخص تطابق بر پایه شهر، سابقه، اولویت و مهارت‌های الزامی">
                                {' '}· تطابق: {toPersianDigits(c.match_score)}٪
                              </span>
                            )}
                          </p>
                        </div>
                        <Link href={`/vacancies/${c.vacancy_id}`} className="shrink-0 font-semibold text-teal-700 hover:underline">
                          مشاهده ردیف شغلی
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              ),
            },
            {
              id: 'notes',
              label: 'یادداشت‌های اداری',
              count: applicant.notes.length,
              content: <NotesSection applicantId={applicant.id} notes={applicant.notes} isAdmin={isAdmin} />,
            },
          ]}
        />
      </div>

      {verification && (
        <VerificationModal
          recordId={verification.recordId}
          initialStatus={verification.status}
          initialNotes={verification.notes}
          onClose={() => setVerification(null)}
          onSaved={() => {
            setVerification(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function IdentityGrid({
  applicant,
  isAdmin,
  unmasked,
  revealed,
}: {
  applicant: ApplicantDetail;
  isAdmin: boolean;
  unmasked: boolean;
  revealed: { nationalId: string | null; phone: string | null; address: string | null } | null;
}) {
  const nationalId = unmasked && isAdmin ? revealed?.nationalId : applicant.national_id_masked;
  const phone = unmasked && isAdmin ? revealed?.phone : applicant.phone_masked;

  return (
    <dl className="grid grid-cols-1 gap-5 text-xs sm:grid-cols-2 lg:grid-cols-3">
      <IdentityItem label="نام و نام خانوادگی" value={applicant.full_name} />
      <IdentityItem label="نام پدر" value={applicant.father_name || 'ثبت نشده'} />
      <IdentityItem
        label="کد ملی"
        value={nationalId ?? 'ثبت نشده'}
        mono
        hint={!unmasked && applicant.national_id_masked ? 'ماسک‌شده جهت حفظ حریم خصوصی' : undefined}
      />
      <IdentityItem label="تاریخ تولد" value={applicant.birth_date_jalali ?? 'ثبت نشده'} num />
      <IdentityItem label="محل تولد" value={applicant.birth_place || 'ثبت نشده'} />
      <IdentityItem label="شهر سکونت" value={applicant.residential_city ?? 'ثبت نشده'} />
      <IdentityItem label="شماره تماس اصلی" value={phone ?? 'ثبت نشده'} mono />
      <IdentityItem label="ایمیل" value={applicant.email ?? 'ثبت نشده'} mono />
      <div className="sm:col-span-2 lg:col-span-3">
        <IdentityItem
          label="نشانی محل سکونت"
          value={
            unmasked && isAdmin
              ? revealed?.address ?? 'ثبت نشده'
              : `${applicant.residential_city ?? '—'} (جزئیات نشانی طبقه‌بندی محرمانه است)`
          }
        />
      </div>
    </dl>
  );
}

function IdentityItem({ label, value, mono, num, hint }: { label: string; value: string; mono?: boolean; num?: boolean; hint?: string }) {
  return (
    <div className="space-y-1">
      <dt className="font-medium text-slate-400">{label}</dt>
      <dd className={`font-semibold text-slate-900 ${mono ? 'dir-ltr font-mono' : ''} ${num ? 'num' : ''}`}>
        {value}
        {hint && <span className="mr-2 text-[10px] font-normal text-slate-400">({hint})</span>}
      </dd>
    </div>
  );
}

function PrefItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 p-3.5">
      <p className="font-medium text-slate-400">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  );
}
