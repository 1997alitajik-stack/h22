'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loginSchema, setupSchema } from '@/lib/validation';
import { adminAudit } from '@/lib/audit';

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Sign-in. Generic error only — never reveal which factor failed. */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'نشانی ایمیل یا کلمه عبور را وارد فرمایید.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, error: 'ورود ناموفق بود؛ اطلاعات ورود را بررسی فرمایید.' };
  }

  // Inactive or not-yet-provisioned accounts are refused immediately.
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .single();

  if (!profile || profile.status !== 'ACTIVE') {
    await supabase.auth.signOut();
    return { ok: false, error: 'حساب کاربری شما فعال نیست. با مدیر سامانه تماس بگیرید.' };
  }

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * First-admin bootstrap. Requires the RASTA_SETUP_TOKEN and refuses once any
 * administrator profile already exists (no default shared credential path).
 */
export async function setupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = setupSchema.safeParse({
    token: formData.get('token'),
    email: formData.get('email'),
    fullName: formData.get('fullName'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: 'اطلاعات وارد شده معتبر نیست.',
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] != null ? String(v[0]) : '']),
      ),
    };
  }

  const expectedToken = process.env.RASTA_SETUP_TOKEN;
  if (!expectedToken || parsed.data.token !== expectedToken) {
    return { ok: false, error: 'توکن راه‌اندازی نامعتبر است.' };
  }

  const supabase = await createSupabaseServerClient();
  const { count: adminCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'ADMIN');
  if ((adminCount ?? 0) > 0) {
    return { ok: false, error: 'مدیر سامانه از قبل تعریف شده است؛ این صفحه غیرفعال است.' };
  }

  const email = parsed.success ? parsed.data.email : undefined;
  if (!parsed.success || !email) {
    return { ok: false, error: 'نشانی ایمیل معتبر نیست.' };
  }

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (createError || !created.user) {
    const message = createError?.message?.includes('already') || createError?.message?.includes('registered')
      ? 'حسابی با این نشانی ایمیل وجود دارد؛ ابتدا آن را حذف یا از ورود استفاده کنید.'
      : `ایجاد حساب مدیر ناموفق بود: ${createError?.message ?? 'خطای نامشخص'}`;
    return { ok: false, error: message };
  }

  // The handle_new_user trigger already created the profile row with role
  // VIEWER — promote it to the first administrator.
  const { error: promoteError } = await admin
    .from('profiles')
    .update({ role: 'ADMIN', full_name: parsed.data.fullName, status: 'ACTIVE' })
    .eq('id', created.user.id);
  if (promoteError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: 'ارتقای نقش مدیر ناموفق بود؛ عملیات لغو شد.' };
  }

  await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  await adminAudit(
    {
      id: created.user.id,
      email,
      fullName: parsed.data.fullName,
      username: null,
      role: 'ADMIN',
      department: null,
    },
    'SECURITY',
    'ایجاد نخستین حساب مدیر سامانه از طریق صفحه راه‌اندازی',
    { severity: 'HIGH' },
  );

  revalidatePath('/', 'layout');
  redirect('/');
}
