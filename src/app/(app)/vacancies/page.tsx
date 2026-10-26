import { requireUser } from '@/lib/auth';
import { listVacancies } from '@/server/vacancies';
import { getVocabularies, listOrganizations } from '@/server/misc';
import { VacancyDirectory } from './VacancyDirectory';

export const metadata = { title: 'فرصت‌های شغلی' };
export const dynamic = 'force-dynamic';

export default async function VacanciesPage() {
  const user = await requireUser('/vacancies');
  const [vacancies, vocab, organizations] = await Promise.all([
    listVacancies(user),
    getVocabularies(user),
    listOrganizations(user),
  ]);

  return (
    <VacancyDirectory
      user={user}
      vacancies={vacancies}
      cities={vocab.cities}
      categories={vocab.job_categories}
      organizations={organizations
        .filter((o) => o.status === 'ACTIVE')
        .map((o) => ({
          id: o.id,
          name: o.name_fa,
          projects: o.projects
            .filter((project) => project.status === 'ACTIVE' || project.status === 'PLANNING')
            .map((project) => ({ id: project.id, name: project.name, city: project.city })),
        }))}
    />
  );
}
