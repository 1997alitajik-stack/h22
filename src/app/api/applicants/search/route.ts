import { NextResponse } from 'next/server';
import { AuthzError, requireUserApi } from '@/lib/auth';
import { searchApplicantSuggestions } from '@/server/applicants';

/** GET /api/applicants/search?q=... — live applicant suggestions for signed-in users. */
export async function GET(request: Request) {
  try {
    const user = await requireUserApi();
    const query = new URL(request.url).searchParams.get('q') ?? '';
    if (query.trim().length < 2) {
      return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const results = await searchApplicantSuggestions(query, 8, user.role === 'ADMIN');
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.status.toUpperCase(), results: [] },
        { status: error.status === 'unauthenticated' ? 401 : 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    console.error('[applicant-search] live search failed', error);
    return NextResponse.json(
      { error: 'SEARCH_FAILED', results: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
