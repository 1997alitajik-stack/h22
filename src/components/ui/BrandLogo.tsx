import Image from 'next/image';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  layout?: 'horizontal' | 'vertical';
  theme?: 'dark' | 'light';
  className?: string;
}

/** Uses the supplied official RASTA logo artwork. */
export function BrandLogo({
  size = 'md',
  withText = false,
  layout = 'horizontal',
  theme = 'light',
  className = '',
}: BrandLogoProps) {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16 sm:h-20 sm:w-20',
    xl: 'h-24 w-24 sm:h-28 sm:w-28',
  }[size];

  const logo = (
    <Image
      src="/rasta-logo.webp"
      alt="لوگوی رسمی سامانه راستا"
      width={160}
      height={198}
      priority={size === 'xl' || size === 'lg'}
      className={`shrink-0 ${withText ? (size === 'xl' ? 'h-40 w-auto sm:h-48' : size === 'lg' ? 'h-32 w-auto' : 'h-24 w-auto') : `rounded-sm object-cover object-top ${sizeClasses}`} ${className}`}
    />
  );

  if (!withText) return logo;

  const titleColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subtitleColor = theme === 'dark' ? 'text-teal-300/80' : 'text-teal-700';

  if (layout === 'vertical') {
    return (
      <div className="flex flex-col items-center text-center">
        {logo}
        <p className={`mt-2 text-xl font-extrabold tracking-tight sm:text-2xl ${titleColor}`}>راستا</p>
        <p className={`mt-1 text-xs font-medium leading-relaxed sm:text-sm ${subtitleColor}`}>
          راهکار ارزیابی سوابق، تخصص و استعدادها
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      {logo}
      <div className="min-w-0 text-right">
        <p className={`truncate text-base font-extrabold tracking-tight sm:text-lg ${titleColor}`}>راستا</p>
        <p className={`truncate text-[11px] font-medium sm:text-xs ${subtitleColor}`}>
          راهکار ارزیابی سوابق، تخصص و استعدادها
        </p>
      </div>
    </div>
  );
}
