'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Plus, Save, Trash2, UserRound, X } from 'lucide-react';
import { createApplicantAction, updateApplicantAction, type ApplicantActionState } from '@/app/actions/applicants';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { DEGREE_LABELS } from '@/lib/domain/labels';
import { applicantFormSchema } from '@/lib/validation';
import { toPersianDigits } from '@/lib/persian';
import type { DegreeLevel, GroupEntityType } from '@/types';

export interface FormEmployment {
  id?: string;
  employerName: string;
  isGroupEntity: boolean;
  groupEntityType: GroupEntityType;
  organizationId: string | null;
  projectName: string;
  city: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  responsibilities: string;
  lastSalary: string;
  reasonForLeaving: string;
}

export interface FormEducation {
  id?: string;
  degreeLevel: DegreeLevel;
  degreeTitle: string;
  fieldOfStudy: string;
  institutionName: string;
  city: string;
  startDate: string;
  endDate: string;
  isStudying: boolean;
  gpa: string;
}

export interface ApplicantFormInitial {
  firstName: string;
  lastName: string;
  fatherName: string;
  nationalId: string;
  birthDate: string;
  birthPlace: string;
  residentialCity: string;
  homeAddress: string;
  phone: string;
  alternativePhone: string;
  email: string;
  primaryJobTitle: string;
  primaryJobCategory: string;
  yearsOfExperience: number;
  employment: FormEmployment[];
  education: FormEducation[];
  skillsCsv: string;
  preferredTitlesCsv: string;
  expectedSalaryMin: string;
  willingToTravelSites: boolean;
  willingToRelocate: boolean;
}

interface Props {
  mode: 'create' | 'edit';
  applicantId?: string;
  applicantCode?: string;
  cities: string[];
  categories: string[];
  organizations: { id: string; name: string }[];
  initial?: ApplicantFormInitial;
  initialPhotoUrl?: string | null;
}

const STEPS = [
  { num: 1, title: 'مشخصات هویتی و تخصصی' },
  { num: 2, title: 'سوابق کاری و سازمانی' },
  { num: 3, title: 'سوابق تحصیلی' },
  { num: 4, title: 'مهارت‌ها و ترجیحات' },
];

const emptyEmployment = (city: string): FormEmployment => ({
  employerName: '',
  isGroupEntity: false,
  groupEntityType: 'EXTERNAL',
  organizationId: null,
  projectName: '',
  city,
  jobTitle: '',
  startDate: '',
  endDate: '',
  isCurrent: true,
  responsibilities: '',
  lastSalary: '',
  reasonForLeaving: '',
});

const emptyEducation = (): FormEducation => ({
  degreeLevel: 'BACHELOR',
  degreeTitle: '',
  fieldOfStudy: '',
  institutionName: '',
  city: '',
  startDate: '',
  endDate: '',
  isStudying: false,
  gpa: '',
});

/**
 * Multi-step applicant form. No fabricated defaults: fields the user has not
 * filled stay empty and are validated honestly (mission §4.2). The whole
 * payload is validated with the shared Zod schema before submission, then
 * persisted through a single transactional RPC.
 */
export function ApplicantForm({ mode, applicantId, applicantCode, cities, categories, organizations, initial, initialPhotoUrl }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);

  function handlePhotoSelected(file: File | null) {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) {
      setFormError('برای تصویر پروفایل فقط فایل JPG یا PNG قابل قبول است.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('حجم تصویر باید کمتر از ۱۰ مگابایت باشد.');
      return;
    }
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
    setFormError('');
    setDirty(true);
  }

  function clearPhoto() {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(mode === 'edit' && Boolean(initialPhotoUrl));
    setDirty(true);
  }

  const [values, setValues] = useState<ApplicantFormInitial>(
    initial ?? {
      firstName: '',
      lastName: '',
      fatherName: '',
      nationalId: '',
      birthDate: '',
      birthPlace: '',
      residentialCity: cities[0] ?? '',
      homeAddress: '',
      phone: '',
      alternativePhone: '',
      email: '',
      primaryJobTitle: '',
      primaryJobCategory: categories[0] ?? '',
      yearsOfExperience: 0,
      employment: [emptyEmployment(cities[0] ?? '')],
      education: [],
      skillsCsv: '',
      preferredTitlesCsv: '',
      expectedSalaryMin: '',
      willingToTravelSites: false,
      willingToRelocate: false,
    },
  );

  function set<K extends keyof ApplicantFormInitial>(key: K, value: ApplicantFormInitial[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  }

  function updateEmployment(index: number, patch: Partial<FormEmployment>) {
    setValues((v) => ({
      ...v,
      employment: v.employment.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
    setDirty(true);
  }

  function updateEducation(index: number, patch: Partial<FormEducation>) {
    setValues((v) => ({
      ...v,
      education: v.education.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
    setDirty(true);
  }

  async function handleSubmit() {
    setFormError('');
    setErrors({});

    const parsed = applicantFormSchema.safeParse({
      firstName: values.firstName,
      lastName: values.lastName,
      fatherName: values.fatherName,
      nationalId: values.nationalId,
      birthDate: values.birthDate,
      birthPlace: values.birthPlace,
      residentialCity: values.residentialCity,
      homeAddress: values.homeAddress,
      phone: values.phone,
      alternativePhone: values.alternativePhone,
      email: values.email,
      primaryJobTitle: values.primaryJobTitle,
      primaryJobCategory: values.primaryJobCategory,
      yearsOfExperience: values.yearsOfExperience,
      employment: values.employment.map((e) => ({
        ...e,
        id: e.id,
        organizationId: e.organizationId,
        projectName: e.projectName,
        city: e.city,
        responsibilities: e.responsibilities,
        lastSalary: e.lastSalary,
        reasonForLeaving: e.reasonForLeaving,
      })),
      education: values.education.map((e) => ({ ...e, id: e.id })),
      skillsCsv: values.skillsCsv,
      preferredTitlesCsv: values.preferredTitlesCsv,
      expectedSalaryMin: values.expectedSalaryMin,
      willingToTravelSites: values.willingToTravelSites,
      willingToRelocate: values.willingToRelocate,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('_');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setFormError('برخی فیلدها معتبر نیستند؛ موارد مشخص‌شده را برطرف کنید.');
      const firstStep = issueStep(Object.keys(fieldErrors)[0] ?? '');
      if (firstStep) setStep(firstStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.set('payload', JSON.stringify(parsed.data));
    if (mode === 'edit' && applicantId) fd.set('applicantId', applicantId);
    if (photoFile) fd.set('photo', photoFile);
    if (removePhoto) fd.set('removePhoto', 'true');

    const action = mode === 'edit' ? updateApplicantAction : createApplicantAction;
    const result: ApplicantActionState = await action({ ok: false }, fd);

    if (!result.ok) {
      setFormError(result.error ?? 'ذخیره‌سازی ناموفق بود.');
      if (result.fieldErrors) setErrors(result.fieldErrors);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (result.warning) window.alert(`پرونده ذخیره شد، اما تصویر کامل ذخیره نشد: ${result.warning}`);
    router.push(`/applicants/${result.applicantId}`);
  }

  const errorFor = (key: string) => errors[key];

  const totalEmployment = values.employment.length;
  const groupClaims = useMemo(
    () => values.employment.filter((e) => e.isGroupEntity).length,
    [values.employment],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {mode === 'edit' ? `ویرایش پرونده ${applicantCode ?? ''}` : 'ثبت پرونده متقاضی جدید'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            فیلدهای ستاره‌دار الزامی هستند؛ سایر موارد در صورت نداشتن اطلاعات خالی بمانند.
            {mode === 'edit' && groupClaims > 0 && (
              <span className="text-amber-700"> ویرایش سابقه تأییدشده، آن را به حالت «در انتظار استعلام» بازمی‌گرداند.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (dirty ? setDiscardOpen(true) : router.push('/applicants'))}
          className="rounded-[var(--radius-md)] p-2 text-slate-400 transition-soft hover:bg-slate-100 hover:text-slate-600"
          aria-label="انصراف و خروج"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Stepper */}
      <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.num}>
            <button
              type="button"
              onClick={() => setStep(s.num)}
              aria-current={step === s.num ? 'step' : undefined}
              className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border p-3 text-right transition-soft ${
                step === s.num
                  ? 'border-teal-300 bg-teal-50 font-bold text-teal-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  step === s.num ? 'bg-[var(--color-accent)] text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {toPersianDigits(s.num)}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      {formError && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 text-xs font-medium text-rose-700">
          {formError}
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 sm:p-6">
        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-dashed border-slate-300 bg-slate-50 p-4 sm:col-span-2 lg:col-span-3 sm:flex-row sm:items-center">
              <div
                role={photoPreview ? 'img' : 'presentation'}
                aria-label={photoPreview ? 'پیش‌نمایش تصویر متقاضی' : undefined}
                className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white bg-cover bg-center text-slate-400"
                style={photoPreview ? { backgroundImage: `url(${JSON.stringify(photoPreview)})` } : undefined}
              >
                {!photoPreview && <UserRound className="h-9 w-9" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-bold text-slate-800">تصویر پروفایل متقاضی</p>
                <p className="text-[11px] leading-5 text-slate-500">تصویر پرسنلی JPG یا PNG، حداکثر ۱۰ مگابایت. تصویر انتخاب‌شده پیش از ذخیره قابل مشاهده است و پس از ثبت نیز در پرونده نمایش داده می‌شود.</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-soft hover:border-teal-300 hover:bg-teal-50">
                    <ImagePlus className="h-3.5 w-3.5 text-teal-700" aria-hidden />
                    {photoPreview ? 'تغییر تصویر' : 'بارگذاری تصویر'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(event) => handlePhotoSelected(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {photoPreview && (
                    <Button type="button" variant="ghost" className="px-3 py-2 text-[11px] text-rose-700" onClick={clearPhoto}>
                      حذف تصویر
                    </Button>
                  )}
                  {photoFile && <span className="max-w-56 truncate text-[10px] text-slate-500">{photoFile.name}</span>}
                </div>
              </div>
            </div>
            <Field label="نام" htmlFor="firstName" required error={errorFor('firstName')}>
              <input id="firstName" className={inputClass} value={values.firstName} onChange={(e) => set('firstName', e.target.value)} maxLength={80} />
            </Field>
            <Field label="نام خانوادگی" htmlFor="lastName" required error={errorFor('lastName')}>
              <input id="lastName" className={inputClass} value={values.lastName} onChange={(e) => set('lastName', e.target.value)} maxLength={80} />
            </Field>
            <Field label="نام پدر" htmlFor="fatherName" error={errorFor('fatherName')}>
              <input id="fatherName" className={inputClass} value={values.fatherName} onChange={(e) => set('fatherName', e.target.value)} maxLength={80} />
            </Field>
            <Field label="کد ملی (۱۰ رقم)" htmlFor="nationalId" error={errorFor('nationalId')}>
              <input id="nationalId" dir="ltr" inputMode="numeric" maxLength={10} className={`${inputClass} dir-ltr font-mono`} value={values.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
            </Field>
            <Field label="تاریخ تولد (شمسی)" htmlFor="birthDate" hint="مثال: ۱۳۷۰/۰۵/۱۴" error={errorFor('birthDate')}>
              <input id="birthDate" dir="ltr" placeholder="1370/05/14" className={`${inputClass} dir-ltr font-mono num`} value={values.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
            </Field>
            <Field label="محل تولد" htmlFor="birthPlace" error={errorFor('birthPlace')}>
              <input id="birthPlace" className={inputClass} value={values.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} maxLength={120} />
            </Field>
            <Field label="شهر محل سکونت" htmlFor="residentialCity" required error={errorFor('residentialCity')}>
              <input id="residentialCity" list="cities-list" className={inputClass} value={values.residentialCity} onChange={(e) => set('residentialCity', e.target.value)} maxLength={80} />
              <datalist id="cities-list">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="شماره تماس اصلی" htmlFor="phone" error={errorFor('phone')}>
              <input id="phone" dir="ltr" inputMode="numeric" className={`${inputClass} dir-ltr font-mono`} value={values.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="تلفن جایگزین" htmlFor="alternativePhone" error={errorFor('alternativePhone')}>
              <input id="alternativePhone" dir="ltr" inputMode="numeric" className={`${inputClass} dir-ltr font-mono`} value={values.alternativePhone} onChange={(e) => set('alternativePhone', e.target.value)} />
            </Field>
            <Field label="ایمیل" htmlFor="email" error={errorFor('email')}>
              <input id="email" type="email" dir="ltr" className={`${inputClass} dir-ltr font-mono`} value={values.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="سابقه کار مفید (سال)" htmlFor="yearsOfExperience" error={errorFor('yearsOfExperience')}>
              <input id="yearsOfExperience" type="number" min={0} max={60} className={`${inputClass} dir-ltr font-mono num`} value={values.yearsOfExperience} onChange={(e) => set('yearsOfExperience', Number(e.target.value))} />
            </Field>
            <Field label="حوزه شغلی اصلی" htmlFor="primaryJobCategory" required error={errorFor('primaryJobCategory')}>
              <select id="primaryJobCategory" className={selectClass} value={values.primaryJobCategory} onChange={(e) => set('primaryJobCategory', e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="عنوان شغلی اصلی / پست تخصصی" htmlFor="primaryJobTitle" required className="sm:col-span-2" error={errorFor('primaryJobTitle')}>
              <input id="primaryJobTitle" className={inputClass} value={values.primaryJobTitle} onChange={(e) => set('primaryJobTitle', e.target.value)} maxLength={150} />
            </Field>
            <Field label="نشانی سکونت (محرمانه)" htmlFor="homeAddress" className="sm:col-span-2 lg:col-span-3" error={errorFor('homeAddress')} hint="فقط مدیران سامانه به نشانی کامل دسترسی دارند.">
              <input id="homeAddress" className={inputClass} value={values.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} maxLength={500} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-xs text-slate-500">
                علامت زدن گزینه «همکاری در مجموعه» سبب ثبت و استعلام اولویت استخدامی می‌شود.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setValues((v) => ({ ...v, employment: [...v.employment, emptyEmployment(v.residentialCity)] }));
                  setDirty(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                افزودن سابقه کاری
              </Button>
            </div>

            {values.employment.map((emp, index) => (
              <fieldset key={emp.id ?? `new-${index}`} className={`space-y-3 rounded-[var(--radius-lg)] border p-4 ${emp.isGroupEntity ? 'border-teal-300 bg-teal-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
                <legend className="num px-1 text-xs font-semibold text-slate-900">سابقه {toPersianDigits(index + 1)}</legend>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={emp.isGroupEntity}
                      onChange={(e) =>
                        updateEmployment(index, {
                          isGroupEntity: e.target.checked,
                          groupEntityType: e.target.checked ? 'SUBSIDIARY' : 'EXTERNAL',
                        })
                      }
                      className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    <span className="font-bold text-teal-900">همکاری در ستاد سازمان مادر یا شرکت‌های تابعه</span>
                  </label>
                  {emp.isGroupEntity && (
                    <select
                      value={emp.groupEntityType}
                      onChange={(e) => updateEmployment(index, { groupEntityType: e.target.value as GroupEntityType })}
                      className="rounded-[var(--radius-sm)] border border-teal-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800"
                      aria-label="نوع همکاری سازمانی"
                    >
                      <option value="PARENT">ستاد سازمان مادر</option>
                      <option value="SUBSIDIARY">شرکت زیرمجموعه</option>
                    </select>
                  )}
                  {emp.isGroupEntity && emp.groupEntityType === 'SUBSIDIARY' && organizations.length > 0 && (
                    <select
                      value={emp.organizationId ?? ''}
                      onChange={(e) => updateEmployment(index, { organizationId: e.target.value || null })}
                      className="rounded-[var(--radius-sm)] border border-teal-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800"
                      aria-label="شرکت تابعه"
                    >
                      <option value="">انتخاب شرکت (اختیاری)</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  )}
                  {values.employment.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setValues((v) => ({ ...v, employment: v.employment.filter((_, i) => i !== index) }));
                        setDirty(true);
                      }}
                      className="mr-auto p-1 text-slate-400 transition-soft hover:text-rose-600"
                      aria-label={`حذف سابقه ${toPersianDigits(index + 1)}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="نام کارفرما / شرکت" htmlFor={`emp-${index}-employer`} required error={errorFor(`employment_${index}_employerName`)}>
                    <input id={`emp-${index}-employer`} className={inputClass} value={emp.employerName} onChange={(e) => updateEmployment(index, { employerName: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="سمت / عنوان شغلی" htmlFor={`emp-${index}-jobTitle`} required error={errorFor(`employment_${index}_jobTitle`)}>
                    <input id={`emp-${index}-jobTitle`} className={inputClass} value={emp.jobTitle} onChange={(e) => updateEmployment(index, { jobTitle: e.target.value })} maxLength={150} />
                  </Field>
                  <Field label="شهر" htmlFor={`emp-${index}-city`} error={errorFor(`employment_${index}_city`)}>
                    <input id={`emp-${index}-city`} className={inputClass} value={emp.city} onChange={(e) => updateEmployment(index, { city: e.target.value })} maxLength={80} />
                  </Field>
                  <Field label="پروژه" htmlFor={`emp-${index}-project`} error={errorFor(`employment_${index}_projectName`)}>
                    <input id={`emp-${index}-project`} className={inputClass} value={emp.projectName} onChange={(e) => updateEmployment(index, { projectName: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="تاریخ شروع (شمسی)" htmlFor={`emp-${index}-start`} required error={errorFor(`employment_${index}_startDate`)}>
                    <input id={`emp-${index}-start`} dir="ltr" placeholder="1398/01/01" className={`${inputClass} dir-ltr font-mono num`} value={emp.startDate} onChange={(e) => updateEmployment(index, { startDate: e.target.value })} />
                  </Field>
                  <Field label="تاریخ پایان (شمسی)" htmlFor={`emp-${index}-end`} error={errorFor(`employment_${index}_endDate`)}>
                    <input
                      id={`emp-${index}-end`}
                      dir="ltr"
                      placeholder="1402/12/29"
                      disabled={emp.isCurrent}
                      className={`${inputClass} dir-ltr font-mono num disabled:opacity-50`}
                      value={emp.isCurrent ? 'اکنون' : emp.endDate}
                      onChange={(e) => updateEmployment(index, { endDate: e.target.value })}
                    />
                  </Field>
                  <div className="flex items-end pb-1.5">
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={emp.isCurrent}
                        onChange={(e) => updateEmployment(index, { isCurrent: e.target.checked, endDate: e.target.checked ? '' : emp.endDate })}
                        className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                      />
                      <span className="text-slate-800">شاغل در حال حاضر</span>
                    </label>
                  </div>
                  <Field label="آخرین حقوق (محرمانه)" htmlFor={`emp-${index}-salary`} error={errorFor(`employment_${index}_lastSalary`)}>
                    <input id={`emp-${index}-salary`} className={inputClass} value={emp.lastSalary} onChange={(e) => updateEmployment(index, { lastSalary: e.target.value })} maxLength={100} />
                  </Field>
                  <Field label="دلیل خروج (محرمانه)" htmlFor={`emp-${index}-reason`} error={errorFor(`employment_${index}_reasonForLeaving`)}>
                    <input id={`emp-${index}-reason`} className={inputClass} value={emp.reasonForLeaving} onChange={(e) => updateEmployment(index, { reasonForLeaving: e.target.value })} maxLength={1000} />
                  </Field>
                  <Field label="شرح وظایف" htmlFor={`emp-${index}-resp`} className="sm:col-span-2 lg:col-span-3" error={errorFor(`employment_${index}_responsibilities`)}>
                    <textarea id={`emp-${index}-resp`} rows={2} maxLength={4000} className={inputClass} value={emp.responsibilities} onChange={(e) => updateEmployment(index, { responsibilities: e.target.value })} />
                  </Field>
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-xs text-slate-500">آخرین مقطع تحصیلی به‌عنوان بالاترین مدرک پرونده ثبت می‌شود.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setValues((v) => ({ ...v, education: [...v.education, emptyEducation()] }));
                  setDirty(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                افزودن مقطع تحصیلی
              </Button>
            </div>

            {values.education.length === 0 && (
              <p className="rounded-[var(--radius-md)] bg-slate-50 p-6 text-center text-xs text-slate-400">
                مقطع تحصیلی ثبت نشده است. در صورت نداشتن سابقه تحصیلی، این بخش را خالی بگذارید.
              </p>
            )}

            {values.education.map((edu, index) => (
              <fieldset key={edu.id ?? `new-edu-${index}`} className="space-y-3 rounded-[var(--radius-lg)] border border-slate-200 bg-slate-50/50 p-4">
                <legend className="num px-1 text-xs font-semibold text-slate-900">مقطع {toPersianDigits(index + 1)}</legend>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setValues((v) => ({ ...v, education: v.education.filter((_, i) => i !== index) }));
                      setDirty(true);
                    }}
                    className="p-1 text-slate-400 transition-soft hover:text-rose-600"
                    aria-label={`حذف مقطع ${toPersianDigits(index + 1)}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="سطح مدرک" htmlFor={`edu-${index}-level`} error={errorFor(`education_${index}_degreeLevel`)}>
                    <select id={`edu-${index}-level`} className={selectClass} value={edu.degreeLevel} onChange={(e) => updateEducation(index, { degreeLevel: e.target.value as DegreeLevel })}>
                      {(Object.entries(DEGREE_LABELS) as [DegreeLevel, string][]).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="عنوان مدرک" htmlFor={`edu-${index}-title`} error={errorFor(`education_${index}_degreeTitle`)}>
                    <input id={`edu-${index}-title`} className={inputClass} value={edu.degreeTitle} onChange={(e) => updateEducation(index, { degreeTitle: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="رشته تحصیلی" htmlFor={`edu-${index}-field`} error={errorFor(`education_${index}_fieldOfStudy`)}>
                    <input id={`edu-${index}-field`} className={inputClass} value={edu.fieldOfStudy} onChange={(e) => updateEducation(index, { fieldOfStudy: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="دانشگاه / مرکز آموزشی" htmlFor={`edu-${index}-inst`} error={errorFor(`education_${index}_institutionName`)}>
                    <input id={`edu-${index}-inst`} className={inputClass} value={edu.institutionName} onChange={(e) => updateEducation(index, { institutionName: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="شهر" htmlFor={`edu-${index}-city`} error={errorFor(`education_${index}_city`)}>
                    <input id={`edu-${index}-city`} className={inputClass} value={edu.city} onChange={(e) => updateEducation(index, { city: e.target.value })} maxLength={80} />
                  </Field>
                  <Field label="شروع (شمسی)" htmlFor={`edu-${index}-start`} error={errorFor(`education_${index}_startDate`)}>
                    <input id={`edu-${index}-start`} dir="ltr" placeholder="1388/07/01" className={`${inputClass} dir-ltr font-mono num`} value={edu.startDate} onChange={(e) => updateEducation(index, { startDate: e.target.value })} />
                  </Field>
                  <Field label="پایان (شمسی)" htmlFor={`edu-${index}-end`} error={errorFor(`education_${index}_endDate`)}>
                    <input id={`edu-${index}-end`} dir="ltr" placeholder="1392/04/15" disabled={edu.isStudying} className={`${inputClass} dir-ltr font-mono num disabled:opacity-50`} value={edu.isStudying ? 'در حال تحصیل' : edu.endDate} onChange={(e) => updateEducation(index, { endDate: e.target.value })} />
                  </Field>
                  <Field label="معدل" htmlFor={`edu-${index}-gpa`} error={errorFor(`education_${index}_gpa`)}>
                    <input id={`edu-${index}-gpa`} dir="ltr" placeholder="17.25" className={`${inputClass} dir-ltr font-mono num`} value={edu.gpa} onChange={(e) => updateEducation(index, { gpa: e.target.value })} />
                  </Field>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={edu.isStudying}
                    onChange={(e) => updateEducation(index, { isStudying: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <span className="text-slate-800">در حال تحصیل</span>
                </label>
              </fieldset>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field
              label="مهارت‌های تخصصی (با ویرگول جدا کنید)"
              htmlFor="skillsCsv"
              error={errorFor('skillsCsv')}
              hint="مهارت‌های تکراری به‌طور خودکار حذف می‌شوند."
            >
              <input id="skillsCsv" className={inputClass} value={values.skillsCsv} onChange={(e) => set('skillsCsv', e.target.value)} maxLength={2000} placeholder="AutoCAD، Primavera P6، گزارش‌نویسی فنی" />
            </Field>
            <Field label="عناوین شغلی مورد نظر (با ویرگول جدا کنید)" htmlFor="preferredTitlesCsv" error={errorFor('preferredTitlesCsv')}>
              <input id="preferredTitlesCsv" className={inputClass} value={values.preferredTitlesCsv} onChange={(e) => set('preferredTitlesCsv', e.target.value)} maxLength={1000} />
            </Field>
            <Field label="حداقل حقوق درخواستی" htmlFor="expectedSalaryMin" error={errorFor('expectedSalaryMin')}>
              <input id="expectedSalaryMin" className={inputClass} value={values.expectedSalaryMin} onChange={(e) => set('expectedSalaryMin', e.target.value)} maxLength={100} />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={values.willingToTravelSites}
                  onChange={(e) => set('willingToTravelSites', e.target.checked)}
                  className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span className="text-slate-800">آمادگی اعزام به کارگاه‌های شهرستانی</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={values.willingToRelocate}
                  onChange={(e) => set('willingToRelocate', e.target.checked)}
                  className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span className="text-slate-800">آمادگی جابه‌جایی شهر</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              مرحله قبلی
            </Button>
          )}
          {step < 4 && (
            <Button variant="secondary" onClick={() => setStep((s) => s + 1)} className="border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100">
              مرحله بعدی
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => (dirty ? setDiscardOpen(true) : router.push('/applicants'))}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Save className="h-4 w-4" aria-hidden />
            {submitting ? 'در حال ذخیره‌سازی…' : mode === 'edit' ? 'ذخیره تغییرات پرونده' : 'ایجاد پرونده متقاضی'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        title="لغو و خروج از فرم"
        message="تغییرات ذخیره‌نشده‌ای در این فرم وجود دارد. آیا از خروج اطمینان دارید؟"
        confirmLabel="خروج بدون ذخیره"
        variant="danger"
        onConfirm={() => router.push('/applicants')}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}

function issueStep(field: string): number | null {
  if (field.startsWith('employment_')) return 2;
  if (field.startsWith('education_')) return 3;
  if (field === 'skillsCsv' || field === 'preferredTitlesCsv' || field === 'expectedSalaryMin') return 4;
  if (field) return 1;
  return null;
}
