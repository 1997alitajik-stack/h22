'use client';

import { useActionState, useEffect } from 'react';
import { verifyEmploymentAction } from '@/app/actions/applicants';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import type { VerificationStatus } from '@/types';

interface Props {
  recordId: string;
  initialStatus: VerificationStatus | string;
  initialNotes: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Employment-verification review modal (ADMIN). Rejection requires a
 * documented reason — enforced by the DB function and surfaced here.
 */
export function VerificationModal({ recordId, initialStatus, initialNotes, onClose, onSaved }: Props) {
  const initial: { ok: boolean; error?: string } = { ok: false };
  const [state, formAction, pending] = useActionState(verifyEmploymentAction, initial);

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  const validInitial: 'VERIFIED' | 'PENDING' | 'REJECTED' =
    initialStatus === 'VERIFIED' || initialStatus === 'REJECTED'
      ? (initialStatus as 'VERIFIED' | 'REJECTED')
      : 'PENDING';

  return (
    <Modal open onClose={onClose} title="بررسی و استعلام سوابق همکاری در سازمان">
      <form action={formAction} className="space-y-4 text-xs">
        <input type="hidden" name="recordId" value={recordId} />

        {state.error && (
          <div role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 font-medium text-rose-700">
            {state.error}
          </div>
        )}

        <div className="rounded-[var(--radius-md)] border border-teal-100 bg-teal-50/60 p-3 text-[11px] leading-6 text-teal-950">
          <p className="font-bold">این وضعیت چه اثری دارد؟</p>
          <p>«تأیید رسمی» فقط زمانی انتخاب شود که سند یا پاسخ کارگزینی بررسی شده باشد. «در حال استعلام» یعنی نتیجه هنوز قطعی نیست. «رد سابقه» همراه با دلیل ثبت می‌شود و به‌عنوان سابقهٔ تأییدشده در اولویت سازمانی اثر ندارد.</p>
        </div>
        <Field label="نتیجه بررسی استعلام کارگزینی" htmlFor="status" required>
          <select id="status" name="status" defaultValue={validInitial} className={selectClass}>
            <option value="VERIFIED">تأیید رسمی سابقه همکاری در گروه (اعطای اولویت)</option>
            <option value="PENDING">در حال استعلام از شعبه / کارگزینی</option>
            <option value="REJECTED">رد سابقه (نیازمند ثبت دلیل)</option>
          </select>
        </Field>

        <Field
          label="توضیحات و مستند استعلام (شماره نامه کارگزینی، سوابق بیمه)"
          htmlFor="notes"
          hint="در صورت رد سابقه، ثبت دلیل الزامی است."
        >
          <textarea id="notes" name="notes" rows={3} defaultValue={initialNotes} className={inputClass} />
        </Field>

        <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
          <Button type="submit" loading={pending}>
            {pending ? 'در حال ثبت…' : 'ثبت نتیجه استعلام'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </form>
    </Modal>
  );
}
