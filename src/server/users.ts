import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ProfileRow, SessionUser } from '@/types';

const PROFILE_COLUMNS = 'id, email, full_name, username, role, status, department, created_at, updated_at';
type ManagedProfile = Pick<ProfileRow, 'id' | 'role' | 'status'>;

function requireAdmin(actor: SessionUser) {
  if (actor.role !== 'ADMIN') throw new Error('FORBIDDEN');
}

async function getManagedProfile(userId: string): Promise<ManagedProfile> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`خواندن مشخصات حساب ناموفق بود: ${error.message}`);
  if (!data) throw new Error('کاربر موردنظر در پایگاه داده پیدا نشد.');
  return data as ManagedProfile;
}

async function countActiveAdmins(): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'ADMIN')
    .eq('status', 'ACTIVE');

  if (error) throw new Error(`بررسی مدیران فعال ناموفق بود: ${error.message}`);
  return count ?? 0;
}

export async function listUsers(actor: SessionUser): Promise<ProfileRow[]> {
  requireAdmin(actor);
  // Profiles intentionally have no client-side write policy. User administration
  // uses the server-only service-role client after the administrator role guard.
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[RASTA_USERS] Unable to load profiles', { code: error.code, message: error.message });
    throw new Error('بارگذاری فهرست کاربران از پایگاه داده ناموفق بود.');
  }
  return (data ?? []) as ProfileRow[];
}

export async function updateUserRole(
  actor: SessionUser,
  userId: string,
  role: 'ADMIN' | 'VIEWER',
): Promise<void> {
  requireAdmin(actor);
  if (actor.id === userId && role !== 'ADMIN') {
    throw new Error('مدیر سامانه نمی‌تواند نقش خود را تنزل دهد.');
  }

  const target = await getManagedProfile(userId);
  if (target.role === 'ADMIN' && target.status === 'ACTIVE' && role !== 'ADMIN') {
    const activeAdminCount = await countActiveAdmins();
    if (activeAdminCount <= 1) {
      throw new Error('نمی‌توان آخرین مدیر فعال سامانه را به نقش دیگری تغییر داد.');
    }
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`تغییر نقش کاربر ناموفق بود: ${error.message}`);
  if (!data) throw new Error('کاربر موردنظر در پایگاه داده پیدا نشد.');
}

export async function updateUserStatus(
  actor: SessionUser,
  userId: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<void> {
  requireAdmin(actor);
  if (actor.id === userId && status === 'INACTIVE') {
    throw new Error('مدیر سامانه نمی‌تواند حساب خود را غیرفعال کند.');
  }

  const target = await getManagedProfile(userId);
  if (target.role === 'ADMIN' && target.status === 'ACTIVE' && status === 'INACTIVE') {
    const activeAdminCount = await countActiveAdmins();
    if (activeAdminCount <= 1) {
      throw new Error('نمی‌توان آخرین مدیر فعال سامانه را غیرفعال کرد.');
    }
  }

  const admin = createSupabaseAdminClient();
  // Ban/unban prevents future sign-ins and refreshes. The app and RLS also
  // check profile status, so an inactive account loses app/data access even
  // while a previously issued access token remains unexpired.
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: status === 'INACTIVE' ? '876000h' : 'none',
  });
  if (banError) throw new Error(`تغییر وضعیت ورود Supabase ناموفق بود: ${banError.message}`);

  const { data, error } = await admin
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    const rollbackDuration = target.status === 'INACTIVE' ? '876000h' : 'none';
    const { error: rollbackError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: rollbackDuration,
    });
    if (rollbackError) {
      console.error('[RASTA_USERS] Failed to roll back Auth ban after profile update failure', {
        userId,
        message: rollbackError.message,
      });
    }
    throw new Error(error ? `تغییر وضعیت کاربر ناموفق بود: ${error.message}` : 'کاربر موردنظر در پایگاه داده پیدا نشد.');
  }
}

/** Creates an Auth user and provisions its profile using server-only credentials. */
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
  requireAdmin(actor);
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

  // The auth.users trigger creates the default profile. Regular clients are
  // intentionally denied profile writes, so provision the profile via admin.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: input.fullName,
      username: input.username || null,
      role: input.role,
      department: input.department || null,
    })
    .eq('id', data.user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (profileError || !profile) {
    console.error('[RASTA_USERS] Profile provisioning failed; rolling back Auth user', {
      code: profileError?.code,
      message: profileError?.message,
    });
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error('ثبت مشخصات حساب ناموفق بود؛ عملیات لغو شد. اتصال دیتابیس و تریگر ساخت پروفایل را بررسی کنید.');
  }
  return profile as ProfileRow;
}

export async function resetUserPassword(
  actor: SessionUser,
  userId: string,
  newPassword: string,
): Promise<void> {
  requireAdmin(actor);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(`تغییر کلمه عبور ناموفق بود: ${error.message}`);
}
