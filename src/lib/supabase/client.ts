'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser client: prefer the current publishable key and retain compatibility
 * with deployments that still configure the legacy anon-key variable.
 * All data access remains governed by Supabase RLS.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the environment.',
    );
  }

  return createBrowserClient(url, key);
}
