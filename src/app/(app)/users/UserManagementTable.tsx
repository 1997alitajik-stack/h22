'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Plus } from 'lucide-react';
import {
  createUserAction,
  resetPasswordAction,
  updateUserRoleAction,
  updateUserStatusAction,
} from '@/app/actions/admin';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { AccountStatusBadge } from '@/components/ui/Badges';
import { useServerAction } from '@/lib/useServerAction';

const initial: { ok: boolean; error?: string; message?: string } = { ok: false };

interface Row {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
  role: 'ADMIN' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE';
  department: string | null;
  createdAt: string;
}

export function UserManagementTable({
  currentUserId,
  users,
  initialsOf,
}: {
  currentUserId: string;
  users: Row[];
  initialsOf: (name: string) => string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [statusTarget, setStatusTarget] = useState<Row | null>(null);

  const [createState, , createPending, createSubmitAndWait] = useServerAction(createUserAction, initial);
  const [resetState, resetFormAction, resetPending] = useServerAction(resetPasswordAction, initial);
  const [roleState, , rolePending, roleSubmitAndWait] = useServerAction(updateUserRoleAction, initial);
  const [statusState, , statusPending, statusSubmitAndWait] = useServerAction(updateUserStatusAction, initial);

  async function handleCreateAction(formData: FormData) {
    const result = await createSubmitAndWait(formData);
    if (result.ok) {
      setCreateOpen(false);
      router.refresh();
    }
  }

  async function handleRoleAction(formData: FormData) {
    const result = await roleSubmitAndWait(formData);
    if (result.ok) router.refresh();
  }

  async function handleStatusAction(formData: FormData) {
    const result = await statusSubmitAndWait(formData);
    if (result.ok) {
      setStatusTarget(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          ایجاد حساب کاربری جدید
        </Button>
      </div>

      {(roleState.error || statusState.error) && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 text-xs font-medium text-rose-700">
          {roleState.error || statusState.error}
        </p>
      )}
      {(roleState.message || statusState.message) && (
        <p role="status" className="rounded-[var(--radius-md)] border border-emerald-200 bg-[var(--color-status-success-bg)] p-3 text-xs font-medium text-emerald-800">
          {roleState.message || statusState.message}
        </p>
      )}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3.5 font-semibold">کاربر</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">ایمیل / نام کاربری</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">بخش سازمانی</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">نقش دسترسی</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">وضعیت</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">تاریخ ایجاد</th>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="transition-soft hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-strong)] text-xs font-bold text-white">
                        {initialsOf(u.fullName)}
                      </div>
                      <div className="font-semibold text-slate-900">{u.fullName || '—'}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="dir-ltr text-right font-mono text-slate-800">{u.email}</div>
                    {u.username && <div className="dir-ltr text-right font-mono text-[10px] text-slate-400">{u.username}</div>}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{u.department ?? '—'}</td>
                  <td className="px-3 py-3">
                    <form action={handleRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        disabled={rolePending || u.id === currentUserId}
                        className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50"
                        aria-label={`نقش ${u.fullName}`}
                      >
                        <option value="ADMIN">مدیر سامانه</option>
                        <option value="VIEWER">مشاهده‌گر منابع انسانی</option>
                      </select>
                      {u.id !== currentUserId && (
                        <Button type="submit" variant="secondary" loading={rolePending} className="px-2 py-1">
                          ثبت
                        </Button>
                      )}
                    </form>
                  </td>
                  <td className="px-3 py-3">
                    <AccountStatusBadge status={u.status} />
                  </td>
                  <td className="num px-3 py-3 text-slate-500">{u.createdAt}</td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setResetTarget(u)}
                        className="rounded-[var(--radius-md)] p-1.5 text-slate-400 transition-soft hover:bg-slate-100 hover:text-teal-800"
                        aria-label={`تغییر کلمه عبور ${u.fullName}`}
                        title="تغییر کلمه عبور"
                      >
                        <KeyRound className="h-4 w-4" aria-hidden />
                      </button>
                      {u.id !== currentUserId && (
                        <Button
                          variant={u.status === 'ACTIVE' ? 'ghost' : 'secondary'}
                          onClick={() => setStatusTarget(u)}
                          className={u.status === 'ACTIVE' ? 'text-rose-700 hover:bg-rose-50' : 'text-emerald-700'}
                        >
                          {u.status === 'ACTIVE' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create user modal */}
      {createOpen && (
        <Modal open onClose={() => setCreateOpen(false)} title="ایجاد حساب کاربری جدید">
          <form action={handleCreateAction} className="space-y-4 text-xs">
            {createState.error && (
              <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 font-medium text-rose-700">
                {createState.error}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="نام و نام خانوادگی" htmlFor="u-name" required>
                <input id="u-name" name="fullName" required maxLength={120} className={inputClass} />
              </Field>
              <Field label="نشانی ایمیل" htmlFor="u-email" required>
                <input id="u-email" name="email" type="email" dir="ltr" required className={`${inputClass} dir-ltr font-mono`} />
              </Field>
              <Field label="نام کاربری (اختیاری)" htmlFor="u-username" hint="حروف لاتین، رقم، نقطه و خط تیره">
                <input id="u-username" name="username" dir="ltr" maxLength={60} className={`${inputClass} dir-ltr font-mono`} />
              </Field>
              <Field label="بخش سازمانی" htmlFor="u-department">
                <input id="u-department" name="department" maxLength={200} className={inputClass} />
              </Field>
              <Field label="نقش دسترسی" htmlFor="u-role" required>
                <select id="u-role" name="role" className={selectClass} defaultValue="VIEWER">
                  <option value="VIEWER">مشاهده‌گر منابع انسانی</option>
                  <option value="ADMIN">مدیر سامانه</option>
                </select>
              </Field>
              <Field label="کلمه عبور اولیه" htmlFor="u-password" required hint="حداقل ۱۰ نویسه؛ به کاربر اطلاع دهید">
                <input id="u-password" name="password" type="password" dir="ltr" required minLength={10} autoComplete="new-password" className={`${inputClass} dir-ltr font-mono`} />
              </Field>
            </div>
            <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              حساب بدون تأیید ایمیل فعال می‌شود؛ کلمه عبور اولیه را از مجرای امن به کاربر ابلاغ کنید.
            </p>
            <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" loading={createPending}>
                ایجاد حساب
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                انصراف
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password reset modal */}
      {resetTarget && (
        <Modal open onClose={() => setResetTarget(null)} title={`تغییر کلمه عبور — ${resetTarget.fullName}`}>
          <form action={resetFormAction} className="space-y-4 text-xs">
            <input type="hidden" name="userId" value={resetTarget.id} />
            {resetState.error && (
              <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 font-medium text-rose-700">
                {resetState.error}
              </p>
            )}
            {resetState.ok && (
              <p className="rounded-[var(--radius-md)] border border-emerald-200 bg-[var(--color-status-success-bg)] p-3 font-medium text-emerald-800">
                {resetState.message}
              </p>
            )}
            <Field label="کلمه عبور جدید" htmlFor="new-password" required hint="حداقل ۱۰ نویسه؛ نشست‌های جاری ممکن است تا پایان اعتبار توکن فعال بمانند.">
              <input id="new-password" name="newPassword" type="password" dir="ltr" required minLength={10} autoComplete="new-password" className={`${inputClass} dir-ltr font-mono`} />
            </Field>
            <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" loading={resetPending}>
                تغییر کلمه عبور
              </Button>
              <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>
                انصراف
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={statusTarget !== null}
        title="تغییر وضعیت حساب کاربری"
        message={
          statusTarget?.status === 'ACTIVE'
            ? `با غیرفعال‌سازی حساب «${statusTarget?.fullName}»، دسترسی او به سامانه مسدود و ورودهای بعدی غیرفعال می‌شود. ادامه می‌دهید؟`
            : `آیا حساب «${statusTarget?.fullName}» مجدداً فعال شود؟`
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
        variant={statusTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        onConfirm={() => {
          if (statusTarget) {
            const fd = new FormData();
            fd.set('userId', statusTarget.id);
            fd.set('status', statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
            handleStatusAction(fd);
          }
        }}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
