import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getApplicantDetail, getSensitiveForAdmin } from '@/server/applicants';
import { getVocabularies, listOrganizations } from '@/server/misc';
import { ApplicantForm, type FormEmployment, type FormEducation } from '../../ApplicantForm';

export const metadata = { title: 'ویرایش پرونده متقاضی' };
export const dynamic = 'force-dynamic';

export default async function EditApplicantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin('/applicants');
  const { id } = await params;

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();

  const [applicant, sensitive, vocab, organizations] = await Promise.all([
    getApplicantDetail(user, id),
    getSensitiveForAdmin(user, id),
    getVocabularies(user),
    listOrganizations(user),
  ]);
  if (!applicant) notFound();

  return (
    <ApplicantForm
      mode="edit"
      applicantId={applicant.id}
      applicantCode={applicant.public_code}
      cities={vocab.cities}
      categories={vocab.job_categories}
      organizations={organizations.map((o) => ({ id: o.id, name: o.name_fa }))}
      initial={{
        firstName: applicant.first_name,
        lastName: applicant.last_name,
        fatherName: applicant.father_name ?? '',
        nationalId: sensitive?.national_id ?? '',
        birthDate: applicant.birth_date_jalali ?? '',
        birthPlace: applicant.birth_place ?? '',
        residentialCity: applicant.residential_city ?? '',
        homeAddress: sensitive?.home_address ?? '',
        phone: sensitive?.phone ?? '',
        alternativePhone: sensitive?.alternative_phone ?? '',
        email: applicant.email ?? '',
        primaryJobTitle: applicant.primary_job_title,
        primaryJobCategory: applicant.primary_job_category,
        yearsOfExperience: applicant.years_of_experience,
        employment: applicant.employment.map<FormEmployment>((e) => ({
          id: e.id,
          employerName: e.employer_name,
          isGroupEntity: e.is_group_entity,
          groupEntityType: e.group_entity_type,
          organizationId: null,
          projectName: e.project_name ?? '',
          city: e.city ?? '',
          jobTitle: e.job_title,
          startDate: e.start_date_jalali,
          endDate: e.end_date_jalali ?? '',
          isCurrent: e.is_current,
          responsibilities: e.responsibilities ?? '',
          lastSalary: e.last_salary ?? '',
          reasonForLeaving: e.reason_for_leaving ?? '',
        })),
        education: applicant.education.map<FormEducation>((e) => ({
          id: e.id,
          degreeLevel: e.degree_level,
          degreeTitle: e.degree_title ?? '',
          fieldOfStudy: e.field_of_study ?? '',
          institutionName: e.institution_name ?? '',
          city: e.city ?? '',
          startDate: e.start_date_jalali ?? '',
          endDate: e.end_date_jalali ?? '',
          isStudying: e.is_studying,
          gpa: e.gpa ?? '',
        })),
        skillsCsv: applicant.skills.map((s) => s.name).join('، '),
        preferredTitlesCsv: applicant.preferences?.preferred_titles.join('، ') ?? '',
        expectedSalaryMin: applicant.preferences?.expected_salary_min ?? '',
        willingToTravelSites: applicant.preferences?.willing_to_travel_sites ?? false,
        willingToRelocate: applicant.preferences?.willing_to_relocate ?? false,
      }}
    />
  );
}
