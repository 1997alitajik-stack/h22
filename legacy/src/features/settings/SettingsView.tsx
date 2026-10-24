import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getControlledVocabulary,
  updateControlledVocabulary,
} from '../../services/mockService';
import { ControlledVocabulary } from '../../types';
import { toPersianDigits } from '../../lib/persianUtils';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Check,
  Building,
  GraduationCap,
  Paperclip,
  MapPin,
  Download,
} from 'lucide-react';
import { BrandLogo } from '../../components/ui/BrandLogo';

export const SettingsView: React.FC = () => {
  const { userRole, showToast } = useApp();
  const [vocab, setVocab] = useState<ControlledVocabulary | null>(null);
  const [newCity, setNewCity] = useState('');
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    getControlledVocabulary().then((data) => setVocab(data));
  }, []);

  if (!vocab) return null;

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.trim() || vocab.cities.includes(newCity.trim())) return;

    const updated = {
      ...vocab,
      cities: [...vocab.cities, newCity.trim()],
    };
    setVocab(updated);
    updateControlledVocabulary(updated);
    setNewCity('');
    showToast(`شهر «${newCity.trim()}» به فهرست شهرهای مجاز افزوده شد.`, 'success');
  };

  const handleRemoveCity = (city: string) => {
    const updated = {
      ...vocab,
      cities: vocab.cities.filter((c) => c !== city),
    };
    setVocab(updated);
    updateControlledVocabulary(updated);
    showToast(`شهر «${city}» از فهرست حذف گردید.`, 'info');
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || vocab.jobCategories.includes(newCategory.trim())) return;

    const updated = {
      ...vocab,
      jobCategories: [...vocab.jobCategories, newCategory.trim()],
    };
    setVocab(updated);
    updateControlledVocabulary(updated);
    setNewCategory('');
    showToast(`حوزه شغلی «${newCategory.trim()}» با موفقیت افزوده شد.`, 'success');
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = {
      ...vocab,
      jobCategories: vocab.jobCategories.filter((c) => c !== cat),
    };
    setVocab(updated);
    updateControlledVocabulary(updated);
    showToast(`حوزه «${cat}» حذف شد.`, 'info');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto text-right">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          تنظیمات پایه و واژگان کنترل‌شده سامانه راستا
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          راهکار ارزیابی سوابق، تخصص و استعدادها · مدیریت دسته‌بندی‌های شغلی، مقاطع تحصیلی و شهرهای فعالیت
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Cities */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-700" />
              <span>شهرهای مجاز فعالیت و کارگاه‌ها ({toPersianDigits(vocab.cities.length)})</span>
            </h3>
          </div>

          {userRole === 'ADMIN' && (
            <form onSubmit={handleAddCity} className="flex items-center gap-2">
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="نام شهر جدید (مثال: عسلویه)..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700 text-xs"
              />
              <button
                type="submit"
                disabled={!newCity.trim()}
                className="px-3 py-2 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 disabled:opacity-50 transition-colors shrink-0"
              >
                افزودن شهر
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {vocab.cities.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs"
              >
                <span>{city}</span>
                {userRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCity(city)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Job Categories */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-700" />
              <span>حوزه‌های تخصصی و شغلی ({toPersianDigits(vocab.jobCategories.length)})</span>
            </h3>
          </div>

          {userRole === 'ADMIN' && (
            <form onSubmit={handleAddCategory} className="flex items-center gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="حوزه شغلی جدید (مثال: نقشه‌برداری زمینی)..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700 text-xs"
              />
              <button
                type="submit"
                disabled={!newCategory.trim()}
                className="px-3 py-2 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 disabled:opacity-50 transition-colors shrink-0"
              >
                افزودن حوزه
              </button>
            </form>
          )}

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {vocab.jobCategories.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="font-medium text-slate-800">{cat}</span>
                {userRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Education Levels (Controlled) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-4 h-4 text-teal-700" />
            <span>مقاطع تحصیلی مصوب استاندارد</span>
          </h3>
          <div className="space-y-1.5">
            {vocab.educationLevels.map((lvl) => (
              <div
                key={lvl.id}
                className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
              >
                <span className="font-semibold text-slate-900">{lvl.label}</span>
                <span className="font-mono text-[10px] text-slate-400">{lvl.id}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attachment Categories (Controlled) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Paperclip className="w-4 h-4 text-teal-700" />
            <span>دسته‌بندی مدارک و پیوست‌ها</span>
          </h3>
          <div className="space-y-1.5">
            {vocab.attachmentCategories.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
              >
                <span className="font-semibold text-slate-900">{att.label}</span>
                <span className="font-mono text-[10px] text-slate-400">{att.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Official Brand Identity & Project Release Checkpoint */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-right">
          <BrandLogo size="lg" animate className="drop-shadow-lg shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-extrabold text-white">سامانه راستا</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                بسته انتشار Checkpoint v1.2
              </span>
            </div>
            <p className="text-xs font-semibold text-teal-300/90 mt-1">
              راهکار ارزیابی سوابق، تخصص و استعدادها
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              مجموعه کامل کد منبع، ساختار دیتابیس شبیه‌سازی‌شده، مدل‌های داده و قوانین امنیتی جهت تحویل و توسعه
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <a
            href="/RASTA_HR_System_v1_Frontend_Checkpoint.zip"
            download="RASTA_HR_System_v1_Frontend_Checkpoint.zip"
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>دانلود آرشیو کامل پروژه (ZIP)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
