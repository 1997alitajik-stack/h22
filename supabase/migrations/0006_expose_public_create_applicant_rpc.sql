-- ============================================================================
-- RASTA: expose the create-applicant RPC in PostgREST's public API schema.
-- The implementation remains in the protected rasta schema; this wrapper
-- preserves its admin check and transaction behavior.
-- Apply this migration once to existing Supabase projects after 0005.
-- ============================================================================

create or replace function public.create_applicant_full(p_payload jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select rasta.create_applicant_full(p_payload);
$function$;

revoke all on function public.create_applicant_full(jsonb) from public;
grant execute on function public.create_applicant_full(jsonb) to authenticated;

-- Make PostgREST expose the newly-created RPC without waiting for a cache refresh.
notify pgrst, 'reload schema';
