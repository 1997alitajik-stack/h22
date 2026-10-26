'use client';

import { useRouter } from 'next/navigation';
import { Archive, Building2, Save } from 'lucide-react';
import { updateOrganizationSettingsAction } from '@/app/actions/admin';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { useServerAction } from '@/lib/useServerAction';
import type { OrganizationSettings } from '@/types';

const initial = { ok: false } as { ok: boolean; error?: string; message?: string };
const ARCHIVE_DAY_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 365];

export function ParentOrganizationCard({settings,isAdmin}:{settings:OrganizationSettings;isAdmin:boolean;}) {
  const router = useRouter();
  const [state, , pending, submit] = useServerAction(updateOrganizationSettingsAction, initial);

  async function saveSettings(formData: FormData) {
    const result = await submit(formData);
    if (result.ok) router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5 text-slate-900" aria-label="تنظیمات هلدینگ و بایگانی">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-teal-200 bg-teal-50">
          <Building2 className="h-5 w-5 text-teal-800" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-bold">نام هلدینگ و سیاست بایگانی</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            این نام در تمام فرصت‌های ستادی استفاده می‌شود. نام شرکت و پروژه اجرایی جداگانه از ساختار زیرمجموعه انتخاب می‌شود.
          </p>
        </div>
      </div>

      {!isAdmin ? (
        <div className="space-y-2 text-xs text-slate-600">
          <p>نام هلدینگ: <strong className="text-slate-900">{settings.parent_name || 'ثبت نشده'}</strong></p>
          <p>بایگانی خودکار معرفی‌های بدون پیگیری: <strong className="text-slate-900">{settings.auto_archive_enabled ? 'فعال پس از ' + settings.auto_archive_days + ' روز' : 'غیرفعال'}</strong></p>
        </div>
      ) : (
        <form action={saveSettings} className="space-y-4">
          {state.error && <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{state.error}</p>}
          {state.message && <p role="status" className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{state.message}</p>}

          <Field label="نام هلدینگ مادر" htmlFor="parent-holding-name" required>
            <input id="parent-holding-name" name="parentOrganizationName" required minLength={2} maxLength={200} defaultValue={settings.parent_name} className={inputClass} placeholder="نام رسمی هلدینگ مادر" />
          </Field>

          <div className="rounded-[var(--radius-md)] border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <Archive className="mt-0.5 h-4 w-4 shrink-0 text-teal-800" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900">بایگانی خودکار معرفی‌های بدون پیگیری</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  فقط معرفی‌هایی که هنوز در «جدید» یا «در حال بررسی» مانده‌اند بایگانی می‌شوند. مصاحبه، فهرست نهایی و پذیرفته‌شده خودکار بایگانی نمی‌شوند. پرونده اصلی متقاضی و سوابقش در استخر رزومه باقی می‌ماند.
                </p>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700">
              <input type="checkbox" name="autoArchiveEnabled" defaultChecked={settings.auto_archive_enabled} className="h-4 w-4 accent-teal-700" />
              فعال‌سازی بایگانی خودکار
            </label>
            <div className="mt-3 max-w-xs">
              <Field label="مدت بایگانی خودکار معرفی‌ها" htmlFor="auto-archive-days" hint="بازه مجاز: ۱۵ تا ۳۶۵ روز">
                <select id="auto-archive-days" name="autoArchiveDays" defaultValue={String(settings.auto_archive_days)} className={selectClass}>
                  {!ARCHIVE_DAY_OPTIONS.includes(settings.auto_archive_days) && <option value={settings.auto_archive_days}>{settings.auto_archive_days} روز (مقدار فعلی)</option>}
                  {ARCHIVE_DAY_OPTIONS.map((days) => <option key={days} value={days}>{days} روز</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-start gap-2 border-t border-slate-100 pt-3">
            <Button type="submit" loading={pending}><Save className="h-3.5 w-3.5" aria-hidden />ذخیره تنظیمات هلدینگ</Button>
          </div>
        </form>
      )}
    </section>
  );
}
