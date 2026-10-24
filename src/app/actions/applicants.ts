'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireUser } from '@/lib/auth';
import { adminAudit, clientAudit } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { applicantFormSchema, noteSchema, verifyEmploymentSchema, documentUploadSchema } from '@/lib/validation';
import type { ApplicantFormValues } from '@/lib/validation';
import { splitList } from '@/lib/persian';
import { uploadApplicantDocument, deleteApplicantDocument } from '@/server/documents';
import type { DegreeLevel } from '@/types';

export interface ApplicantActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  applicantId?: string;
}

export interface ActionState {
  ok: boolean;
  error?: string;
}

function toPayload(values: ApplicantFormValues, highest?: { degree: DegreeLevel; title: string; field: string }): Record<string, unknown> {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    father_name: values.fatherName ?? '',
    birth_date: values.birthDate ?? '',
    birth_place: values.birthPlace ?? '',
    residential_city: values.residentialCity,
    email: values.email ?? '',
    national_id: values.nationalId ?? '',
    home_address: values.homeAddress ?? '',
    phone: values.phone ?? '',
    alternative_phone: values.alternativePhone ?? '',
    primary_job_title: values.primaryJobTitle,
    primary_job_category: values.primaryJobCategory,
    years_of_experience: values.yearsOfExperience,
    highest_degree: highest?.degree ?? '',
    highest_degree_title: highest?.title ?? '',
    highest_field_of_study: highest?.field ?? '',
    employment: values.employment.map((e) => ({
      id: e.id ?? '',
      employerName: e.employerName,
      isGroupEntity: e.isGroupEntity,
      groupEntityType: e.groupEntityType,
      organizationId: e.organizationId ?? '',
      projectName: e.projectName ?? '',
      city: e.city ?? '',
      jobTitle: e.jobTitle,
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      isCurrent: e.isCurrent,
      responsibilities: e.responsibilities ?? '',
      lastSalary: e.lastSalary ?? '',
      reasonForLeaving: e.reasonForLeaving ?? '',
    })),
    education: values.education.map((e, idx) => ({
      id: e.id ?? '',
      degreeLevel: e.degreeLevel,
      degreeTitle: e.degreeTitle ?? '',
      fieldOfStudy: e.fieldOfStudy ?? '',
      institutionName: e.institutionName ?? '',
      city: e.city ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      isStudying: e.isStudying,
      gpa: e.gpa ?? '',
      sortOrder: idx,
    })),
    skills: splitList(values.skillsCsv),
    preferred_titles: splitList(values.preferredTitlesCsv),
    preferred_cities: [values.residentialCity],
    willing_to_relocate: values.willingToRelocate,
    willing_to_travel_sites: values.willingToTravelSites,
    employment_types: ['FULL_TIME'],
    expected_salary_min: values.expectedSalaryMin ?? '',
    availability_timeline: null,
  };
}

export async function createApplicantAction(
  _prev: ApplicantActionState,
  formData: FormData,
): Promise<ApplicantActionState> {
  const user = await requireAdmin('/applicants/new');

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('payload') ?? '{}'));
  } catch {
    return { ok: false, error: 'داده فرم نامعتبر است.' };
  }

  const parsed = applicantFormSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: 'برخی فیلدها معتبر نیستند؛ خطاها را برطرف کنید.',
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k.replace(/\./g, '_'), v?.[0] ?? '']),
      ),
    };
  }
  const values = parsed.data;

  const sorted = [...values.education].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  const top = sorted.at(-1);
  const payload = toPayload(
    values,
    top
      ? {
          degree: top.degreeLevel,
          title: top.degreeTitle || '',
          field: top.fieldOfStudy || '',
        }
      : undefined,
  );

  const supabase = await createSupabaseServerClient();
  const { data: newId, error } = await supabase.rpc('create_applicant_full', { p_payload: payload });
  if (error || !newId) {
    return { ok: false, error: `ثبت متقاضی ناموفق بود: ${error?.message ?? 'خطای نامشخص'}` };
  }

  await adminAudit(user, 'APPLICANT', `ایجاد پرونده جدید برای ${values.firstName} ${values.lastName}`, {
    recordIdentifier: String(newId),
    severity: 'MEDIUM',
  });

  revalidatePath('/applicants');
  revalidatePath('/');
  return { ok: true, applicantId: String(newId) };
}

export async function updateApplicantAction(
  _prev: ApplicantActionState,
  formData: FormData,
): Promise<ApplicantActionState> {
  const applicantId = String(formData.get('applicantId') ?? '');
  const user = await requireAdmin(`/applicants/${applicantId}/edit`);

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('payload') ?? '{}'));
  } catch {
    return { ok: false, error: 'داده فرم نامعتبر است.' };
  }

  const parsed = applicantFormSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: 'برخی فیلدها معتبر نیستند؛ خطاها را برطرف کنید.',
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k.replace(/\./g, '_'), v?.[0] ?? '']),
      ),
    };
  }
  const values = parsed.data;

  const sorted = [...values.education].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  const top = sorted.at(-1);
  const payload = toPayload(
    values,
    top
      ? {
          degree: top.degreeLevel,
          title: top.degreeTitle || '',
          field: top.fieldOfStudy || '',
        }
      : undefined,
  );

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('update_applicant_full', { p_id: applicantId, p_payload: payload });
  if (error) {
    return { ok: false, error: `ذخیره تغییرات ناموفق بود: ${error.message}` };
  }

  await adminAudit(user, 'APPLICANT', `ویرایش اطلاعات متقاضی ${values.firstName} ${values.lastName}`, {
    recordIdentifier: applicantId,
    severity: 'MEDIUM',
  });

  revalidatePath('/applicants');
  revalidatePath(`/applicants/${applicantId}`);
  return { ok: true, applicantId };
}

export async function updateRecruitmentStatusAction(applicantId: string, status: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('applicants')
    .update({ recruitment_status: status })
    .eq('id', applicantId);
  if (error) throw new Error(error.message);

  await adminAudit(user, 'APPLICANT', 'تغییر وضعیت فرآیند استخدام متقاضی', {
    recordIdentifier: applicantId,
    details: status,
  });
  revalidatePath(`/applicants/${applicantId}`);
}

export async function verifyEmploymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = verifyEmploymentSchema.safeParse({
    recordId: formData.get('recordId'),
    status: formData.get('status'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'داده استعلام نامعتبر است.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_verification', {
    p_record_id: parsed.data.recordId,
    p_new_status: parsed.data.status,
    p_notes: parsed.data.notes,
  });
  if (error) {
    if (error.message.includes('REJECTION_REQUIRES_REASON')) {
      return { ok: false, error: 'ثبت دلیل رد سابقه الزامی است.' };
    }
    if (error.message.includes('FORBIDDEN')) {
      return { ok: false, error: 'اجازه انجام این عملیات را ندارید.' };
    }
    return { ok: false, error: `ثبت نتیجه استعلام ناموفق بود: ${error.message}` };
  }

  revalidatePath('/applicants');
  return { ok: true };
}

export async function addNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = noteSchema.safeParse({
    applicantId: formData.get('applicantId'),
    content: formData.get('content'),
    isConfidential: formData.get('isConfidential') === 'on',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'یادداشت نامعتبر است.' };
  }

  const supabase = await createSupabaseServerClient();
  const roleLabel = user.role === 'ADMIN' ? 'مدیر سامانه' : 'کارشناس منابع انسانی';
  const { error } = await supabase.from('internal_notes').insert({
    applicant_id: parsed.data.applicantId,
    author_id: user.id,
    author_name: user.fullName,
    author_role: roleLabel,
    content: parsed.data.content,
    is_confidential: parsed.data.isConfidential,
  });
  if (error) return { ok: false, error: `ثبت یادداشت ناموفق بود: ${error.message}` };

  await adminAudit(user, 'APPLICANT', 'ثبت یادداشت اداری در پرونده متقاضی', {
    recordIdentifier: parsed.data.applicantId,
    details: parsed.data.isConfidential ? 'محرمانه' : undefined,
  });
  revalidatePath(`/applicants/${parsed.data.applicantId}`);
  return { ok: true };
}

export async function logSensitiveRevealAction(applicantId: string): Promise<void> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return;
  await adminAudit(user, 'SECURITY', 'نمایش اطلاعات حساس پرونده (کد ملی/تلفن/نشانی) توسط مدیر', {
    recordIdentifier: applicantId,
    severity: 'HIGH',
  });
}

export async function logSearchAction(term: string): Promise<void> {
  const user = await requireUser();
  await clientAudit(user, 'SEARCH_DIRECTORY', `جستجو در بانک متقاضیان: ${term.slice(0, 80)}`);
}

export async function uploadDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'فایلی انتخاب نشده است.' };
  }

  const parsed = documentUploadSchema.safeParse({
    applicantId: formData.get('applicantId'),
    category: formData.get('category'),
    title: formData.get('title'),
    isPrimaryResume: formData.get('isPrimaryResume') === 'on',
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات سند نامعتبر است.' };
  }

  try {
    const result = await uploadApplicantDocument(user, parsed.data.applicantId, file, {
      category: parsed.data.category,
      title: parsed.data.title,
      isPrimaryResume: parsed.data.isPrimaryResume,
      notes: parsed.data.notes,
    });
    await adminAudit(user, 'ATTACHMENT', `بارگذاری سند «${parsed.data.title}»`, {
      recordIdentifier: result.attachmentId,
    });
    revalidatePath(`/applicants/${parsed.data.applicantId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'بارگذاری سند ناموفق بود.' };
  }
}

export async function deleteDocumentAction(attachmentId: string, applicantId: string): Promise<void> {
  const user = await requireAdmin();
  await deleteApplicantDocument(user, attachmentId);
  await adminAudit(user, 'ATTACHMENT', 'حذف سند پیوست پرونده', {
    recordIdentifier: attachmentId,
    severity: 'MEDIUM',
  });
  revalidatePath(`/applicants/${applicantId}`);
}
