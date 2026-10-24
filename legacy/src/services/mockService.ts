/**
 * Mock Service Layer for Persian HR Resume Pool System
 *
 * NOTE FOR CLAUDE HANDOFF:
 * All business methods are typed, async, and decoupled from React components.
 * To integrate with production API/backend, replace the in-memory array operations
 * in these functions with fetch/axios calls to your real endpoints.
 */

import {
  Applicant,
  Vacancy,
  Subsidiary,
  Project,
  User,
  AuditEvent,
  ControlledVocabulary,
  GroupEmploymentPriority,
  RecruitmentStatus,
  DegreeLevel,
  Attachment,
  CandidacyStage,
  VerificationStatus,
} from '../types';
import {
  INITIAL_APPLICANTS,
  INITIAL_VACANCIES,
  SUBSIDIARIES,
  PROJECTS,
  INITIAL_USERS,
  INITIAL_AUDIT_EVENTS,
  INITIAL_VOCABULARY,
} from '../mocks/mockData';
import { normalizePersianText, toEnglishDigits } from '../lib/persianUtils';

// In-Memory state holder
class MockStore {
  applicants: Applicant[] = [...INITIAL_APPLICANTS];
  vacancies: Vacancy[] = [...INITIAL_VACANCIES];
  subsidiaries: Subsidiary[] = [...SUBSIDIARIES];
  projects: Project[] = [...PROJECTS];
  users: User[] = [...INITIAL_USERS];
  auditEvents: AuditEvent[] = [...INITIAL_AUDIT_EVENTS];
  vocabulary: ControlledVocabulary = { ...INITIAL_VOCABULARY };

  constructor() {
    // Cross-link candidacies into vacancies on start
    this.syncCandidacies();
  }

  syncCandidacies() {
    // Populate vacancy candidacy lists from applicants
    this.vacancies.forEach((vac) => {
      const linkedCandidacies = this.applicants.flatMap((app) =>
        app.candidacies
          .filter((c) => c.vacancyId === vac.id)
          .map((c) => ({
            ...c,
            applicantName: app.fullName,
            applicantCity: app.residentialCity,
            applicantPriority: app.groupPriority,
          }))
      );
      vac.applicantCount = linkedCandidacies.length;
      vac.shortlistedCount = linkedCandidacies.filter(
        (c) => c.stage === 'SHORTLIST' || c.stage === 'INTERVIEW'
      ).length;
    });
  }
}

const store = new MockStore();

export interface ApplicantFilterOptions {
  searchQuery?: string;
  city?: string;
  jobCategory?: string;
  degreeLevel?: DegreeLevel | 'ALL';
  minExperience?: number;
  maxExperience?: number;
  groupPriority?: GroupEmploymentPriority | 'ALL';
  recruitmentStatus?: RecruitmentStatus | 'ALL';
  verificationStatus?: VerificationStatus | 'ALL';
  hasParentOrgHistory?: boolean;
  hasSubsidiaryHistory?: boolean;
}

export type SortField = 'priority' | 'experience' | 'registeredAt' | 'fullName' | 'completeness';
export type SortDirection = 'asc' | 'desc';

export async function listApplicants(
  filters: ApplicantFilterOptions = {},
  sortField: SortField = 'priority',
  sortDirection: SortDirection = 'desc'
): Promise<Applicant[]> {
  // Simulate micro-latency
  await new Promise((resolve) => setTimeout(resolve, 30));

  let results = [...store.applicants];

  // 1. Text Search (normalized Persian + English digits + multiple permitted fields)
  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const qNorm = normalizePersianText(filters.searchQuery);
    const qAscii = toEnglishDigits(filters.searchQuery).toLowerCase();

    results = results.filter((app) => {
      const nameNorm = normalizePersianText(app.fullName);
      const titleNorm = normalizePersianText(app.primaryJobTitle);
      const cityNorm = normalizePersianText(app.residentialCity);
      const categoryNorm = normalizePersianText(app.primaryJobCategory);
      const idNorm = app.id.toLowerCase();
      const skillsNorm = app.skills.map((s) => normalizePersianText(s.name)).join(' ');
      const empNorm = app.employmentHistory
        .map((e) => `${normalizePersianText(e.employerName)} ${normalizePersianText(e.jobTitle)}`)
        .join(' ');

      return (
        nameNorm.includes(qNorm) ||
        titleNorm.includes(qNorm) ||
        cityNorm.includes(qNorm) ||
        categoryNorm.includes(qNorm) ||
        idNorm.includes(qAscii) ||
        skillsNorm.includes(qNorm) ||
        empNorm.includes(qNorm)
      );
    });
  }

  // 2. City Filter
  if (filters.city && filters.city !== 'ALL') {
    results = results.filter((app) => app.residentialCity === filters.city);
  }

  // 3. Job Category Filter
  if (filters.jobCategory && filters.jobCategory !== 'ALL') {
    results = results.filter((app) => app.primaryJobCategory === filters.jobCategory);
  }

  // 4. Degree Level Filter
  if (filters.degreeLevel && filters.degreeLevel !== 'ALL') {
    results = results.filter((app) => app.highestDegree === filters.degreeLevel);
  }

  // 5. Experience Filter
  if (filters.minExperience !== undefined && filters.minExperience > 0) {
    results = results.filter((app) => app.yearsOfExperience >= filters.minExperience!);
  }
  if (filters.maxExperience !== undefined && filters.maxExperience < 50) {
    results = results.filter((app) => app.yearsOfExperience <= filters.maxExperience!);
  }

  // 6. Group Priority Filter
  if (filters.groupPriority && filters.groupPriority !== 'ALL') {
    results = results.filter((app) => app.groupPriority === filters.groupPriority);
  }

  // 7. Recruitment Status Filter
  if (filters.recruitmentStatus && filters.recruitmentStatus !== 'ALL') {
    results = results.filter((app) => app.recruitmentStatus === filters.recruitmentStatus);
  }

  // 8. Specific Parent / Subsidiary toggles
  if (filters.hasParentOrgHistory) {
    results = results.filter((app) => app.groupPriority === 'VERIFIED_PARENT');
  }
  if (filters.hasSubsidiaryHistory) {
    results = results.filter((app) => app.groupPriority === 'VERIFIED_SUBSIDIARY');
  }

  // 9. Sorting
  // Priority Rank weight: VERIFIED_PARENT (4), VERIFIED_SUBSIDIARY (3), PENDING (2), NO_GROUP (1), INSUFFICIENT (0)
  const priorityWeight: Record<GroupEmploymentPriority, number> = {
    VERIFIED_PARENT: 4,
    VERIFIED_SUBSIDIARY: 3,
    PENDING_VERIFICATION: 2,
    NO_GROUP_HISTORY: 1,
    INSUFFICIENT_DATA: 0,
  };

  results.sort((a, b) => {
    let comp = 0;
    if (sortField === 'priority') {
      comp = priorityWeight[b.groupPriority] - priorityWeight[a.groupPriority];
      // Tie breaker by experience
      if (comp === 0) {
        comp = b.yearsOfExperience - a.yearsOfExperience;
      }
    } else if (sortField === 'experience') {
      comp = a.yearsOfExperience - b.yearsOfExperience;
    } else if (sortField === 'completeness') {
      comp = a.profileCompleteness - b.profileCompleteness;
    } else if (sortField === 'registeredAt') {
      comp = a.registeredAt.localeCompare(b.registeredAt);
    } else if (sortField === 'fullName') {
      comp = a.fullName.localeCompare(b.fullName, 'fa');
    }

    return sortDirection === 'desc' ? (sortField === 'priority' ? comp : -comp) : (sortField === 'priority' ? -comp : comp);
  });

  return results;
}

export async function getApplicantById(id: string): Promise<Applicant | null> {
  await new Promise((resolve) => setTimeout(resolve, 20));
  const found = store.applicants.find((a) => a.id === id);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

export async function createApplicant(data: Omit<Applicant, 'id' | 'registeredAt' | 'updatedAt'>): Promise<Applicant> {
  const newId = `APP-1403-${store.applicants.length + 101}`;
  const nowJalali = '۱۴۰۳/۰۸/۱۲';

  const newApplicant: Applicant = {
    ...data,
    id: newId,
    registeredAt: nowJalali,
    updatedAt: nowJalali,
  };

  store.applicants.unshift(newApplicant);
  store.syncCandidacies();

  // Audit event
  await logAuditEvent({
    actorName: 'مدیر سامانه (شبیه‌سازی)',
    actorRole: 'مدیر سامانه',
    category: 'APPLICANT',
    categoryLabel: 'بانک متقاضیان',
    recordIdentifier: newId,
    summary: `ایجاد پرونده جدید برای ${newApplicant.fullName}`,
    details: `ثبت متقاضی با عنوان ${newApplicant.primaryJobTitle} در شهر ${newApplicant.residentialCity}`,
    outcome: 'SUCCESS',
  });

  return newApplicant;
}

export async function updateApplicant(id: string, updates: Partial<Applicant>): Promise<Applicant> {
  const index = store.applicants.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error('متقاضی با این شناسه یافت نشد.');
  }

  const updated: Applicant = {
    ...store.applicants[index],
    ...updates,
    updatedAt: '۱۴۰۳/۰۸/۱۲',
  };

  store.applicants[index] = updated;
  store.syncCandidacies();

  await logAuditEvent({
    actorName: 'مدیر سامانه (شبیه‌سازی)',
    actorRole: 'مدیر سامانه',
    category: 'APPLICANT',
    categoryLabel: 'بانک متقاضیان',
    recordIdentifier: id,
    summary: `ویرایش اطلاعات متقاضی ${updated.fullName}`,
    outcome: 'SUCCESS',
  });

  return updated;
}

export async function updateEmploymentVerification(
  applicantId: string,
  employmentRecordId: string,
  newStatus: VerificationStatus,
  reviewerNotes: string,
  reviewerName: string
): Promise<Applicant> {
  const applicant = store.applicants.find((a) => a.id === applicantId);
  if (!applicant) throw new Error('متقاضی یافت نشد.');

  const empRecord = applicant.employmentHistory.find((e) => e.id === employmentRecordId);
  if (!empRecord) throw new Error('سابقه شغلی مورد نظر یافت نشد.');

  empRecord.verificationStatus = newStatus;
  empRecord.verificationNotes = reviewerNotes;
  empRecord.verifiedAt = '۱۴۰۳/۰۸/۱۲';
  empRecord.verifiedBy = reviewerName;

  // Re-calculate Group Priority for applicant
  const verifiedParent = applicant.employmentHistory.some(
    (e) => e.isGroupEntity && e.groupEntityType === 'PARENT' && e.verificationStatus === 'VERIFIED'
  );
  const verifiedSub = applicant.employmentHistory.some(
    (e) => e.isGroupEntity && e.groupEntityType === 'SUBSIDIARY' && e.verificationStatus === 'VERIFIED'
  );
  const pendingAny = applicant.employmentHistory.some(
    (e) => e.isGroupEntity && e.verificationStatus === 'PENDING'
  );

  if (verifiedParent) {
    applicant.groupPriority = 'VERIFIED_PARENT';
    applicant.groupPriorityReason = 'دارای سابقه همکاری تأییدشده در ستاد سازمان مادر';
  } else if (verifiedSub) {
    applicant.groupPriority = 'VERIFIED_SUBSIDIARY';
    applicant.groupPriorityReason = 'دارای سابقه همکاری تأییدشده در شرکت‌های زیرمجموعه سازمان';
  } else if (pendingAny) {
    applicant.groupPriority = 'PENDING_VERIFICATION';
    applicant.groupPriorityReason = 'سوابق سازمانی در انتظار بررسی و استعلام کارگزینی است';
  } else {
    applicant.groupPriority = 'NO_GROUP_HISTORY';
    applicant.groupPriorityReason = 'فاقد سابقه همکاری تاییدشده در مجموعه سازمان';
  }

  applicant.updatedAt = '۱۴۰۳/۰۸/۱۲';

  await logAuditEvent({
    actorName: reviewerName,
    actorRole: 'مدیر سامانه',
    category: 'VERIFICATION',
    categoryLabel: 'تأییدیه سابقه',
    recordIdentifier: employmentRecordId,
    summary: `تغییر وضعیت تایید سابقه شغلی در پرونده ${applicant.fullName} به ${
      newStatus === 'VERIFIED' ? 'تاییدشده' : newStatus === 'PENDING' ? 'در انتظار تایید' : 'ردشده'
    }`,
    details: reviewerNotes,
    outcome: 'SUCCESS',
  });

  return { ...applicant };
}

export async function addMockAttachment(
  applicantId: string,
  newAttachment: Omit<Attachment, 'id' | 'uploadedAt' | 'applicantId'>
): Promise<Attachment> {
  const applicant = store.applicants.find((a) => a.id === applicantId);
  if (!applicant) throw new Error('متقاضی یافت نشد.');

  const attachmentId = `ATT-${Date.now().toString().slice(-6)}`;
  const att: Attachment = {
    ...newAttachment,
    id: attachmentId,
    applicantId,
    uploadedAt: '۱۴۰۳/۰۸/۱۲',
  };

  // If set as primary resume, demote existing primary
  if (att.isPrimaryResume) {
    applicant.attachments.forEach((a) => {
      if (a.isPrimaryResume) {
        a.isPrimaryResume = false;
        a.category = 'PREVIOUS_RESUME';
        a.categoryLabel = 'نسخه قبلی رزومه';
      }
    });
  }

  applicant.attachments.unshift(att);

  await logAuditEvent({
    actorName: att.uploaderName,
    actorRole: 'مدیر سامانه',
    category: 'ATTACHMENT',
    categoryLabel: 'مدیریت اسناد',
    recordIdentifier: attachmentId,
    summary: `بارگذاری پیوست "${att.title}" برای ${applicant.fullName}`,
    details: `فایل ${att.originalFileName} (${att.formattedSize}) اضافه گردید.`,
    outcome: 'SUCCESS',
  });

  return att;
}

export async function deleteMockAttachment(applicantId: string, attachmentId: string): Promise<boolean> {
  const applicant = store.applicants.find((a) => a.id === applicantId);
  if (!applicant) return false;

  const initialLen = applicant.attachments.length;
  applicant.attachments = applicant.attachments.filter((a) => a.id !== attachmentId);
  return applicant.attachments.length < initialLen;
}

export async function listVacancies(): Promise<Vacancy[]> {
  await new Promise((resolve) => setTimeout(resolve, 20));
  store.syncCandidacies();
  return JSON.parse(JSON.stringify(store.vacancies));
}

export async function getVacancyById(id: string): Promise<Vacancy | null> {
  await new Promise((resolve) => setTimeout(resolve, 20));
  store.syncCandidacies();
  const v = store.vacancies.find((item) => item.id === id);
  return v ? JSON.parse(JSON.stringify(v)) : null;
}

export async function createVacancy(data: Omit<Vacancy, 'id' | 'openedAt' | 'applicantCount' | 'shortlistedCount' | 'candidacies'>): Promise<Vacancy> {
  const newId = `VAC-${store.vacancies.length + 101}`;
  const nowJalali = '۱۴۰۳/۰۸/۱۲';

  const newVacancy: Vacancy = {
    ...data,
    id: newId,
    openedAt: nowJalali,
    applicantCount: 0,
    shortlistedCount: 0,
    candidacies: [],
  };

  store.vacancies.unshift(newVacancy);

  await logAuditEvent({
    actorName: 'مدیر سامانه',
    actorRole: 'مدیر سامانه',
    category: 'VACANCY',
    categoryLabel: 'فرصت‌های شغلی',
    recordIdentifier: newId,
    summary: `ایجاد فرصت شغلی جدید: ${newVacancy.title}`,
    details: `${newVacancy.organizationName} - شهر ${newVacancy.city}`,
    outcome: 'SUCCESS',
  });

  return newVacancy;
}

export async function updateVacancyStatus(vacancyId: string, status: Vacancy['status']): Promise<Vacancy> {
  const vac = store.vacancies.find((v) => v.id === vacancyId);
  if (!vac) throw new Error('فرصت شغلی یافت نشد.');
  vac.status = status;
  return { ...vac };
}

export async function linkApplicantToVacancy(
  vacancyId: string,
  applicantId: string,
  initialStage: CandidacyStage = 'NEW',
  notes = ''
): Promise<void> {
  const applicant = store.applicants.find((a) => a.id === applicantId);
  const vacancy = store.vacancies.find((v) => v.id === vacancyId);
  if (!applicant || !vacancy) throw new Error('متقاضی یا فرصت شغلی یافت نشد.');

  // Check if already linked
  const existing = applicant.candidacies.find((c) => c.vacancyId === vacancyId);
  if (existing) {
    existing.stage = initialStage;
    existing.notes = notes;
  } else {
    applicant.candidacies.push({
      id: `CND-${Date.now().toString().slice(-6)}`,
      applicantId,
      vacancyId,
      vacancyTitle: vacancy.title,
      appliedDate: '۱۴۰۳/۰۸/۱۲',
      stage: initialStage,
      stageLabel: getStageLabel(initialStage),
      notes,
      matchScorePercent: calculateMockMatch(applicant, vacancy),
    });
  }

  store.syncCandidacies();

  await logAuditEvent({
    actorName: 'مدیر سامانه',
    actorRole: 'مدیر سامانه',
    category: 'VACANCY',
    categoryLabel: 'فرصت‌های شغلی',
    recordIdentifier: vacancyId,
    summary: `معرفی متقاضی ${applicant.fullName} به فرصت "${vacancy.title}"`,
    outcome: 'SUCCESS',
  });
}

export async function updateCandidacyStage(
  vacancyId: string,
  applicantId: string,
  newStage: CandidacyStage,
  notes = ''
): Promise<void> {
  const applicant = store.applicants.find((a) => a.id === applicantId);
  if (!applicant) return;

  const cand = applicant.candidacies.find((c) => c.vacancyId === vacancyId);
  if (cand) {
    cand.stage = newStage;
    cand.stageLabel = getStageLabel(newStage);
    if (notes) cand.notes = notes;
  }

  store.syncCandidacies();

  await logAuditEvent({
    actorName: 'مدیر سامانه',
    actorRole: 'مدیر سامانه',
    category: 'VACANCY',
    categoryLabel: 'فرصت‌های شغلی',
    recordIdentifier: vacancyId,
    summary: `تغییر مرحله بررسی ${applicant.fullName} به ${getStageLabel(newStage)}`,
    details: notes,
    outcome: 'SUCCESS',
  });
}

function getStageLabel(stage: CandidacyStage): string {
  switch (stage) {
    case 'NEW':
      return 'جدید';
    case 'SCREENING':
      return 'در حال بررسی';
    case 'INTERVIEW':
      return 'مرحله مصاحبه';
    case 'SHORTLIST':
      return 'فهرست نهایی';
    case 'ACCEPTED':
      return 'پذیرفته‌شده';
    case 'REJECTED':
      return 'ردشده';
    case 'WITHDRAWN':
      return 'انصراف';
    default:
      return stage;
  }
}

/**
 * Transparent demonstration match calculator (No AI / opaque math)
 */
export function calculateMockMatch(applicant: Applicant, vacancy: Vacancy): number {
  let score = 50;

  // City match
  if (applicant.residentialCity === vacancy.city) score += 15;

  // Experience match
  if (applicant.yearsOfExperience >= vacancy.minimumYearsExperience) score += 15;

  // Priority bonus (transparent rule)
  if (applicant.groupPriority === 'VERIFIED_PARENT') score += 15;
  else if (applicant.groupPriority === 'VERIFIED_SUBSIDIARY') score += 10;

  // Skills intersection
  const appSkillNames = applicant.skills.map((s) => s.name.toLowerCase());
  const matchedRequired = vacancy.requiredSkills.filter((rs) =>
    appSkillNames.some((as) => as.includes(rs.toLowerCase()))
  );
  if (vacancy.requiredSkills.length > 0) {
    score += Math.round((matchedRequired.length / vacancy.requiredSkills.length) * 15);
  }

  return Math.min(score, 99);
}

export async function listSubsidiaries(): Promise<Subsidiary[]> {
  return JSON.parse(JSON.stringify(store.subsidiaries));
}

export async function createSubsidiary(data: Omit<Subsidiary, 'id'>): Promise<Subsidiary> {
  const newSub: Subsidiary = {
    ...data,
    id: `SUB-${store.subsidiaries.length + 10}`,
  };
  store.subsidiaries.push(newSub);
  return newSub;
}

export async function listProjects(): Promise<Project[]> {
  return JSON.parse(JSON.stringify(store.projects));
}

export async function listUsers(): Promise<User[]> {
  return JSON.parse(JSON.stringify(store.users));
}

export async function updateUserRole(userId: string, newRole: User['role']): Promise<User> {
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error('کاربر یافت نشد.');
  user.role = newRole;
  user.roleTitle = newRole === 'ADMIN' ? 'مدیر سامانه' : 'کاربر مشاهده‌گر منابع انسانی';

  await logAuditEvent({
    actorName: 'مدیر سامانه',
    actorRole: 'مدیر سامانه',
    category: 'USER',
    categoryLabel: 'مدیریت کاربران',
    recordIdentifier: userId,
    summary: `تغییر نقش دسترسی کاربر ${user.name} به ${user.roleTitle}`,
    outcome: 'SUCCESS',
  });

  return { ...user };
}

export async function toggleUserStatus(userId: string): Promise<User> {
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error('کاربر یافت نشد.');
  user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return { ...user };
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  return JSON.parse(JSON.stringify(store.auditEvents));
}

export async function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
  const newEvent: AuditEvent = {
    ...event,
    id: `AUD-${Date.now().toString().slice(-5)}`,
    timestamp: '۱۴۰۳/۰۸/۱۲ - ۱۲:۰۰',
  };
  store.auditEvents.unshift(newEvent);
}

export async function getControlledVocabulary(): Promise<ControlledVocabulary> {
  return JSON.parse(JSON.stringify(store.vocabulary));
}

export async function updateControlledVocabulary(vocab: ControlledVocabulary): Promise<void> {
  store.vocabulary = { ...vocab };
}

export interface DashboardMetrics {
  totalApplicants: number;
  newThisMonth: number;
  verifiedParentCount: number;
  verifiedSubsidiaryCount: number;
  pendingVerificationCount: number;
  externalOnlyCount: number;
  incompleteProfilesCount: number;
  openVacanciesCount: number;
  categoryDistribution: { category: string; count: number; percentage: number }[];
  cityDistribution: { city: string; count: number }[];
  recruitmentStatusDistribution: { status: string; label: string; count: number }[];
  recentApplicants: Applicant[];
  openVacancies: Vacancy[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 20));
  const applicants = store.applicants;
  const total = applicants.length;

  const verifiedParentCount = applicants.filter((a) => a.groupPriority === 'VERIFIED_PARENT').length;
  const verifiedSubsidiaryCount = applicants.filter((a) => a.groupPriority === 'VERIFIED_SUBSIDIARY').length;
  const pendingVerificationCount = applicants.filter((a) => a.groupPriority === 'PENDING_VERIFICATION').length;
  const externalOnlyCount = applicants.filter((a) => a.groupPriority === 'NO_GROUP_HISTORY').length;
  const incompleteProfilesCount = applicants.filter((a) => a.profileCompleteness < 70).length;

  // Category counts
  const catMap: Record<string, number> = {};
  applicants.forEach((a) => {
    catMap[a.primaryJobCategory] = (catMap[a.primaryJobCategory] || 0) + 1;
  });
  const categoryDistribution = Object.entries(catMap)
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / (total || 1)) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // City counts
  const cityMap: Record<string, number> = {};
  applicants.forEach((a) => {
    cityMap[a.residentialCity] = (cityMap[a.residentialCity] || 0) + 1;
  });
  const cityDistribution = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  // Status counts
  const statusLabels: Record<RecruitmentStatus, string> = {
    NEW: 'جدید',
    UNDER_REVIEW: 'در حال بررسی',
    INTERVIEWING: 'مصاحبه',
    SHORTLISTED: 'فهرست نهایی',
    OFFERED: 'پیشنهاد کار',
    HIRED: 'استخدام‌شده',
    REJECTED: 'عدم احراز',
    ARCHIVED: 'بایگانی',
  };
  const statusMap: Record<string, number> = {};
  applicants.forEach((a) => {
    statusMap[a.recruitmentStatus] = (statusMap[a.recruitmentStatus] || 0) + 1;
  });
  const recruitmentStatusDistribution = Object.entries(statusLabels).map(([status, label]) => ({
    status,
    label,
    count: statusMap[status] || 0,
  }));

  const openVacancies = store.vacancies.filter((v) => v.status === 'OPEN').slice(0, 4);
  const recentApplicants = [...applicants].slice(0, 6);

  return {
    totalApplicants: total,
    newThisMonth: 6,
    verifiedParentCount,
    verifiedSubsidiaryCount,
    pendingVerificationCount,
    externalOnlyCount,
    incompleteProfilesCount,
    openVacanciesCount: store.vacancies.filter((v) => v.status === 'OPEN').length,
    categoryDistribution,
    cityDistribution,
    recruitmentStatusDistribution,
    recentApplicants,
    openVacancies,
  };
}
