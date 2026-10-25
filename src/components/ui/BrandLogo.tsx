import Image from 'next/image';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  layout?: 'horizontal' | 'vertical';
  theme?: 'dark' | 'light';
  className?: string;
}

/** Official RASTA artwork. The full asset already contains its Persian lettering. */
export function BrandLogo({
  size = 'md',
  withText = false,
  layout = 'horizontal',
  theme = 'light',
  className = '',
}: BrandLogoProps) {
  const markSize = {
    xs: 'h-6 w-6',
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16 sm:h-20 sm:w-20',
    xl: 'h-24 w-24 sm:h-28 sm:w-28',
  }[size];

  const fullSize = {
    xs: 'w-10',
    sm: 'w-14',
    md: 'w-20',
    lg: 'w-28',
    xl: 'w-36 sm:w-44',
  }[size];

  if (withText) {
    const fullLogo = (
      <div
        className={`rasta-logo-full-stage ${fullSize} ${theme === 'dark' ? 'drop-shadow-lg' : 'drop-shadow-sm'}`}
        role="img"
        aria-label="موسسه ارزیابی راستا"
      >
        <div className="rasta-logo-rotor">
          <Image
            src="/rasta-logo.webp"
            alt=""
            width={160}
            height={198}
            priority={size === 'xl' || size === 'lg'}
            className="block h-auto w-full select-none"
          />
        </div>
      </div>
    );

    return layout === 'vertical'
      ? <div className={`flex flex-col items-center text-center ${className}`}>{fullLogo}</div>
      : <div className={`flex items-center ${className}`}>{fullLogo}</div>;
  }

  return (
    <div
      className={`rasta-logo-mark-stage relative inline-flex shrink-0 items-center justify-center overflow-hidden ${markSize} ${className}`}
      role="img"
      aria-label="نشان موسسه ارزیابی راستا"
    >
      <div className="rasta-logo-rotor absolute inset-0">
        <Image
          src="/rasta-emblem.webp"
          alt=""
          width={160}
          height={160}
          className="block h-full w-full select-none object-contain"
        />
      </div>
    </div>
  );
}
