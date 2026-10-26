'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ShieldCheck } from 'lucide-react';
import { replyPublicSupportTicketAction, type SupportActionState } from '@/app/actions/support';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import { SUPPORT_CATEGORY_LABELS, SUPPORT_STATUS_CLASSES, SUPPORT_STATUS_LABELS } from '@/lib/support-labels';
import type { SupportCategory, SupportStatus } from '@/lib/support-validation';

const initial: SupportActionState = { ok: false };

interface GuestTicket {
  id: string;
  ticket_number: number;
  requester_name: string;
  requester_email: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
}
interface GuestMessage {
  id: string;
  sender_type: 'ADMIN' | 'GUEST' | 'SYSTEM' | 'USER';
  sender_name: string;
  body: string;
  created_at: string;
}

export function GuestTicketView({ ticket, messages, token }: {
  ticket: GuestTicket;
  messages: GuestMessage[];
  token: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(replyPublicSupportTicketAction, initial);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold text-teal-800">{SUPPORT_CATEGORY_LABELS[ticket.category]} · شماره {ticket.ticket_number}</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{ticket.subject}</h2>
            <p className="mt-1 text-[11px] text-slate-500">{ticket.requester_name} · {ticket.requester_email}</p>
          </div>
          <span className={'rounded-[var(--radius-sm)] border px-2.5 py-1 text-[10px] font-semibold ' + SUPPORT_STATUS_CLASSES[ticket.status]}>{SUPPORT_STATUS_LABELS[ticket.status]}</span>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">این پیوند محرمانه است و نقش کلید دسترسی به گفت‌وگوی تیکت را دارد. آن را در اختیار دیگران نگذارید.</p>
      </header>

      <div className="space-y-4 p-5 sm:p-6">
        {messages.map((item) => {
          const staff = item.sender_type === 'ADMIN' || item.sender_type === 'SYSTEM';
          return (
            <article key={item.id} className={'max-w-[95%] rounded-[var(--radius-md)] border p-4 ' + (staff ? 'ml-auto border-teal-100 bg-teal-50/70' : 'mr-auto border-slate-200 bg-slate-50')}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  {staff && <ShieldCheck className="h-3.5 w-3.5 text-teal-700" aria-hidden />}
                  {item.sender_name}
                </span>
                <time className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString('fa-IR')}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-xs leading-7 text-slate-700">{item.body}</p>
            </article>
          );
        })}
        {messages.length === 0 && <p className="py-6 text-center text-xs text-slate-400">هنوز پیامی ثبت نشده است.</p>}
      </div>

      <div className="border-t border-slate-100 p-5 sm:p-6">
        <h3 className="mb-3 text-sm font-bold text-slate-900">ارسال پیام تکمیلی</h3>
        {state.error && <p role="alert" className="mb-3 rounded-[var(--radius-md)] bg-rose-50 p-3 text-xs text-rose-800">{state.error}</p>}
        {state.ok && state.message && <p role="status" className="mb-3 rounded-[var(--radius-md)] bg-emerald-50 p-3 text-xs text-emerald-800">{state.message}</p>}
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <input type="hidden" name="token" value={token} />
          <Field label="پیام شما" htmlFor="guest-support-reply" required>
            <textarea id="guest-support-reply" name="message" required maxLength={5000} rows={4} className={inputClass} placeholder="پاسخ یا توضیحات تکمیلی را بنویسید…" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}><Send className="h-3.5 w-3.5" aria-hidden />ارسال پیام</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
