import { requireAdmin } from '@/lib/auth';
import { listUsers } from '@/server/users';
import { formatJalali, initialsOf } from '@/lib/persian';
import { UserManagementTable } from './UserManagementTable';

export const metadata = { title: 'مدیریت کاربران' };
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await requireAdmin('/users');

  let profiles;
  try {
    profiles = await listUsers(user);
  } catch (error) {
    // Keep details in server logs. Never expose credentials or raw database errors in HTML.
    console.error('[RASTA_USERS_PAGE] Failed to load user management page', error);
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="rounded-[var(--radius-lg)] border border-rose-200 bg-white p-6" role="alert">
          <h1 className="text-base font-bold text-slate-900">بارگذاری مدیریت کاربران ناموفق بود</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            دریافت فهرست کاربران از دیتابیس انجام نشد. در Vercel از بخش Logs، پیام دارای برچسب
            <code className="dir-ltr mx-1">RASTA_USERS_PAGE</code> را بررسی کنید.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">مدیریت کاربران و سطوح دسترسی</h1>
        <p className="mt-1 text-xs text-slate-500">
          ایجاد حساب، تغییر نقش مدیر/مشاهده‌گر و فعال‌سازی حساب‌ها — همه تغییرات در سابقه رویدادها ثبت می‌شود.
        </p>
      </div>
      <UserManagementTable
        currentUserId={user.id}
        users={profiles.map((p) => ({
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          initials: initialsOf(p.full_name || p.email),
          username: p.username,
          role: p.role,
          status: p.status,
          department: p.department,
          createdAt: formatJalali(p.created_at),
        }))}
      />
    </div>
  );
}
