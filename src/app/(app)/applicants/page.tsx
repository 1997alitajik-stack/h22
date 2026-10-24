import { requireUser } from '@/lib/auth';
import { listApplicants } from '@/server/applicants';
import { getVocabularies } from '@/server/misc';
import type { ApplicantFilters } from '@/types';
import { ApplicantDirectory } from './ApplicantDirectory';

export const metadata = { title: 'بانک متقاضیان' };
export const dynamic = 'force-dynamic';

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser('/applicants');
  const sp = await searchParams;

  const pick = (key: string): string | undefined => {
    const v = sp[key];
    return typeof v === 'string' && v !== '' && v !== 'ALL' ? v : undefined;
  };

  const filters: ApplicantFilters = {
    q: pick('q'),
    city: pick('city'),
    category: pick('category'),
    priority: pick('priority') as ApplicantFilters['priority'],
    status: pick('status') as ApplicantFilters['status'],
    degree: pick('degree') as ApplicantFilters['degree'],
    minExp: sp.minExp ? Number(sp.minExp) : undefined,
    maxExp: sp.maxExp ? Number(sp.maxExp) : undefined,
    hasParent: sp.hasParent === '1',
    hasSubsidiary: sp.hasSubsidiary === '1',
    page: sp.page ? Math.max(1, Number(sp.page)) : 1,
    pageSize: sp.pageSize ? Math.min(100, Math.max(10, Number(sp.pageSize))) : 10,
    sort: (pick('sort') as ApplicantFilters['sort']) ?? 'priority',
    dir: (pick('dir') as ApplicantFilters['dir']) ?? 'desc',
  };

  const [result, vocab] = await Promise.all([
    listApplicants(user, filters),
    getVocabularies(user),
  ]);

  return (
    <ApplicantDirectory
      user={user}
      result={result}
      filters={filters}
      cities={vocab.cities}
      categories={vocab.job_categories}
    />
  );
}
