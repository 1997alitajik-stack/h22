import Link from 'next/link';
import { LifeBuoy, Plus, TicketCheck } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { listSupportTickets } from '@/server/support';
import { SupportCenter } from './SupportCenter';

export const metadata = { title: 'پشتیبانی سامانه' };
export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const user = await requireUser('/support');
  const tickets = await listSupportTickets(user);
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-teal-800">
            <LifeBuoy className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold">مرکز راهنمایی و پیگیری</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">پشتیبانی سامانه</h1>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500">
            مشکل ورود، خطاهای سامانه یا پرسش درباره روند کار را ثبت کنید. پاسخ‌ها و پیگیری هر درخواست در همین بخش نگهداری می‌شود.
          </p>
        </div>
        <Link href="#create-ticket" className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent-strong)]">
          <Plus className="h-4 w-4" aria-hidden />ثبت تیکت جدید
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <section className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{user.role === 'ADMIN' ? 'همه درخواست‌های پشتیبانی' : 'درخواست‌های من'}</h2>
              <p className="mt-1 text-[11px] text-slate-500">برای مشاهده پاسخ‌ها و ادامه گفت‌وگو، تیکت را باز کنید.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{tickets.length}</span>
          </div>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <TicketCheck className="h-8 w-8 text-slate-300" aria-hidden />
              <p className="text-sm font-semibold text-slate-700">هنوز تیکتی ثبت نشده است.</p>
              <p className="text-xs text-slate-500">از فرم کنار صفحه برای ثبت نخستین درخواست استفاده کنید.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <Link key={ticket.id} href={'/support/' + ticket.id} className="block rounded-md px-2 py-4 transition-soft hover:bg-slate-50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-teal-800">تیکت #{ticket.ticket_number}</p>
                      <h3 className="mt-1 font-semibold text-slate-900">{ticket.subject}</h3>
                      {user.role === 'ADMIN' && <p className="mt-1 text-[11px] text-slate-500">{ticket.requester_name} · {ticket.requester_email}</p>}
                    </div>
                    <span className="shrink-0 rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">{ticket.status === 'OPEN' ? 'جدید' : ticket.status === 'IN_PROGRESS' ? 'در حال بررسی' : ticket.status === 'WAITING_USER' ? 'در انتظار پاسخ کاربر' : ticket.status === 'RESOLVED' ? 'حل‌شده' : 'بسته‌شده'}</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">آخرین به‌روزرسانی: {new Date(ticket.updated_at).toLocaleString('fa-IR')}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <SupportCenter />
      </div>
    </div>
  );
}
