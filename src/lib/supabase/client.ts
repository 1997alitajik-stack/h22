'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Browser client — anon key only; every read/write is governed by RLS. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
