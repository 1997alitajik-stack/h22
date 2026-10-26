import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, LifeBuoy } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getSupportTicket } from '@/server/support';
import { SupportTicketView } from './SupportTicketView';

export const metadata = { title: 'جزئیات تیکت پشتیبانی' };
export const dynamic = 'force-dynamic';

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('/support');
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const result = await getSupportTicket(user, id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8">
      <Link href="/support" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-teal-800">
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />بازگشت به پشتیبانی
      </Link>
      <div className="flex items-center gap-2 text-teal-800">
        <LifeBuoy className="h-5 w-5" aria-hidden />
        <span className="text-xs font-semibold">تیکت شماره {result.ticket.ticket_number}</span>
      </div>
      <SupportTicketView user={user} ticket={result.ticket} messages={result.messages} />
    </div>
  );
}
