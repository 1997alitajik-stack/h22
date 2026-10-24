/**
 * Persian display labels for every domain enum — single source for UI + CSV exports.
 */
import type {
  AttachmentCategory,
  CandidacyStage,
  DegreeLevel,
  EmploymentType,
  GroupPriority,
  OrgType,
  RecruitmentStatus,
  SkillLevel,
  VacancyStatus,
  VerificationStatus,
} from '@/types';

export const PRIORITY_LABELS: Record<GroupPriority, string> = {
  VERIFIED_PARENT: 'سابقه تأییدشده در سازمان مادر',
  VERIFIED_SUBSIDIARY: 'سابقه تأییدشده در شرکت زیرمجموعه',
  PENDING_VERIFICATION: 'سابقه در انتظار تأیید',
  NO_GROUP_HISTORY: 'فاقد سابقه در مجموعه',
  INSUFFICIENT_DATA: 'اطلاعات ناکافی',
};

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  NEW: 'جدید',
  UNDER_REVIEW: 'در حال بررسی',
  INTERVIEWING: 'مرحله مصاحبه',
  SHORTLISTED: 'فهرست نهایی',
  OFFERED: 'پیشنهاد کار',
  HIRED: 'استخدام‌شده',
  REJECTED: 'عدم احراز',
  ARCHIVED: 'بایگانی',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  VERIFIED: 'تأییدشده',
  PENDING: 'در انتظار استعلام',
  REJECTED: 'احراز نشد / رد',
  NOT_APPLICABLE: 'خارج از سازمان',
};

export const CANDIDACY_STAGE_LABELS: Record<CandidacyStage, string> = {
  NEW: 'جدید',
  SCREENING: 'در حال بررسی',
  INTERVIEW: 'مرحله مصاحبه',
  SHORTLIST: 'فهرست نهایی',
  ACCEPTED: 'پذیرفته‌شده',
  REJECTED: 'ردشده',
  WITHDRAWN: 'انصراف',
};

export const VACANCY_STATUS_LABELS: Record<VacancyStatus, string> = {
  OPEN: 'پذیرش فعال',
  IN_PROGRESS: 'در جریان ارزیابی',
  FILLED: 'تکمیل‌شده',
  CANCELLED: 'لغو‌شده',
};

export const DEGREE_LABELS: Record<DegreeLevel, string> = {
  UNDER_DIPLOMA: 'زیر دیپلم',
  DIPLOMA: 'دیپلم متوسطه',
  ASSOCIATE: 'کاردانی (فوق دیپلم)',
  BACHELOR: 'کارشناسی (لیسانس)',
  MASTER: 'کارشناسی ارشد',
  DOCTORATE: 'دکتری تخصصی',
};

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
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

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BASIC: 'مقدماتی',
  INTERMEDIATE: 'متوسط',
  ADVANCED: 'پیشرفته',
  EXPERT: 'تسلط عالی',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'تمام‌وقت',
  PART_TIME: 'پاره‌وقت',
  CONTRACTUAL: 'قراردادی',
  PROJECT_BASED: 'پروژه‌ای',
};

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  PARENT: 'ستاد مرکزی سازمان',
  SUBSIDIARY: 'شرکت تابعه',
};

export const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  APPLICANT: 'بانک متقاضیان',
  VERIFICATION: 'تأییدیه سوابق',
  ATTACHMENT: 'مدیریت اسناد',
  VACANCY: 'فرصت‌های شغلی',
  USER: 'مدیریت کاربران',
  REPORT: 'گزارش‌ها',
  SETTING: 'تنظیمات سامانه',
  ORGANIZATION: 'ساختار سازمانی',
  SECURITY: 'رویداد امنیتی',
  VIEW_RESUME: 'مشاهده رزومه',
  SEARCH_DIRECTORY: 'جستجوی بانک متقاضیان',
  EXPORT_LIST: 'خروجی اکسل',
};
