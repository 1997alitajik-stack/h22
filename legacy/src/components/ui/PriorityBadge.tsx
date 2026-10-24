import React from 'react';
import { GroupEmploymentPriority } from '../../types';
import { Building2, Layers, Clock, MinusCircle, HelpCircle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: GroupEmploymentPriority;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  switch (priority) {
    case 'VERIFIED_PARENT':
      return (
        <span
          className={`inline-flex items-center font-medium rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${sizeClasses}`}
          title="دارای سابقه همکاری رسمی تأییدشده در ستاد سازمان مادر (اولویت استخدام عالی)"
        >
          {showIcon && <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          <span>سابقه تأییدشده در سازمان مادر</span>
        </span>
      );

    case 'VERIFIED_SUBSIDIARY':
      return (
        <span
          className={`inline-flex items-center font-medium rounded bg-teal-50 text-teal-800 border border-teal-200/80 ${sizeClasses}`}
          title="دارای سابقه همکاری رسمی تأییدشده در یکی از شرکت‌های تابعه سازمان"
        >
          {showIcon && <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
          <span>سابقه تأییدشده در شرکت زیرمجموعه</span>
        </span>
      );

    case 'PENDING_VERIFICATION':
      return (
        <span
          className={`inline-flex items-center font-medium rounded bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses}`}
          title="سوابق همکاری در سازمان یا زیرمجموعه اعلام شده و در انتظار استعلام و تأیید کارگزینی است"
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span>سابقه در انتظار تأیید</span>
        </span>
      );

    case 'NO_GROUP_HISTORY':
      return (
        <span
          className={`inline-flex items-center font-medium rounded bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
          title="فاقد سابقه قبلی در سازمان یا شرکت‌های تابعه (دارای سوابق آزاد)"
        >
          {showIcon && <MinusCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          <span>فاقد سابقه در مجموعه</span>
        </span>
      );

    case 'INSUFFICIENT_DATA':
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded bg-rose-50 text-rose-800 border border-rose-200/80 ${sizeClasses}`}
          title="اطلاعات سوابق یا مدارک برای احراز اولویت سازمانی ناقص است"
        >
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
          <span>اطلاعات ناکافی</span>
        </span>
      );
  }
};
