'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileImage, FileText, Trash2, UploadCloud } from 'lucide-react';
import { uploadDocumentAction, deleteDocumentAction } from '@/app/actions/applicants';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Button, EmptyState, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { ATTACHMENT_CATEGORY_LABELS } from '@/lib/domain/labels';
import { useServerAction } from '@/lib/useServerAction';
import { formatFileSizePersian, formatJalali } from '@/lib/persian';
import type { AttachmentCategory, AttachmentRow } from '@/types';

const initial: { ok: boolean; error?: string } = { ok: false };

const UPLOADABLE_CATEGORIES = Object.entries(ATTACHMENT_CATEGORY_LABELS).filter(
  ([key]) => key !== 'PREVIOUS_RESUME',
) as [AttachmentCategory, string][];

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <FileImage className="h-5 w-5 text-indigo-600" aria-hidden />;
  return <FileText className="h-5 w-5 text-rose-600" aria-hidden />;
}

export function AttachmentCenter({
  applicantId,
  attachments,
  isAdmin,
}: {
  applicantId: string;
  attachments: AttachmentRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttachmentRow | null>(null);
  const [, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState('');

  const [state, formAction, pending] = useServerAction(uploadDocumentAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  function handleUploadFormAction(formData: FormData) {
    formAction(formData);
    if (formRef.current) {
      formRef.current.reset();
    }
    setUploadOpen(false);
    router.refresh();
  }

  const primary = attachments.find((a) => a.is_primary_resume);
  const previous = attachments.filter((a) => a.category === 'PREVIOUS_RESUME' || (!a.is_primary_resume && a.category === 'PRIMARY_RESUME'));
  const others = attachments.filter((a) => !a.is_primary_resume && a.category !== 'PREVIOUS_RESUME' && a.category !== 'PRIMARY_RESUME');

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError('');
    startDelete(async () => {
      try {
        await deleteDocumentAction(deleteTarget.id, applicantId);
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'حذف سند ناموفق بود.');
      }
    });
  }

  return (
    <div className="space-y-5 text-right">
      <div className="flex flex-col items-start justify-between gap-3 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-600">
          اسناد در مخزن خصوصی سازمان نگهداری می‌شوند؛ دانلود فقط با نشانی امن و کوتاه‌مدت و پس از احراز دسترسی انجام می‌شود.
        </p>
        {isAdmin && (
          <Button onClick={() => setUploadOpen(true)} className="shrink-0">
            <UploadCloud className="h-4 w-4" aria-hidden />
            بارگذاری سند یا رزومه جدید
          </Button>
        )}
      </div>

      {/* Primary resume */}
      <section className="rounded-[var(--radius-lg)] border border-teal-200 bg-teal-50/30 p-4" aria-label="رزومه اصلی">
        <h3 className="mb-3 text-sm font-bold text-slate-900">
          رزومه اصلی
          {primary?.version_number && (
            <span className="num mr-2 rounded-[var(--radius-sm)] bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800">
              نسخه {primary.version_number}
            </span>
          )}
        </h3>
        {primary ? (
          <DocumentRow doc={primary} isAdmin={isAdmin} onDelete={() => setDeleteTarget(primary)} />
        ) : (
          <p className="rounded-[var(--radius-md)] border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
            هنوز رزومه اصلی برای این متقاضی بارگذاری نشده است.
          </p>
        )}
      </section>

      {previous.length > 0 && (
        <section aria-label="نسخه‌های قبلی رزومه" className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold text-slate-900">نسخه‌های قبلی رزومه (بایگانی)</h3>
          <div className="space-y-2">
            {previous.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} isAdmin={isAdmin} onDelete={() => setDeleteTarget(doc)} compact />
            ))}
          </div>
        </section>
      )}

      {/* Other documents */}
      <section aria-label="مدارک تکمیلی" className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          مدارک و پیوست‌های تکمیلی ({others.length} سند)
        </h3>
        {others.length === 0 ? (
          <EmptyState title="سند تکمیلی ضمیمه نشده است" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {others.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} isAdmin={isAdmin} onDelete={() => setDeleteTarget(doc)} />
            ))}
          </div>
        )}
      </section>

      {/* Upload modal */}
      {uploadOpen && (
        <Modal open onClose={() => setUploadOpen(false)} title="بارگذاری سند یا رزومه جدید">
          <form ref={formRef} action={handleUploadFormAction} className="space-y-4 text-xs">
            <input type="hidden" name="applicantId" value={applicantId} />
            {state.error && (
              <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-[var(--color-status-danger-bg)] p-3 font-medium text-rose-700">
                {state.error}
              </p>
            )}

            <Field label="فایل (PDF، DOC، DOCX، JPG، PNG — حداکثر ۱۰ مگابایت)" htmlFor="doc-file" required>
              <input
                id="doc-file"
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
                className="w-full rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 p-2 text-xs file:ml-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-teal-800"
              />
            </Field>

            <Field label="دسته‌بندی مدرک" htmlFor="doc-category" required>
              <select id="doc-category" name="category" className={selectClass} defaultValue="PRIMARY_RESUME">
                {UPLOADABLE_CATEGORIES.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="عنوان نمایشی سند" htmlFor="doc-title" required>
              <input id="doc-title" name="title" type="text" maxLength={200} required className={inputClass} placeholder="مثال: رزومه تفصیلی سال ۱۴۰۳" />
            </Field>

            <label className="flex items-center gap-2 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 p-2.5">
              <input
                type="checkbox"
                name="isPrimaryResume"
                defaultChecked
                className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span className="font-medium text-slate-800">تعیین به‌عنوان رزومه اصلی (نسخه قبلی به بایگانی منتقل می‌شود)</span>
            </label>

            <Field label="یادداشت (اختیاری)" htmlFor="doc-notes">
              <textarea id="doc-notes" name="notes" rows={2} maxLength={1000} className={inputClass} />
            </Field>

            <div className="flex items-center justify-start gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" loading={pending}>
                {pending ? 'در حال بارگذاری…' : 'بارگذاری و ثبت سند'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
                انصراف
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف سند پیوست"
        message={`آیا از حذف سند «${deleteTarget?.title ?? ''}» اطمینان دارید؟ این عملیات بازگشت‌پذیر نیست.`}
        confirmLabel="حذف سند"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {deleteError && (
        <p role="alert" className="text-xs font-medium text-rose-600">{deleteError}</p>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  isAdmin,
  onDelete,
  compact = false,
}: {
  doc: AttachmentRow;
  isAdmin: boolean;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[var(--radius-md)] border bg-white p-3 ${compact ? 'border-slate-100' : 'border-slate-200'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-[var(--radius-md)] bg-slate-100 p-2">{fileIcon(doc.mime_type)}</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900">{doc.title}</p>
          <p className="dir-ltr truncate font-mono text-[10px] text-slate-400">
            {doc.original_filename} · {formatFileSizePersian(doc.size_bytes)}
          </p>
          {!compact && (
            <p className="text-[11px] font-medium text-teal-800">
              {ATTACHMENT_CATEGORY_LABELS[doc.category]}
              <span className="num text-slate-400"> · {formatJalali(doc.uploaded_at, true)}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href={`/api/documents/${doc.id}`}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-soft hover:bg-slate-200"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          دانلود
        </a>
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-[var(--radius-md)] p-1.5 text-slate-400 transition-soft hover:bg-rose-50 hover:text-rose-600"
            aria-label={`حذف سند ${doc.title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
