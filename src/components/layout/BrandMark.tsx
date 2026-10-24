import { BrandLogo } from '@/components/ui/BrandLogo';

interface BrandMarkProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  className?: string;
  withText?: boolean;
}

/**
 * The official RASTA brand composition (vector logo + name + subtitle).
 * The original SVG from the supplied checkpoint is preserved unchanged.
 */
export function BrandMark({ size = 'md', theme = 'light', className = '', withText = true }: BrandMarkProps) {
  return (
    <BrandLogo size={size} withText={withText} layout="horizontal" theme={theme} className={className} />
  );
}
