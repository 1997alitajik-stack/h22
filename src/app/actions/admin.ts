'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireUser } from '@/lib/auth';
import { adminAudit } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createUserSchema,
  linkCandidacySchema,
  organizationSchema,
  organizationUpdateSchema,
  organizationSettingsSchema,
  deleteOrganizationSchema,
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
  resetPasswordSchema,
  updateStageSchema,
  userRoleSchema,
  userStatusSchema,
  userAccountUpdateSchema,
  ownProfileUpdateSchema,
  vacancyFormSchema,
  vocabUpdateSchema,
} from '@/lib/validation';
import {
  archiveCandidacy,
  archiveVacancy,
  createVacancy,
  linkCandidacy,
  updateCandidacyStage,
  updateVacancyStatus,
} from '@/server/vacancies';
import {
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  updateOwnProfile,
  resetUserPassword,
  updateUserRole,
  updateUserStatus,
} from '@/server/users';
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  createProject,
  updateProject,
  deleteProject,
  updateVocabulary,
  updateOrganizationSettings,
} from '@/server/misc';
import type { SessionUser, VacancyListRow } from '@/types';

export interface SimpleActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function updateOrganizationSettingsAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  try {
    const user = await requireAdmin('/organization');
    const parsed = organizationSettingsSchema.safeParse({
      parentOrganizationName: formData.get('parentOrganizationName'),
      autoArchiveEnabled: formData.get('autoArchiveEnabled') === 'on',
      autoArchiveDays: formData.get('autoArchiveDays'),
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return { ok: false, error: first ?? 'تنظیمات معتبر نیست.' };
    }
    await updateOrganizationSettings(user, {
      parentName: parsed.data.parentOrganizationName,
      autoArchiveEnabled: parsed.data.autoArchiveEnabled,
      autoArchiveDays: parsed.data.autoArchiveDays,
    });
    await adminAudit(user, 'ORGANIZATION', 'به‌روزرسانی نام هلدینگ و سیاست بایگانی خودکار', {
      details: 'مدت عدم فعالیت: ' + parsed.data.autoArchiveDays + ' روز؛ بایگانی خودکار: ' + (parsed.data.autoArchiveEnabled ? 'فعال' : 'غیرفعال'),
    });
    revalidatePath('/organization');
    revalidatePath('/vacancies');
    return { ok: true, message: 'تنظیمات ذخیره شد.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود.' };
  }
}

export async function archiveVacancyAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  try {
    const user = await requireAdmin('/vacancies');
    const vacancyId = String(formData.get('vacancyId') ?? '');
    const action = String(formData.get('action') ?? '');
    const reason = String(formData.get('reason') ?? '').trim();
    if (!/^[0-9a-fA-F-]{36}$/.test(vacancyId)) return { ok: false, error: 'شناسه فرصت شغلی معتبر نیست.' };
    if (action !== 'ARCHIVE' && action !== 'RESTORE') return { ok: false, error: 'عملیات بایگانی معتبر نیست.' };
    if (reason.length > 300) return { ok: false, error: 'علت بایگانی حداکثر ۳۰۰ نویسه است.' };

    await archiveVacancy(user, vacancyId, action === 'ARCHIVE', reason);
    await adminAudit(
      user,
      'VACANCY',
      action === 'ARCHIVE' ? 'بایگانی فرصت شغلی' : 'بازگردانی فرصت شغلی از بایگانی',
      { recordIdentifier: vacancyId, details: reason || undefined },
    );
    revalidatePath('/vacancies');
    revalidatePath('/vacancies/' + vacancyId);
    return { ok: true, message: action === 'ARCHIVE' ? 'فرصت شغلی بایگانی شد.' : 'فرصت شغلی بازگردانی شد.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'عملیات بایگانی ناموفق بود.' };
  }
}

export async function archiveCandidacyAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  try {
    const user = await requireAdmin('/vacancies');
    const candidacyId = String(formData.get('candidacyId') ?? '');
    const vacancyId = String(formData.get('vacancyId') ?? '');
    const action = String(formData.get('action') ?? '');
    const reason = String(formData.get('reason') ?? '').trim();
    if (!/^[0-9a-fA-F-]{36}$/.test(candidacyId) || !/^[0-9a-fA-F-]{36}$/.test(vacancyId)) {
      return { ok: false, error: 'شناسه معرفی معتبر نیست.' };
    }
    if (action !== 'ARCHIVE' && action !== 'RESTORE') return { ok: false, error: 'عملیات بایگانی معتبر نیست.' };
    if (reason.length > 300) return { ok: false, error: 'علت بایگانی حداکثر ۳۰۰ نویسه است.' };

    await archiveCandidacy(user, candidacyId, vacancyId, action === 'ARCHIVE', reason);
    await adminAudit(
      user,
      'VACANCY',
      action === 'ARCHIVE' ? 'بایگانی معرفی متقاضی' : 'بازگردانی معرفی متقاضی از بایگانی',
      { recordIdentifier: candidacyId, details: reason || undefined },
    );
    revalidatePath('/vacancies/' + vacancyId);
    revalidatePath('/vacancies');
    return { ok: true, message: action === 'ARCHIVE' ? 'معرفی متقاضی بایگانی شد.' : 'معرفی متقاضی بازگردانی شد.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'عملیات معرفی ناموفق بود.' };
  }
}

export async function createVacancyAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  let user: SessionUser;
  try {
    user = await requireAdmin('/vacancies');
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'اجازه ثبت فرصت شغلی را ندارید.' };
  }

  const parsed = vacancyFormSchema.safeParse({
    title: formData.get('title'),
    code: formData.get('code') || undefined,
    category: formData.get('category'),
    organizationType: formData.get('organizationType'),
    organizationId: formData.get('organizationId') || null,
    organizationName: formData.get('organizationName') ?? '',
    projectId: formData.get('projectId') || null,
    city: formData.get('city'),
    openPositionsCount: formData.get('openPositionsCount'),
    employmentType: formData.get('employmentType'),
    requiredDegree: formData.get('requiredDegree') || null,
    minYearsExperience: formData.get('minYearsExperience'),
    requiredSkillsCsv: formData.get('requiredSkillsCsv') ?? '',
    preferredSkillsCsv: formData.get('preferredSkillsCsv') ?? '',
    description: formData.get('description') ?? '',
    salaryRange: formData.get('salaryRange') ?? '',
    status: formData.get('status') || 'OPEN',
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
  let user: SessionUser;
  try {
    user = await requireAdmin('/vacancies');
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'اجازه معرفی متقاضی را ندارید.' };
  }
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


export async function updateOrganizationAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/organization');
  const parsed = organizationUpdateSchema.safeParse({
    organizationId: formData.get('organizationId'),
    nameFa: formData.get('nameFa'),
    code: formData.get('code'),
    field: formData.get('field') ?? '',
    city: formData.get('city') ?? '',
    status: formData.get('status'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات شرکت معتبر نیست.' };

  try {
    await updateOrganization(user, parsed.data);
    await adminAudit(user, 'ORGANIZATION', `ویرایش اطلاعات شرکت «${parsed.data.nameFa}»`, {
      recordIdentifier: parsed.data.organizationId,
      severity: 'MEDIUM',
    });
    revalidatePath('/organization');
    revalidatePath('/applicants');
    revalidatePath('/applicants/new');
    return { ok: true, message: 'اطلاعات شرکت به‌روزرسانی شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'ویرایش شرکت ناموفق بود.' };
  }
}

export async function deleteOrganizationAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/organization');
  const parsed = deleteOrganizationSchema.safeParse({ organizationId: formData.get('organizationId') });
  if (!parsed.success) return { ok: false, error: 'شناسه شرکت معتبر نیست.' };

  try {
    await deleteOrganization(user, parsed.data.organizationId);
    await adminAudit(user, 'ORGANIZATION', 'حذف شرکت از ساختار سازمانی', {
      recordIdentifier: parsed.data.organizationId,
      severity: 'HIGH',
    });
    revalidatePath('/organization');
    revalidatePath('/applicants');
    revalidatePath('/applicants/new');
    return { ok: true, message: 'شرکت از ساختار سازمانی حذف شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حذف شرکت ناموفق بود.' };
  }
}

export async function createProjectAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/organization');
  const parsed = createProjectSchema.safeParse({
    organizationId: formData.get('organizationId'),
    name: formData.get('name'),
    city: formData.get('city') ?? '',
    status: formData.get('status') || 'ACTIVE',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات پروژه معتبر نیست.' };

  try {
    await createProject(user, parsed.data);
    await adminAudit(user, 'ORGANIZATION', `افزودن پروژه «${parsed.data.name}»`, {
      recordIdentifier: parsed.data.organizationId,
      severity: 'MEDIUM',
    });
    revalidatePath('/organization');
    return { ok: true, message: 'پروژه به ساختار سازمانی افزوده شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'ثبت پروژه ناموفق بود.' };
  }
}

export async function updateProjectAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/organization');
  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get('projectId'),
    name: formData.get('name'),
    city: formData.get('city') ?? '',
    status: formData.get('status'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات پروژه معتبر نیست.' };

  try {
    await updateProject(user, parsed.data);
    await adminAudit(user, 'ORGANIZATION', `ویرایش پروژه «${parsed.data.name}»`, {
      recordIdentifier: parsed.data.projectId,
      severity: 'MEDIUM',
    });
    revalidatePath('/organization');
    return { ok: true, message: 'پروژه به‌روزرسانی شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'ویرایش پروژه ناموفق بود.' };
  }
}

export async function deleteProjectAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireAdmin('/organization');
  const parsed = deleteProjectSchema.safeParse({ projectId: formData.get('projectId') });
  if (!parsed.success) return { ok: false, error: 'شناسه پروژه معتبر نیست.' };

  try {
    await deleteProject(user, parsed.data.projectId);
    await adminAudit(user, 'ORGANIZATION', 'حذف پروژه از ساختار سازمانی', {
      recordIdentifier: parsed.data.projectId,
      severity: 'HIGH',
    });
    revalidatePath('/organization');
    return { ok: true, message: 'پروژه حذف شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حذف پروژه ناموفق بود.' };
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

export async function updateUserAccountAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const actor = await requireAdmin('/users');
  const parsed = userAccountUpdateSchema.safeParse({
    userId: formData.get('userId'),
    email: formData.get('email'),
    fullName: formData.get('fullName'),
    username: formData.get('username') ?? '',
    department: formData.get('department') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات حساب معتبر نیست.' };
  }

  try {
    await updateUserAccount(actor, parsed.data.userId, {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      username: parsed.data.username,
      department: parsed.data.department,
    });
    await adminAudit(actor, 'USER', `ویرایش مشخصات حساب کاربری ${parsed.data.fullName}`, {
      recordIdentifier: parsed.data.userId,
      severity: 'MEDIUM',
    });
    revalidatePath('/users');
    revalidatePath('/profile');
    return { ok: true, message: 'مشخصات حساب کاربری ذخیره شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'ویرایش حساب ناموفق بود.' };
  }
}

export async function deleteUserAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const actor = await requireAdmin('/users');
  const userId = String(formData.get('userId') ?? '');
  if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
    return { ok: false, error: 'شناسه حساب معتبر نیست.' };
  }

  try {
    await deleteUserAccount(actor, userId);
    await adminAudit(actor, 'USER', 'حذف حساب کاربری', {
      recordIdentifier: userId,
      severity: 'HIGH',
    });
    revalidatePath('/users');
    return { ok: true, message: 'حساب کاربر حذف شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حذف حساب ناموفق بود.' };
  }
}

export async function updateOwnProfileAction(
  _prev: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const actor = await requireUser('/profile');
  const parsed = ownProfileUpdateSchema.safeParse({
    fullName: formData.get('fullName'),
    username: formData.get('username') ?? '',
    department: formData.get('department') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'اطلاعات پروفایل معتبر نیست.' };
  }

  try {
    await updateOwnProfile(actor, parsed.data);
    try {
      await adminAudit(actor, 'USER', 'به‌روزرسانی پروفایل شخصی', {
        recordIdentifier: actor.id,
        severity: 'LOW',
      });
    } catch (auditError) {
      // Viewer roles cannot write ADMIN_SECURITY events; do not report a failed
      // profile update when the profile was already saved successfully.
      console.error('[RASTA_PROFILE] Profile updated but audit could not be written', auditError);
    }
    revalidatePath('/profile');
    revalidatePath('/');
    return { ok: true, message: 'اطلاعات پروفایل شما به‌روزرسانی شد.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'به‌روزرسانی پروفایل ناموفق بود.' };
  }
}

