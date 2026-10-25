import { requireUser } from '@/lib/auth';
import { ProfileSettingsForm } from './ProfileSettingsForm';

export const metadata = { title: 'پروفایل من' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireUser('/profile');

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">پروفایل من</h1>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          مشخصات حساب ورود خود را ببینید و نام، نام کاربری و بخش سازمانی خود را به‌روز کنید.
          سطح دسترسی توسط مدیر سامانه کنترل می‌شود.
        </p>
      </header>

      <section className="space-y-5 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] text-sm font-bold text-white">
            {user.fullName.trim().split(/\s+/).map((part) => part.charAt(0)).slice(0, 2).join('')}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{user.fullName}</h2>
            <p className="dir-ltr mt-1 text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <ProfileSettingsForm user={user} />
      </section>
    </div>
  );
}
