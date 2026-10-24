import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Vacancy, Subsidiary } from '../../types';
import {
  listVacancies,
  createVacancy,
  listSubsidiaries,
} from '../../services/mockService';
import { toPersianDigits } from '../../lib/persianUtils';
import {
  Briefcase,
  Building2,
  MapPin,
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronLeft,
  X,
} from 'lucide-react';

export const VacancyDirectory: React.FC = () => {
  const { navigateTo, userRole, showToast } = useApp();

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  // Create vacancy modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('مهندسی عمران و سازه');
  const [newOrgType, setNewOrgType] = useState<'PARENT' | 'SUBSIDIARY'>('SUBSIDIARY');
  const [newSubId, setNewSubId] = useState('SUB-01');
  const [newCity, setNewCity] = useState('تهران');
  const [newOpenings, setNewOpenings] = useState(2);
  const [newMinExp, setNewMinExp] = useState(4);
  const [newSkillsStr, setNewSkillsStr] = useState('AutoCAD, نقشه‌خوانی');
  const [newDesc, setNewDesc] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([listVacancies(), listSubsidiaries()]).then(([vacs, subs]) => {
      setVacancies(vacs);
      setSubsidiaries(subs);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVacancies = vacancies.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchesCity = cityFilter === 'ALL' || v.city === cityFilter;
    return matchesSearch && matchesStatus && matchesCity;
  });

  const handleCreateVacancySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('لطفاً عنوان فرصت شغلی را وارد نمایید.', 'warning');
      return;
    }

    const selectedSub = subsidiaries.find((s) => s.id === newSubId);
    const orgName =
      newOrgType === 'PARENT'
        ? 'ستاد مرکزی سازمان'
        : selectedSub?.persianName || 'شرکت مهندسی و توسعه سدید';

    await createVacancy({
      title: newTitle.trim(),
      code: `VAC-NEW-${Date.now().toString().slice(-4)}`,
      category: newCategory,
      organizationType: newOrgType,
      organizationName: orgName,
      subsidiaryId: newOrgType === 'SUBSIDIARY' ? newSubId : undefined,
      city: newCity,
      openPositionsCount: Number(newOpenings),
      employmentType: 'FULL_TIME',
      requiredDegree: 'BACHELOR',
      minimumYearsExperience: Number(newMinExp),
      requiredSkills: newSkillsStr.split(/[,،]/).map((s) => s.trim()).filter(Boolean),
      preferredSkills: [],
      description: newDesc.trim() || 'شرح مسئولیت‌های ردیف استخدامی در سازمان.',
      responsibilities: ['اجرای وظایف محوله سازمانی طبق شرح شغل'],
      status: 'OPEN',
    });

    showToast('فرصت شغلی جدید با موفقیت ایجاد گردید.', 'success');
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            فرصت‌های شغلی و موقعیت‌های جذب سامانه راستا
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            راهکار ارزیابی سوابق، تخصص و استعدادها · ردیف‌های باز استخدامی در سازمان مادر و شرکت‌های تابعه
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تعریف موقعیت شغلی جدید</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی عنوان شغلی، شرکت یا حوزه تخصصی..."
            className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 text-slate-900"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="OPEN">فعال و باز</option>
            <option value="FILLED">تکمیل‌شده</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="ALL">همه شهرها</option>
            <option value="تهران">تهران</option>
            <option value="اصفهان">اصفهان</option>
            <option value="مشهد">مشهد</option>
            <option value="اهواز">اهواز</option>
            <option value="بندرعباس">بندرعباس</option>
          </select>
        </div>
      </div>

      {/* Vacancies Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">در حال بارگذاری فرصت‌های شغلی...</div>
      ) : filteredVacancies.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-xs">
          هیچ فرصت شغلی با فیلترهای انتخابی یافت نشد.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVacancies.map((vac) => (
            <div
              key={vac.id}
              onClick={() => navigateTo('vacancy-detail', { vacancyId: vac.id })}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {vac.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      vac.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {vac.status === 'OPEN' ? 'پذیرش فعال' : 'بسته'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">
                  {vac.title}
                </h3>

                <div className="text-xs text-slate-600 flex items-center gap-1.5 mb-1 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{vac.organizationName}</span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{vac.city}</span>
                  {vac.projectName && <span>· پروژه {vac.projectName}</span>}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                  {vac.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                  <span>ظرفیت: {toPersianDigits(vac.openPositionsCount)} ردیف</span>
                  <span>·</span>
                  <span className="text-teal-800 font-bold">
                    {toPersianDigits(vac.applicantCount)} متقاضی
                  </span>
                </div>

                <span className="text-teal-700 font-semibold flex items-center gap-1">
                  <span>بررسی</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Vacancy Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-right"
          role="dialog"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">تعریف فرصت شغلی و ردیف جدید</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVacancySubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  عنوان موقعیت شغلی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: سرپرست کارگاه سازه بتنی یا کارشناس اداری"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">سازمان / شرکت تابعه</label>
                  <select
                    value={newOrgType}
                    onChange={(e) => setNewOrgType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="PARENT">ستاد مرکزی سازمان</option>
                    <option value="SUBSIDIARY">شرکت‌های تابعه</option>
                  </select>
                </div>

                {newOrgType === 'SUBSIDIARY' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">انتخاب شرکت زیرمجموعه</label>
                    <select
                      value={newSubId}
                      onChange={(e) => setNewSubId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    >
                      {subsidiaries.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.persianName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-medium mb-1">شهر محل خدمت</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">تعداد ردیف استخدام</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newOpenings}
                    onChange={(e) => setNewOpenings(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-left dir-ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  مهارت‌های الزامی (با ویرگول جدا کنید)
                </label>
                <input
                  type="text"
                  value={newSkillsStr}
                  onChange={(e) => setNewSkillsStr(e.target.value)}
                  placeholder="AutoCAD, صورت‌وضعیت, نقشه‌خوانی"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">شرح وظایف و الزامات</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="شرح انتظارات و شرایط احراز شغل..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
                >
                  ایجاد موقعیت شغلی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
