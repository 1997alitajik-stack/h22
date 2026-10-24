import { requireAdmin } from '@/lib/auth';
import { listUsers } from '@/server/users';
import { formatJalali, initialsOf } from '@/lib/persian';
import { UserManagementTable } from './UserManagementTable';

export const metadata = { title: 'مدیریت کاربران' };
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await requireAdmin('/users');
  const profiles = await listUsers(user);

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
          username: p.username,
          role: p.role,
          status: p.status,
          department: p.department,
          createdAt: formatJalali(p.created_at),
        }))}
        initialsOf={initialsOf}
      />
    </div>
  );
}
