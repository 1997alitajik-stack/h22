import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'دسترسی غیرمجاز' };
export const dynamic = 'force-dynamic';

export default async function ForbiddenPage() {
  const user = await getSessionUser();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="max-w-md rounded-[var(--radius-lg)] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-status-danger-bg)] text-rose-600">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-base font-bold text-slate-900">دسترسی به این بخش مجاز نیست</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          این بخش مخصوص مدیر سامانه است. تلاش شما برای دسترسی ثبت شد.
          {user ? '' : ' در صورت نیاز ابتدا وارد حساب کاربری خود شوید.'}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent-strong)] transition-soft"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    </main>
  );
}
