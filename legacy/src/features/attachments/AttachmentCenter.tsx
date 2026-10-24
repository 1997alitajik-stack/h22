import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Attachment, AttachmentCategory } from '../../types';
import { addMockAttachment, deleteMockAttachment } from '../../services/mockService';
import { formatFileSizePersian, toPersianDigits } from '../../lib/persianUtils';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import {
  FileText,
  FileCheck,
  FileImage,
  UploadCloud,
  Trash2,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  FileCode,
  ShieldAlert,
} from 'lucide-react';

import { StorageService } from '../../services/storageService';

interface AttachmentCenterProps {
  applicantId: string;
  applicantName: string;
  attachments: Attachment[];
  onAttachmentChanged: () => void;
}

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  PRIMARY_RESUME: 'رزومه اصلی',
  PREVIOUS_RESUME: 'نسخه قبلی رزومه',
  SUPPLEMENTARY_RESUME: 'رزومه تکمیلی',
  ID_PHOTO: 'عکس پرسنلی',
  DEGREE_CERTIFICATE: 'مدرک تحصیلی',
  TRANSCRIPT: 'ریزنمرات',
  TRAINING_CERTIFICATE: 'گواهینامه آموزشی',
  TECHNICAL_CERTIFICATE: 'مدرک فنی یا تخصصی',
  ORGANIZATION_RECORD: 'مدرک مرتبط با سابقه همکاری',
  OTHER: 'سایر مدارک',
};

export const AttachmentCenter: React.FC<AttachmentCenterProps> = ({
  applicantId,
  applicantName,
  attachments,
  onAttachmentChanged,
}) => {
  const { userRole, showToast } = useApp();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [category, setCategory] = useState<AttachmentCategory>('PRIMARY_RESUME');
  const [isPrimary, setIsPrimary] = useState(true);
  const [docNotes, setDocNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion state
  const [itemToDelete, setItemToDelete] = useState<Attachment | null>(null);

  const primaryResume = attachments.find((a) => a.isPrimaryResume);
  const previousVersions = attachments.filter(
    (a) => a.category === 'PREVIOUS_RESUME' || (!a.isPrimaryResume && a.category === 'PRIMARY_RESUME')
  );
  const otherDocuments = attachments.filter(
    (a) => !a.isPrimaryResume && a.category !== 'PREVIOUS_RESUME'
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = StorageService.validateFile(file);
      if (!validation.isValid) {
        showToast(validation.error || 'فایل نامعتبر است', 'error');
        return;
      }

      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('لطفاً یک فایل را از دستگاه خود انتخاب نمایید.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const metadata = StorageService.prepareAttachmentMetadata(
        applicantId,
        selectedFile,
        category,
        CATEGORY_LABELS[category],
        docTitle,
        userRole === 'ADMIN' ? 'مدیر سامانه' : 'کارشناس منابع انسانی',
        isPrimary,
        isPrimary ? (primaryResume ? (primaryResume.versionNumber || 1) + 1 : 1) : undefined,
        docNotes
      );

      await addMockAttachment(applicantId, metadata);

      showToast(
        `متادیتای فایل «${selectedFile.name}» ثبت گردید. (ذخیره‌سازی باینری ابری در انتظار فعال‌سازی پلن پرداخت است)`,
        'success',
        'ثبت موفق سند'
      );

      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocTitle('');
      setDocNotes('');
      onAttachmentChanged();
    } catch (err: any) {
      showToast(err.message || 'خطا در افزودن سند', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    await deleteMockAttachment(applicantId, itemToDelete.id);
    showToast(`سند «${itemToDelete.title}» حذف گردید.`, 'info');
    setItemToDelete(null);
    onAttachmentChanged();
  };

  const getFileIcon = (ext: string) => {
    switch (ext.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileImage className="w-5 h-5 text-indigo-600" />;
      case 'doc':
      case 'docx':
        return <FileCheck className="w-5 h-5 text-blue-600" />;
      default:
        return <FileCode className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner and Upload CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <h4 className="font-semibold text-slate-900 text-sm">
            مرکز مدیریت اسناد و رزومه‌های {applicantName}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              وضعیت مخزن: ثبت متادیتای محلی (اتصال به مخزن ابری امن در انتظار تایید پلن پرداخت)
            </span>
            <span className="text-xs text-slate-500">
              تفکیک رزومه اصلی، نسخه‌های قبلی، مدارک هویتی و گواهی‌ها
            </span>
          </div>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>بارگذاری مدرک یا رزومه جدید</span>
          </button>
        )}
      </div>

      {/* Primary Active Resume Box */}
      <div className="border border-teal-200 rounded-xl p-5 bg-teal-50/30">
        <div className="flex items-center justify-between border-b border-teal-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
            <h5 className="font-bold text-slate-900 text-sm">رزومه اصلی و فعال متقاضی</h5>
            {primaryResume?.versionNumber && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-mono font-medium">
                نسخه {toPersianDigits(primaryResume.versionNumber)}
              </span>
            )}
          </div>
          <span className="text-xs text-teal-800 font-medium">مبنای بررسی کارشناسان جذب</span>
        </div>

        {primaryResume ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-teal-100 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-lg">
                {getFileIcon(primaryResume.fileExtension)}
              </div>
              <div>
                <h6 className="font-semibold text-slate-900 text-xs">{primaryResume.title}</h6>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 font-mono">
                  <span>نام فایل: {primaryResume.originalFileName}</span>
                  <span>·</span>
                  <span>حجم: {primaryResume.formattedSize}</span>
                  <span>·</span>
                  <span>تاریخ ثبت: {primaryResume.uploadedAt}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  showToast(
                    `در محیط نهایی، دانلود امن توکن‌دار برای ${primaryResume.originalFileName} فراخوانی می‌شود.`,
                    'info'
                  )
                }
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>مشاهده / دانلود</span>
              </button>

              {userRole === 'ADMIN' && (
                <button
                  onClick={() => setItemToDelete(primaryResume)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  title="حذف رزومه"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
            هنوز رزومه اصلی برای این متقاضی بارگذاری نشده است.
          </div>
        )}
      </div>

      {/* Previous Resume Versions (History) */}
      {previousVersions.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <h5 className="font-semibold text-slate-900 text-xs">
              تاریخچه نسخه‌های قبلی رزومه (بایگانی)
            </h5>
          </div>

          <div className="space-y-2">
            {previousVersions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(item.fileExtension)}
                  <div>
                    <span className="font-medium text-slate-800">{item.title}</span>
                    <span className="text-slate-400 font-mono text-[11px] mr-2">
                      ({item.originalFileName} · {item.formattedSize} · ثبت‌شده در {item.uploadedAt})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      showToast(
                        `دریافت نسخه پیشین: ${item.originalFileName}`,
                        'info'
                      )
                    }
                    className="p-1 text-slate-500 hover:text-slate-800"
                    title="دانلود نسخه قبلی"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {userRole === 'ADMIN' && (
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="حذف از آرشیو"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supporting Documents (Certificates, Organization Records, Transcripts) */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h5 className="font-semibold text-slate-900 text-sm">
            مدارک و پیوست‌های تکمیلی ({toPersianDigits(otherDocuments.length)} سند)
          </h5>
          <span className="text-xs text-slate-400">مدرک تحصیلی، گواهینامه‌ها، تأییدیه‌های کاری</span>
        </div>

        {otherDocuments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            سند تکمیلی دیگری ضمیمه نشده است.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-white rounded border border-slate-200 shrink-0">
                    {getFileIcon(doc.fileExtension)}
                  </div>
                  <div>
                    <h6 className="font-semibold text-slate-900">{doc.title}</h6>
                    <div className="text-[11px] text-teal-800 font-medium mt-0.5">
                      {doc.categoryLabel}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {doc.originalFileName} · {doc.formattedSize}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() =>
                      showToast(
                        `درخواست بازبینی سند ${doc.originalFileName}`,
                        'info'
                      )
                    }
                    className="p-1.5 text-slate-600 hover:text-teal-800 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    title="دانلود"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {userRole === 'ADMIN' && (
                    <button
                      onClick={() => setItemToDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                      title="حذف سند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal (Interactive Client File Picker Demonstration) */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-right"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-teal-700" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  بارگذاری سند یا رزومه برای {applicantName}
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              {/* Notice */}
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  فایل انتخابی در مرورگر شما بررسی شده و متادیتای آن به صورت آزمایشی در حافظه کلاینت ثبت می‌گردد. در مرحله اتصال نهایی توسط Claude، فایل‌ها به مخزن امن فایل (S3/GCS) آپلود خواهند شد.
                </p>
              </div>

              {/* Local File Selection */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  انتخاب فایل از رایانه (PDF, DOCX, JPG, PNG - حداکثر ۱۰ مگابایت)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-600 file:mr-0 file:ml-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 file:cursor-pointer border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                  required
                />
                {selectedFile && (
                  <div className="mt-1 text-[11px] text-slate-500 font-mono">
                    فایل انتخاب‌شده: {selectedFile.name} ({formatFileSizePersian(selectedFile.size)})
                  </div>
                )}
              </div>

              {/* Document Category */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  دسته‌بندی مدرک
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as AttachmentCategory;
                    setCategory(cat);
                    setIsPrimary(cat === 'PRIMARY_RESUME');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  عنوان نمایشی سند
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="مثال: رزومه تفصیلی سال ۱۴۰۳ یا گواهی سابقه کار سدید"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  required
                />
              </div>

              {/* Primary Resume Toggle */}
              {category === 'PRIMARY_RESUME' && (
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  <span className="text-slate-800 font-medium">
                    تعیین به عنوان رزومه اصلی و فعال متقاضی (نسخه قبلی به آرشیو منتقل می‌شود)
                  </span>
                </label>
              )}

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  توضیحات یا یادداشت اداری (اختیاری)
                </label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  rows={2}
                  placeholder="توضیحات مربوط به صحت سند یا منبع صدور..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedFile}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'در حال ثبت...' : 'ثبت سند در پروتوتایپ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={itemToDelete !== null}
        title="حذف سند پیوست"
        message={`آیا از حذف سند «${itemToDelete?.title}» از پرونده متقاضی اطمینان دارید؟`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
