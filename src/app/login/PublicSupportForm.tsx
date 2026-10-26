'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { LifeBuoy, MessageCircle, X } from 'lucide-react';
import { createPublicSupportTicketAction, type SupportActionState } from '@/app/actions/support';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { SUPPORT_CATEGORY_LABELS } from '@/lib/support-labels';
import type { SupportCategory } from '@/lib/support-validation';

const initial: SupportActionState = { ok: false };
const categories = Object.entries(SUPPORT_CATEGORY_LABELS) as [SupportCategory, string][];

export function PublicSupportForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createPublicSupportTicketAction, initial);

  return (
    <section className="mt-4 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-right">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <LifeBuoy className="h-4 w-4 text-teal-700" aria-hidden />
          مشکل ورود دارید؟ با پشتیبانی تماس بگیرید
        </span>
        <span className="text-[11px] text-teal-800">{open ? 'بستن' : 'ثبت درخواست'}</span>
      </button>
      {!open && <p className="mt-2 text-[11px] leading-5 text-slate-500">حتی بدون ورود به سامانه می‌توانید مشکل را گزارش کنید و از طریق پیوند محرمانه، پاسخ را پیگیری کنید.</p>}

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {state.error && <p role="alert" className="mb-3 rounded-[var(--radius-md)] bg-rose-50 p-3 text-xs text-rose-800">{state.error}</p>}
          {state.ok && state.message && <p role="status" className="mb-3 rounded-[var(--radius-md)] bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">{state.message}</p>}
          {state.ticketUrl ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-800">شماره پیگیری: {state.ticketNumber}</p>
              <p className="text-[11px] leading-5 text-slate-600">پیوند زیر کلید دسترسی به گفت‌وگوی شماست. آن را کپی کنید و محرمانه نگه دارید؛ هرکس این پیوند را داشته باشد می‌تواند تیکت را مشاهده کند.</p>
              <Link href={state.ticketUrl} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />مشاهده و پیگیری تیکت
              </Link>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}><X className="h-3.5 w-3.5" aria-hidden />بستن</Button>
            </div>
          ) : (
            <form action={formAction} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="نام و نام خانوادگی" htmlFor="public-support-name" required>
                  <input id="public-support-name" name="requesterName" required minLength={2} maxLength={120} className={inputClass} autoComplete="name" />
                </Field>
                <Field label="ایمیل برای معرفی درخواست" htmlFor="public-support-email" required>
                  <input id="public-support-email" name="requesterEmail" type="email" required maxLength={254} dir="ltr" className={inputClass + ' text-left'} autoComplete="email" />
                </Field>
              </div>
              <Field label="موضوع درخواست" htmlFor="public-support-subject" required>
                <input id="public-support-subject" name="subject" required minLength={3} maxLength={160} className={inputClass} placeholder="مثلاً نمی‌توانم وارد سامانه شوم" />
              </Field>
              <Field label="دسته‌بندی" htmlFor="public-support-category" required>
                <select id="public-support-category" name="category" defaultValue="ACCOUNT_ACCESS" className={selectClass}>
                  {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="شرح مشکل" htmlFor="public-support-message" required hint="نشانی ایمیل شما برای پاسخ در پیوند پیگیری ثبت می‌شود؛ ارسال ایمیل خودکار در این نسخه فعال نیست.">
                <textarea id="public-support-message" name="message" required minLength={10} maxLength={5000} rows={4} className={inputClass} placeholder="پیام خطا و کاری را که انجام می‌دادید توضیح دهید." />
              </Field>
              <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="public-support-website">Website</label>
                <input id="public-support-website" name="website" autoComplete="off" tabIndex={-1} />
              </div>
              <Button type="submit" loading={pending} className="w-full">{pending ? 'در حال ثبت…' : 'ثبت درخواست پشتیبانی'}</Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
