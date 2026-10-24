'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/** Accessible modal: focus capture, Escape to close, labelled dialog. */
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full ${widths[size]} max-h-[90vh] overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-soft"
          >
            <X className="h-4.5 w-4.5" aria-hidden />
          </button>
        </div>
        <div className="max-h-[calc(90vh-56px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation only for consequential/destructive choices. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      <div className="mt-5 flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-xs font-semibold text-white transition-soft disabled:opacity-50 ${
            variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)]'
          }`}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--radius-md)] px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-soft"
        >
          انصراف
        </button>
      </div>
    </Modal>
  );
}
