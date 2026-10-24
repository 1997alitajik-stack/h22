import { requireAdmin } from '@/lib/auth';
import { listAuditEvents } from '@/server/misc';
import { toPersianDigits, formatJalali } from '@/lib/persian';
import { AUDIT_CATEGORY_LABELS } from '@/lib/domain/labels';
import { CheckCircle2, History, Search, XCircle, AlertTriangle } from 'lucide-react';
import { AuditToolbar } from './AuditToolbar';

export const metadata = { title: 'سوابق رویدادها' };
export const dynamic = 'force-dynamic';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin('/audit');
  const sp = await searchParams;
  const category = typeof sp.category === 'string' ? sp.category : 'ALL';
  const q = typeof sp.q === 'string' ? sp.q : '';
  const page = typeof sp.page === 'string' ? Math.max(1, Number(sp.page)) : 1;

  const events = await listAuditEvents(user, { category, q, page });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
          <History className="h-5 w-5 text-slate-400" aria-hidden />
          سوابق رویدادها و حسابرسی امنیتی
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          رویدادها فقط‌الحاقی هستند؛ هیچ کاربری — از جمله مدیر سامانه — امکان ویرایش یا حذف آنها را ندارد.
        </p>
      </div>

      <AuditToolbar categories={Object.entries(AUDIT_CATEGORY_LABELS)} currentCategory={category} currentQuery={q} />

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">زمان رویداد</th>
                <th scope="col" className="px-3 py-3 font-semibold">کاربر اقدام‌کننده</th>
                <th scope="col" className="px-3 py-3 font-semibold">دسته‌بندی</th>
                <th scope="col" className="px-3 py-3 font-semibold">شناسه رکورد</th>
                <th scope="col" className="px-4 py-3 font-semibold">خلاصه عملیات</th>
                <th scope="col" className="px-3 py-3 font-semibold">نتیجه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Search className="mx-auto mb-2 h-5 w-5" aria-hidden />
                    رویدادی با این فیلترها یافت نشد.
                  </td>
                </tr>
              )}
              {events.map((evt) => (
                <tr key={evt.id} className="transition-soft hover:bg-slate-50/80">
                  <td className="num whitespace-nowrap px-4 py-3 text-[11px] text-slate-500">
                    {formatJalali(evt.created_at, true)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="font-medium text-slate-900">{evt.actor_name}</div>
                    <div className="text-[10px] text-slate-400">{evt.actor_role}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="rounded-[var(--radius-sm)] bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {AUDIT_CATEGORY_LABELS[evt.category] ?? evt.category}
                    </span>
                  </td>
                  <td className="dir-ltr whitespace-nowrap px-3 py-3 text-right font-mono text-[11px] text-slate-500">
                    {evt.record_identifier ? `${evt.record_identifier.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{evt.summary}</div>
                    {evt.details && <div className="mt-0.5 text-[11px] text-slate-500">{evt.details}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {evt.outcome === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-emerald-200 bg-[var(--color-status-success-bg)] px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        موفق
                      </span>
                    ) : evt.outcome === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-rose-200 bg-[var(--color-status-danger-bg)] px-2 py-0.5 text-[11px] font-medium text-rose-800">
                        <XCircle className="h-3 w-3" aria-hidden />
                        ناموفق
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-amber-200 bg-[var(--color-status-warning-bg)] px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        هشدار
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {events.length === 50 && (
          <p className="num border-t border-slate-100 bg-slate-50 p-3 text-center text-[11px] text-slate-500">
            نمایش صفحه {toPersianDigits(page)} — برای رویدادهای قدیمی‌تر از فیلترها استفاده کنید.
          </p>
        )}
      </div>
    </div>
  );
}
