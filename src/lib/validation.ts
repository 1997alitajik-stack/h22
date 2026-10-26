/**
 * Zod schemas validating every untrusted input before it reaches the database.
 * Jalali date format: canonical zero-padded 13XX/14XX/15XX so lexical order
 * matches chronological order (mirrors the SQL CHECK constraints).
 */
import { z } from 'zod';
import { toEnglishDigits } from '@/lib/persian';

const JALALI_DATE = /^1[2-5][0-9]{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/;

/** Accepts Persian or ASCII digits, normalizes to ASCII, validates format. */
export const jalaliDate = z
  .string()
  .trim()
  .transform(toEnglishDigits)
  .refine((v) => v === '' || JALALI_DATE.test(v), 'قالب تاریخ معتبر نیست (مثال: ۱۳۷۰/۰۵/۱۴)')
  .transform((v) => (v === '' ? undefined : v));

const nameField = (max: number) =>
  z.string().trim().min(1, 'الزامی است').max(max, `حداکثر ${max} نویسه`);

export const nationalIdSchema = z
  .string()
  .trim()
  .transform(toEnglishDigits)
  .refine((v) => v === '' || /^\d{10}$/.test(v), 'کد ملی باید ۱۰ رقم باشد')
  .transform((v) => (v === '' ? undefined : v));

export const phoneSchema = z
  .string()
  .trim()
  .transform(toEnglishDigits)
  .refine((v) => v === '' || /^\d{8,14}$/.test(v), 'شماره تماس معتبر نیست')
  .transform((v) => (v === '' ? undefined : v));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'نشانی ایمیل معتبر نیست')
  .transform((v) => (v === '' ? undefined : v));

export const degreeEnum = z.enum([
  'UNDER_DIPLOMA',
  'DIPLOMA',
  'ASSOCIATE',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
]);

export const recruitmentStatusEnum = z.enum([
  'NEW',
  'UNDER_REVIEW',
  'INTERVIEWING',
  'SHORTLISTED',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'ARCHIVED',
]);

export const employmentRecordSchema = z.object({
  id: z.string().uuid().optional(),
  employerName: z.string().trim().min(1, 'نام کارفرما الزامی است').max(200),
  isGroupEntity: z.boolean().default(false),
  groupEntityType: z.enum(['PARENT', 'SUBSIDIARY', 'EXTERNAL']).default('EXTERNAL'),
  organizationId: z.string().uuid().optional().nullable(),
  projectName: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  jobTitle: z.string().trim().min(1, 'عنوان شغلی الزامی است').max(150),
  startDate: jalaliDate,
  endDate: jalaliDate.optional(),
  isCurrent: z.boolean().default(false),
  responsibilities: z.string().trim().max(4000).optional(),
  lastSalary: z.string().trim().max(100).optional(),
  reasonForLeaving: z.string().trim().max(1000).optional(),
});

export const educationRecordSchema = z.object({
  id: z.string().uuid().optional(),
  degreeLevel: degreeEnum,
  degreeTitle: z.string().trim().max(200).optional(),
  fieldOfStudy: z.string().trim().max(200).optional(),
  institutionName: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  startDate: jalaliDate.optional(),
  endDate: jalaliDate.optional(),
  isStudying: z.boolean().default(false),
  gpa: z
    .string()
    .trim()
    .transform(toEnglishDigits)
    .refine((v) => v === '' || /^\d{0,2}(\.\d{1,3})?$/.test(v), 'معدل معتبر نیست')
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
});

export const applicantFormSchema = z
  .object({
    firstName: nameField(80),
    lastName: nameField(80),
    fatherName: z.string().trim().max(80).optional(),
    nationalId: nationalIdSchema.optional(),
    birthDate: jalaliDate.optional(),
    birthPlace: z.string().trim().max(120).optional(),
    residentialCity: z.string().trim().min(1, 'شهر سکونت الزامی است').max(80),
    homeAddress: z.string().trim().max(500).optional(),
    phone: phoneSchema.optional(),
    alternativePhone: phoneSchema.optional(),
    email: emailSchema.optional(),
    primaryJobTitle: z.string().trim().min(2, 'عنوان شغلی الزامی است').max(150),
    primaryJobCategory: z.string().trim().min(1, 'حوزه شغلی الزامی است').max(150),
    yearsOfExperience: z.coerce.number().int().min(0).max(60),
    employment: z.array(employmentRecordSchema).max(50).default([]),
    education: z.array(educationRecordSchema).max(20).default([]),
    skillsCsv: z.string().trim().max(2000).default(''),
    preferredTitlesCsv: z.string().trim().max(1000).default(''),
    expectedSalaryMin: z.string().trim().max(100).optional(),
    willingToTravelSites: z.boolean().default(false),
    willingToRelocate: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    for (const [i, emp] of data.employment.entries()) {
      if (!emp.isCurrent && !emp.endDate && emp.startDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['employment', i, 'endDate'],
          message: 'تاریخ پایان برای سابقه پایان‌یافته الزامی است',
        });
      }
      if (
        emp.isGroupEntity &&
        (emp.groupEntityType === 'SUBSIDIARY') &&
        !emp.organizationId
      ) {
        // Subsidiary history without a linked organization still allowed —
        // employer name is authoritative; organization link enriches reporting.
      }
    }
    for (const [i, edu] of data.education.entries()) {
      if (!edu.isStudying && edu.startDate && edu.endDate && edu.startDate > edu.endDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['education', i, 'endDate'],
          message: 'تاریخ پایان تحصیل پیش از تاریخ شروع است',
        });
      }
    }
  });

export type ApplicantFormValues = z.infer<typeof applicantFormSchema>;

export const verifyEmploymentSchema = z.object({
  recordId: z.string().uuid(),
  status: z.enum(['VERIFIED', 'PENDING', 'REJECTED']),
  notes: z.string().trim().max(2000).default(''),
});

export const vacancyFormSchema = z
  .object({
    title: z.string().trim().min(2, 'عنوان الزامی است').max(200),
    code: z.string().trim().max(60).optional(),
    category: z.string().trim().min(1, 'حوزه شغلی الزامی است').max(150),
    organizationType: z.enum(['PARENT', 'SUBSIDIARY']),
    organizationId: z.string().uuid().optional().nullable(),
    organizationName: z.string().trim().min(2, 'نام هلدینگ یا شرکت الزامی است').max(200),
    projectId: z.string().uuid().optional().nullable(),
    city: z.string().trim().min(1, 'شهر الزامی است').max(80),
    openPositionsCount: z.coerce.number().int().min(1).max(100).default(1),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTUAL', 'PROJECT_BASED']).default('FULL_TIME'),
    requiredDegree: degreeEnum.optional().nullable(),
    minYearsExperience: z.coerce.number().int().min(0).max(40).default(0),
    requiredSkillsCsv: z.string().trim().max(1000).default(''),
    preferredSkillsCsv: z.string().trim().max(1000).default(''),
    description: z.string().trim().max(4000).optional(),
    salaryRange: z.string().trim().max(100).optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'FILLED', 'CANCELLED']).default('OPEN'),
  })
  .superRefine((data, ctx) => {
    if (data.organizationType === 'SUBSIDIARY' && !data.organizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message: 'برای فرصت شغلی شرکت زیرمجموعه، انتخاب شرکت الزامی است.',
      });
    }
    if (data.organizationType === 'PARENT' && data.organizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message: 'فرصت هلدینگ مادر نباید به شرکت زیرمجموعه متصل شود.',
      });
    }
    if (data.organizationType === 'PARENT' && data.projectId) {
      ctx.addIssue({
        code: 'custom',
        path: ['projectId'],
        message: 'پروژه باید به یکی از شرکت‌های زیرمجموعه متصل باشد.',
      });
    }
    if (data.organizationType === 'SUBSIDIARY' && data.projectId && !data.organizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['projectId'],
        message: 'ابتدا شرکت زیرمجموعه را انتخاب کنید.',
      });
    }
  });

export const linkCandidacySchema = z.object({
  vacancyId: z.string().uuid(),
  applicantId: z.string().uuid(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateStageSchema = z.object({
  candidacyId: z.string().uuid(),
  stage: z.enum(['NEW', 'SCREENING', 'INTERVIEW', 'SHORTLIST', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']),
  notes: z.string().trim().max(2000).optional(),
});

export const noteSchema = z.object({
  applicantId: z.string().uuid(),
  content: z.string().trim().min(1, 'متن یادداشت الزامی است').max(4000),
  isConfidential: z.boolean().default(false),
});

export const organizationSchema = z.object({
  nameFa: z.string().trim().min(2, 'نام شرکت الزامی است').max(200),
  code: z.string().trim().min(2).max(60),
  field: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  isSubsidiary: z.boolean().default(true),
});

export const organizationUpdateSchema = organizationSchema.extend({
  organizationId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const deleteOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
});

export const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, 'نام پروژه الزامی است').max(200),
  city: z.string().trim().max(80).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PLANNING']).default('ACTIVE'),
});

export const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(2, 'نام پروژه الزامی است').max(200),
  city: z.string().trim().max(80).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PLANNING']),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const vocabUpdateSchema = z.object({
  key: z.enum(['cities', 'job_categories']),
  action: z.enum(['add', 'remove']),
  value: z.string().trim().min(1, 'مقدار الزامی است').max(150),
});

export const userRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['ADMIN', 'VIEWER']),
});

export const userStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const createUserSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2, 'نام کامل الزامی است').max(120),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,60}$/, 'نام کاربری فقط حروف لاتین، رقم، نقطه و خط تیره')
    .optional(),
  role: z.enum(['ADMIN', 'VIEWER']),
  department: z.string().trim().max(200).optional(),
  password: z.string().min(10, 'کلمه عبور حداقل ۱۰ نویسه').max(128),
});

export const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(10, 'کلمه عبور حداقل ۱۰ نویسه').max(128),
});

export const userAccountUpdateSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email('نشانی ایمیل معتبر نیست').max(254),
  fullName: z.string().trim().min(2, 'نام کامل الزامی است').max(120),
  username: z.string().trim().toLowerCase().transform((v) => v || undefined)
    .refine((v) => v === undefined || /^[a-z0-9._-]{3,60}$/.test(v), 'نام کاربری فقط حروف لاتین، رقم، نقطه و خط تیره'),
  department: z.string().trim().max(200).transform((v) => v || undefined),
});

export const ownProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'نام کامل الزامی است').max(120),
  username: z.string().trim().toLowerCase().transform((v) => v || undefined)
    .refine((v) => v === undefined || /^[a-z0-9._-]{3,60}$/.test(v), 'نام کاربری فقط حروف لاتین، رقم، نقطه و خط تیره'),
  department: z.string().trim().max(200).transform((v) => v || undefined),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'نشانی ایمیل الزامی است'),
  password: z.string().min(1, 'کلمه عبور الزامی است'),
});

export const setupSchema = z.object({
  token: z.string().min(10, 'توکن راه‌اندازی نامعتبر است'),
  email: emailSchema,
  fullName: z.string().trim().min(2, 'نام کامل الزامی است').max(120),
  password: z.string().min(10, 'کلمه عبور حداقل ۱۰ نویسه').max(128),
});

export const documentUploadSchema = z.object({
  applicantId: z.string().uuid(),
  category: z.enum([
    'PRIMARY_RESUME',
    'SUPPLEMENTARY_RESUME',
    'ID_PHOTO',
    'DEGREE_CERTIFICATE',
    'TRANSCRIPT',
    'TRAINING_CERTIFICATE',
    'TECHNICAL_CERTIFICATE',
    'ORGANIZATION_RECORD',
    'OTHER',
  ]),
  title: z.string().trim().min(1, 'عنوان سند الزامی است').max(200),
  isPrimaryResume: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional(),
});
