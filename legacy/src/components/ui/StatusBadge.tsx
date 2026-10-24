import React from 'react';
import { RecruitmentStatus, VerificationStatus } from '../../types';

interface StatusBadgeProps {
  status: RecruitmentStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'NEW':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-blue-50 text-blue-700 border border-blue-200/70 ${sizeClasses}`}>
          جدید
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-amber-50 text-amber-800 border border-amber-200/70 ${sizeClasses}`}>
          در حال بررسی
        </span>
      );
    case 'INTERVIEWING':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 ${sizeClasses}`}>
          مرحله مصاحبه
        </span>
      );
    case 'SHORTLISTED':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-emerald-50 text-emerald-800 border border-emerald-200/70 ${sizeClasses}`}>
          فهرست نهایی
        </span>
      );
    case 'OFFERED':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-teal-50 text-teal-800 border border-teal-200/70 ${sizeClasses}`}>
          پیشنهاد شغلی
        </span>
      );
    case 'HIRED':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-emerald-100 text-emerald-900 border border-emerald-300 ${sizeClasses}`}>
          استخدام‌شده
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-rose-50 text-rose-700 border border-rose-200/70 ${sizeClasses}`}>
          عدم احراز
        </span>
      );
    case 'ARCHIVED':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}>
          بایگانی استخر
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center font-medium rounded bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};

export const VerificationStatusBadge: React.FC<{ status: VerificationStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${sizeClasses}`}>
          تأییدشده
        </span>
      );
    case 'PENDING':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses}`}>
          در انتظار استعلام
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center font-medium rounded bg-rose-50 text-rose-800 border border-rose-200/80 ${sizeClasses}`}>
          احراز نشد / رد
        </span>
      );
    case 'NOT_APPLICABLE':
    default:
      return (
        <span className={`inline-flex items-center font-medium rounded bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}>
          سایر (خارج از سازمان)
        </span>
      );
  }
};
