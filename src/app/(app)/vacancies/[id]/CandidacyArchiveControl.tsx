'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore } from 'lucide-react';
import { archiveCandidacyAction } from '@/app/actions/admin';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, inputClass } from '@/components/ui/Primitives';
import { useServerAction } from '@/lib/useServerAction';

const initial = { ok: false } as { ok: boolean; error?: string; message?: string };

export function CandidacyArchiveControl({candidacyId,vacancyId,archived,archiveReason,vacancyArchived}:{
  candidacyId:string; vacancyId:string; archived:boolean; archiveReason?:string|null; vacancyArchived:boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, , pending, submit] = useServerAction(archiveCandidacyAction, initial);

  async function restore() {
    const data = new FormData();
    data.set('candidacyId', candidacyId);
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
    <div className="min-w-28 space-y-1">
      {archived ? (
        <Button type="button" variant="secondary" className="px-2 py-1.5 text-[10px]" disabled={vacancyArchived} onClick={() => void restore()} loading={pending}>
          <ArchiveRestore className="h-3 w-3" aria-hidden />بازگردانی
        </Button>
      ) : (
        <Button type="button" variant="ghost" className="px-2 py-1.5 text-[10px] text-amber-800" onClick={() => setOpen(true)}>
          <Archive className="h-3 w-3" aria-hidden />بایگانی معرفی
        </Button>
      )}
      {vacancyArchived && archived && <p className="text-[10px] text-slate-400">ابتدا فرصت را بازگردانید.</p>}
      {state.error && <p role="alert" className="max-w-40 text-[10px] leading-4 text-rose-700">{state.error}</p>}
      {open && (
        <Modal open onClose={() => setOpen(false)} title="بایگانی معرفی متقاضی">
          <form action={archive} className="space-y-4 text-xs">
            <input type="hidden" name="candidacyId" value={candidacyId} />
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <input type="hidden" name="action" value="ARCHIVE" />
            <p className="leading-6 text-slate-600">فقط معرفی این فرد به همین فرصت بایگانی می‌شود؛ پرونده اصلی او در استخر رزومه برای فرصت‌های آینده باقی می‌ماند.</p>
            {archiveReason && <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-slate-500">علت قبلی: {archiveReason}</p>}
            {state.error && <p role="alert" className="rounded-[var(--radius-md)] bg-rose-50 p-3 text-rose-800">{state.error}</p>}
            <Field label="علت بایگانی (اختیاری)" htmlFor={'candidacy-archive-reason-' + candidacyId}>
              <textarea id={'candidacy-archive-reason-' + candidacyId} name="reason" rows={3} maxLength={300} className={inputClass} placeholder="مثلاً عدم تطابق با نیاز شغلی یا پایان مهلت بررسی" />
            </Field>
            <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
              <Button type="submit" loading={pending}>بایگانی معرفی</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
