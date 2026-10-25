import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SessionUser } from '@/types';

const PREFIX = 'DEMO-RASTA-';

const FIRST_NAMES = [
  'آرمان', 'نیما', 'پارسا', 'امیرعلی', 'محمدرضا',
  'کیان', 'علی', 'سامان', 'مهدی', 'بردیا',
] as const;
const LAST_NAMES = ['نمونه‌پور', 'آزمایشی', 'توسعه‌نیا', 'فرضی‌زاده', 'آزمون‌خواه'] as const;
const CITIES = ['تهران', 'کرج', 'اصفهان', 'مشهد', 'شیراز', 'تبریز', 'رشت', 'قزوین'] as const;
const INSTITUTIONS = [
  'دانشگاه نمونه تهران',
  'دانشگاه فنی آزمایشی',
  'دانشگاه توسعه و فناوری',
  'مؤسسه آموزش عالی نمونه',
  'دانشگاه مهندسی فرضی',
] as const;
const JOBS = [
  { title: 'مهندس عمران', category: 'مهندسی عمران', field: 'مهندسی عمران', degree: 'BACHELOR', degreeTitle: 'کارشناسی مهندسی عمران' },
  { title: 'کارشناس دفتر فنی', category: 'دفتر فنی', field: 'مهندسی و مدیریت ساخت', degree: 'MASTER', degreeTitle: 'کارشناسی ارشد مدیریت ساخت' },
  { title: 'کارشناس کنترل پروژه', category: 'کنترل پروژه', field: 'مدیریت پروژه', degree: 'MASTER', degreeTitle: 'کارشناسی ارشد مدیریت پروژه' },
  { title: 'سرپرست کارگاه', category: 'اجرا و کارگاه', field: 'مهندسی عمران', degree: 'BACHELOR', degreeTitle: 'کارشناسی مهندسی عمران' },
  { title: 'مهندس تأسیسات', category: 'تأسیسات', field: 'مهندسی مکانیک', degree: 'BACHELOR', degreeTitle: 'کارشناسی مهندسی مکانیک' },
  { title: 'کارشناس HSE', category: 'ایمنی و HSE', field: 'مهندسی ایمنی', degree: 'BACHELOR', degreeTitle: 'کارشناسی مهندسی ایمنی' },
  { title: 'کارشناس متره و برآورد', category: 'متره و برآورد', field: 'مهندسی عمران', degree: 'ASSOCIATE', degreeTitle: 'کاردانی عمران' },
  { title: 'مهندس معماری', category: 'معماری', field: 'مهندسی معماری', degree: 'MASTER', degreeTitle: 'کارشناسی ارشد معماری' },
  { title: 'کارشناس نقشه‌برداری', category: 'نقشه‌برداری', field: 'مهندسی نقشه‌برداری', degree: 'BACHELOR', degreeTitle: 'کارشناسی نقشه‌برداری' },
  { title: 'مدیر پروژه', category: 'مدیریت پروژه', field: 'مدیریت پروژه', degree: 'MASTER', degreeTitle: 'کارشناسی ارشد مدیریت پروژه' },
] as const;
const RECRUITMENT_STATUSES = [
  'NEW', 'UNDER_REVIEW', 'INTERVIEWING', 'SHORTLISTED',
  'OFFERED', 'HIRED', 'REJECTED', 'ARCHIVED',
] as const;
const SKILLS = [
  { name: 'AutoCAD', category: 'TOOL_SOFTWARE', level: 'ADVANCED' },
  { name: 'Revit', category: 'TOOL_SOFTWARE', level: 'INTERMEDIATE' },
  { name: 'ETABS', category: 'TOOL_SOFTWARE', level: 'ADVANCED' },
  { name: 'SAP2000', category: 'TOOL_SOFTWARE', level: 'INTERMEDIATE' },
  { name: 'Primavera P6', category: 'TOOL_SOFTWARE', level: 'ADVANCED' },
  { name: 'Microsoft Project', category: 'TOOL_SOFTWARE', level: 'INTERMEDIATE' },
  { name: 'کنترل پروژه', category: 'TECHNICAL', level: 'ADVANCED' },
  { name: 'متره و برآورد', category: 'TECHNICAL', level: 'EXPERT' },
  { name: 'مدیریت کارگاه', category: 'MANAGERIAL', level: 'ADVANCED' },
  { name: 'گزارش‌نویسی', category: 'GENERAL', level: 'ADVANCED' },
  { name: 'Excel', category: 'TOOL_SOFTWARE', level: 'EXPERT' },
  { name: 'برنامه‌ریزی اجرایی', category: 'TECHNICAL', level: 'INTERMEDIATE' },
] as const;

function jalaliDate(year: number, month: number, day: number): string {
  return String(year) + '/' + String(month).padStart(2, '0') + '/' + String(day).padStart(2, '0');
}

function errorFor(stage: string, message: string): Error {
  return new Error('ثبت داده‌های آزمایشی در مرحله «' + stage + '» ناموفق بود: ' + message);
}

/**
 * Inserts clearly identified synthetic applicant records. This operation is
 * explicit, admin-only, and idempotent: clicking again will not create copies.
 * No real national IDs, phone numbers, addresses, or reachable email accounts
 * are generated.
 */
export async function seedDemoApplicants(actor: SessionUser): Promise<{ created: number; alreadyExists: boolean }> {
  if (actor.role !== 'ADMIN') throw new Error('فقط مدیر سامانه می‌تواند داده آزمایشی ایجاد کند.');

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from('applicants')
    .select('id, public_code')
    .like('public_code', PREFIX + '%');

  if (existingError) throw errorFor('بررسی داده‌های موجود', existingError.message);
  const existingCount = existing?.length ?? 0;
  if (existingCount >= 50) return { created: 0, alreadyExists: true };
  if (existingCount > 0) {
    throw new Error('بخشی از داده‌های آزمایشی از قبل موجود است (' + existingCount + ' پرونده). برای جلوگیری از ایجاد پرونده تکراری، عملیات متوقف شد.');
  }

  const rows = Array.from({ length: 50 }, (_, i) => {
    const job = JOBS[i % JOBS.length]!;
    const city = CITIES[(i * 3 + Math.floor(i / 5)) % CITIES.length]!;
    const month = (i % 12) + 1;
    const day = ((i * 7) % 28) + 1;
    const birthYear = 1360 + (i % 24);
    return {
      public_code: PREFIX + String(i + 1).padStart(3, '0'),
      first_name: FIRST_NAMES[i % FIRST_NAMES.length]!,
      last_name: LAST_NAMES[Math.floor(i / FIRST_NAMES.length)]!,
      father_name: 'نام پدر آزمایشی ' + String(i + 1).padStart(2, '0'),
      birth_date_jalali: jalaliDate(birthYear, month, day),
      birth_place: CITIES[(i + 2) % CITIES.length]!,
      residential_city: city,
      email: 'demo.person.' + String(i + 1).padStart(3, '0') + '@example.invalid',
      primary_job_title: job.title,
      primary_job_category: job.category,
      years_of_experience: (i * 7) % 26,
      highest_degree: job.degree,
      highest_degree_title: job.degreeTitle,
      highest_field_of_study: job.field,
      recruitment_status: RECRUITMENT_STATUSES[i % RECRUITMENT_STATUSES.length],
      created_by: actor.id,
    };
  });

  const { data: inserted, error: insertError } = await supabase
    .from('applicants')
    .insert(rows)
    .select('id, public_code');
  if (insertError) throw errorFor('ایجاد پرونده‌ها', insertError.message);

  const created = inserted ?? [];
  const ids = created.map((row) => row.id as string);
  if (created.length !== 50) {
    if (ids.length) await supabase.from('applicants').delete().in('id', ids);
    throw errorFor('بررسی نتیجه', 'تعداد پرونده‌های ایجادشده با ۵۰ مورد مورد انتظار برابر نیست.');
  }

  try {
    const employmentRows = created.map((row, i) => {
      let isGroupEntity = false;
      let groupEntityType: 'PARENT' | 'SUBSIDIARY' | 'EXTERNAL' = 'EXTERNAL';
      let verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
      if (i < 8) {
        isGroupEntity = true;
        groupEntityType = 'PARENT';
        verificationStatus = 'VERIFIED';
      } else if (i < 20) {
        isGroupEntity = true;
        groupEntityType = 'SUBSIDIARY';
        verificationStatus = 'VERIFIED';
      } else if (i < 30) {
        isGroupEntity = true;
        groupEntityType = i % 2 === 0 ? 'PARENT' : 'SUBSIDIARY';
        verificationStatus = 'PENDING';
      } else if (i < 40) {
        isGroupEntity = true;
        groupEntityType = i % 2 === 0 ? 'PARENT' : 'SUBSIDIARY';
        verificationStatus = 'REJECTED';
      }
      const current = i % 4 === 0;
      const startYear = 1395 + (i % 8);
      return {
        applicant_id: row.id,
        employer_name: groupEntityType === 'PARENT'
          ? 'ستاد سازمان نمونه'
          : groupEntityType === 'SUBSIDIARY'
            ? 'شرکت تابعه آزمایشی ' + ((i % 4) + 1)
            : 'شرکت خصوصی نمونه ' + ((i % 7) + 1),
        is_group_entity: isGroupEntity,
        group_entity_type: groupEntityType,
        project_name: 'پروژه آزمایشی ' + String(i + 1).padStart(2, '0'),
        city: CITIES[(i + 1) % CITIES.length]!,
        job_title: JOBS[i % JOBS.length]!.title,
        start_date_jalali: jalaliDate(startYear, (i % 12) + 1, 1),
        end_date_jalali: current ? null : jalaliDate(Math.min(1404, startYear + 2), ((i + 4) % 12) + 1, 29),
        is_current: current,
        responsibilities: 'شرح مسئولیت‌ها برای پرونده نمایشی؛ این اطلاعات صرفاً برای آزمایش رابط کاربری تولید شده‌اند.',
        verification_status: verificationStatus,
        verification_notes: verificationStatus === 'PENDING'
          ? 'در انتظار استعلام آزمایشی'
          : verificationStatus === 'REJECTED'
            ? 'نمونه برای آزمایش وضعیت ردشده'
            : null,
        verified_at: verificationStatus === 'VERIFIED' || verificationStatus === 'REJECTED' ? new Date().toISOString() : null,
        verified_by: verificationStatus === 'VERIFIED' || verificationStatus === 'REJECTED' ? actor.id : null,
      };
    });

    const educationRows = created.map((row, i) => ({
      applicant_id: row.id,
      degree_level: JOBS[i % JOBS.length]!.degree,
      degree_title: JOBS[i % JOBS.length]!.degreeTitle,
      field_of_study: JOBS[i % JOBS.length]!.field,
      institution_name: INSTITUTIONS[i % INSTITUTIONS.length]!,
      city: CITIES[(i + 2) % CITIES.length]!,
      start_date_jalali: jalaliDate(1390 + (i % 9), 7, 1),
      end_date_jalali: i % 9 === 0 ? null : jalaliDate(1394 + (i % 9), 4, 30),
      is_studying: i % 9 === 0,
      gpa: (14 + (i % 60) / 10).toFixed(2),
      sort_order: 0,
    }));

    const skillRows = created.flatMap((row, i) =>
      [i % SKILLS.length, (i + 4) % SKILLS.length, (i + 8) % SKILLS.length].map((skillIndex) => ({
        applicant_id: row.id,
        name: SKILLS[skillIndex]!.name,
        category: SKILLS[skillIndex]!.category,
        level: SKILLS[skillIndex]!.level,
      })),
    );

    const preferenceRows = created.map((row, i) => ({
      applicant_id: row.id,
      preferred_titles: [JOBS[i % JOBS.length]!.title],
      preferred_cities: [CITIES[(i + 3) % CITIES.length]!],
      willing_to_relocate: i % 2 === 0,
      willing_to_travel_sites: i % 3 === 0,
      employment_types: ['FULL_TIME', 'PROJECT_BASED'],
      expected_salary_min: 'توافقی (داده نمایشی)',
      availability_timeline: i % 4 === 0 ? 'فوری (آزمایشی)' : 'یک ماه آینده (آزمایشی)',
    }));

    const employmentResult = await supabase.from('employment_records').insert(employmentRows);
    if (employmentResult.error) throw errorFor('ثبت سوابق کاری', employmentResult.error.message);

    const educationResult = await supabase.from('education_records').insert(educationRows);
    if (educationResult.error) throw errorFor('ثبت سوابق تحصیلی', educationResult.error.message);

    const skillsResult = await supabase.from('applicant_skills').insert(skillRows);
    if (skillsResult.error) throw errorFor('ثبت مهارت‌ها', skillsResult.error.message);

    const preferencesResult = await supabase.from('job_preferences').insert(preferenceRows);
    if (preferencesResult.error) throw errorFor('ثبت ترجیحات شغلی', preferencesResult.error.message);
  } catch (error) {
    const { error: cleanupError } = await supabase.from('applicants').delete().in('id', ids);
    if (cleanupError) {
      console.error('[RASTA_DEMO_SEED] Cleanup failed after seed error', {
        message: cleanupError.message,
        applicantCount: ids.length,
      });
    }
    throw error instanceof Error ? error : errorFor('ثبت پرونده‌ها', 'خطای نامشخص');
  }

  return { created: created.length, alreadyExists: false };
}
