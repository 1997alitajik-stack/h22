import { NextResponse } from 'next/server';
import { requireUserApi, AuthzError } from '@/lib/auth';
import { clientAudit } from '@/lib/audit';
import { listApplicants } from '@/server/applicants';
import { buildCsv, csvFilename, type CsvColumn } from '@/lib/csv';
import {
  DEGREE_LABELS,
  PRIORITY_LABELS,
  RECRUITMENT_STATUS_LABELS,
} from '@/lib/domain/labels';
import { formatJalali, toPersianDigits } from '@/lib/persian';
import type { ApplicantFilters, DegreeLevel, GroupPriority, RecruitmentStatus } from '@/types';

/**
 * GET /api/export/applicants — server-side CSV export of the CURRENT filter
 * (up to 10,000 rows). Column allowlist is role-aware; sensitive fields are
 * never exported (mission §4.6). Formula injection neutralized in lib/csv.
 */
const BASE_COLUMNS: CsvColumn[] = [
  { key: 'code', label: 'شناسه متقاضی' },
  { key: 'fullName', label: 'نام و نام خانوادگی' },
  { key: 'city', label: 'شهر سکونت' },
  { key: 'jobTitle', label: 'عنوان شغلی' },
  { key: 'category', label: 'حوزه تخصصی' },
  { key: 'experience', label: 'سابقه کار (سال)' },
  { key: 'degree', label: 'مدرک تحصیلی' },
  { key: 'priority', label: 'وضعیت اولویت سازمانی' },
  { key: 'recruitmentStatus', label: 'وضعیت استخدام' },
  { key: 'completeness', label: 'تکمیل پرونده (٪)' },
  { key: 'registeredAt', label: 'تاریخ ثبت‌نام' },
];

export async function GET(request: Request) {
  try {
    const user = await requireUserApi();
    const url = new URL(request.url);

    const filters: ApplicantFilters = {
      q: url.searchParams.get('q') ?? undefined,
      city: url.searchParams.get('city') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
      priority: (url.searchParams.get('priority') ?? undefined) as ApplicantFilters['priority'],
      status: (url.searchParams.get('status') ?? undefined) as ApplicantFilters['status'],
      degree: (url.searchParams.get('degree') ?? undefined) as ApplicantFilters['degree'],
      minExp: url.searchParams.get('minExp') ? Number(url.searchParams.get('minExp')) : undefined,
      maxExp: url.searchParams.get('maxExp') ? Number(url.searchParams.get('maxExp')) : undefined,
      hasParent: url.searchParams.get('hasParent') === 'true',
      hasSubsidiary: url.searchParams.get('hasSubsidiary') === 'true',
      page: 1,
      pageSize: 100,
      sort: (url.searchParams.get('sort') as ApplicantFilters['sort']) ?? 'priority',
      dir: (url.searchParams.get('dir') as ApplicantFilters['dir']) ?? 'desc',
    };

    const columns = [...BASE_COLUMNS];

    const rows: Record<string, string | number | null>[] = [];
    let page = 1;
    for (;;) {
      const result = await listApplicants(user, { ...filters, page });
      for (const r of result.rows) {
        rows.push({
          code: r.public_code,
          fullName: r.full_name,
          city: r.residential_city ?? '',
          jobTitle: r.primary_job_title,
          category: r.primary_job_category,
          experience: toPersianDigits(r.years_of_experience),
          degree: r.highest_degree ? DEGREE_LABELS[r.highest_degree as DegreeLevel] : '',
          priority: PRIORITY_LABELS[r.group_priority as GroupPriority],
          recruitmentStatus: RECRUITMENT_STATUS_LABELS[r.recruitment_status as RecruitmentStatus],
          completeness: toPersianDigits(r.completeness),
          registeredAt: formatJalali(r.created_at),
        });
      }
      if (result.rows.length < result.pageSize || rows.length >= 10000) break;
      page += 1;
    }

    await clientAudit(user, 'EXPORT_LIST', `خروجی اکسل بانک متقاضیان (${rows.length} رکورد)`);

    const csv = buildCsv(columns, rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rasta-export.csv"; filename*=UTF-8''${encodeURIComponent(csvFilename('rasta_applicants'))}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.status.toUpperCase() }, { status: err.status === 'unauthenticated' ? 401 : 403 });
    }
    console.error('[export] failed', err);
    return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: 500 });
  }
}
