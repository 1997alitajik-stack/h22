import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SessionUser } from '@/types';

type AuditChannel = 'ADMIN_SECURITY' | 'CLIENT_ACTIVITY';
type AuditOutcome = 'SUCCESS' | 'WARNING' | 'FAILED';

interface AuditEventInput {
  channel: AuditChannel;
  category: string;
  summary: string;
  recordIdentifier?: string;
  details?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  outcome?: AuditOutcome;
}

/**
 * Appends an audit event through the security-definer RPC (the only path with
 * INSERT permission on audit_events). Actor identity comes from auth.uid()
 * inside the function — callers cannot spoof it. Failures are logged, never
 * thrown: an audit write must not crash the business operation after commit.
 */
export async function logAudit(
  user: SessionUser,
  event: AuditEventInput,
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('log_audit', {
      p_channel: event.channel,
      p_category: event.category,
      p_summary: event.summary,
      p_record_identifier: event.recordIdentifier ?? null,
      p_details: event.details ?? null,
      p_severity: event.severity ?? 'LOW',
      p_outcome: event.outcome ?? 'SUCCESS',
    });
    if (error) {
      console.error('[audit] rpc failed', { category: event.category, error: error.message });
    }
  } catch (err) {
    console.error('[audit] unexpected failure', err);
  }
}

/** Admin-channel shortcut (role is re-verified inside the RPC). */
export function adminAudit(
  user: SessionUser,
  category: string,
  summary: string,
  opts: Omit<AuditEventInput, 'channel' | 'category' | 'summary'> = {},
) {
  return logAudit(user, { channel: 'ADMIN_SECURITY', category, summary, ...opts });
}

/** Client-channel shortcut: LOW severity, whitelisted categories only. */
export function clientAudit(
  user: SessionUser,
  category: 'VIEW_RESUME' | 'SEARCH_DIRECTORY' | 'EXPORT_LIST',
  summary: string,
  opts: Omit<AuditEventInput, 'channel' | 'category' | 'summary'> = {},
) {
  return logAudit(user, { channel: 'CLIENT_ACTIVITY', category, summary, severity: 'LOW', ...opts });
}
