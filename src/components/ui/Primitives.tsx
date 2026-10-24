import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/* ---------------------------------- Button --------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)] disabled:opacity-50 shadow-xs',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50',
};

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading = false, className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-xs font-semibold transition-soft ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function LinkButton({ href, variant = 'primary', children, className = '' }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-xs font-semibold transition-soft ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------- Inputs --------------------------------- */

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, hint, error, children, className = '' }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-700">
        {label}
        {required && (
          <span className="text-rose-500" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && (
        <p className="text-[11px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'w-full rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-soft';

export const selectClass =
  'w-full rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-soft';

/* ------------------------------ States & misc ------------------------------ */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-8 text-center"
    >
      <p className="text-sm font-medium text-rose-800">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          تلاش مجدد
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-md)] bg-slate-200/80 ${className}`} aria-hidden />;
}

/** Completeness meter — text + bar, never icon-only meaning. */
export function CompletenessMeter({ value }: { value: number }) {
  const tone = value >= 85 ? 'bg-emerald-600' : value >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2" title={`تکمیل پرونده: ${value} درصد`}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="num text-[11px] text-slate-500">{value}٪</span>
    </div>
  );
}
