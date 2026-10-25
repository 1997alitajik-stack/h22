'use client';

import { useRouter } from 'next/navigation';
import { useServerAction } from '@/lib/useServerAction';
import { updateOwnProfileAction } from '@/app/actions/admin';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import type { SessionUser } from '@/types';

const initial = { ok: false } as { ok: boolean; error?: string; message?: string };

export function ProfileSettingsForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [state, , pending, submitAndWait] = useServerAction(updateOwnProfileAction, initial);

  async function handleSubmit(formData: FormData) {
    const result = await submitAndWait(formData);
    if (result.ok) router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          {state.message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
        <Field label="نام و نام خانوادگی" htmlFor="profile-full-name" required>
          <input id="profile-full-name" name="fullName" required maxLength={120} defaultValue={user.fullName} className={inputClass} />
        </Field>
        <Field label="نام کاربری" htmlFor="profile-username" hint="اختیاری؛ حروف لاتین، رقم، نقطه و خط تیره">
          <input id="profile-username" name="username" dir="ltr" maxLength={60} defaultValue={user.username ?? ''} className={`${inputClass} dir-ltr font-mono`} />
        </Field>
        <Field label="بخش سازمانی" htmlFor="profile-department">
          <input id="profile-department" name="department" maxLength={200} defaultValue={user.department ?? ''} className={inputClass} />
        </Field>
        <Field label="ایمیل ورود" htmlFor="profile-email" hint="برای تغییر ایمیل، مدیر سامانه باید از مدیریت کاربران اقدام کند.">
          <input id="profile-email" dir="ltr" readOnly value={user.email} className={`${inputClass} dir-ltr bg-slate-50 text-slate-500`} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-slate-50 p-3 text-xs">
        <span className="text-slate-500">سطح دسترسی:</span>
        <span className="font-semibold text-slate-800">{user.role === 'ADMIN' ? 'مدیر سامانه' : 'مشاهده‌گر منابع انسانی'}</span>
        <span className="mr-auto text-[11px] text-slate-500">نقش دسترسی فقط توسط مدیر سامانه قابل تغییر است.</span>
      </div>

      <div className="flex justify-start border-t border-slate-100 pt-4">
        <Button type="submit" loading={pending}>ذخیره تغییرات پروفایل</Button>
      </div>
    </form>
  );
}
