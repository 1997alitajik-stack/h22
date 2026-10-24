import { NextResponse } from 'next/server';
import { AuthzError, requireAdminApi } from '@/lib/auth';
import { getSensitiveForAdmin } from '@/server/applicants';

/**
 * POST /api/applicants/:id/sensitive — ADMIN-only full-PII reveal for the
 * profile unmask action. The reveal is audited by the caller (server action);
 * the route itself enforces the role boundary.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdminApi();
    const { id } = await params;

    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    }

    const sensitive = await getSensitiveForAdmin(user, id);
    if (!sensitive) {
      return NextResponse.json({ nationalId: null, phone: null, address: null });
    }

    return NextResponse.json(
      {
        nationalId: sensitive.national_id,
        phone: sensitive.phone,
        address: sensitive.home_address,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.status.toUpperCase() }, { status: err.status === 'unauthenticated' ? 401 : 403 });
    }
    return NextResponse.json({ error: 'SENSITIVE_FETCH_FAILED' }, { status: 500 });
  }
}
