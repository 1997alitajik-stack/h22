import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { SetupForm } from './SetupForm';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const metadata = { title: 'راه‌اندازی اولیه سامانه' };
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const user = await getSessionUser();
  if (user) redirect('/');

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <BrandLogo size="md" withText={false} />
          <h1 className="mt-3 text-base font-bold text-slate-900">راه‌اندازی اولیه سامانه راستا</h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            این صفحه فقط یک‌بار برای ایجاد نخستین حساب مدیر سامانه استفاده می‌شود. توکن راه‌اندازی در
            متغیر محیطی <code className="dir-ltr rounded bg-slate-100 px-1 py-0.5 text-[10px]">RASTA_SETUP_TOKEN</code> سرور
            تعریف شده است و پس از ایجاد مدیر، این مسیر به‌طور کامل غیرفعال می‌گردد.
          </p>
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
