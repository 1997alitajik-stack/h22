import 'server-only';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export class AuthzError extends Error {
  constructor(
    message: string,
    readonly status: 'unauthenticated' | 'inactive' | 'forbidden' = 'forbidden',
  ) {
    super(message);
  }
}

/**
 * Resolves the authoritative session user: Supabase Auth identity joined with
 * the profiles row (role + status). Client claims are never trusted for role.
 * Returns null when unauthenticated or the account is not usable.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, role, status, department')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'ACTIVE') return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name || profile.email,
    username: profile.username,
    role: profile.role,
    department: profile.department,
  };
}

/** Page/action guard: authenticated + active account, else redirect to login. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
  }
  return user;
}

/** Page/action guard: administrator only. */
export async function requireAdmin(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role !== 'ADMIN') {
    redirect('/forbidden');
  }
  return user;
}

/** Route-handler guard: throws typed errors instead of redirecting. */
export async function requireUserApi(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthzError('UNAUTHENTICATED', 'unauthenticated');
  return user;
}

export async function requireAdminApi(): Promise<SessionUser> {
  const user = await requireUserApi();
  if (user.role !== 'ADMIN') throw new AuthzError('FORBIDDEN', 'forbidden');
  return user;
}
