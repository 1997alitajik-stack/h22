/**
 * RASTA domain types — mirrors the Supabase schema (supabase/migrations/0001).
 */

export type UserRole = 'ADMIN' | 'VIEWER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'NOT_APPLICABLE';
export type GroupEntityType = 'PARENT' | 'SUBSIDIARY' | 'EXTERNAL';
export type GroupPriority =
  | 'VERIFIED_PARENT'
  | 'VERIFIED_SUBSIDIARY'
  | 'PENDING_VERIFICATION'
  | 'NO_GROUP_HISTORY'
  | 'INSUFFICIENT_DATA';
export type RecruitmentStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'INTERVIEWING'
  | 'SHORTLISTED'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'ARCHIVED';
export type DegreeLevel = 'UNDER_DIPLOMA' | 'DIPLOMA' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'DOCTORATE';
export type CandidacyStage = 'NEW' | 'SCREENING' | 'INTERVIEW' | 'SHORTLIST' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type VacancyStatus = 'OPEN' | 'IN_PROGRESS' | 'FILLED' | 'CANCELLED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTUAL' | 'PROJECT_BASED';
export type AttachmentCategory =
  | 'PRIMARY_RESUME'
  | 'PREVIOUS_RESUME'
  | 'SUPPLEMENTARY_RESUME'
  | 'ID_PHOTO'
  | 'DEGREE_CERTIFICATE'
  | 'TRANSCRIPT'
  | 'TRAINING_CERTIFICATE'
  | 'TECHNICAL_CERTIFICATE'
  | 'ORGANIZATION_RECORD'
  | 'OTHER';
export type SkillCategory = 'TECHNICAL' | 'MANAGERIAL' | 'GENERAL' | 'TOOL_SOFTWARE';
export type SkillLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type OrgType = 'PARENT' | 'SUBSIDIARY';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'PLANNING';

/** Session user as resolved on the server (profile + role + status). */
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
  role: UserRole;
  department: string | null;
}

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  role: UserRole;
  status: AccountStatus;
  department: string | null;
  created_at: string;
  updated_at: string;
}

/** Applicant as rendered in lists — masked values only; full PII never leaves the server for viewers. */
export interface ApplicantListRow {
  id: string;
  public_code: string;
  full_name: string;
  primary_job_title: string;
  primary_job_category: string;
  residential_city: string | null;
  years_of_experience: number;
  highest_degree: DegreeLevel | null;
  highest_degree_title: string | null;
  group_priority: GroupPriority;
  group_priority_reason: string;
  recruitment_status: RecruitmentStatus;
  completeness: number;
  created_at: string;
}

export interface ApplicantFilters {
  q?: string;
  city?: string;
  category?: string;
  priority?: GroupPriority;
  status?: RecruitmentStatus;
  degree?: DegreeLevel;
  minExp?: number;
  maxExp?: number;
  hasParent?: boolean;
  hasSubsidiary?: boolean;
  page?: number;
  pageSize?: number;
  sort?: 'priority' | 'experience' | 'registeredAt' | 'fullName' | 'completeness';
  dir?: 'asc' | 'desc';
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EmploymentRow {
  id: string;
  applicant_id: string;
  employer_name: string;
  is_group_entity: boolean;
  group_entity_type: GroupEntityType;
  project_name: string | null;
  city: string | null;
  job_title: string;
  start_date_jalali: string;
  end_date_jalali: string | null;
  is_current: boolean;
  responsibilities: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  verified_at: string | null;
  last_salary?: string | null;
  reason_for_leaving?: string | null;
}

export interface EducationRow {
  id: string;
  degree_level: DegreeLevel;
  degree_title: string | null;
  field_of_study: string | null;
  institution_name: string | null;
  city: string | null;
  start_date_jalali: string | null;
  end_date_jalali: string | null;
  is_studying: boolean;
  gpa: string | null;
}

export interface CertificateRow {
  id: string;
  title: string;
  issuing_organization: string | null;
  issue_date_jalali: string | null;
  expiry_date_jalali: string | null;
  certificate_type: string | null;
  verification_status: VerificationStatus;
}

export interface SkillRow {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
}

export interface PreferencesRow {
  preferred_titles: string[];
  preferred_cities: string[];
  willing_to_relocate: boolean;
  willing_to_travel_sites: boolean;
  employment_types: string[];
  expected_salary_min: string | null;
  availability_timeline: string | null;
}

export interface AttachmentRow {
  id: string;
  applicant_id: string;
  title: string;
  category: AttachmentCategory;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  is_primary_resume: boolean;
  version_number: number | null;
  notes: string | null;
  uploaded_at: string;
  uploader_name: string | null;
}

export interface CandidacyRow {
  id: string;
  applicant_id: string;
  vacancy_id: string;
  stage: CandidacyStage;
  notes: string | null;
  match_score: number | null;
  match_breakdown: MatchBreakdown | null;
  applied_at: string;
}

export interface MatchBreakdown {
  base: number;
  categoryMatch: number;
  titleMatch: number;
  cityMatch: number;
  experienceMatch: number;
  priorityBonus: number;
  organizationMatch: number;
  skillsMatch: number;
  preferredCityMatch: number;
  degreeMatch: number;
  matchedSkills: string[];
  missingSkills: string[];
  total: number;
}

export interface NoteRow {
  id: string;
  author_name: string;
  author_role: string;
  content: string;
  is_confidential: boolean;
  created_at: string;
}

/** Full applicant detail — sensitive block present only for admin unmask actions. */
export interface ApplicantDetail {
  id: string;
  public_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  father_name: string | null;
  birth_date_jalali: string | null;
  birth_place: string | null;
  residential_city: string | null;
  email: string | null;
  primary_job_title: string;
  primary_job_category: string;
  years_of_experience: number;
  highest_degree: DegreeLevel | null;
  highest_degree_title: string | null;
  highest_field_of_study: string | null;
  recruitment_status: RecruitmentStatus;
  group_priority: GroupPriority;
  group_priority_reason: string;
  completeness: number;
  created_at: string;
  updated_at: string;
  /** Masked server-side; null when the underlying value is absent. */
  national_id_masked: string | null;
  phone_masked: string | null;
  photo_url: string | null;
  employment: EmploymentRow[];
  education: EducationRow[];
  certificates: CertificateRow[];
  skills: SkillRow[];
  preferences: PreferencesRow | null;
  attachments: AttachmentRow[];
  candidacies: (CandidacyRow & { vacancy_title: string; vacancy_code: string })[];
  notes: NoteRow[];
}

export interface VacancyListRow {
  id: string;
  code: string;
  title: string;
  category: string;
  organization_type: OrgType;
  organization_id: string | null;
  organization_name: string;
  project_name: string | null;
  archived_at: string | null;
  archive_reason: string | null;
  city: string;
  open_positions_count: number;
  employment_type: EmploymentType;
  min_years_experience: number;
  required_skills: string[];
  status: VacancyStatus;
  opened_at: string;
  applicant_count: number;
  shortlisted_count: number;
}

export interface VacancyDetail extends VacancyListRow {
  required_degree: DegreeLevel | null;
  preferred_skills: string[];
  description: string | null;
  responsibilities: string[];
  salary_range: string | null;
  candidacies: {
    id: string;
    applicant_id: string;
    applicant_name: string;
    applicant_code: string;
    applicant_city: string | null;
    years_of_experience: number;
    group_priority: GroupPriority;
    stage: CandidacyStage;
    notes: string | null;
    match_score: number | null;
    match_breakdown: MatchBreakdown | null;
    archived_at: string | null;
    archive_reason: string | null;
  }[];
}

export interface VacancyApplicantOption {
  id: string;
  public_code: string;
  full_name: string;
  primary_job_title: string;
  primary_job_category: string;
  residential_city: string | null;
  years_of_experience: number;
  group_priority: GroupPriority;
  match_score: number;
  match_breakdown: MatchBreakdown;
  is_recommended: boolean;
}

export interface OrganizationSettings {
  id: number;
  parent_name: string;
  auto_archive_enabled: boolean;
  auto_archive_days: number;
  updated_at: string | null;
}

export interface OrganizationRow {
  id: string;
  code: string;
  name_fa: string;
  name_en: string | null;
  field: string | null;
  city: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  project_count: number;
  projects: { id: string; name: string; city: string | null; status: ProjectStatus }[];
}

export interface AuditRow {
  id: string;
  created_at: string;
  channel: 'ADMIN_SECURITY' | 'CLIENT_ACTIVITY';
  category: string;
  actor_name: string;
  actor_role: string;
  record_identifier: string | null;
  summary: string;
  details: string | null;
  outcome: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface Vocabularies {
  cities: string[];
  job_categories: string[];
}

export interface DashboardMetrics {
  total_applicants: number;
  new_this_month: number;
  verified_parent: number;
  verified_subsidiary: number;
  pending_verification: number;
  no_group_history: number;
  insufficient_data: number;
  incomplete_profiles: number;
  open_vacancies: number;
  category_distribution: { category: string; count: number }[];
  city_distribution: { city: string; count: number }[];
  status_distribution: { status: RecruitmentStatus; count: number }[];
  recent_applicants: ApplicantListRow[];
  open_vacancy_list: VacancyListRow[];
}
