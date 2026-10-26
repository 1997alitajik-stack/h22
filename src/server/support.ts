import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SessionUser } from '@/types';
import type { SupportCategory, SupportStatus } from '@/lib/support-validation';

export interface SupportTicketRecord {
  id: string;
  ticket_number: number;
  created_by: string | null;
  requester_name: string;
  requester_email: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  page_path: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface SupportMessageRecord {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: 'USER' | 'ADMIN' | 'GUEST' | 'SYSTEM';
  sender_name: string;
  body: string;
  created_at: string;
}

const TICKET_COLUMNS =
  'id,ticket_number,created_by,requester_name,requester_email,subject,category,status,priority,page_path,assigned_to,created_at,updated_at,resolved_at';

export async function listSupportTickets(user: SessionUser): Promise<SupportTicketRecord[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('support_tickets').select(TICKET_COLUMNS).order('updated_at', { ascending: false }).limit(200);
  if (user.role !== 'ADMIN') query = query.eq('created_by', user.id);
  const { data, error } = await query;
  if (error) throw new Error('بارگذاری تیکت‌های پشتیبانی ناموفق بود: ' + error.message);
  return (data ?? []) as SupportTicketRecord[];
}

export async function getSupportTicket(
  user: SessionUser,
  ticketId: string,
): Promise<{ ticket: SupportTicketRecord; messages: SupportMessageRecord[] } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select(TICKET_COLUMNS)
    .eq('id', ticketId)
    .maybeSingle();
  if (error) throw new Error('بارگذاری تیکت پشتیبانی ناموفق بود: ' + error.message);
  if (!ticket) return null;

  const { data: messages, error: messagesError } = await supabase
    .from('support_messages')
    .select('id,ticket_id,sender_id,sender_type,sender_name,body,created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (messagesError) throw new Error('بارگذاری گفت‌وگوی پشتیبانی ناموفق بود: ' + messagesError.message);

  return {
    ticket: ticket as SupportTicketRecord,
    messages: (messages ?? []) as SupportMessageRecord[],
  };
}
