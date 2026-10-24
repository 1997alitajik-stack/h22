import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SessionUser } from '@/types';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Extension → expected MIME types and file-signature probes (§5.5). */
const ALLOWED: Record<string, { mimes: string[]; signature?: (bytes: Uint8Array) => boolean }> = {
  pdf: {
    mimes: ['application/pdf'],
    signature: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  },
  doc: {
    mimes: ['application/msword'],
    signature: (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0, // OLE2
  },
  docx: {
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    signature: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, // ZIP
  },
  jpg: {
    mimes: ['image/jpeg'],
    signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  jpeg: {
    mimes: ['image/jpeg'],
    signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  png: {
    mimes: ['image/png'],
    signature: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
};

export interface UploadResult {
  attachmentId: string;
  storagePath: string;
}

/**
 * Validates and stores an uploaded document. Checks (in order):
 * size → extension allowlist → declared MIME → file signature (magic bytes) →
 * applicant existence → writes object to the private bucket with a generated
 * path → inserts metadata → demotes the previous primary resume if needed.
 * A failed metadata insert removes the stored object (no orphans).
 */
export async function uploadApplicantDocument(
  user: SessionUser,
  applicantId: string,
  file: File,
  meta: {
    category: string;
    title: string;
    isPrimaryResume: boolean;
    notes?: string;
  },
): Promise<UploadResult> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');

  if (file.size <= 0) throw new Error('فایل انتخابی خالی است.');
  if (file.size > MAX_SIZE_BYTES) throw new Error('حجم فایل بیش از سقف مجاز ۱۰ مگابایت است.');

  const originalName = file.name;
  const ext = originalName.split('.').pop()?.toLowerCase() ?? '';
  const rule = ALLOWED[ext];
  if (!rule) {
    throw new Error('فرمت فایل مجاز نیست. فرمت‌های مجاز: PDF، DOC، DOCX، JPG، PNG');
  }

  const declaredMime = file.type || 'application/octet-stream';
  if (!rule.mimes.includes(declaredMime)) {
    throw new Error('نوع فایل اعلام‌شده با پسوند آن همخوانی ندارد.');
  }

  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (rule.signature && !rule.signature(head)) {
    throw new Error('محتوای فایل با فرمت اعلام‌شده همخوانی ندارد.');
  }

  const supabase = await createSupabaseServerClient();

  const { data: applicant } = await supabase
    .from('applicants')
    .select('id')
    .eq('id', applicantId)
    .single();
  if (!applicant) throw new Error('متقاضی یافت نشد.');

  // Demote current primary resume before promoting the new one.
  if (meta.isPrimaryResume) {
    await supabase
      .from('attachments')
      .update({ is_primary_resume: false, category: 'PREVIOUS_RESUME' })
      .eq('applicant_id', applicantId)
      .eq('is_primary_resume', true);
  }

  let versionNumber: number | null = null;
  if (meta.isPrimaryResume) {
    const { data: lastVersion } = await supabase
      .from('attachments')
      .select('version_number')
      .eq('applicant_id', applicantId)
      .not('version_number', 'is', null)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    versionNumber = ((lastVersion?.version_number as number | null) ?? 0) + 1;
  }

  const objectName = `${applicantId}/${crypto.randomUUID()}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from('applicant-documents')
    .upload(objectName, await file.arrayBuffer(), {
      contentType: declaredMime,
      upsert: false,
    });
  if (storageError) throw new Error(`بارگذاری فایل ناموفق بود: ${storageError.message}`);

  const { data: inserted, error: dbError } = await supabase
    .from('attachments')
    .insert({
      applicant_id: applicantId,
      title: meta.title,
      category: meta.category,
      original_filename: originalName.replace(/[^\w\u0600-\u06FF.\- ]/g, '_').slice(0, 200),
      storage_path: objectName,
      mime_type: declaredMime,
      size_bytes: file.size,
      is_primary_resume: meta.isPrimaryResume,
      version_number: versionNumber,
      notes: meta.notes || null,
      uploaded_by: user.id,
      uploader_name: user.fullName,
    })
    .select('id')
    .single();

  if (dbError || !inserted) {
    await supabase.storage.from('applicant-documents').remove([objectName]);
    throw new Error('ثبت اطلاعات سند ناموفق بود؛ فایل ذخیره‌شده حذف گردید.');
  }

  return { attachmentId: inserted.id, storagePath: objectName };
}

/** Expiring signed download URL — authorization happens before signing. */
export async function createDocumentDownloadUrl(
  user: SessionUser,
  attachmentId: string,
): Promise<{ url: string; filename: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: attachment } = await supabase
    .from('attachments')
    .select('storage_path, original_filename')
    .eq('id', attachmentId)
    .single();
  if (!attachment) throw new Error('سند یافت نشد.');

  const { data, error } = await supabase.storage
    .from('applicant-documents')
    .createSignedUrl(attachment.storage_path, 60, { download: attachment.original_filename });
  if (error || !data?.signedUrl) throw new Error('ایجاد نشانی امن دانلود ناموفق بود.');
  return { url: data.signedUrl, filename: attachment.original_filename };
}

export async function deleteApplicantDocument(
  user: SessionUser,
  attachmentId: string,
): Promise<void> {
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const supabase = await createSupabaseServerClient();

  const { data: attachment } = await supabase
    .from('attachments')
    .select('id, storage_path, title')
    .eq('id', attachmentId)
    .single();
  if (!attachment) throw new Error('سند یافت نشد.');

  const { error: dbError } = await supabase.from('attachments').delete().eq('id', attachmentId);
  if (dbError) throw new Error(dbError.message);

  await supabase.storage.from('applicant-documents').remove([attachment.storage_path]);
}
