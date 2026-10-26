'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { replySupportTicketAction, updateSupportTicketStatusAction, type SupportActionState } from '@/app/actions/support';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { SUPPORT_CATEGORY_LABELS, SUPPORT_STATUS_CLASSES, SUPPORT_STATUS_LABELS } from '@/lib/support-labels';
import type { SupportCategory, SupportStatus } from '@/lib/support-validation';
import type { SessionUser } from '@/types';
import type { SupportMessageRecord, SupportTicketRecord } from '@/server/support';

const initial: SupportActionState = { ok: false };
const statusOptions = Object.entries(SUPPORT_STATUS_LABELS) as [SupportStatus, string][];

export function SupportTicketView({ user, ticket, messages }: {
  user: SessionUser;
  ticket: SupportTicketRecord;
  messages: SupportMessageRecord[];
}) {
  const router = useRouter();
  const [replyState, replyAction, replyPending] = useActionState(replySupportTicketAction, initial);
  const [statusState, statusAction, statusPending] = useActionState(updateSupportTicketStatusAction, initial);

  useEffect(() => {
    if (replyState.ok || statusState.ok) router.refresh();
  }, [replyState, statusState, router]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 rounded-[var(--radius-lg)] border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-teal-800">{SUPPORT_CATEGORY_LABELS[ticket.category as SupportCategory]} · تیکت #{ticket.ticket_number}</p>
              <h1 className="mt-1 text-lg font-bold text-slate-900">{ticket.subject}</h1>
              <p className="mt-1 text-[11px] text-slate-500">ثبت‌کننده: {ticket.requester_name} · {ticket.requester_email}</p>
            </div>
            <span className={'rounded-[var(--radius-sm)] border px-2.5 py-1 text-[10px] font-semibold ' + SUPPORT_STATUS_CLASSES[ticket.status]}>
              {SUPPORT_STATUS_LABELS[ticket.status]}
            </span>
          </div>
          {ticket.page_path && <p className="mt-3 text-[10px] text-slate-400">بخش گزارش‌شده: <span dir="ltr">{ticket.page_path}</span></p>}
        </div>

        <div className="space-y-4 p-5">
          {messages.map((item) => {
            const staff = item.sender_type === 'ADMIN' || item.sender_type === 'SYSTEM';
            return (
              <article key={item.id} className={'max-w-[95%] rounded-[var(--radius-md)] border p-4 ' + (staff ? 'ml-auto border-teal-100 bg-teal-50/70' : 'mr-auto border-slate-200 bg-slate-50')}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    {staff && <ShieldCheck className="h-3.5 w-3.5 text-teal-700" aria-hidden />}
                    {item.sender_name}
                  </span>
                  <time className="shrink-0 text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString('fa-IR')}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-xs leading-7 text-slate-700">{item.body}</p>
              </article>
            );
          })}
          {messages.length === 0 && <p className="py-8 text-center text-xs text-slate-400">هنوز پیامی در این تیکت وجود ندارد.</p>}
        </div>

        <div className="border-t border-slate-100 p-5">
          {replyState.error && <p role="alert" className="mb-3 rounded-[var(--radius-md)] bg-rose-50 p-3 text-xs text-rose-800">{replyState.error}</p>}
          {replyState.ok && replyState.message && <p role="status" className="mb-3 rounded-[var(--radius-md)] bg-emerald-50 p-3 text-xs text-emerald-800">{replyState.message}</p>}
          <form action={replyAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Field label="پاسخ یا توضیحات تکمیلی" htmlFor="support-reply" required>
              <textarea id="support-reply" name="message" required maxLength={5000} rows={4} className={inputClass} placeholder="پیام خود را بنویسید…" />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={replyPending}><Send className="h-3.5 w-3.5" aria-hidden />ارسال پاسخ</Button>
            </div>
          </form>
        </div>
      </section>

      <aside className="h-fit space-y-4 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-teal-700" aria-hidden />
          <h2 className="text-sm font-bold text-slate-900">وضعیت درخواست</h2>
        </div>
        <p className="text-xs leading-6 text-slate-500">تیم پشتیبانی پاسخ‌ها را در همین گفت‌وگو ثبت می‌کند. پس از پاسخ پشتیبانی، وضعیت روی «در انتظار پاسخ شما» قرار می‌گیرد.</p>
        {user.role === 'ADMIN' ? (
          <form action={statusAction} className="space-y-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Field label="تغییر وضعیت تیکت" htmlFor="support-status">
              <select id="support-status" name="status" defaultValue={ticket.status} className={selectClass}>
                {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            {statusState.error && <p role="alert" className="text-xs text-rose-700">{statusState.error}</p>}
            {statusState.ok && statusState.message && <p role="status" className="text-xs text-emerald-700">{statusState.message}</p>}
            <Button type="submit" loading={statusPending} variant="secondary" className="w-full">ذخیره وضعیت</Button>
          </form>
        ) : (
          <div className="rounded-[var(--radius-md)] bg-slate-50 p-3">
            <p className="text-[10px] text-slate-500">وضعیت فعلی</p>
            <p className="mt-1 text-xs font-semibold text-slate-800">{SUPPORT_STATUS_LABELS[ticket.status]}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
