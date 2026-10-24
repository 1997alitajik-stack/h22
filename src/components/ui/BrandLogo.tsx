'use client';

import { useId } from 'react';

export interface BrandLogoProps {
  /**
   * 'xs': 24px (top bar) · 'sm': 36px (sidebar) · 'md': 48px (page headers)
   * 'lg': 68px (hero) · 'xl': 96px (login)
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  layout?: 'horizontal' | 'vertical';
  theme?: 'dark' | 'light';
  className?: string;
}

/**
 * The official RASTA emblem — original vector from the supplied checkpoint,
 * preserved unchanged (mission §6.7: do not redraw or substitute the logo).
 */
export function BrandLogo({
  size = 'md',
  withText = false,
  layout = 'horizontal',
  theme = 'light',
  className = '',
}: BrandLogoProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16 sm:h-20 sm:w-20',
    xl: 'h-24 w-24 sm:h-28 sm:w-28',
  }[size];

  const emblem = (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${sizeClasses} ${className}`} role="img" aria-label="نشان رسمی سامانه راستا">
      <svg viewBox="0 0 500 500" className="h-full w-full select-none drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id={`bg-${reactId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#040711" />
          </linearGradient>
          <linearGradient id={`teal-${reactId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="40%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#115e59" />
          </linearGradient>
          <linearGradient id={`emerald-${reactId}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="60%" stopColor="#059669" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id={`gold-${reactId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id={`glow-${reactId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
          </linearGradient>
          <filter id={`shadow-${reactId}`} x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        <rect x="25" y="25" width="450" height="450" rx="90" fill={`url(#bg-${reactId})`} stroke="#1e293b" strokeWidth="4" filter={`url(#shadow-${reactId})`} />
        <circle cx="250" cy="250" r="185" fill="none" stroke={`url(#glow-${reactId})`} strokeWidth="3" strokeDasharray="14 8" opacity="0.6" />
        <circle cx="250" cy="250" r="165" fill="none" stroke="#0d9488" strokeWidth="1.5" opacity="0.4" />
        <path d="M 155 350 L 155 210 Q 155 140 220 120 L 220 185 Q 195 198 195 240 L 195 350 Z" fill={`url(#teal-${reactId})`} filter={`url(#shadow-${reactId})`} />
        <path d="M 345 350 L 345 210 Q 345 140 280 120 L 280 185 Q 305 198 305 240 L 305 350 Z" fill={`url(#emerald-${reactId})`} filter={`url(#shadow-${reactId})`} />
        <path d="M 235 365 L 265 365 L 265 195 L 235 195 Z" fill={`url(#teal-${reactId})`} opacity="0.95" />
        <polygon points="250,90 280,135 250,180 220,135" fill={`url(#gold-${reactId})`} filter={`url(#shadow-${reactId})`} />
        <circle cx="250" cy="135" r="14" fill="#ffffff" opacity="0.95" />
        <circle cx="250" cy="135" r="7" fill="#b45309" />
        <rect x="135" y="345" width="230" height="14" rx="7" fill="#0f766e" />
        <circle cx="155" cy="352" r="5" fill="#5eead4" />
        <circle cx="250" cy="352" r="6" fill="#fbbf24" />
        <circle cx="345" cy="352" r="5" fill="#34d399" />
        <circle cx="120" cy="220" r="4" fill="#14b8a6" opacity="0.85" />
        <circle cx="380" cy="220" r="4" fill="#10b981" opacity="0.85" />
        <circle cx="250" cy="60" r="4.5" fill="#fbbf24" opacity="0.9" />
      </svg>
    </div>
  );

  if (!withText) return emblem;

  const titleColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subtitleColor = theme === 'dark' ? 'text-teal-300/80' : 'text-teal-700';

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {emblem}
        <p className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl ${titleColor}`}>راستا</p>
        <p className={`mt-1.5 text-xs font-medium leading-relaxed sm:text-sm ${subtitleColor}`}>
          راهکار ارزیابی سوابق، تخصص و استعدادها
        </p>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {emblem}
      <div className="min-w-0 text-right">
        <p className={`truncate text-base font-extrabold tracking-tight sm:text-lg ${titleColor}`}>راستا</p>
        <p className={`truncate text-[11px] font-medium sm:text-xs ${subtitleColor}`}>
          راهکار ارزیابی سوابق، تخصص و استعدادها
        </p>
      </div>
    </div>
  );
}
