import { requireUser } from '@/lib/auth';
import { listOrganizations } from '@/server/misc';
import { toPersianDigits } from '@/lib/persian';
import { Building2, FolderGit2, Layers } from 'lucide-react';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';

export const metadata = { title: 'ساختار سازمانی' };
export const dynamic = 'force-dynamic';

export default async function OrganizationPage() {
  const user = await requireUser('/organization');
  const organizations = await listOrganizations(user);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">ساختار سازمان و شرکت‌های تابعه</h1>
          <p className="mt-1 text-xs text-slate-500">
            تعریف هویت‌های حقوقی مجاز برای اعطای اولویت استخدامی گروهی
          </p>
        </div>
        {user.role === 'ADMIN' && <CreateOrganizationDialog />}
      </div>

      {/* Parent organization */}
      <section className="rounded-[var(--radius-lg)] border border-emerald-900 bg-emerald-950 p-6 text-white" aria-label="سازمان مادر">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-emerald-700 bg-emerald-800">
              <Building2 className="h-8 w-8 text-emerald-300" aria-hidden />
            </div>
            <div>
              <span className="mb-1 inline-block rounded-full border border-emerald-700 bg-emerald-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                ستاد مرکزی هلدینگ و سازمان مادر
              </span>
              <h2 className="text-base font-bold">سازمان مادر (ستاد پروژه‌ها و مدیریت راهبردی)</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-emerald-200/80">
                سوابق خدمت تأییدشده در ستاد دارای «اولویت عالی» در جذب و ارزیابی است.
              </p>
            </div>
          </div>
          <div className="num flex items-center gap-6 border-t border-emerald-800 pt-3 text-xs md:border-r md:border-t-0 md:pr-6 md:pt-0">
            <div>
              <span className="block text-[10px] text-emerald-400">مرکزیت</span>
              <span className="font-semibold">تهران — ستاد مرکزی</span>
            </div>
            <div>
              <span className="block text-[10px] text-emerald-400">شرکت‌های تابعه</span>
              <span className="font-semibold">{toPersianDigits(organizations.length)} شرکت فعال</span>
            </div>
          </div>
        </div>
      </section>

      {/* Subsidiaries */}
      <section className="space-y-4" aria-label="شرکت‌های تابعه">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            شرکت‌های زیرمجموعه ({toPersianDigits(organizations.length)} شرکت)
          </h2>
          <span className="text-xs text-slate-500">سوابق این شرکت‌ها مشمول اولویت گروهی دوم است</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {organizations.map((org) => (
            <article key={org.id} className="space-y-4 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 transition-soft hover:border-slate-300">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-teal-200 bg-teal-50">
                    <Layers className="h-5 w-5 text-teal-700" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{org.name_fa}</h3>
                    <p className="dir-ltr mt-0.5 font-mono text-[11px] text-slate-400">
                      {org.code}
                      {org.city ? ` · ${org.city}` : ''}
                    </p>
                  </div>
                </div>
                <span className="rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  فعال در ساختار
                </span>
              </div>

              {org.field && (
                <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  <span className="mb-0.5 block font-semibold text-slate-800">حوزه فعالیت:</span>
                  {org.field}
                </p>
              )}

              <div className="border-t border-slate-100 pt-3 text-xs">
                <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-700">
                  <FolderGit2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  پروژه‌های مرتبط ({toPersianDigits(org.projects.length)})
                </p>
                {org.projects.length === 0 ? (
                  <p className="text-[11px] text-slate-400">پروژه‌ای ثبت نشده است.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {org.projects.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-slate-50 p-2 text-[11px]">
                        <span className="truncate font-medium text-slate-800">{p.name}</span>
                        <span className="shrink-0 text-slate-400">{p.city ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
