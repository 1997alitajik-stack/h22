import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ProfileRow, SessionUser } from '@/types';

export async function listUsers(user: SessionUser): Promise<ProfileRow[]> {
  // RLS: non-admins see only their own row.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, role, status, department, created_at, updated_at')
    .order('created_at');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateUserRole(
  actor: SessionUser,
  userId: string,
  role: 'ADMIN' | 'VIEWER',
): Promise<void> {
  if (actor.role !== 'ADMIN') throw new Error('FORBIDDEN');
  if (actor.id === userId && role !== 'ADMIN') {
    throw new Error('مدیر سامانه نمی‌تواند نقش خود را تنزل دهد.');
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function updateUserStatus(
  actor: SessionUser,
  userId: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<void> {
  if (actor.role !== 'ADMIN') throw new Error('FORBIDDEN');
  if (actor.id === userId && status === 'INACTIVE') {
    throw new Error('مدیر سامانه نمی‌تواند حساب خود را غیرفعال کند.');
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
  if (error) throw new Error(error.message);

  if (status === 'INACTIVE') {
    // Sign out every session of the deactivated account.
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.signOut(userId);
  }
}

/**
 * Creates an auth user + profile through the Admin API (service-role, server
 * only). Email confirmation is bypassed deliberately: accounts are created by
 * an administrator who communicates credentials out-of-band.
 */
export async function createUserAccount(
  actor: SessionUser,
  input: {
    email: string;
    fullName: string;
    username?: string;
    role: 'ADMIN' | 'VIEWER';
    department?: string;
    password: string;
  },
): Promise<ProfileRow> {
  if (actor.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) {
    const message =
      error?.message?.includes('already been registered') || error?.message?.includes('already exists')
        ? 'حسابی با این نشانی ایمیل از قبل وجود دارد.'
        : `ایجاد حساب ناموفق بود: ${error?.message ?? 'خطای نامشخص'}`;
    throw new Error(message);
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      username: input.username || null,
      role: input.role,
      department: input.department || null,
    })
    .eq('id', data.user.id)
    .select('id, email, full_name, username, role, status, department, created_at, updated_at')
    .single();

  if (profileError || !profile) {
    // Compensate: remove the orphan auth user so a retry is clean.
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error('ثبت مشخصات حساب ناموفق بود؛ عملیات لغو گردید.');
  }
  return profile;
}

export async function resetUserPassword(
  actor: SessionUser,
  userId: string,
  newPassword: string,
): Promise<void> {
  if (actor.role !== 'ADMIN') throw new Error('FORBIDDEN');
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(`تغییر کلمه عبور ناموفق بود: ${error.message}`);
  await admin.auth.admin.signOut(userId);
}
