'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Download, Filter, Printer } from 'lucide-react';
import { selectClass } from '@/components/ui/Primitives';

export function ReportToolbar({
  cities,
  categories,
  exportQuery,
}: {
  cities: string[];
  categories: string[];
  exportQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'ALL') params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4 text-xs">
      <span className="flex items-center gap-1 font-semibold text-slate-700">
        <Filter className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        دامنه گزارش:
      </span>

      <select value={searchParams.get('city') ?? 'ALL'} onChange={(e) => setParam('city', e.target.value)} className={selectClass} aria-label="فیلتر شهر">
        <option value="ALL">همه شهرها</option>
        {cities.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select value={searchParams.get('category') ?? 'ALL'} onChange={(e) => setParam('category', e.target.value)} className={selectClass} aria-label="فیلتر حوزه شغلی">
        <option value="ALL">همه حوزه‌های تخصصی</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select value={searchParams.get('priority') ?? 'ALL'} onChange={(e) => setParam('priority', e.target.value)} className={selectClass} aria-label="فیلتر اولویت">
        <option value="ALL">همه اولویت‌های سازمانی</option>
        <option value="VERIFIED_PARENT">سابقه تأییدشده سازمان مادر</option>
        <option value="VERIFIED_SUBSIDIARY">سابقه تأییدشده زیرمجموعه‌ها</option>
        <option value="PENDING_VERIFICATION">در انتظار استعلام</option>
      </select>

      <div className="mr-auto flex items-center gap-2">
        <a
          href={`/api/export/applicants?${exportQuery}`}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white transition-soft hover:bg-[var(--color-accent-strong)]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          خروجی اکسل (CSV)
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-soft hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          چاپ / PDF
        </button>
      </div>
      {pending && <span className="text-slate-400">در حال به‌روزرسانی…</span>}
    </div>
  );
}
