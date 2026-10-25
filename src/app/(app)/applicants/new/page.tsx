import { requireAdmin } from '@/lib/auth';
import { getVocabularies, listOrganizations } from '@/server/misc';
import { ApplicantForm } from '../ApplicantForm';

export const metadata = { title: 'ثبت متقاضی جدید' };
export const dynamic = 'force-dynamic';

export default async function NewApplicantPage() {
  const user = await requireAdmin('/applicants/new');
  const [vocab, organizations] = await Promise.all([
    getVocabularies(user),
    listOrganizations(user),
  ]);

  return (
    <ApplicantForm
      mode="create"
      cities={vocab.cities}
      categories={vocab.job_categories}
      organizations={organizations.filter((o) => o.status === 'ACTIVE').map((o) => ({ id: o.id, name: o.name_fa }))}
    />
  );
}
