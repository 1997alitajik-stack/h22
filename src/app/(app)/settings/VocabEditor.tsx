'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { updateVocabularyAction } from '@/app/actions/admin';
import { Button, inputClass } from '@/components/ui/Primitives';
import { useServerAction } from '@/lib/useServerAction';
import { toPersianDigits } from '@/lib/persian';

const initial: { ok: boolean; error?: string; message?: string } = { ok: false };

export function VocabEditor({
  title,
  icon,
  vocabKey,
  values,
  isAdmin,
  addLabel,
  placeholder,
}: {
  title: string;
  icon: React.ReactNode;
  vocabKey: 'cities' | 'job_categories';
  values: string[];
  isAdmin: boolean;
  addLabel: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useServerAction(updateVocabularyAction, initial);
  const addFormRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');

  function handleAddAction(formData: FormData) {
    formAction(formData);
    addFormRef.current?.reset();
    setError('');
    router.refresh();
  }

  async function remove(value: string) {
    setError('');
    const fd = new FormData();
    fd.set('key', vocabKey);
    fd.set('action', 'remove');
    fd.set('value', value);
    const result = await updateVocabularyAction(initial, fd);
    if (!result.ok) setError(result.error ?? 'خطا در حذف مقدار');
    else router.refresh();
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
        {icon}
        {title} ({toPersianDigits(values.length)})
      </h2>

      {isAdmin && (
        <form ref={addFormRef} action={handleAddAction} className="flex items-center gap-2">
          <input type="hidden" name="key" value={vocabKey} />
          <input type="hidden" name="action" value="add" />
          <input
            name="value"
            required
            maxLength={150}
            placeholder={placeholder}
            className={inputClass}
            aria-label={title}
          />
          <Button type="submit" loading={pending} className="shrink-0">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {addLabel}
          </Button>
        </form>
      )}

      {(state.error || error) && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-2.5 font-medium text-rose-700">
          {error || state.error}
        </p>
      )}

      {vocabKey === 'cities' ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-800"
            >
              {value}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => remove(value)}
                  className="text-slate-400 transition-soft hover:text-rose-600"
                  aria-label={`حذف ${value}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              )}
            </span>
          ))}
          {values.length === 0 && <p className="text-slate-400">موردی ثبت نشده است.</p>}
        </div>
      ) : (
        <ul className="max-h-60 space-y-1.5 overflow-y-auto pl-1">
          {values.map((value) => (
            <li key={value} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-slate-100 bg-slate-50 p-2">
              <span className="font-medium text-slate-800">{value}</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => remove(value)}
                  className="p-1 text-slate-400 transition-soft hover:text-rose-600"
                  aria-label={`حذف ${value}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {values.length === 0 && <li className="text-slate-400">موردی ثبت نشده است.</li>}
        </ul>
      )}
    </section>
  );
}
