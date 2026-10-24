/**
 * Core Domain Types for Persian HR Resume Pool System
 * سامانه استخر رزومه سازمان
 */

export type UserRole = 'ADMIN' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  roleTitle: string; // "مدیر سامانه" | "کاربر مشاهده‌گر منابع انسانی"
  avatarInitials: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string; // Jalali formatted string e.g. "۱۴۰۲/۰۵/۱۴"
  lastLoginAt: string;
}

// 5 Explicit Priority Classifications defined in specifications:
export type GroupEmploymentPriority =
  | 'VERIFIED_PARENT'       // سابقه همکاری تأییدشده در سازمان مادر
  | 'VERIFIED_SUBSIDIARY'   // سابقه همکاری تأییدشده در شرکت زیرمجموعه
  | 'PENDING_VERIFICATION'  // سابقه همکاری در انتظار تأیید
  | 'NO_GROUP_HISTORY'      // فاقد سابقه تأییدشده در مجموعه
  | 'INSUFFICIENT_DATA';    // اطلاعات ناکافی برای تعیین وضعیت

export type VerificationStatus =
  | 'VERIFIED'
  | 'PENDING'
  | 'REJECTED'
  | 'NOT_APPLICABLE';

export type RecruitmentStatus =
  | 'NEW'             // جدید
  | 'UNDER_REVIEW'    // در حال بررسی
  | 'INTERVIEWING'    // مصاحبه
  | 'SHORTLISTED'     // فهرست نهایی
  | 'OFFERED'         // پیشنهاد کار
  | 'HIRED'           // استخدام شده
  | 'REJECTED'        // عدم پذیرش
  | 'ARCHIVED';       // بایگانی

export type CandidacyStage =
  | 'NEW'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'SHORTLIST'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type DegreeLevel =
  | 'UNDER_DIPLOMA'   // زیر دیپلم
  | 'DIPLOMA'         // دیپلم
  | 'ASSOCIATE'       // کاردانی (فوق دیپلم)
  | 'BACHELOR'        // کارشناسی
  | 'MASTER'          // کارشناسی ارشد
  | 'DOCTORATE';      // دکتری و بالاتر

export type AttachmentCategory =
  | 'PRIMARY_RESUME'        // رزومه اصلی
  | 'PREVIOUS_RESUME'       // نسخه قبلی رزومه
  | 'SUPPLEMENTARY_RESUME'  // رزومه تکمیلی
  | 'ID_PHOTO'              // عکس پرسنلی
  | 'DEGREE_CERTIFICATE'    // مدرک تحصیلی
  | 'TRANSCRIPT'            // ریزنمرات
  | 'TRAINING_CERTIFICATE'  // گواهینامه آموزشی
  | 'TECHNICAL_CERTIFICATE' // مدرک فنی یا تخصصی
  | 'ORGANIZATION_RECORD'   // مدرک مرتبط با سابقه همکاری
  | 'OTHER';                // سایر مدارک

export interface Attachment {
  id: string;
  applicantId: string;
  title: string;
  category: AttachmentCategory;
  categoryLabel: string;
  originalFileName: string;
  fileExtension: string; // 'pdf' | 'docx' | 'jpg' etc.
  fileSizeBytes: number;
  formattedSize: string; // e.g. "۱.۸ مگابایت"
  uploadedAt: string; // Jalali
  uploaderName: string;
  isPrimaryResume: boolean;
  versionNumber?: number;
  isSimulatedLocalOnly: boolean;
  notes?: string;
}

export interface EmploymentRecord {
  id: string;
  employerName: string;
  isGroupEntity: boolean; // Is it parent org or a subsidiary
  groupEntityType?: 'PARENT' | 'SUBSIDIARY' | 'EXTERNAL';
  subsidiaryId?: string;
  subsidiaryName?: string;
  projectName?: string;
  city: string;
  jobTitle: string;
  startDate: string; // Jalali e.g. "۱۳۹۸/۰۷/۰۱"
  endDate?: string;
  isCurrent: boolean;
  responsibilities: string;
  lastSalary?: string;
  reasonForLeaving?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface EducationRecord {
  id: string;
  degreeLevel: DegreeLevel;
  degreeTitle: string;
  fieldOfStudy: string;
  institutionName: string; // University, vocational institute, or school
  city: string;
  startDate: string;
  endDate?: string;
  isStudying: boolean;
  gpa?: string; // معدل e.g. "۱۷.۴۵"
  notes?: string;
}

export interface CertificateRecord {
  id: string;
  title: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  certificateType: string;
  hasAttachment: boolean;
  verificationStatus: VerificationStatus;
}

export interface SkillItem {
  id: string;
  name: string;
  category: 'TECHNICAL' | 'MANAGERIAL' | 'GENERAL' | 'TOOL_SOFTWARE';
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export interface JobPreferences {
  preferredTitles: string[];
  preferredCities: string[];
  willingToRelocate: boolean;
  willingToTravelSites: boolean;
  employmentTypes: ('FULL_TIME' | 'PART_TIME' | 'CONTRACTUAL' | 'PROJECT_BASED')[];
  expectedSalaryMin?: string;
  availabilityTimeline: string; // e.g. "آماده به کار فوری" | "یک ماه پس از اعلام"
}

export interface Candidacy {
  id: string;
  applicantId: string;
  vacancyId: string;
  vacancyTitle: string;
  appliedDate: string;
  stage: CandidacyStage;
  stageLabel: string;
  notes?: string;
  matchScorePercent?: number; // transparent calculated mock demonstration score
}

export interface InternalNote {
  id: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  content: string;
  isConfidential: boolean;
}

/**
 * Isolated Sensitive Record (Stored in subcollection /applicants/{id}/applicant_sensitive/default)
 * Strictly restricted to verified ADMIN role via Firestore Security Rules.
 */
export interface ApplicantSensitiveRecord {
  applicantId: string;
  nationalIdFull: string;
  homeAddressFull: string;
  phoneNumberFull: string;
  previousSalaries?: Array<{
    employmentRecordId: string;
    employerName: string;
    salaryAmount: string;
  }>;
  confidentialNotes?: InternalNote[];
  updatedAt: string;
  updatedBy: string;
}

export interface Applicant {
  id: string; // e.g. "APP-1403-102"
  firstName: string;
  lastName: string;
  fullName: string;
  fatherName: string;
  nationalIdMasked: string; // e.g. "۰۰۱-******-۸"
  nationalIdFull: string; // e.g. "۰۰۱۸۲۳۹۴۲۸" (only accessible in admin mode toggle)
  birthDate: string;
  birthPlace: string;
  residentialCity: string;
  addressSummary: string;
  phoneNumberMasked: string;
  phoneNumberFull: string;
  alternativePhone?: string;
  email: string;
  avatarInitials: string;

  // Professional summary
  primaryJobTitle: string;
  primaryJobCategory: string;
  yearsOfExperience: number;
  highestDegree: DegreeLevel;
  highestDegreeTitle: string;
  highestFieldOfStudy: string;

  // Group Priority Classification
  groupPriority: GroupEmploymentPriority;
  groupPriorityReason: string;
  groupEmploymentSummary?: {
    entityType: 'PARENT' | 'SUBSIDIARY' | 'NONE';
    entityName: string;
    totalMonths: number;
    lastProject?: string;
    isVerified: boolean;
    verificationDate?: string;
    verifiedBy?: string;
  };

  // Status and metadata
  recruitmentStatus: RecruitmentStatus;
  profileCompleteness: number; // 0 to 100
  registeredAt: string;
  updatedAt: string;

  // Sub-records
  employmentHistory: EmploymentRecord[];
  educationHistory: EducationRecord[];
  certificates: CertificateRecord[];
  skills: SkillItem[];
  preferences: JobPreferences;
  attachments: Attachment[];
  candidacies: Candidacy[];
  internalNotes: InternalNote[];
}

export interface Vacancy {
  id: string; // e.g. "VAC-204"
  title: string;
  code: string;
  category: string;
  organizationType: 'PARENT' | 'SUBSIDIARY';
  organizationName: string;
  subsidiaryId?: string;
  projectName?: string;
  city: string;
  openPositionsCount: number;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTUAL' | 'PROJECT_BASED';
  requiredDegree: DegreeLevel | 'ANY';
  minimumYearsExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  salaryRange?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'FILLED' | 'CANCELLED';
  openedAt: string;
  closedAt?: string;
  applicantCount: number;
  shortlistedCount: number;
  candidacies: Candidacy[];
}

export interface Subsidiary {
  id: string;
  code: string;
  name: string;
  persianName: string;
  field: string;
  city: string;
  activeProjectsCount: number;
  employeeCountEstimate: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Project {
  id: string;
  subsidiaryId?: string;
  subsidiaryName: string;
  name: string;
  city: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PLANNING';
  startDate: string;
  type: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string; // Jalali with time
  actorUid?: string;
  actorName: string;
  actorRole: string;
  channel?: 'ADMIN_SECURITY' | 'CLIENT_ACTIVITY';
  category: 'APPLICANT' | 'VERIFICATION' | 'ATTACHMENT' | 'VACANCY' | 'USER' | 'REPORT' | 'SETTING' | 'SECURITY' | 'VIEW_RESUME' | 'SEARCH_DIRECTORY' | 'EXPORT_LIST';
  categoryLabel: string;
  recordIdentifier: string;
  summary: string;
  details?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  outcome: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface ControlledVocabulary {
  jobCategories: string[];
  cities: string[];
  skillCategories: { category: string; skills: string[] }[];
  educationLevels: { id: DegreeLevel; label: string }[];
  recruitmentStatuses: { id: RecruitmentStatus; label: string }[];
  attachmentCategories: { id: AttachmentCategory; label: string }[];
}
