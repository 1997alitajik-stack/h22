import { requireUser } from '@/lib/auth';
import { getVocabularies } from '@/server/misc';
import { toPersianDigits } from '@/lib/persian';
import { DEGREE_LABELS, ATTACHMENT_CATEGORY_LABELS } from '@/lib/domain/labels';
import { Building, GraduationCap, MapPin, Paperclip } from 'lucide-react';
import { VocabEditor } from './VocabEditor';

export const metadata = { title: 'تنظیمات پایه' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser('/settings');
  const vocab = await getVocabularies(user);
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">تنظیمات پایه و واژگان کنترل‌شده</h1>
        <p className="mt-1 text-xs text-slate-500">
          فهرست‌های مجاز شهرها و حوزه‌های شغلی؛ مقاطع تحصیلی و دسته‌بندی مدارک استاندارد و غیرقابل تغییرند.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 text-xs md:grid-cols-2">
        <VocabEditor
          title="شهرهای مجاز فعالیت و کارگاه‌ها"
          icon={<MapPin className="h-4 w-4 text-teal-700" aria-hidden />}
          vocabKey="cities"
          values={vocab.cities}
          isAdmin={isAdmin}
          addLabel="افزودن شهر"
          placeholder="نام شهر جدید (مثال: عسلویه)"
        />

        <VocabEditor
          title="حوزه‌های تخصصی و شغلی"
          icon={<Building className="h-4 w-4 text-teal-700" aria-hidden />}
          vocabKey="job_categories"
          values={vocab.job_categories}
          isAdmin={isAdmin}
          addLabel="افزودن حوزه"
          placeholder="حوزه شغلی جدید (مثال: نقشه‌برداری زمینی)"
        />

        <section className="space-y-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
            <GraduationCap className="h-4 w-4 text-teal-700" aria-hidden />
            مقاطع تحصیلی استاندارد ({toPersianDigits(Object.keys(DEGREE_LABELS).length)})
          </h2>
          <ul className="space-y-1.5">
            {(Object.entries(DEGREE_LABELS) as [string, string][]).map(([id, label]) => (
              <li key={id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-slate-100 bg-slate-50 p-2">
                <span className="font-semibold text-slate-900">{label}</span>
                <span className="dir-ltr font-mono text-[10px] text-slate-400">{id}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
            <Paperclip className="h-4 w-4 text-teal-700" aria-hidden />
            دسته‌بندی مدارک و پیوست‌ها
          </h2>
          <ul className="space-y-1.5">
            {(Object.entries(ATTACHMENT_CATEGORY_LABELS) as [string, string][]).map(([id, label]) => (
              <li key={id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-slate-100 bg-slate-50 p-2">
                <span className="font-semibold text-slate-900">{label}</span>
                <span className="dir-ltr font-mono text-[10px] text-slate-400">{id}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
