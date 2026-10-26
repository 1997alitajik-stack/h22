import { z } from 'zod';

export const SUPPORT_CATEGORIES = ['ACCOUNT_ACCESS', 'BUG', 'DATA', 'HOW_TO', 'OTHER'] as const;
export const SUPPORT_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'] as const;

const category = z.enum(SUPPORT_CATEGORIES);
const status = z.enum(SUPPORT_STATUSES);

const subject = z.string().trim().min(3, 'موضوع باید حداقل ۳ نویسه باشد').max(160, 'موضوع حداکثر ۱۶۰ نویسه است');
const message = z.string().trim().min(1, 'متن پیام الزامی است').max(5000, 'متن پیام حداکثر ۵۰۰۰ نویسه است');

export const authenticatedSupportTicketSchema = z.object({
  subject,
  category,
  message: message.refine((value) => value.length >= 10, 'شرح مشکل باید حداقل ۱۰ نویسه باشد'),
  pagePath: z.string().trim().max(300).optional().default('/support'),
});

export const publicSupportTicketSchema = z.object({
  requesterName: z.string().trim().min(2, 'نام باید حداقل ۲ نویسه باشد').max(120),
  requesterEmail: z.string().trim().toLowerCase().email('نشانی ایمیل معتبر نیست').max(254),
  subject,
  category,
  message: message.refine((value) => value.length >= 10, 'شرح مشکل باید حداقل ۱۰ نویسه باشد'),
  pagePath: z.string().trim().max(300).optional().default('/login'),
  website: z.string().max(200).optional().default(''),
});

export const supportReplySchema = z.object({
  ticketId: z.string().uuid('شناسه تیکت معتبر نیست'),
  message,
});

export const publicSupportReplySchema = z.object({
  ticketId: z.string().uuid('شناسه تیکت معتبر نیست'),
  token: z.string().regex(/^[a-f0-9]{64}$/, 'پیوند پیگیری معتبر نیست'),
  message,
});

export const supportStatusSchema = z.object({
  ticketId: z.string().uuid('شناسه تیکت معتبر نیست'),
  status,
});

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
