import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getDashboardMetrics,
  DashboardMetrics,
} from '../../services/mockService';
import { toPersianDigits } from '../../lib/persianUtils';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { BrandLogo } from '../../components/ui/BrandLogo';
import {
  Users,
  Building2,
  Clock,
  Briefcase,
  AlertCircle,
  TrendingUp,
  FileText,
  UserPlus,
  ArrowUpRight,
  MapPin,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { navigateTo, userRole } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getDashboardMetrics().then((data) => {
      if (isMounted) {
        setMetrics(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !metrics) {
    return (
      <div className="p-8 space-y-6 animate-pulse text-right">
        <div className="h-8 bg-slate-200 rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-right">
      {/* Official Brand Identity Hero Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <BrandLogo size="lg" animate className="drop-shadow-lg shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                سامانه راستا
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                نسخه سازمانی
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-teal-300/90 mt-1">
              راهکار ارزیابی سوابق، تخصص و استعدادها
            </p>
            <p className="text-[11px] text-slate-300/80 mt-1 max-w-xl hidden sm:block">
              مدیریت هوشمند استخر رزومه، اعتبارسنجی سوابق در ستاد و شرکت‌های تابعه و تخصیص اولویت‌های ۵ گانه استخدام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          {userRole === 'ADMIN' && (
            <button
              onClick={() => navigateTo('applicant-form')}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>ثبت متقاضی جدید</span>
            </button>
          )}
          <button
            onClick={() => navigateTo('applicants')}
            className="px-4 py-2.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <span>مشاهده بانک متقاضیان</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 1: Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Resume Pool */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">کل پرونده‌های ثبت‌شده</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {toPersianDigits(metrics.totalApplicants)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">متقاضی</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{toPersianDigits(metrics.newThisMonth)} متقاضی جدید در ماه جاری</span>
          </div>
        </div>

        {/* Verified Organization Priority (Parent + Subsidiary) */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200/80 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-semibold">سابقه تأییدشده در گروه</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-900 tabular-nums">
            {toPersianDigits(metrics.verifiedParentCount + metrics.verifiedSubsidiaryCount)}
            <span className="text-xs font-normal text-emerald-700 mr-1.5">نفر دارای اولویت</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600">
            {toPersianDigits(metrics.verifiedParentCount)} نفر سازمان مادر · {toPersianDigits(metrics.verifiedSubsidiaryCount)} نفر شرکت‌های تابعه
          </div>
        </div>

        {/* Pending Verification */}
        <div className="bg-white p-5 rounded-xl border border-amber-200/80 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-semibold">در انتظار استعلام سابقه</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900 tabular-nums">
            {toPersianDigits(metrics.pendingVerificationCount)}
            <span className="text-xs font-normal text-amber-700 mr-1.5">پرونده منتظر تأیید</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            نیازمند بررسی مستندات کارگزینی و بیمه
          </div>
        </div>

        {/* Open Vacancies */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">فرصت‌های شغلی باز</span>
            <div className="p-2 bg-teal-50 rounded-lg text-teal-700">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {toPersianDigits(metrics.openVacanciesCount)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">ردیف فعال جذب</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            در ستاد مرکزی و شرکت‌های تابعه
          </div>
        </div>
      </div>

      {/* Row 2: Charts and Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Category Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                توزیع متقاضیان بر اساس حوزه تخصصی
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                فراوانی کارجویان در رشته‌های مهندسی، فنی، اداری و خدماتی
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {toPersianDigits(metrics.totalApplicants)} نفر
            </span>
          </div>

          <div className="space-y-3">
            {metrics.categoryDistribution.slice(0, 6).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{cat.category}</span>
                  <div className="flex items-center gap-2 text-slate-500 tabular-nums font-mono text-[11px]">
                    <span>{toPersianDigits(cat.count)} نفر</span>
                    <span className="text-slate-400">({toPersianDigits(cat.percentage)}٪)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(cat.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority & Group Employment Breakdown Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">
                وضعیت اولویت سازمانی در استخر
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تفکیک کارجویان بر مبنای سیاست تقدم سابقه خدمت
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-start justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-emerald-900">
                      سازمان مادر (ستاد مرکزی)
                    </div>
                    <div className="text-[10px] text-emerald-700">اولویت عالی جذب</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-900 tabular-nums">
                  {toPersianDigits(metrics.verifiedParentCount)}
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-lg bg-teal-50/70 border border-teal-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-teal-900">
                      شرکت‌های تابعه (سدید، عمران پارس و...)
                    </div>
                    <div className="text-[10px] text-teal-700">اولویت جذب زیرمجموعه</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-teal-900 tabular-nums">
                  {toPersianDigits(metrics.verifiedSubsidiaryCount)}
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-lg bg-amber-50/70 border border-amber-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-900">
                      در انتظار استعلام
                    </div>
                    <div className="text-[10px] text-amber-700">نیازمند تأیید کارگزینی</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-amber-900 tabular-nums">
                  {toPersianDigits(metrics.pendingVerificationCount)}
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-slate-800">
                      سوابق آزاد (خارج از سازمان)
                    </div>
                    <div className="text-[10px] text-slate-500">بررسی بر مبنای شایستگی</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {toPersianDigits(metrics.externalOnlyCount)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500 leading-normal">
            توجه: بر اساس آیین‌نامه اداری، متقاضیان دارای سابقه تأییدشده در اولویت فراخوان مصاحبه قرار دارند.
          </div>
        </div>
      </div>

      {/* Row 3: Cities and Recruitment Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">
              توزیع جغرافیایی متقاضیان (شهر سکونت)
            </h3>
            <span className="text-xs text-slate-400">مناطق تحت پوشش پروژه‌ها</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {metrics.cityDistribution.slice(0, 9).map((c) => (
              <div
                key={c.city}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.city}</span>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  {toPersianDigits(c.count)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recruitment Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">
              وضعیت پرونده‌ها در پایپ‌لاین استخدام
            </h3>
            <button
              onClick={() => navigateTo('applicants')}
              className="text-xs text-teal-700 hover:underline"
            >
              مدیریت مراحل
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {metrics.recruitmentStatusDistribution.map((st) => (
              <div
                key={st.status}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center"
              >
                <div className="text-[11px] text-slate-500 mb-1">{st.label}</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {toPersianDigits(st.count)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Applicants Table & Open Vacancies List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applicants */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                متقاضیان اخیر ثبت‌شده در استخر
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                پرونده‌های ورودی جدید به تفکیک تخصص و اولویت
              </p>
            </div>
            <button
              onClick={() => navigateTo('applicants')}
              className="text-xs text-teal-700 hover:text-teal-800 font-medium flex items-center gap-1"
            >
              <span>مشاهده همه</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">متقاضی</th>
                  <th className="py-3 px-3 font-semibold">تخصص / عنوان شغلی</th>
                  <th className="py-3 px-3 font-semibold">شهر</th>
                  <th className="py-3 px-3 font-semibold">اولویت سازمانی</th>
                  <th className="py-3 px-3 font-semibold">وضعیت</th>
                  <th className="py-3 px-4 font-semibold text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.recentApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-[11px] shrink-0 border border-slate-200">
                        {app.avatarInitials}
                      </div>
                      <div>
                        <div>{app.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">{app.id}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">
                      {app.primaryJobTitle}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{app.residentialCity}</td>
                    <td className="py-3 px-3">
                      <PriorityBadge priority={app.groupPriority} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={app.recruitmentStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-left">
                      <button
                        onClick={() => navigateTo('applicant-detail', { applicantId: app.id })}
                        className="text-xs text-teal-700 hover:text-teal-900 font-semibold transition-colors"
                      >
                        مشاهده پرونده
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Currently Open Vacancies */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">
                موقعیت‌های استخدامی فعال
              </h3>
              <button
                onClick={() => navigateTo('vacancies')}
                className="text-xs text-teal-700 hover:underline"
              >
                مشاهده همه
              </button>
            </div>

            <div className="space-y-3">
              {metrics.openVacancies.map((vac) => (
                <div
                  key={vac.id}
                  onClick={() => navigateTo('vacancy-detail', { vacancyId: vac.id })}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">
                      {vac.title}
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-medium shrink-0">
                      {toPersianDigits(vac.openPositionsCount)} ردیف
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-2 truncate">
                    {vac.organizationName} · {vac.city}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{toPersianDigits(vac.applicantCount)} متقاضی متصل</span>
                    <span className="text-teal-700 font-medium">بررسی کارجویان ←</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => navigateTo('vacancies')}
              className="w-full py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
            >
              مشاهده تمامی ردیف‌های شغلی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
