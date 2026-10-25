import { requireUser } from '@/lib/auth';
import { listOrganizations } from '@/server/misc';
import { toPersianDigits } from '@/lib/persian';
import { Building2 } from 'lucide-react';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { OrganizationCard } from './OrganizationCard';

export const metadata = { title: 'ساختار سازمانی' };
export const dynamic = 'force-dynamic';

export default async function OrganizationPage() {
  const user = await requireUser('/organization');
  const organizations = await listOrganizations(user);
  const activeCount = organizations.filter((organization) => organization.status === 'ACTIVE').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">ساختار سازمان و شرکت‌های تابعه</h1>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500">
            شرکت‌ها و پروژه‌های مرتبط را مدیریت کنید. فقط مدیر سامانه می‌تواند اطلاعات ساختار را تغییر دهد؛
            غیرفعال‌سازی، سوابق تاریخی را حفظ می‌کند.
          </p>
        </div>
        {user.role === 'ADMIN' && <CreateOrganizationDialog />}
      </div>

      <section className="rounded-[var(--radius-lg)] border border-emerald-900 bg-emerald-950 p-5 text-white sm:p-6" aria-label="سازمان مادر">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-emerald-700 bg-emerald-800">
              <Building2 className="h-6 w-6 text-emerald-300" aria-hidden />
            </div>
            <div>
              <span className="mb-1 inline-block rounded-full border border-emerald-700 bg-emerald-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                ستاد مرکزی هلدینگ و سازمان مادر
              </span>
              <h2 className="text-base font-bold">سازمان مادر (ستاد پروژه‌ها و مدیریت راهبردی)</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-emerald-200/80">
                سوابق تأییدشده در ستاد، بالاترین اولویت سازمانی را دارند. این مشخصات عنوان راهنماست؛ شرکت‌ها و پروژه‌های قابل مدیریت در فهرست پایین ثبت می‌شوند.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 border-t border-emerald-800 pt-3 text-xs md:border-r md:border-t-0 md:pr-5 md:pt-0">
            <span className="text-emerald-300">شرکت‌های فعال</span>
            <span className="num text-xl font-bold">{toPersianDigits(activeCount)}</span>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-label="شرکت‌های تابعه">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-sm font-bold text-slate-900">
            شرکت‌ها و زیرمجموعه‌ها ({toPersianDigits(organizations.length)})
          </h2>
          <span className="text-xs text-slate-500">سابقهٔ تأییدشدهٔ شرکت‌های تابعه مشمول اولویت گروهی دوم است.</span>
        </div>

        {organizations.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
            هنوز شرکتی در ساختار ثبت نشده است.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {organizations.map((organization) => (
              <OrganizationCard key={organization.id} organization={organization} isAdmin={user.role === 'ADMIN'} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
