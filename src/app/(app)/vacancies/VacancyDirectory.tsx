'use client';

import Link from 'next/link';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { Briefcase, Building2, MapPin, Plus, Search, Users } from 'lucide-react';
import { createVacancyAction, type SimpleActionState } from '@/app/actions/admin';
import { Modal } from '@/components/ui/Modal';
import { Button, EmptyState, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { VacancyStatusBadge } from '@/components/ui/Badges';
import { DEGREE_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/lib/domain/labels';
import { toPersianDigits } from '@/lib/persian';
import type { SessionUser, VacancyListRow } from '@/types';

const initial: SimpleActionState = { ok: false };

export function VacancyDirectory({
  user,
  vacancies,
  cities,
  categories,
  organizations,
}: {
  user: SessionUser;
  vacancies: VacancyListRow[];
  cities: string[];
  categories: string[];
  organizations: { id: string; name: string }[];
}) {
  const isAdmin = user.role === 'ADMIN';
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(
    () =>
      vacancies.filter((v) => {
        const needle = q.trim().toLowerCase();
        const matchesQ =
          needle === '' ||
          [v.title, v.organization_name, v.category, v.code, v.project_name ?? ''].some((f) =>
            f.toLowerCase().includes(needle),
          );
        return (
          matchesQ &&
          (statusFilter === 'ALL' || v.status === statusFilter) &&
          (cityFilter === 'ALL' || v.city === cityFilter)
        );
      }),
    [vacancies, q, statusFilter, cityFilter],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">فرصت‌های شغلی و موقعیت‌های جذب</h1>
          <p className="mt-1 text-xs text-slate-500">
            ردیف‌های باز استخدامی در ستاد سازمان و شرکت‌های تابعه
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="self-start">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            تعریف موقعیت شغلی جدید
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی عنوان شغلی، شرکت، حوزه تخصصی…"
            aria-label="جستجوی فرصت شغلی"
            className={`${inputClass} pr-10`}
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass} aria-label="فیلتر وضعیت">
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="OPEN">پذیرش فعال</option>
            <option value="IN_PROGRESS">در جریان ارزیابی</option>
            <option value="FILLED">تکمیل‌شده</option>
            <option value="CANCELLED">لغو‌شده</option>
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={selectClass} aria-label="فیلتر شهر">
            <option value="ALL">همه شهرها</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-slate-200 bg-white">
          <EmptyState
            icon={<Briefcase className="h-5 w-5" aria-hidden />}
            title="هیچ فرصت شغلی یافت نشد"
            description="فیلترها را تغییر دهید یا نخستین ردیف استخدامی را تعریف کنید."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vac) => (
            <Link
              key={vac.id}
              href={`/vacancies/${vac.id}`}
              className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 transition-soft hover:border-teal-400 hover:shadow-sm"
            >
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="dir-ltr font-mono text-[11px] text-slate-400">{vac.code}</span>
                  <VacancyStatusBadge status={vac.status} />
                </div>
                <h2 className="mb-1.5 text-sm font-bold text-slate-900">{vac.title}</h2>
                <p className="mb-1 flex items-center gap-1.5 truncate text-xs text-slate-600">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  {vac.organization_name}
                </p>
                <p className="mb-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                  {vac.city}
                  {vac.project_name && <span> · پروژه {vac.project_name}</span>}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="num flex items-center gap-3 text-slate-500">
                  <span>ظرفیت: {toPersianDigits(vac.open_positions_count)}</span>
                  <span className="flex items-center gap-1 font-bold text-teal-800">
                    <Users className="h-3 w-3" aria-hidden />
                    {toPersianDigits(vac.applicant_count)} متقاضی
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">{EMPLOYMENT_TYPE_LABELS[vac.employment_type]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateVacancyModal
          cities={cities}
          categories={categories}
          organizations={organizations}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

function CreateVacancyModal({
  cities,
  categories,
  organizations,
  onClose,
}: {
  cities: string[];
  categories: string[];
  organizations: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createVacancyAction, initial);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title="تعریف فرصت شغلی و ردیف جدید" size="lg">
      <form action={formAction} className="space-y-4 text-xs">
        {state.error && (
          <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 font-medium text-rose-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="عنوان موقعیت شغلی" htmlFor="v-title" required className="sm:col-span-2">
            <input id="v-title" name="title" required maxLength={200} className={inputClass} placeholder="مثال: سرپرست دفتر فنی پروژه عمرانی" />
          </Field>

          <Field label="حوزه شغلی" htmlFor="v-category" required>
            <select id="v-category" name="category" className={selectClass} required>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="سازمان" htmlFor="v-orgtype" required>
            <select id="v-orgtype" name="organizationType" className={selectClass} defaultValue="SUBSIDIARY">
              <option value="PARENT">ستاد مرکزی سازمان</option>
              <option value="SUBSIDIARY">شرکت تابعه</option>
            </select>
          </Field>

          <Field label="شناسه سازمانی تابعه" htmlFor="v-org">
            <select id="v-org" name="organizationId" className={selectClass}>
              <option value="">—</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </Field>

          <Field label="نام نمایشی سازمان" htmlFor="v-orgname" required>
            <input id="v-orgname" name="organizationName" required maxLength={200} className={inputClass} placeholder="مثال: شرکت مهندسی و توسعه سدید" />
          </Field>

          <Field label="شهر محل خدمت" htmlFor="v-city" required>
            <input id="v-city" name="city" required list="vac-cities" maxLength={80} className={inputClass} />
            <datalist id="vac-cities">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="تعداد ردیف استخدام" htmlFor="v-openings" required>
            <input id="v-openings" name="openPositionsCount" type="number" min={1} max={100} defaultValue={1} required className={`${inputClass} num`} />
          </Field>

          <Field label="نوع همکاری" htmlFor="v-emptype">
            <select id="v-emptype" name="employmentType" className={selectClass} defaultValue="FULL_TIME">
              {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [string, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="حداقل مدرک تحصیلی" htmlFor="v-degree">
            <select id="v-degree" name="requiredDegree" className={selectClass}>
              <option value="">بدون الزام</option>
              {(Object.entries(DEGREE_LABELS) as [string, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="حداقل سابقه کار (سال)" htmlFor="v-minexp">
            <input id="v-minexp" name="minYearsExperience" type="number" min={0} max={40} defaultValue={0} className={`${inputClass} num`} />
          </Field>

          <Field label="مهارت‌های الزامی (با ویرگول)" htmlFor="v-skills">
            <input id="v-skills" name="requiredSkillsCsv" maxLength={1000} className={inputClass} placeholder="AutoCAD، نقشه‌خوانی" />
          </Field>

          <Field label="مهارت‌های ترجیحی (با ویرگول)" htmlFor="v-prefskills">
            <input id="v-prefskills" name="preferredSkillsCsv" maxLength={1000} className={inputClass} />
          </Field>

          <Field label="بازه حقوق (اختیاری)" htmlFor="v-salary">
            <input id="v-salary" name="salaryRange" maxLength={100} className={inputClass} placeholder="۲۵ تا ۳۲ میلیون تومان" />
          </Field>

          <Field label="شرح شغل و انتظارات" htmlFor="v-desc" className="sm:col-span-2">
            <textarea id="v-desc" name="description" rows={3} maxLength={4000} className={inputClass} />
          </Field>
        </div>

        <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
          <Button type="submit" loading={pending}>
            {pending ? 'در حال ایجاد…' : 'ایجاد موقعیت شغلی'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </form>
    </Modal>
  );
}
