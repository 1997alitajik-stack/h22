'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { adminAudit } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createUserSchema,
  linkCandidacySchema,
  organizationSchema,
  resetPasswordSchema,
  updateStageSchema,
  userRoleSchema,
  userStatusSchema,
  vacancyFormSchema,
  vocabUpdateSchema,
} from '@/lib/validation';
import { createVacancy, linkCandidacy, updateCandidacyStage, updateVacancyStatus } from '@/server/vacancies';
import {
  createUserAccount,
  resetUserPassword,
  updateUserRole,
  updateUserStatus,
} from '@/server/users';
import { createOrganization, updateVocabulary } from '@/server/misc';
import { seedDemoApplicants } from '@/server/demo-applicants';
import type { VacancyListRow } from '@/types';

export interface SimpleActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function createVacancyAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/vacancies');

  const parsed = vacancyFormSchema.safeParse({
    title: formData.get('title'),
    code: formData.get('code'),
    category: formData.get('category'),
    organizationType: formData.get('organizationType'),
    organizationId: formData.get('organizationId') || null,
    organizationName: formData.get('organizationName'),
    projectName: formData.get('projectName'),
    city: formData.get('city'),
    openPositionsCount: formData.get('openPositionsCount'),
    employmentType: formData.get('employmentType'),
    requiredDegree: formData.get('requiredDegree') || null,
    minYearsExperience: formData.get('minYearsExperience'),
    requiredSkillsCsv: formData.get('requiredSkillsCsv'),
    preferredSkillsCsv: formData.get('preferredSkillsCsv'),
    description: formData.get('description'),
    salaryRange: formData.get('salaryRange'),
    status: formData.get('status'),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: Object.values(flat)[0]?.[0] ?? 'اطلاعات فرصت شغلی معتبر نیست.',
    };
  }

  try {
    const id = await createVacancy(user, parsed.data);
    await adminAudit(user, 'VACANCY', `ایجاد فرصت شغلی جدید: ${parsed.data.title}`, {
      recordIdentifier: id,
    });
    revalidatePath('/vacancies');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در ایجاد فرصت شغلی' };
  }
}

export async function updateVacancyStatusAction(id: string, status: VacancyListRow['status']): Promise<void> {
  const user = await requireAdmin();
  await updateVacancyStatus(user, id, status);
  await adminAudit(user, 'VACANCY', 'تغییر وضعیت فرصت شغلی', { recordIdentifier: id, details: status });
  revalidatePath(`/vacancies/${id}`);
  revalidatePath('/vacancies');
}

export async function linkCandidacyAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/vacancies');
  const parsed = linkCandidacySchema.safeParse({
    vacancyId: formData.get('vacancyId'),
    applicantId: formData.get('applicantId'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'انتخاب متقاضی الزامی است.' };
  }

  try {
    await linkCandidacy(user, parsed.data.vacancyId, parsed.data.applicantId, parsed.data.notes);
    await adminAudit(user, 'VACANCY', 'معرفی متقاضی به فرصت شغلی', {
      recordIdentifier: parsed.data.vacancyId,
      details: parsed.data.notes || undefined,
    });
    revalidatePath(`/vacancies/${parsed.data.vacancyId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در اتصال متقاضی' };
  }
}

export async function updateStageAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/vacancies');
  const parsed = updateStageSchema.safeParse({
    candidacyId: formData.get('candidacyId'),
    stage: formData.get('stage'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'مرحله بررسی نامعتبر است.' };
  }

  try {
    await updateCandidacyStage(user, parsed.data.candidacyId, parsed.data.stage, parsed.data.notes);
    revalidatePath('/vacancies');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در تغییر مرحله' };
  }
}

export async function createUserAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/users');
  const parsed = createUserSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('fullName'),
    username: formData.get('username') || undefined,
    role: formData.get('role'),
    department: formData.get('department'),
    password: formData.get('password'),
  });
  const email = parsed.success ? parsed.data.email : undefined;
  if (!parsed.success || !email) {
    const flat = parsed.error?.flatten().fieldErrors;
    return {
      ok: false,
      error: Object.values(flat ?? {})[0]?.[0] ?? 'اطلاعات حساب معتبر نیست.',
    };
  }

  try {
    const profile = await createUserAccount(user, { ...parsed.data, email });
    await adminAudit(user, 'USER', `ایجاد حساب کاربری جدید ${profile.full_name} (${profile.email})`, {
      recordIdentifier: profile.id,
      severity: 'HIGH',
    });
    revalidatePath('/users');
    return { ok: true, message: `حساب ${profile.full_name} ایجاد شد.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در ایجاد حساب' };
  }
}

export async function resetPasswordAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/users');
  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get('userId'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'کلمه عبور نامعتبر است.' };
  }

  try {
    await resetUserPassword(user, parsed.data.userId, parsed.data.newPassword);
    await adminAudit(user, 'USER', 'تغییر دستی کلمه عبور حساب کاربری توسط مدیر', {
      recordIdentifier: parsed.data.userId,
      severity: 'HIGH',
    });
    return { ok: true, message: 'کلمه عبور تغییر کرد. نشست‌های باز ممکن است تا پایان اعتبار توکن فعال بمانند.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در تغییر کلمه عبور' };
  }
}

export async function updateUserRoleAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/users');
  const parsed = userRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { ok: false, error: 'نقش نامعتبر است.' };

  try {
    await updateUserRole(user, parsed.data.userId, parsed.data.role);
    await adminAudit(user, 'USER', `تغییر نقش دسترسی کاربر به ${parsed.data.role === 'ADMIN' ? 'مدیر سامانه' : 'مشاهده‌گر'}`, {
      recordIdentifier: parsed.data.userId,
      severity: 'HIGH',
    });
    revalidatePath('/users');
    return { ok: true, message: 'نقش کاربر به‌روزرسانی شد.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در تغییر نقش' };
  }
}

export async function updateUserStatusAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/users');
  const parsed = userStatusSchema.safeParse({
    userId: formData.get('userId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { ok: false, error: 'وضعیت نامعتبر است.' };

  try {
    await updateUserStatus(user, parsed.data.userId, parsed.data.status);
    await adminAudit(user, 'USER', `تغییر وضعیت حساب کاربر به ${parsed.data.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}`, {
      recordIdentifier: parsed.data.userId,
      severity: 'HIGH',
    });
    revalidatePath('/users');
    return { ok: true, message: 'وضعیت حساب به‌روزرسانی شد.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در تغییر وضعیت' };
  }
}

export async function createOrganizationAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/organization');
  const parsed = organizationSchema.safeParse({
    nameFa: formData.get('nameFa'),
    code: formData.get('code'),
    field: formData.get('field'),
    city: formData.get('city'),
    isSubsidiary: formData.get('isSubsidiary') !== 'false',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات شرکت معتبر نیست.' };
  }

  try {
    await createOrganization(user, parsed.data);
    await adminAudit(user, 'ORGANIZATION', `افزودن شرکت تابعه «${parsed.data.nameFa}» به ساختار سازمانی`, {
      severity: 'MEDIUM',
    });
    revalidatePath('/organization');
    return { ok: true, message: 'شرکت در ساختار سازمانی ثبت شد.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در ثبت شرکت' };
  }
}

export async function updateVocabularyAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/settings');
  const parsed = vocabUpdateSchema.safeParse({
    key: formData.get('key'),
    action: formData.get('action'),
    value: formData.get('value'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'مقدار نامعتبر است.' };
  }

  try {
    await updateVocabulary(user, parsed.data.key, parsed.data.action, parsed.data.value);
    await adminAudit(user, 'SETTING', `${parsed.data.action === 'add' ? 'افزودن' : 'حذف'} «${parsed.data.value}» در واژگان ${parsed.data.key === 'cities' ? 'شهرها' : 'حوزه‌های شغلی'}`);
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'خطا در به‌روزرسانی واژگان' };
  }
}

/** Explicit, administrator-only creation of 50 clearly marked synthetic applicants. */
export async function seedDemoApplicantsAction(
  _prev: SimpleActionState,
  _formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/applicants');

  try {
    const result = await seedDemoApplicants(user);
    if (result.alreadyExists) {
      return { ok: true, message: '۵۰ پرونده آزمایشی از قبل در بانک متقاضیان وجود دارد؛ رکورد تکراری ایجاد نشد.' };
    }

    try {
      await adminAudit(user, 'APPLICANT', 'ایجاد ۵۰ پرونده آزمایشی راستا', {
        recordIdentifier: 'DEMO-RASTA-001…050',
        details: 'اطلاعات ساختگی برای ارزیابی نمایش فهرست، جستجو، فیلترها و صفحه پرونده؛ بدون اطلاعات هویتی واقعی.',
        severity: 'MEDIUM',
      });
    } catch (auditError) {
      console.error('[RASTA_DEMO_SEED] Audit event could not be written', auditError);
    }

    revalidatePath('/');
    revalidatePath('/applicants');
    revalidatePath('/reports');
    return {
      ok: true,
      message: '۵۰ پرونده ساختگی با سوابق کاری، تحصیلی و مهارت‌ها به بانک متقاضیان اضافه شد. شناسه‌هایشان با DEMO-RASTA شروع می‌شود.',
    };
  } catch (error) {
    console.error('[RASTA_DEMO_SEED] Demo applicant seeding failed', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'ایجاد پرونده‌های آزمایشی ناموفق بود.',
    };
  }
}

