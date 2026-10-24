import { NextResponse } from 'next/server';
import { requireUserApi, AuthzError } from '@/lib/auth';
import { clientAudit, adminAudit } from '@/lib/audit';
import { createDocumentDownloadUrl } from '@/server/documents';

/**
 * GET /api/documents/:id → 302 to a 60-second signed download URL.
 * Authorization is enforced before signing; the access itself is audited.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await params;

    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    }

    const { url, filename } = await createDocumentDownloadUrl(user, id);

    if (user.role === 'ADMIN') {
      await adminAudit(user, 'ATTACHMENT', 'دانلود سند پیوست', { recordIdentifier: id, severity: 'LOW' });
    } else {
      await clientAudit(user, 'VIEW_RESUME', 'دانلود/مشاهده سند پیوست', { recordIdentifier: id });
    }

    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.status.toUpperCase() }, { status: err.status === 'unauthenticated' ? 401 : 403 });
    }
    const message = err instanceof Error ? err.message : 'UNKNOWN';
    return NextResponse.json({ error: message }, { status: message.includes('یافت نشد') ? 404 : 500 });
  }
}
