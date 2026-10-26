'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { createSupportTicketAction, type SupportActionState } from '@/app/actions/support';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { SUPPORT_CATEGORY_LABELS } from '@/lib/support-labels';
import type { SupportCategory } from '@/lib/support-validation';

const initial: SupportActionState = { ok: false };
const categories = Object.entries(SUPPORT_CATEGORY_LABELS) as [SupportCategory, string][];

export function SupportCenter() {
  const [state, formAction, pending] = useActionState(createSupportTicketAction, initial);

  return (
    <section id="create-ticket" className="h-fit rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <LifeBuoy className="h-4 w-4 text-teal-700" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-slate-900">ثبت درخواست جدید</h2>
          <p className="mt-1 text-[11px] text-slate-500">موضوع را توضیح دهید تا تیم پشتیبانی بررسی کند.</p>
        </div>
      </div>

      {state.error && <p role="alert" className="mb-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{state.error}</p>}
      {state.ok && state.message && <p role="status" className="mb-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">{state.message}</p>}
      {state.ok && state.ticketId && (
        <Link className="mb-4 block rounded-[var(--radius-md)] bg-teal-50 p-3 text-xs font-semibold text-teal-900 hover:bg-teal-100" href={'/support/' + state.ticketId}>
          مشاهده تیکت شماره {state.ticketNumber}
        </Link>
      )}

      <form action={formAction} className="space-y-4">
        <Field label="دسته‌بندی درخواست" htmlFor="support-category" required>
          <select id="support-category" name="category" defaultValue="BUG" className={selectClass}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="موضوع کوتاه" htmlFor="support-subject" required>
          <input id="support-subject" name="subject" required minLength={3} maxLength={160} className={inputClass} placeholder="مثلاً ذخیره مرحله ارزیابی انجام نمی‌شود" />
        </Field>
        <Field label="شرح مشکل یا پرسش" htmlFor="support-message" required hint="اگر خطایی نمایش داده شده، متن آن و کاری را که قبل از خطا انجام دادید بنویسید.">
          <textarea id="support-message" name="message" required minLength={10} maxLength={5000} rows={5} className={inputClass} placeholder="چه اتفاقی افتاد و انتظار داشتید چه اتفاقی بیفتد؟" />
        </Field>
        <input type="hidden" name="pagePath" value="/support" />
        <Button type="submit" loading={pending} className="w-full">{pending ? 'در حال ثبت…' : 'ثبت تیکت پشتیبانی'}</Button>
      </form>
    </section>
  );
}
