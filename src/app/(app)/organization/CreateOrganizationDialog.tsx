'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createOrganizationAction } from '@/app/actions/admin';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import { useServerAction } from '@/lib/useServerAction';

const initial: { ok: boolean; error?: string; message?: string } = { ok: false };

export function CreateOrganizationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, , pending, submitAndWait] = useServerAction(createOrganizationAction, initial);

  async function handleAction(formData: FormData) {
    const result = await submitAndWait(formData);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="self-start">
        <Plus className="h-3.5 w-3.5" aria-hidden />
        تعریف شرکت تابعه جدید
      </Button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="افزودن شرکت تابعه به ساختار">
          <form action={handleAction} className="space-y-4 text-xs">
            {state.error && (
              <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 font-medium text-rose-700">
                {state.error}
              </p>
            )}
            <Field label="نام شرکت (فارسی)" htmlFor="org-name" required>
              <input id="org-name" name="nameFa" required maxLength={200} className={inputClass} placeholder="مثال: شرکت توسعه و بهره‌برداری اروند" />
            </Field>
            <Field label="کد سازمانی / شناسه" htmlFor="org-code" required hint="یکتا؛ مثال: ARVAND-OPS">
              <input id="org-code" name="code" dir="ltr" required maxLength={60} className={`${inputClass} dir-ltr font-mono`} />
            </Field>
            <Field label="حوزه مأموریت و فعالیت" htmlFor="org-field">
              <input id="org-field" name="field" maxLength={300} className={inputClass} placeholder="پیمانکاری خطوط لوله و نفت و گاز" />
            </Field>
            <Field label="شهر مرکزی" htmlFor="org-city">
              <input id="org-city" name="city" maxLength={80} className={inputClass} />
            </Field>
            <input type="hidden" name="isSubsidiary" value="true" />
            <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" loading={pending}>
                ثبت شرکت در ساختار
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                انصراف
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
