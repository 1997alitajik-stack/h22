'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from '@/app/actions/auth';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import { LogIn } from 'lucide-react';

const initialState: ActionState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-4" noValidate>
      {state.error && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 text-xs font-medium text-rose-700">
          {state.error}
        </div>
      )}

      <Field label="نشانی ایمیل سازمانی" htmlFor="email" required>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          required
          className={`${inputClass} dir-ltr font-mono`}
          placeholder="name@org.ir"
        />
      </Field>

      <Field label="کلمه عبور" htmlFor="password" required>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          required
          className={`${inputClass} dir-ltr font-mono`}
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" loading={pending} className="w-full">
        <LogIn className="h-4 w-4" aria-hidden />
        <span>{pending ? 'در حال تأیید ورود…' : 'ورود به سامانه'}</span>
      </Button>
    </form>
  );
}
