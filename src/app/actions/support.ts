'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin, requireUser } from '@/lib/auth';
import { adminAudit, clientAudit } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  authenticatedSupportTicketSchema,
  publicSupportTicketSchema,
  publicSupportReplySchema,
  supportReplySchema,
  supportStatusSchema,
} from '@/lib/support-validation';

export interface SupportActionState {
  ok: boolean;
  error?: string;
  message?: string;
  ticketId?: string;
  ticketUrl?: string;
  ticketNumber?: number;
}

function firstError(error: { issues: { message: string }[] }, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

function actionError(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : '';
  if (raw.includes('UNAUTHENTICATED')) return 'برای ادامه دوباره وارد سامانه شوید.';
  if (raw.includes('FORBIDDEN')) return 'اجازه انجام این عملیات را ندارید.';
  if (raw.includes('RECORD_NOT_FOUND')) return 'تیکت موردنظر پیدا نشد یا به آن دسترسی ندارید.';
  if (raw.includes('INVALID_TICKET_LINK')) return 'پیوند پیگیری معتبر نیست؛ از پیوند دریافتی هنگام ثبت تیکت استفاده کنید.';
  if (raw.includes('RATE_LIMITED')) return 'برای این نشانی ایمیل در یک ساعت گذشته تعداد زیادی درخواست ثبت شده است؛ کمی بعد دوباره تلاش کنید.';
  if (raw.includes('INVALID_INPUT')) return 'اطلاعات واردشده معتبر نیست؛ فیلدها را بررسی کنید.';
  if (raw) console.error('[support-action] operation failed', { message: raw });
  return fallback;
}

export async function createSupportTicketAction(
  _prev: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const user = await requireUser('/support');
    const parsed = authenticatedSupportTicketSchema.safeParse({
      subject: formData.get('subject'),
      category: formData.get('category'),
      message: formData.get('message'),
      pagePath: formData.get('pagePath') ?? '/support',
    });
    if (!parsed.success) return { ok: false, error: firstError(parsed.error, 'اطلاعات تیکت معتبر نیست.') };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('create_support_ticket', {
      p_subject: parsed.data.subject,
      p_category: parsed.data.category,
      p_message: parsed.data.message,
      p_page_path: parsed.data.pagePath,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.ticket_id) throw new Error('پاسخ ثبت تیکت کامل نبود.');

    const auditOptions = {
      recordIdentifier: result.ticket_id,
      details: parsed.data.category + ' · ' + parsed.data.subject,
    };
    if (user.role === 'ADMIN') {
      await adminAudit(user, 'SUPPORT_TICKET', 'ثبت تیکت پشتیبانی', auditOptions);
    } else {
      await clientAudit(user, 'SUPPORT_TICKET', 'ثبت تیکت پشتیبانی', auditOptions);
    }
    revalidatePath('/support');
    return {
      ok: true,
      message: 'تیکت با موفقیت ثبت شد.',
      ticketId: result.ticket_id,
      ticketNumber: Number(result.ticket_number),
    };
  } catch (error) {
    return { ok: false, error: actionError(error, 'ثبت تیکت ناموفق بود.') };
  }
}

export async function replySupportTicketAction(
  _prev: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const user = await requireUser('/support');
    const parsed = supportReplySchema.safeParse({
      ticketId: formData.get('ticketId'),
      message: formData.get('message'),
    });
    if (!parsed.success) return { ok: false, error: firstError(parsed.error, 'پیام معتبر نیست.') };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('reply_support_ticket', {
      p_ticket_id: parsed.data.ticketId,
      p_message: parsed.data.message,
    });
    if (error) throw error;

    const auditOptions = { recordIdentifier: parsed.data.ticketId };
    if (user.role === 'ADMIN') {
      await adminAudit(user, 'SUPPORT_REPLY', 'ارسال پاسخ در تیکت پشتیبانی', auditOptions);
    } else {
      await clientAudit(user, 'SUPPORT_REPLY', 'ارسال پاسخ در تیکت پشتیبانی', auditOptions);
    }
    revalidatePath('/support');
    revalidatePath('/support/' + parsed.data.ticketId);
    return { ok: true, message: 'پاسخ شما ثبت شد.' };
  } catch (error) {
    return { ok: false, error: actionError(error, 'ارسال پاسخ ناموفق بود.') };
  }
}

export async function updateSupportTicketStatusAction(
  _prev: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const user = await requireAdmin('/support');
    const parsed = supportStatusSchema.safeParse({
      ticketId: formData.get('ticketId'),
      status: formData.get('status'),
    });
    if (!parsed.success) return { ok: false, error: firstError(parsed.error, 'وضعیت تیکت معتبر نیست.') };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('set_support_ticket_status', {
      p_ticket_id: parsed.data.ticketId,
      p_status: parsed.data.status,
    });
    if (error) throw error;

    await adminAudit(user, 'SUPPORT_STATUS', 'تغییر وضعیت تیکت پشتیبانی', {
      recordIdentifier: parsed.data.ticketId,
      details: parsed.data.status,
    });
    revalidatePath('/support');
    revalidatePath('/support/' + parsed.data.ticketId);
    return { ok: true, message: 'وضعیت تیکت به‌روزرسانی شد.' };
  } catch (error) {
    return { ok: false, error: actionError(error, 'تغییر وضعیت تیکت ناموفق بود.') };
  }
}

export async function createPublicSupportTicketAction(
  _prev: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const parsed = publicSupportTicketSchema.safeParse({
    requesterName: formData.get('requesterName'),
    requesterEmail: formData.get('requesterEmail'),
    subject: formData.get('subject'),
    category: formData.get('category'),
    message: formData.get('message'),
    pagePath: '/login',
    website: formData.get('website') ?? '',
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, 'اطلاعات درخواست پشتیبانی معتبر نیست.') };
  if (parsed.data.website.trim()) {
    return { ok: true, message: 'درخواست شما ثبت شد.' };
  }

  try {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('create_public_support_ticket', {
      p_requester_name: parsed.data.requesterName,
      p_requester_email: parsed.data.requesterEmail,
      p_subject: parsed.data.subject,
      p_category: parsed.data.category,
      p_message: parsed.data.message,
      p_page_path: parsed.data.pagePath,
      p_token_hash: tokenHash,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.ticket_id) throw new Error('پاسخ ثبت تیکت کامل نبود.');

    return {
      ok: true,
      message: 'درخواست پشتیبانی ثبت شد. این پیوند محرمانه را برای مشاهده پاسخ و ادامه گفت‌وگو نگه دارید.',
      ticketNumber: Number(result.ticket_number),
      ticketUrl: '/support-access?ticket=' + encodeURIComponent(result.ticket_id) + '&key=' + token,
    };
  } catch (error) {
    return { ok: false, error: actionError(error, 'ثبت درخواست پشتیبانی ناموفق بود.') };
  }
}

export async function replyPublicSupportTicketAction(
  _prev: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const parsed = publicSupportReplySchema.safeParse({
    ticketId: formData.get('ticketId'),
    token: formData.get('token'),
    message: formData.get('message'),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error, 'پیام یا پیوند پیگیری معتبر نیست.') };

  try {
    const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('reply_public_support_ticket', {
      p_ticket_id: parsed.data.ticketId,
      p_token_hash: tokenHash,
      p_message: parsed.data.message,
    });
    if (error) throw error;
    revalidatePath('/support-access');
    return { ok: true, message: 'پاسخ شما ثبت شد.' };
  } catch (error) {
    return { ok: false, error: actionError(error, 'ارسال پاسخ ناموفق بود.') };
  }
}
