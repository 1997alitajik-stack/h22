import { createHash } from 'node:crypto';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { GuestTicketView } from './GuestTicketView';

export const metadata = { title: 'پیگیری تیکت پشتیبانی', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PublicSupportAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string | string[]; key?: string | string[] }>;
}) {
  const params = await searchParams;
  const ticketId = Array.isArray(params.ticket) ? params.ticket[0] : params.ticket;
  const token = Array.isArray(params.key) ? params.key[0] : params.key;
  if (!ticketId || !/^[0-9a-fA-F-]{36}$/.test(ticketId) || !token || !/^[a-f0-9]{64}$/.test(token)) {
    return <InvalidTicketLink />;
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const admin = createSupabaseAdminClient();
  const { data: ticket, error } = await admin
    .from('support_tickets')
    .select('id,ticket_number,requester_name,requester_email,subject,category,status,created_at,updated_at,public_token_hash')
    .eq('id', ticketId)
    .eq('public_token_hash', tokenHash)
    .is('created_by', null)
    .maybeSingle();
  if (error || !ticket) return <InvalidTicketLink />;

  const { data: rows, error: messagesError } = await admin
    .from('support_messages')
    .select('id,sender_type,sender_name,body,created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (messagesError) return <InvalidTicketLink />;

  const safeTicket = {
    id: ticket.id as string,
    ticket_number: Number(ticket.ticket_number),
    requester_name: ticket.requester_name as string,
    requester_email: ticket.requester_email as string,
    subject: ticket.subject as string,
    category: ticket.category as 'ACCOUNT_ACCESS' | 'BUG' | 'DATA' | 'HOW_TO' | 'OTHER',
    status: ticket.status as 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED',
    created_at: ticket.created_at as string,
    updated_at: ticket.updated_at as string,
  };
  const safeMessages = (rows ?? []).map((row) => ({
    id: row.id as string,
    sender_type: row.sender_type as 'ADMIN' | 'GUEST' | 'SYSTEM' | 'USER',
    sender_name: row.sender_name as string,
    body: row.body as string,
    created_at: row.created_at as string,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-teal-800">مرکز پشتیبانی راستا</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">پیگیری درخواست شما</h1>
          </div>
          <Link href="/login" className="text-xs font-medium text-teal-800 hover:underline">بازگشت به ورود</Link>
        </div>
        <GuestTicketView ticket={safeTicket} messages={safeMessages} token={token} />
      </div>
    </main>
  );
}

function InvalidTicketLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg rounded-[var(--radius-lg)] border border-slate-200 bg-white p-7 text-center">
        <h1 className="text-base font-bold text-slate-900">پیوند پیگیری معتبر نیست</h1>
        <p className="mt-2 text-xs leading-6 text-slate-600">لطفاً از همان پیوند محرمانه‌ای استفاده کنید که پس از ثبت درخواست پشتیبانی دریافت کردید.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-[var(--radius-md)] bg-teal-700 px-4 py-2 text-xs font-semibold text-white">بازگشت به ورود</Link>
      </div>
    </main>
  );
}
