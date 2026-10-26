import { requireUser } from '@/lib/auth';
import { listVacancies } from '@/server/vacancies';
import { getOrganizationSettings, getVocabularies, listOrganizations } from '@/server/misc';
import { VacancyDirectory } from './VacancyDirectory';

export const metadata = { title: 'فرصت‌های شغلی' };
export const dynamic = 'force-dynamic';

export default async function VacanciesPage() {
  const user = await requireUser('/vacancies');
  const [vacancies, vocab, organizations, settings] = await Promise.all([
    listVacancies(user),
    getVocabularies(user),
    listOrganizations(user),
    getOrganizationSettings(),
  ]);

  return (
    <VacancyDirectory
      user={user}
      vacancies={vacancies}
      cities={vocab.cities}
      categories={vocab.job_categories}
      parentOrganizationName={settings.parent_name}
      organizations={organizations
        .filter((organization) => organization.status === 'ACTIVE')
        .map((organization) => ({
          id: organization.id,
          name: organization.name_fa,
          projects: organization.projects
            .filter((project) => project.status === 'ACTIVE' || project.status === 'PLANNING')
            .map((project) => ({ id: project.id, name: project.name, city: project.city })),
        }))}
    />
  );
}
