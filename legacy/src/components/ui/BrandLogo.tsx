import React, { useId } from 'react';

export interface BrandLogoProps {
  /**
   * 'xs': 24x24 px (TopBar, badges, breadcrumbs)
   * 'sm': 36x36 px (Sidebar, compact headers)
   * 'md': 48x48 px (Page headers, cards, dialogs)
   * 'lg': 68x68 px (Dashboard hero, report banners)
   * 'xl': 96x96 px (Login screen prominent display)
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether to include the official Persian product name and subtitle
   */
  withText?: boolean;
  /**
   * Layout when text is enabled:
   * 'horizontal' (logo + text side-by-side)
   * 'vertical' (logo centered above text)
   * 'compact' (logo + bold title, small subtitle)
   */
  layout?: 'horizontal' | 'vertical' | 'compact';
  /**
   * Light or dark text mode (for dark sidebar / login or white page headers)
   */
  theme?: 'dark' | 'light';
  /**
   * Optional gentle hover lift or subtle rotation
   */
  animate?: boolean;
  durationSeconds?: number;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  withText = false,
  layout = 'horizontal',
  theme = 'light',
  animate = false,
  className = '',
}) => {
  const reactId = useId().replace(/:/g, '');

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    xl: 'w-24 h-24 sm:w-28 sm:h-28',
  };

  const svgContent = (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${
        animate ? 'transition-transform duration-300 hover:scale-105' : ''
      }`}
      aria-label="نشان رسمی سامانه راستا"
      role="img"
    >
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full select-none drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
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

        {/* Base emblem container (rounded squircle) */}
        <rect
          x="25"
          y="25"
          width="450"
          height="450"
          rx="90"
          fill={`url(#bg-${reactId})`}
          stroke="#1e293b"
          strokeWidth="4"
          filter={`url(#shadow-${reactId})`}
        />

        {/* Outer dynamic orbit ring (Symbol of continuous evaluation & growth) */}
        <circle
          cx="250"
          cy="250"
          r="185"
          fill="none"
          stroke={`url(#glow-${reactId})`}
          strokeWidth="3"
          strokeDasharray="14 8"
          opacity="0.6"
        />
        <circle cx="250" cy="250" r="165" fill="none" stroke="#0d9488" strokeWidth="1.5" opacity="0.4" />

        {/* Central Motif: Architectural Persian Pathway & Ascending RASTA Geometric Monogram */}
        {/* Left ascending dynamic wing (Capability & Talent) */}
        <path
          d="M 155 350 L 155 210 Q 155 140 220 120 L 220 185 Q 195 198 195 240 L 195 350 Z"
          fill={`url(#teal-${reactId})`}
          filter={`url(#shadow-${reactId})`}
        />

        {/* Right ascending symmetric dynamic wing (Experience & Career Path) */}
        <path
          d="M 345 350 L 345 210 Q 345 140 280 120 L 280 185 Q 305 198 305 240 L 305 350 Z"
          fill={`url(#emerald-${reactId})`}
          filter={`url(#shadow-${reactId})`}
        />

        {/* Center vertical pillar & trajectory (True North / Straight Path - راستا) */}
        <path d="M 235 365 L 265 365 L 265 195 L 235 195 Z" fill={`url(#teal-${reactId})`} opacity="0.95" />

        {/* Golden Beacon Diamond (The guiding apex of talent assessment) */}
        <polygon
          points="250,90 280,135 250,180 220,135"
          fill={`url(#gold-${reactId})`}
          filter={`url(#shadow-${reactId})`}
        />

        {/* Internal core focal ring */}
        <circle cx="250" cy="135" r="14" fill="#ffffff" opacity="0.95" />
        <circle cx="250" cy="135" r="7" fill="#b45309" />

        {/* Bottom Horizontal Stabilizer Bar with precision nodes */}
        <rect x="135" y="345" width="230" height="14" rx="7" fill="#0f766e" />
        <circle cx="155" cy="352" r="5" fill="#5eead4" />
        <circle cx="250" cy="352" r="6" fill="#fbbf24" />
        <circle cx="345" cy="352" r="5" fill="#34d399" />

        {/* Micro constellation nodes symbolizing connected holding entities & subsidiaries */}
        <circle cx="120" cy="220" r="4" fill="#14b8a6" opacity="0.85" />
        <circle cx="380" cy="220" r="4" fill="#10b981" opacity="0.85" />
        <circle cx="250" cy="60" r="4.5" fill="#fbbf24" opacity="0.9" />
      </svg>
    </div>
  );

  if (!withText) {
    return <div className={`inline-flex shrink-0 ${className}`}>{svgContent}</div>;
  }

  const isDark = theme === 'dark';
  const titleColor = isDark ? 'text-white' : 'text-slate-900';
  const subtitleColor = isDark ? 'text-teal-300/80' : 'text-teal-700';

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {svgContent}
        <h1 className={`mt-3 font-extrabold text-2xl sm:text-3xl ${titleColor} tracking-tight`}>
          راستا
        </h1>
        <p className={`mt-1.5 text-xs sm:text-sm font-medium ${subtitleColor} leading-relaxed`}>
          راهکار ارزیابی سوابق، تخصص و استعدادها
        </p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      {svgContent}
      <div className="min-w-0 text-right">
        <h1 className={`font-extrabold text-base sm:text-lg ${titleColor} tracking-tight truncate`}>
          راستا
        </h1>
        <p className={`text-[11px] sm:text-xs font-medium ${subtitleColor} truncate`}>
          راهکار ارزیابی سوابق، تخصص و استعدادها
        </p>
      </div>
    </div>
  );
};
