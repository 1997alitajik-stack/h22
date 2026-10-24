import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  listApplicants,
  ApplicantFilterOptions,
  SortField,
  SortDirection,
} from '../../services/mockService';
import { Applicant, GroupEmploymentPriority, RecruitmentStatus, DegreeLevel } from '../../types';
import { toPersianDigits, exportToCsv } from '../../lib/persianUtils';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  Search,
  Filter,
  X,
  ArrowUpDown,
  Download,
  UserPlus,
  Eye,
  Edit,
  ChevronRight,
  ChevronLeft,
  Building2,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

export const ApplicantDirectory: React.FC = () => {
  const { navigateTo, userRole, globalSearchQuery, setGlobalSearchQuery, showToast } = useApp();

  // Filter states
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery || '');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<GroupEmploymentPriority | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RecruitmentStatus | 'ALL'>('ALL');
  const [degreeFilter, setDegreeFilter] = useState<DegreeLevel | 'ALL'>('ALL');
  const [minExp, setMinExp] = useState<number>(0);
  const [maxExp, setMaxExp] = useState<number>(50);
  const [hasParentHistoryOnly, setHasParentHistoryOnly] = useState<boolean>(false);
  const [hasSubHistoryOnly, setHasSubHistoryOnly] = useState<boolean>(false);

  // Sorting and Pagination
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // UI state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load applicants
  const fetchApplicants = () => {
    setLoading(true);
    const filterOptions: ApplicantFilterOptions = {
      searchQuery: searchQuery.trim(),
      city: cityFilter,
      jobCategory: categoryFilter,
      groupPriority: priorityFilter,
      recruitmentStatus: statusFilter,
      degreeLevel: degreeFilter,
      minExperience: minExp,
      maxExperience: maxExp,
      hasParentOrgHistory: hasParentHistoryOnly,
      hasSubsidiaryHistory: hasSubHistoryOnly,
    };

    listApplicants(filterOptions, sortField, sortDirection).then((data) => {
      setApplicants(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchApplicants();
  }, [
    searchQuery,
    cityFilter,
    categoryFilter,
    priorityFilter,
    statusFilter,
    degreeFilter,
    minExp,
    maxExp,
    hasParentHistoryOnly,
    hasSubHistoryOnly,
    sortField,
    sortDirection,
  ]);

  // Synchronize global search if set externally
  useEffect(() => {
    if (globalSearchQuery !== searchQuery) {
      setSearchQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  // Pagination calculation
  const totalItems = applicants.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedApplicants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return applicants.slice(start, start + pageSize);
  }, [applicants, currentPage, pageSize]);

  // Active filter count and chips
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (cityFilter !== 'ALL') count++;
    if (categoryFilter !== 'ALL') count++;
    if (priorityFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (degreeFilter !== 'ALL') count++;
    if (minExp > 0 || maxExp < 50) count++;
    if (hasParentHistoryOnly) count++;
    if (hasSubHistoryOnly) count++;
    return count;
  }, [
    cityFilter,
    categoryFilter,
    priorityFilter,
    statusFilter,
    degreeFilter,
    minExp,
    maxExp,
    hasParentHistoryOnly,
    hasSubHistoryOnly,
  ]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setGlobalSearchQuery('');
    setCityFilter('ALL');
    setCategoryFilter('ALL');
    setPriorityFilter('ALL');
    setStatusFilter('ALL');
    setDegreeFilter('ALL');
    setMinExp(0);
    setMaxExp(50);
    setHasParentHistoryOnly(false);
    setHasSubHistoryOnly(false);
    setCurrentPage(1);
    showToast('تمامی فیلترهای جستجو پاک شدند.', 'info');
  };

  const handleExportCsv = () => {
    if (applicants.length === 0) {
      showToast('موردی برای خروجی اکسل یافت نشد.', 'warning');
      return;
    }

    const headers = [
      { key: 'id', label: 'شناسه متقاضی' },
      { key: 'fullName', label: 'نام و نام خانوادگی' },
      { key: 'residentialCity', label: 'شهر سکونت' },
      { key: 'primaryJobTitle', label: 'عنوان شغلی' },
      { key: 'primaryJobCategory', label: 'حوزه تخصصی' },
      { key: 'yearsOfExperience', label: 'سابقه کار (سال)' },
      { key: 'highestDegreeTitle', label: 'مدرک تحصیلی' },
      { key: 'groupPriorityReason', label: 'وضعیت اولویت سازمانی' },
      { key: 'recruitmentStatus', label: 'وضعیت استخدام' },
      { key: 'registeredAt', label: 'تاریخ ثبت‌نام' },
    ];

    const rows = applicants.map((a) => ({
      ...a,
      yearsOfExperience: toPersianDigits(a.yearsOfExperience),
    }));

    exportToCsv(`استخر_رزومه_راستا_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}`, headers, rows);
    showToast(`فایل اکسل با ${toPersianDigits(applicants.length)} رکورد با موفقیت دریافت شد.`, 'success');
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto text-right">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              بانک متقاضیان سامانه راستا
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold tabular-nums border border-slate-200">
              {toPersianDigits(applicants.length)} پرونده
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            راهکار ارزیابی سوابق، تخصص و استعدادها · اولویت‌بندی هوشمند سوابق سازمانی در ستاد و شرکت‌های تابعه
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>

          {userRole === 'ADMIN' && (
            <button
              onClick={() => navigateTo('applicant-form')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ثبت متقاضی جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو بر اساس نام، کدمتقاضی، تخصص، مهارت، کارفرمای پیشین، شرکت زیرمجموعه یا شهر..."
              className="w-full pl-8 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white text-slate-900 placeholder-slate-400 transition-all"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setGlobalSearchQuery('');
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Panel Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-4 py-2.5 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-2 shrink-0 ${
              isFilterPanelOpen || activeFiltersCount > 0
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فیلترهای پیشرفته</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-mono text-[10px] flex items-center justify-center">
                {toPersianDigits(activeFiltersCount)}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Advanced Filter Panel */}
        {isFilterPanelOpen && (
          <div className="pt-4 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
            {/* City */}
            <div>
              <label className="block text-slate-600 font-medium mb-1">شهر محل سکونت</label>
              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
              >
                <option value="ALL">همه شهرها</option>
                <option value="تهران">تهران</option>
                <option value="اصفهان">اصفهان</option>
                <option value="مشهد">مشهد</option>
                <option value="اهواز">اهواز</option>
                <option value="شیراز">شیراز</option>
                <option value="تبریز">تبریز</option>
                <option value="کرج">کرج</option>
                <option value="بندرعباس">بندرعباس</option>
              </select>
            </div>

            {/* Job Category */}
            <div>
              <label className="block text-slate-600 font-medium mb-1">حوزه شغلی و تخصصی</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
              >
                <option value="ALL">همه حوزه‌ها</option>
                <option value="مهندسی عمران و سازه">مهندسی عمران و سازه</option>
                <option value="معماری و شهرسازی">معماری و شهرسازی</option>
                <option value="نظارت کارگاهی و کنترل پروژه">نظارت کارگاهی و کنترل پروژه</option>
                <option value="تأسیسات مکانیکی و برقی">تأسیسات مکانیکی و برقی</option>
                <option value="تکنسین فنی و تعمیرات">تکنسین فنی و تعمیرات</option>
                <option value="امور مالی و حسابداری">امور مالی و حسابداری</option>
                <option value="منابع انسانی و اداری">منابع انسانی و اداری</option>
                <option value="حمل و نقل و لجستیک">حمل و نقل و لجستیک</option>
                <option value="خدمات عمومی و پذیرایی">خدمات عمومی و پذیرایی</option>
                <option value="حفاظت فیزیکی و انتظامات">حفاظت فیزیکی و انتظامات</option>
              </select>
            </div>

            {/* Priority Classification */}
            <div>
              <label className="block text-slate-600 font-medium mb-1">اولویت استخدامی سازمانی</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
              >
                <option value="ALL">همه اولویت‌ها</option>
                <option value="VERIFIED_PARENT">سابقه تأییدشده سازمان مادر</option>
                <option value="VERIFIED_SUBSIDIARY">سابقه تأییدشده شرکت زیرمجموعه</option>
                <option value="PENDING_VERIFICATION">سابقه در انتظار استعلام</option>
                <option value="NO_GROUP_HISTORY">فاقد سابقه در مجموعه</option>
                <option value="INSUFFICIENT_DATA">اطلاعات ناکافی</option>
              </select>
            </div>

            {/* Recruitment Stage */}
            <div>
              <label className="block text-slate-600 font-medium mb-1">وضعیت فرآیند استخدام</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="NEW">جدید</option>
                <option value="UNDER_REVIEW">در حال بررسی</option>
                <option value="INTERVIEWING">مرحله مصاحبه</option>
                <option value="SHORTLISTED">فهرست نهایی</option>
                <option value="OFFERED">پیشنهاد کار</option>
                <option value="HIRED">استخدام شده</option>
                <option value="REJECTED">عدم احراز شرایط</option>
                <option value="ARCHIVED">بایگانی</option>
              </select>
            </div>

            {/* Quick check toggles */}
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-4 pt-2 flex-wrap text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasParentHistoryOnly}
                  onChange={(e) => setHasParentHistoryOnly(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>فقط سوابق خدمت در ستاد سازمان مادر</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSubHistoryOnly}
                  onChange={(e) => setHasSubHistoryOnly(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>فقط سوابق شرکت‌های تابعه (سدید، عمران پارس، افق، کوشا)</span>
              </label>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mr-auto text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
                >
                  پاک کردن تمام فیلترها
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-slate-400">فیلترهای فعال:</span>

            {cityFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                شهر: {cityFilter}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setCityFilter('ALL')}
                />
              </span>
            )}

            {categoryFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                حوزه: {categoryFilter}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setCategoryFilter('ALL')}
                />
              </span>
            )}

            {priorityFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                اولویت انتخاب‌شده
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setPriorityFilter('ALL')}
                />
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                وضعیت: {statusFilter}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setStatusFilter('ALL')}
                />
              </span>
            )}

            {hasParentHistoryOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                ستاد سازمان مادر
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setHasParentHistoryOnly(false)}
                />
              </span>
            )}

            {hasSubHistoryOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                شرکت‌های زیرمجموعه
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setHasSubHistoryOnly(false)}
                />
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:underline mr-2"
            >
              پاک‌سازی همه
            </button>
          </div>
        )}
      </div>

      {/* Main Applicants Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="inline-block w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs">در حال بارگذاری متقاضیان...</div>
          </div>
        ) : paginatedApplicants.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-800 text-sm">هیچ متقاضی با این مشخصات یافت نشد</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              لطفاً واژه جستجو را تغییر دهید یا فیلترهای فعال را پاک کنید.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              بازنشانی فیلترها
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 select-none">
                <tr>
                  <th
                    onClick={() => handleSortChange('fullName')}
                    className="py-3.5 px-4 font-semibold cursor-pointer hover:text-teal-800"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>شناسه و نام متقاضی</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 font-semibold">تخصص / عنوان شغلی</th>
                  <th className="py-3.5 px-3 font-semibold">شهر</th>
                  <th className="py-3.5 px-3 font-semibold">مدرک تحصیلی</th>
                  <th
                    onClick={() => handleSortChange('experience')}
                    className="py-3.5 px-3 font-semibold cursor-pointer hover:text-teal-800"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>سابقه کار</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('priority')}
                    className="py-3.5 px-3 font-semibold cursor-pointer hover:text-teal-800"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>اولویت استخدام سازمانی</span>
                      <ArrowUpDown className="w-3 h-3 text-teal-700" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 font-semibold">وضعیت جذب</th>
                  <th
                    onClick={() => handleSortChange('completeness')}
                    className="py-3.5 px-3 font-semibold cursor-pointer hover:text-teal-800"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>تکمیل پرونده</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedApplicants.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => navigateTo('applicant-detail', { applicantId: app.id })}
                  >
                    {/* ID & Full Name */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs shrink-0 border border-slate-200">
                          {app.avatarInitials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
                            {app.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                            {app.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Job Title & Category */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 max-w-[170px] truncate">
                        {app.primaryJobTitle}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[170px]">
                        {app.primaryJobCategory}
                      </div>
                    </td>

                    {/* Residential City */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {app.residentialCity}
                    </td>

                    {/* Highest Degree */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      <div>{app.highestDegreeTitle}</div>
                      <div className="text-[10px] text-slate-400">{app.highestFieldOfStudy}</div>
                    </td>

                    {/* Years of Experience */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-slate-900 font-medium">
                      {toPersianDigits(app.yearsOfExperience)} سال
                    </td>

                    {/* Group Employment Priority */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <PriorityBadge priority={app.groupPriority} size="sm" />
                    </td>

                    {/* Recruitment Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={app.recruitmentStatus} size="sm" />
                    </td>

                    {/* Profile Completeness */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              app.profileCompleteness >= 85
                                ? 'bg-emerald-600'
                                : app.profileCompleteness >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${app.profileCompleteness}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                          {toPersianDigits(app.profileCompleteness)}٪
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-4 text-left whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigateTo('applicant-detail', { applicantId: app.id })}
                          className="p-1 text-slate-500 hover:text-teal-800 rounded hover:bg-slate-100 transition-colors"
                          title="مشاهده پرونده کامل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {userRole === 'ADMIN' && (
                          <button
                            onClick={() =>
                              navigateTo('applicant-form', { applicantId: app.id, isEditing: true })
                            }
                            className="p-1 text-slate-500 hover:text-teal-800 rounded hover:bg-slate-100 transition-colors"
                            title="ویرایش متقاضی"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer: Pagination & Page size */}
        {!loading && applicants.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>تعداد در هر صفحه:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
              >
                <option value={10}>۱۰ سطر</option>
                <option value={20}>۲۰ سطر</option>
                <option value={50}>۵۰ سطر</option>
              </select>
              <span className="text-slate-400 mr-2">
                نمایش {toPersianDigits((currentPage - 1) * pageSize + 1)} تا{' '}
                {toPersianDigits(Math.min(currentPage * pageSize, totalItems))} از{' '}
                {toPersianDigits(totalItems)} متقاضی
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                title="صفحه قبلی"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-slate-800">
                صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                title="صفحه بعدی"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
