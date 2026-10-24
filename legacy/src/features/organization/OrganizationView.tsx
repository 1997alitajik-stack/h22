import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Subsidiary, Project } from '../../types';
import {
  listSubsidiaries,
  listProjects,
  createSubsidiary,
} from '../../services/mockService';
import { toPersianDigits } from '../../lib/persianUtils';
import {
  Building2,
  Layers,
  FolderGit2,
  MapPin,
  Users,
  Plus,
  X,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const OrganizationView: React.FC = () => {
  const { userRole, showToast } = useApp();
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newField, setNewField] = useState('');
  const [newCity, setNewCity] = useState('تهران');

  const loadData = () => {
    setLoading(true);
    Promise.all([listSubsidiaries(), listProjects()]).then(([subs, prjs]) => {
      setSubsidiaries(subs);
      setProjects(prjs);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubsidiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await createSubsidiary({
      code: newCode.trim() || `SUB-${Date.now().toString().slice(-3)}`,
      name: newName.trim(),
      persianName: newName.trim(),
      field: newField.trim() || 'خدمات و عملیات فنی',
      city: newCity,
      activeProjectsCount: 1,
      employeeCountEstimate: 50,
      status: 'ACTIVE',
    });

    showToast(`شرکت تابعه «${newName}» در ساختار شبیه‌سازی اضافه شد.`, 'success');
    setIsModalOpen(false);
    setNewName('');
    setNewCode('');
    setNewField('');
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            ساختار سازمانی و شرکت‌های تابعه سامانه راستا
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            راهکار ارزیابی سوابق، تخصص و استعدادها · تعریف هویت‌های حقوقی مجاز جهت اعطای اولویت استخدامی
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تعریف شرکت تابعه جدید</span>
          </button>
        )}
      </div>

      {/* Parent Organization Card */}
      <div className="bg-emerald-950 text-white p-6 rounded-2xl shadow-md border border-emerald-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shadow-inner border border-emerald-700 shrink-0">
              <Building2 className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 text-[11px] font-semibold border border-emerald-700 mb-1">
                ستاد مرکزی هلدینگ و سازمان مادر
              </div>
              <h3 className="text-lg font-bold">سازمان مادر (ستاد پروژه‌ها و مدیریت راهبردی)</h3>
              <p className="text-xs text-emerald-200/80 mt-1 max-w-xl leading-relaxed">
                بالاترین سطح سازمانی؛ سوابق خدمت تاییدشده در ستاد دارای «اولویت عالی» در جذب و ارزیابی است.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-emerald-200/90 pt-3 md:pt-0 border-t md:border-t-0 border-emerald-800">
            <div>
              <span className="block text-[10px] text-emerald-400">مرکزیت:</span>
              <span className="font-semibold text-white">تهران - ستاد مرکزی</span>
            </div>
            <div>
              <span className="block text-[10px] text-emerald-400">تعداد شرکت‌های تابعه:</span>
              <span className="font-semibold text-white tabular-nums">
                {toPersianDigits(subsidiaries.length)} شرکت فعال
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subsidiaries Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            شرکت‌های زیرمجموعه و تابعه رسمی ({toPersianDigits(subsidiaries.length)} شرکت)
          </h3>
          <span className="text-xs text-slate-500">
            سوابق همکاری در این شرکت‌ها مشمول اولویت گروهی دوم است
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subsidiaries.map((sub) => {
            const subProjects = projects.filter((p) => p.subsidiaryId === sub.id);

            return (
              <div
                key={sub.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-200">
                      <Layers className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{sub.persianName}</h4>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        کد ثبتی: {sub.code} · شهر مرکزی: {sub.city}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                    فعال در ساختار
                  </span>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
                  <span className="font-semibold text-slate-800 block mb-0.5">حوزه فعالیت:</span>
                  {sub.field}
                </div>

                {/* Sub projects */}
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>پروژه‌های کلیدی مرتبط:</span>
                  </div>

                  {subProjects.length === 0 ? (
                    <div className="text-[11px] text-slate-400">پروژه مستقلی ثبت نشده است.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {subProjects.map((prj) => (
                        <div
                          key={prj.id}
                          className="flex items-center justify-between p-2 rounded bg-slate-50 text-[11px]"
                        >
                          <span className="font-medium text-slate-800 truncate">{prj.name}</span>
                          <span className="text-slate-400 shrink-0 font-mono">{prj.city}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal to add subsidiary */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-right"
          role="dialog"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">افزودن شرکت تابعه به ساختار</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubsidiary} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  نام شرکت (فارسی) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: شرکت توسعه و بهره‌برداری اروند"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">کد سازمانی / شناسه</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="ARVAND-OPS"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-left dir-ltr"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">حوزه مأموریت و فعالیت</label>
                <input
                  type="text"
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  placeholder="پیمانکاری خطوط لوله و نفت و گاز"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">شهر مرکزی</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="تهران"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
                >
                  ثبت شرکت در ساختار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
