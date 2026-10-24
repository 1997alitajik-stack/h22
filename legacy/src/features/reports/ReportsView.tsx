import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { listApplicants } from '../../services/mockService';
import { Applicant } from '../../types';
import { toPersianDigits, exportToCsv } from '../../lib/persianUtils';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  Building2,
  MapPin,
  GraduationCap,
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { BrandLogo } from '../../components/ui/BrandLogo';

export const ReportsView: React.FC = () => {
  const { showToast } = useApp();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  useEffect(() => {
    listApplicants().then((data) => {
      setApplicants(data);
      setLoading(false);
    });
  }, []);

  const filteredData = useMemo(() => {
    return applicants.filter((app) => {
      const matchCity = selectedCity === 'ALL' || app.residentialCity === selectedCity;
      const matchCat = selectedCategory === 'ALL' || app.primaryJobCategory === selectedCategory;
      const matchPri = selectedPriority === 'ALL' || app.groupPriority === selectedPriority;
      return matchCity && matchCat && matchPri;
    });
  }, [applicants, selectedCity, selectedCategory, selectedPriority]);

  // Aggregate stats
  const total = filteredData.length;
  const verifiedParent = filteredData.filter((a) => a.groupPriority === 'VERIFIED_PARENT').length;
  const verifiedSub = filteredData.filter((a) => a.groupPriority === 'VERIFIED_SUBSIDIARY').length;
  const pending = filteredData.filter((a) => a.groupPriority === 'PENDING_VERIFICATION').length;
  const external = filteredData.filter((a) => a.groupPriority === 'NO_GROUP_HISTORY').length;

  // City breakdown
  const cityMap: Record<string, number> = {};
  filteredData.forEach((a) => {
    cityMap[a.residentialCity] = (cityMap[a.residentialCity] || 0) + 1;
  });

  // Degree breakdown
  const degreeMap: Record<string, number> = {};
  filteredData.forEach((a) => {
    degreeMap[a.highestDegreeTitle] = (degreeMap[a.highestDegreeTitle] || 0) + 1;
  });

  // Category breakdown
  const catMap: Record<string, number> = {};
  filteredData.forEach((a) => {
    catMap[a.primaryJobCategory] = (catMap[a.primaryJobCategory] || 0) + 1;
  });

  const handleExportCsv = () => {
    const headers = [
      { key: 'id', label: 'شناسه' },
      { key: 'fullName', label: 'نام کامل' },
      { key: 'residentialCity', label: 'شهر' },
      { key: 'primaryJobTitle', label: 'عنوان شغلی' },
      { key: 'primaryJobCategory', label: 'حوزه' },
      { key: 'highestDegreeTitle', label: 'مدرک' },
      { key: 'yearsOfExperience', label: 'سابقه کار (سال)' },
      { key: 'groupPriorityReason', label: 'اولویت سازمانی' },
      { key: 'recruitmentStatus', label: 'وضعیت استخدام' },
    ];
    exportToCsv(`گزارش_جامع_استخر_رزومه_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}`, headers, filteredData);
    showToast(`گزارش آماری با موفقیت به صورت فایل اکسل دریافت شد.`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 no-print">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" animate />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                سامانه راستا
              </h2>
              <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                مرکز گزارش‌ها و تحلیل آماری
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              راهکار ارزیابی سوابق، تخصص و استعدادها · آمار سوابق تاییدشده، فراوانی تخصص‌ها و پراکندگی جغرافیایی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ / خروجی PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی جدول اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3 no-print text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>محدوده گزارش:</span>
        </span>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
        >
          <option value="ALL">همه شهرها</option>
          <option value="تهران">تهران</option>
          <option value="اصفهان">اصفهان</option>
          <option value="مشهد">مشهد</option>
          <option value="اهواز">اهواز</option>
          <option value="شیراز">شیراز</option>
          <option value="تبریز">تبریز</option>
          <option value="بندرعباس">بندرعباس</option>
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
        >
          <option value="ALL">همه حوزه‌های تخصصی</option>
          <option value="مهندسی عمران و سازه">مهندسی عمران و سازه</option>
          <option value="معماری و شهرسازی">معماری و شهرسازی</option>
          <option value="تأسیسات مکانیکی و برقی">تأسیسات مکانیکی و برقی</option>
          <option value="امور مالی و حسابداری">امور مالی و حسابداری</option>
          <option value="منابع انسانی و اداری">منابع انسانی و اداری</option>
          <option value="حمل و نقل و لجستیک">حمل و نقل و لجستیک</option>
          <option value="خدمات عمومی و پذیرایی">خدمات عمومی و پذیرایی</option>
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
        >
          <option value="ALL">همه اولویت‌های سازمانی</option>
          <option value="VERIFIED_PARENT">فقط سابقه تاییدشده سازمان مادر</option>
          <option value="VERIFIED_SUBSIDIARY">فقط سابقه تاییدشده زیرمجموعه‌ها</option>
          <option value="PENDING_VERIFICATION">فقط در انتظار استعلام</option>
        </select>

        {(selectedCity !== 'ALL' || selectedCategory !== 'ALL' || selectedPriority !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedCity('ALL');
              setSelectedCategory('ALL');
              setSelectedPriority('ALL');
            }}
            className="text-rose-600 hover:underline mr-auto"
          >
            بازنشانی فیلترها
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 mb-1">متقاضیان در دامنه گزارش</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {toPersianDigits(total)} <span className="text-xs font-normal text-slate-400">نفر</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="text-xs text-emerald-800 font-semibold mb-1">سابقه تأییدشده سازمان مادر</div>
          <div className="text-2xl font-bold text-emerald-900 tabular-nums">
            {toPersianDigits(verifiedParent)} <span className="text-xs font-normal text-emerald-700">نفر</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-2xs">
          <div className="text-xs text-teal-800 font-semibold mb-1">سابقه تأییدشده شرکت‌های تابعه</div>
          <div className="text-2xl font-bold text-teal-900 tabular-nums">
            {toPersianDigits(verifiedSub)} <span className="text-xs font-normal text-teal-700">نفر</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div className="text-xs text-amber-800 font-semibold mb-1">در انتظار استعلام کارگزینی</div>
          <div className="text-2xl font-bold text-amber-900 tabular-nums">
            {toPersianDigits(pending)} <span className="text-xs font-normal text-amber-700">پرونده</span>
          </div>
        </div>
      </div>

      {/* Visual Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              آمار تفکیکی حوزه‌های شغلی در استخر
            </h3>
            <span className="text-xs text-slate-400">تعداد پرونده</span>
          </div>

          <div className="space-y-3">
            {Object.entries(catMap)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const pct = Math.round((count / (total || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{cat}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {toPersianDigits(count)} نفر ({toPersianDigits(pct)}٪)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-700 rounded-full"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Education Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              تفکیک بر مبنای آخرین مقطع تحصیلی
            </h3>
            <span className="text-xs text-slate-400">سطوح تحصیلی</span>
          </div>

          <div className="space-y-3">
            {Object.entries(degreeMap)
              .sort((a, b) => b[1] - a[1])
              .map(([deg, count]) => {
                const pct = Math.round((count / (total || 1)) * 100);
                return (
                  <div key={deg} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{deg}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {toPersianDigits(count)} نفر ({toPersianDigits(pct)}٪)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-800 rounded-full"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">
            فهرست متقاضیان منتخب در این گزارش ({toPersianDigits(filteredData.length)} سطر)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">ردیف</th>
                <th className="py-3 px-3 font-semibold">شناسه</th>
                <th className="py-3 px-3 font-semibold">نام و نام خانوادگی</th>
                <th className="py-3 px-3 font-semibold">شهر</th>
                <th className="py-3 px-3 font-semibold">عنوان شغلی</th>
                <th className="py-3 px-3 font-semibold">سابقه کار</th>
                <th className="py-3 px-3 font-semibold">مدرک تحصیلی</th>
                <th className="py-3 px-4 font-semibold">وضعیت اولویت در مجموعه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredData.slice(0, 15).map((app, idx) => (
                <tr key={app.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                    {toPersianDigits(idx + 1)}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">{app.id}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{app.fullName}</td>
                  <td className="py-2.5 px-3">{app.residentialCity}</td>
                  <td className="py-2.5 px-3">{app.primaryJobTitle}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums">
                    {toPersianDigits(app.yearsOfExperience)} سال
                  </td>
                  <td className="py-2.5 px-3">{app.highestDegreeTitle}</td>
                  <td className="py-2.5 px-4">
                    <span className="text-[11px] text-slate-700">{app.groupPriorityReason}</span>
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
