'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addNoteAction } from '@/app/actions/applicants';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import { formatJalali } from '@/lib/persian';
import type { NoteRow } from '@/types';

const initial: { ok: boolean; error?: string } = { ok: false };

export function NotesSection({
  applicantId,
  notes,
  isAdmin,
}: {
  applicantId: string;
  notes: NoteRow[];
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(addNoteAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5 text-xs">
      {isAdmin ? (
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="applicantId" value={applicantId} />
          {state.error && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-2.5 font-medium text-rose-700">
              {state.error}
            </p>
          )}
          <Field
            label="یادداشت اداری جدید"
            htmlFor="note-content"
            hint="یادداشت محرمانه فقط برای مدیران سامانه قابل مشاهده است."
          >
            <textarea
              id="note-content"
              name="content"
              rows={3}
              maxLength={4000}
              required
              className={inputClass}
              placeholder="نظر مصاحبه‌کننده، نتیجه تماس یا یادداشت محرمانه…"
            />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="isConfidential"
                className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span className="font-medium text-slate-700">یادداشت محرمانه (فقط مدیران)</span>
            </label>
            <Button type="submit" loading={pending}>
              ثبت یادداشت
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-center text-slate-500">
          ثبت یادداشت جدید فقط برای مدیر سامانه امکان‌پذیر است.
        </p>
      )}

      <div className="space-y-3 border-t border-slate-100 pt-4">
        {notes.length === 0 ? (
          <p className="rounded-[var(--radius-md)] bg-slate-50 p-4 text-center text-slate-400">یادداشتی ثبت نشده است.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="space-y-1.5 rounded-[var(--radius-lg)] border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-800">
                  {note.author_name} ({note.author_role})
                  {note.is_confidential && (
                    <span className="mr-2 rounded-[var(--radius-sm)] border border-amber-200 bg-[var(--color-status-warning-bg)] px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      محرمانه
                    </span>
                  )}
                </span>
                <span className="num">{formatJalali(note.created_at, true)}</span>
              </div>
              <p className="leading-relaxed text-slate-800">{note.content}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
