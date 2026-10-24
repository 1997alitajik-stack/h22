# قرارداد داده و اینترفیس‌های تایپ‌اسکریپت (FRONTEND DATA CONTRACT)
## سامانه راستا — راهکار ارزیابی سوابق، تخصص و استعدادها

این سند اینترفیس‌های اصلی داده، مدل‌های رابطه و قرارداد متدهای سرویس سامانه **راستا** را برای پیاده‌سازی بک‌اند مشخص می‌کند.

---

### ۱. مدل پرونده متقاضی (`Applicant`)

```typescript
export interface Applicant {
  id: string; // e.g. "APP-1403-101"
  firstName: string;
  lastName: string;
  fullName: string;
  fatherName: string;
  nationalIdMasked: string; // "۰۰۶-******-۴"
  nationalIdFull: string; // "۰۰۶۲۳۸۴۹۱۴"
  birthDate: string; // "۱۳۶۳/۰۵/۱۴"
  birthPlace: string;
  residentialCity: string;
  addressSummary: string;
  phoneNumberMasked: string; // "۰۹۱۲-***-۳۴۲۱"
  phoneNumberFull: string; // "۰۹۱۲۳۴۲۱۸۹۰"
  alternativePhone?: string;
  email: string;
  avatarInitials: string;

  // مشخصات شغلی
  primaryJobTitle: string;
  primaryJobCategory: string;
  yearsOfExperience: number;
  highestDegree: DegreeLevel;
  highestDegreeTitle: string;
  highestFieldOfStudy: string;

  // وضعیت اولویت استخدامی گروه
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

  recruitmentStatus: RecruitmentStatus;
  profileCompleteness: number; // 0..100
  registeredAt: string;
  updatedAt: string;

  // زیرمجموعه‌ها
  employmentHistory: EmploymentRecord[];
  educationHistory: EducationRecord[];
  certificates: CertificateRecord[];
  skills: SkillItem[];
  preferences: JobPreferences;
  attachments: Attachment[];
  candidacies: Candidacy[];
  internalNotes: InternalNote[];
}
```

---

### ۲. سابقه شغلی (`EmploymentRecord`)

```typescript
export interface EmploymentRecord {
  id: string;
  employerName: string;
  isGroupEntity: boolean; // آیا در ستاد سازمان یا زیرمجموعه‌ها بوده؟
  groupEntityType?: 'PARENT' | 'SUBSIDIARY' | 'EXTERNAL';
  subsidiaryId?: string;
  subsidiaryName?: string;
  projectName?: string;
  city: string;
  jobTitle: string;
  startDate: string; // "۱۳۹۸/۰۷/۰۱"
  endDate?: string;
  isCurrent: boolean; // در صورت فعال بودن، endDate غیرالزامی است
  responsibilities: string;
  lastSalary?: string;
  reasonForLeaving?: string;
  verificationStatus: VerificationStatus; // 'VERIFIED' | 'PENDING' | 'REJECTED' | 'NOT_APPLICABLE'
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}
```

---

### ۳. پیوست و مدیریت نسخه‌های رزومه (`Attachment`)

```typescript
export interface Attachment {
  id: string;
  applicantId: string;
  title: string;
  category: AttachmentCategory;
  categoryLabel: string;
  originalFileName: string;
  fileExtension: string; // 'pdf', 'docx', 'jpg', ...
  fileSizeBytes: number;
  formattedSize: string; // "۲.۴ مگابایت"
  uploadedAt: string;
  uploaderName: string;
  isPrimaryResume: boolean;
  versionNumber?: number; // رزومه اصلی دارای شماره نسخه است
  isSimulatedLocalOnly: boolean;
  notes?: string;
}
```

---

### ۴. فرصت شغلی و ردیف‌های استخدام (`Vacancy` & `Candidacy`)

```typescript
export interface Vacancy {
  id: string; // "VAC-101"
  code: string;
  title: string;
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
  applicantCount: number;
  shortlistedCount: number;
  candidacies: Candidacy[];
}

export interface Candidacy {
  id: string;
  applicantId: string;
  vacancyId: string;
  vacancyTitle: string;
  appliedDate: string;
  stage: CandidacyStage; // 'NEW' | 'SCREENING' | 'INTERVIEW' | 'SHORTLIST' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
  stageLabel: string;
  notes?: string;
  matchScorePercent?: number;
}
```

---

### ۵. اینترفیس متدهای سرویس (Service Methods)

```typescript
// کارجویان
listApplicants(filters: ApplicantFilterOptions, sortField: SortField, sortDirection: SortDirection): Promise<Applicant[]>;
getApplicantById(id: string): Promise<Applicant | null>;
createApplicant(data: Omit<Applicant, 'id' | 'registeredAt' | 'updatedAt'>): Promise<Applicant>;
updateApplicant(id: string, updates: Partial<Applicant>): Promise<Applicant>;

// استعلام سوابق
updateEmploymentVerification(applicantId: string, recordId: string, newStatus: VerificationStatus, notes: string, reviewer: string): Promise<Applicant>;

// اسناد
addMockAttachment(applicantId: string, attachment: Omit<Attachment, 'id' | 'uploadedAt' | 'applicantId'>): Promise<Attachment>;
deleteMockAttachment(applicantId: string, attachmentId: string): Promise<boolean>;

// فرصت‌ها
listVacancies(): Promise<Vacancy[]>;
getVacancyById(id: string): Promise<Vacancy | null>;
createVacancy(data: Omit<Vacancy, 'id' | 'openedAt' | 'applicantCount' | 'shortlistedCount' | 'candidacies'>): Promise<Vacancy>;
linkApplicantToVacancy(vacancyId: string, applicantId: string, initialStage: CandidacyStage, notes?: string): Promise<void>;
updateCandidacyStage(vacancyId: string, applicantId: string, newStage: CandidacyStage, notes?: string): Promise<void>;

// آمار و داشبورد
getDashboardMetrics(): Promise<DashboardMetrics>;
```
