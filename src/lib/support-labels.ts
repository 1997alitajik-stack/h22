import type { SupportCategory, SupportStatus } from '@/lib/support-validation';

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  ACCOUNT_ACCESS: 'ورود و دسترسی',
  BUG: 'گزارش خطای سامانه',
  DATA: 'اطلاعات یا پرونده‌ها',
  HOW_TO: 'راهنمای استفاده',
  OTHER: 'سایر موارد',
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  OPEN: 'جدید',
  IN_PROGRESS: 'در حال بررسی',
  WAITING_USER: 'در انتظار پاسخ شما',
  RESOLVED: 'حل‌شده',
  CLOSED: 'بسته‌شده',
};

export const SUPPORT_STATUS_CLASSES: Record<SupportStatus, string> = {
  OPEN: 'border-sky-200 bg-sky-50 text-sky-800',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-800',
  WAITING_USER: 'border-violet-200 bg-violet-50 text-violet-800',
  RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CLOSED: 'border-slate-200 bg-slate-100 text-slate-600',
};
