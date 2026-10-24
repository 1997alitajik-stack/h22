'use client';

import { useActionState } from 'react';
import { setupAction, type ActionState } from '@/app/actions/auth';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import { ShieldCheck } from 'lucide-react';

const initialState: ActionState = { ok: false };

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupAction, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-4" noValidate>
      {state.error && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 text-xs font-medium text-rose-700">
          {state.error}
        </div>
      )}

      <Field label="توکن راه‌اندازی" htmlFor="token" required>
        <input id="token" name="token" type="password" dir="ltr" required autoComplete="off" className={`${inputClass} dir-ltr font-mono`} />
      </Field>

      <Field label="نشانی ایمیل مدیر" htmlFor="email" required>
        <input id="email" name="email" type="email" dir="ltr" required className={`${inputClass} dir-ltr font-mono`} />
      </Field>

      <Field label="نام و نام خانوادگی" htmlFor="fullName" required>
        <input id="fullName" name="fullName" type="text" required className={inputClass} />
      </Field>

      <Field
        label="کلمه عبور"
        htmlFor="password"
        required
        hint="حداقل ۱۰ نویسه؛ ترکیب حروف، ارقام و نمادها"
      >
        <input id="password" name="password" type="password" dir="ltr" required minLength={10} autoComplete="new-password" className={`${inputClass} dir-ltr font-mono`} />
      </Field>

      <Button type="submit" loading={pending} className="w-full">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        <span>ایجاد حساب مدیر و ورود</span>
      </Button>
    </form>
  );
}
