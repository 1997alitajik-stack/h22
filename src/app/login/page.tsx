import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { PublicSupportForm } from './PublicSupportForm';

export const metadata = { title: 'ورود به سامانه' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-structure)] px-4 py-12">
      <div className="w-full max-w-md text-center">
        <BrandLogo size="xl" withText layout="vertical" theme="dark" />
      </div>
      <div className="mt-8 w-full max-w-md">
        <div className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <h1 className="text-base font-bold text-slate-900">ورود به سامانه راستا</h1>
          <p className="mt-1 text-xs text-slate-500">
            با حساب سازمانی خود وارد شوید. در صورت فراموشی کلمه عبور با مدیر سامانه تماس بگیرید.
          </p>
          <LoginForm />
        </div>
        <PublicSupportForm />
        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
          دسترسی به اطلاعات این سامانه محرمانه است و صرفاً برای کارکنان مجاز سازمان امکان‌پذیر است.
        </p>
      </div>
    </main>
  );
}
