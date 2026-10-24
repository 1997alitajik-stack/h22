/**
 * Storage Service Interface for Private Applicant Documents & Resumes
 *
 * ARCHITECTURAL SAFETY DIRECTIVE:
 * Cloud Storage for Firebase requires a Blaze (pay-as-you-go) billing plan.
 * To strictly follow cost and security boundaries, this service encapsulates
 * all document handling behind an isolated interface without incurring unauthorized charges.
 *
 * Current operational mode: PENDING_CLOUD_PROVISIONING
 * Metadata is managed in Firestore/State, while binary storage remains isolated with
 * transparent UI indicators until explicit billing approval.
 */

import { Attachment, AttachmentCategory } from '../types';
import { formatFileSizePersian } from '../lib/persianUtils';

export type StorageState =
  | 'PENDING_CLOUD_PROVISIONING' // Metadata valid, binary awaiting private bucket configuration
  | 'CLOUD_ACTIVE'              // Stored in private Cloud Storage with secure signed token
  | 'ERROR_UNSUPPORTED';

export interface StorageCapabilities {
  isCloudStorageConfigured: boolean;
  requiresBillingPlan: boolean;
  activeProvider: string;
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  statusMessage: string;
}

export interface UploadValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFileName?: string;
  fileExtension?: string;
}

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export class StorageService {
  /**
   * Returns current storage system status and configuration constraints
   */
  static getCapabilities(): StorageCapabilities {
    return {
      isCloudStorageConfigured: false,
      requiresBillingPlan: true,
      activeProvider: 'ISOLATED_CLIENT_METADATA_LAYER',
      allowedExtensions: [...ALLOWED_EXTENSIONS],
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
      statusMessage:
        'مخزن ابری خصوصی به دلیل نیاز به طرح پرداخت فعال نشده است. متادیتای اسناد ثبت می‌شود اما ذخیره‌سازی باینری معلق است.',
    };
  }

  /**
   * Validates file size, extension, and filename safety
   */
  static validateFile(file: File): UploadValidationResult {
    if (!file) {
      return { isValid: false, error: 'هیچ فایلی انتخاب نشده است.' };
    }

    if (file.size <= 0) {
      return { isValid: false, error: 'فایل انتخابی خالی است.' };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `حجم فایل (${formatFileSizePersian(file.size)}) بیش از سقف مجاز (۱۰ مگابایت) است.`,
      };
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        isValid: false,
        error: `فرمت فایل (${extension || 'نامشخص'}) مجاز نیست. فرمت‌های مجاز: PDF, DOC, DOCX, JPG, PNG`,
      };
    }

    // Sanitize filename to prevent path traversal or unsafe characters
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9_\-\.\u0600-\u06FF\s]/g, '')
      .trim();

    return {
      isValid: true,
      sanitizedFileName: sanitizedFileName || `document.${extension}`,
      fileExtension: extension,
    };
  }

  /**
   * Generates a managed Attachment object with strict storage status metadata
   */
  static prepareAttachmentMetadata(
    applicantId: string,
    file: File,
    category: AttachmentCategory,
    categoryLabel: string,
    title: string,
    uploaderName: string,
    isPrimaryResume: boolean,
    versionNumber?: number,
    notes?: string
  ): Omit<Attachment, 'id' | 'uploadedAt'> {
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return {
      applicantId,
      title: title.trim() || validation.sanitizedFileName || file.name,
      category,
      categoryLabel,
      originalFileName: validation.sanitizedFileName || file.name,
      fileExtension: validation.fileExtension || 'pdf',
      fileSizeBytes: file.size,
      formattedSize: formatFileSizePersian(file.size),
      uploaderName,
      isPrimaryResume,
      versionNumber,
      isSimulatedLocalOnly: true, // Clearly marks that remote cloud persistence is pending
      notes,
    };
  }
}
