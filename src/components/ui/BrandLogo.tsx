import Image from 'next/image';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  layout?: 'horizontal' | 'vertical';
  theme?: 'dark' | 'light';
  className?: string;
}

const LOGO_WIDTH = 330;
const LOGO_HEIGHT = 419;

/** Layered HERA artwork with a real CSS 3D extrusion effect while rotating. */
function ThreeDimensionalLogo({ depth, priority = false }: { depth: number; priority?: boolean }) {
  return (
    <div className="rasta-logo-rotor">
      {Array.from({ length: depth }, (_, index) => {
        const layer = index + 1;
        const brightness = 0.42 + (1 - index / Math.max(depth - 1, 1)) * 0.2;
        return (
          <span
            key={layer}
            aria-hidden="true"
            className="rasta-logo-extrusion"
            style={{
              transform: `translateZ(-${layer}px)`,
              filter: `brightness(${brightness.toFixed(2)}) saturate(1.18)`,
            }}
          />
        );
      })}

      <Image
        src="/rasta-logo.webp"
        alt=""
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority={priority}
        draggable={false}
        className="rasta-logo-face rasta-logo-front"
        style={{ transform: 'translateZ(1px)' }}
      />

      <Image
        src="/rasta-logo.webp"
        alt=""
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        draggable={false}
        className="rasta-logo-face rasta-logo-back"
        style={{ transform: `rotateY(180deg) translateZ(${depth + 1}px) scaleX(-1)` }}
      />
    </div>
  );
}

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
        aria-label="مؤسسه حرا"
      >
        <ThreeDimensionalLogo depth={12} priority={size === 'xl' || size === 'lg'} />
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
      aria-label="نشان مؤسسه حرا"
    >
      <ThreeDimensionalLogo depth={5} />
    </div>
  );
}
