import { describe, expect, it } from 'vitest';
import {
  authenticatedSupportTicketSchema,
  publicSupportTicketSchema,
  publicSupportReplySchema,
} from '@/lib/support-validation';

describe('support ticket validation', () => {
  it('accepts a complete authenticated support request', () => {
    const result = authenticatedSupportTicketSchema.safeParse({
      category: 'BUG',
      subject: 'مرحله ارزیابی ذخیره نمی‌شود',
      message: 'پس از انتخاب مرحله و کلیک روی ثبت هیچ تغییری ذخیره نمی‌شود.',
      pagePath: '/vacancies/example',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed public email and a too-short problem description', () => {
    const payload = {
      requesterName: 'کاربر آزمایشی',
      requesterEmail: 'not-an-email',
      category: 'ACCOUNT_ACCESS',
      subject: 'مشکل ورود',
      message: 'خراب',
      website: '',
    };
    expect(publicSupportTicketSchema.safeParse(payload).success).toBe(false);
  });

  it('requires an opaque 64-character token for guest ticket replies', () => {
    const ticketId = crypto.randomUUID();
    expect(publicSupportReplySchema.safeParse({
      ticketId,
      token: 'a'.repeat(64),
      message: 'توضیح تکمیلی برای پیگیری درخواست.',
    }).success).toBe(true);
    expect(publicSupportReplySchema.safeParse({
      ticketId,
      token: 'not-a-token',
      message: 'توضیح تکمیلی برای پیگیری درخواست.',
    }).success).toBe(false);
  });

  it('does not allow a public request to exceed the message limit', () => {
    const result = publicSupportTicketSchema.safeParse({
      requesterName: 'کاربر آزمایشی',
      requesterEmail: 'person@example.org',
      category: 'BUG',
      subject: 'گزارش خطای سامانه',
      message: 'x'.repeat(5001),
      website: '',
    });
    expect(result.success).toBe(false);
  });
});
