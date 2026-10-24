import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Privileged service-role client. SERVER-ONLY, never imported from client code.
 * Used exclusively for narrowly scoped operations that genuinely require it:
 *   - first-admin bootstrap (/setup)
 *   - administrator user provisioning (create auth user, password reset)
 * Routine queries must use the RLS-scoped server client instead.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
