import React, { useEffect, useState } from 'react';
import { listAuditEvents } from '../../services/mockService';
import { AuditEvent } from '../../types';
import { toPersianDigits } from '../../lib/persianUtils';
import {
  History,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    listAuditEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
    const matchSearch =
      e.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.recordIdentifier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-right">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          سوابق رویدادها و حسابرسی امنیتی سامانه راستا
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          راهکار ارزیابی سوابق، تخصص و استعدادها · ثبت رویدادهای مدیریتی، استعلام سوابق، اسناد و تغییرات کاربری
        </p>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در خلاصه رویداد، نام کاربر یا شناسه رکورد..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
        >
          <option value="ALL">همه دسته‌بندی‌ها</option>
          <option value="APPLICANT">بانک متقاضیان</option>
          <option value="VERIFICATION">تأییدیه سوابق</option>
          <option value="ATTACHMENT">مدیریت اسناد</option>
          <option value="VACANCY">فرصت‌های شغلی</option>
          <option value="USER">مدیریت کاربران</option>
          <option value="REPORT">گزارش‌ها</option>
        </select>
      </div>

      {/* Audit List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">زمان رویداد</th>
                <th className="py-3 px-3 font-semibold">کاربر اقدام‌کننده</th>
                <th className="py-3 px-3 font-semibold">دسته‌بندی</th>
                <th className="py-3 px-3 font-semibold">شناسه رکورد</th>
                <th className="py-3 px-4 font-semibold">خلاصه عملیات انجام‌شده</th>
                <th className="py-3 px-3 font-semibold">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                    {evt.timestamp}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                    <div>{evt.actorName}</div>
                    <div className="text-[10px] text-slate-400">{evt.actorRole}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {evt.categoryLabel}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {evt.recordIdentifier}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{evt.summary}</div>
                    {evt.details && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{evt.details}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>موفق</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
