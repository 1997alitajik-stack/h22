'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore } from 'lucide-react';
import { archiveVacancyAction } from '@/app/actions/admin';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import { useServerAction } from '@/lib/useServerAction';

const initial = { ok: false } as { ok: boolean; error?: string; message?: string };

export function VacancyArchiveControl({vacancyId,archived,archiveReason,compact=false}:{vacancyId:string;archived:boolean;archiveReason?:string|null;compact?:boolean;}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, , pending, submit] = useServerAction(archiveVacancyAction, initial);

  async function restore() {
    const data = new FormData();
    data.set('vacancyId', vacancyId);
    data.set('action', 'RESTORE');
    data.set('reason', '');
    const result = await submit(data);
    if (result.ok) router.refresh();
  }

  async function archive(formData: FormData) {
    const result = await submit(formData);
    if (result.ok) { setOpen(false); router.refresh(); }
  }

  return (
    <div className="space-y-2">
      {archived ? (
        <Button type="button" variant="secondary" className={compact ? 'px-2 py-1.5 text-[11px]' : ''} onClick={() => void restore()} loading={pending}>
          <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />بازگردانی از بایگانی
        </Button>
      ) : (
        <Button type="button" variant="ghost" className={'text-amber-800 hover:bg-amber-50 ' + (compact ? 'px-2 py-1.5 text-[11px]' : '')} onClick={() => setOpen(true)}>
          <Archive className="h-3.5 w-3.5" aria-hidden />بایگانی فرصت
        </Button>
      )}
      {state.error && <p role="alert" className="text-[11px] leading-5 text-rose-700">{state.error}</p>}
      {state.message && <p role="status" className="text-[11px] leading-5 text-emerald-700">{state.message}</p>}
      {open && (
        <Modal open onClose={() => setOpen(false)} title="بایگانی فرصت شغلی">
          <form action={archive} className="space-y-4 text-xs">
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <input type="hidden" name="action" value="ARCHIVE" />
            <p className="leading-6 text-slate-600">فرصت از فهرست جاری خارج می‌شود؛ سوابق و گزارش‌های استخدام حذف نمی‌شوند. معرفی‌های فعال این فرصت نیز بایگانی می‌شوند.</p>
            {archiveReason && <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-slate-500">علت قبلی: {archiveReason}</p>}
            {state.error && <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-rose-800">{state.error}</p>}
            <Field label="علت بایگانی (اختیاری)" htmlFor={'vacancy-archive-reason-' + vacancyId}>
              <textarea id={'vacancy-archive-reason-' + vacancyId} name="reason" maxLength={300} rows={3} className={inputClass} placeholder="مثلاً جذب متوقف شد، نیاز استخدامی تغییر کرد یا ظرفیت تکمیل شد" />
            </Field>
            <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
              <Button type="submit" loading={pending}>تأیید و بایگانی</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
