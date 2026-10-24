import React from 'react';
import { useApp } from '../../context/AppContext';
import { Info, X, ShieldAlert, Sparkles } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { showDemoNotice, dismissDemoNotice, userRole, switchRole } = useApp();

  if (!showDemoNotice) return null;

  return (
    <div className="bg-slate-900 text-slate-100 text-xs px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1 font-semibold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/80">
          <Sparkles className="w-3.5 h-3.5" />
          نسخه پیش‌نمایش تعاملی فرانت‌اند
        </span>
        <span className="text-slate-300">
          تمام داده‌های متقاضیان ساختگی بوده و تغییرات به صورت موقت در حافظه کلاینت ثبت می‌شوند.
        </span>
        <span className="hidden lg:inline text-slate-400">
          (پروتوتایپ آماده اتصال به بک‌اند، پایگاه‌داده و احراز هویت توسط Claude)
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
          <button
            onClick={() => switchRole('ADMIN')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              userRole === 'ADMIN'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            مدیر سامانه
          </button>
          <button
            onClick={() => switchRole('VIEWER')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              userRole === 'VIEWER'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            مشاهده‌گر HR
          </button>
        </div>

        <button
          onClick={dismissDemoNotice}
          className="text-slate-400 hover:text-white p-1 transition-colors"
          title="بستن اعلان"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
