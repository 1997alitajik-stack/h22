import React from 'react';
import { useApp, AppPage } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Building,
  UserCog,
  History,
  SlidersHorizontal,
  PlusCircle,
  X,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';

export const Sidebar: React.FC = () => {
  const {
    activePage,
    navigateTo,
    currentUser,
    userRole,
    switchRole,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();

  const navItems: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'applicants', label: 'بانک متقاضیان', icon: Users },
    { id: 'vacancies', label: 'فرصت‌های شغلی', icon: Briefcase },
    { id: 'reports', label: 'گزارش‌ها و آمار', icon: BarChart3 },
    { id: 'organization', label: 'سازمان و شرکت‌ها', icon: Building },
    { id: 'users', label: 'مدیریت کاربران', icon: UserCog },
    { id: 'audit', label: 'سوابق فعالیت (لاگ)', icon: History },
    { id: 'settings', label: 'تنظیمات پایه', icon: SlidersHorizontal },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Persistent Sidebar (RTL: right side) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-slate-200 border-l border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-800/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" animate />
            <div className="min-w-0">
              <h1 className="font-extrabold text-base text-white tracking-tight truncate">
                راستا
              </h1>
              <p className="text-[10px] text-teal-300/80 leading-tight truncate">
                راهکار ارزیابی سوابق، تخصص و استعدادها
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action for Admin */}
        {userRole === 'ADMIN' && (
          <div className="px-4 pt-4 pb-1">
            <button
              onClick={() => navigateTo('applicant-form')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ثبت متقاضی جدید</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activePage === item.id ||
              (item.id === 'applicants' &&
                (activePage === 'applicant-detail' || activePage === 'applicant-form')) ||
              (item.id === 'vacancies' && activePage === 'vacancy-detail');

            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors text-right ${
                  isActive
                    ? 'bg-teal-700/80 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-200' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile & Role Switcher */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-teal-300 flex items-center justify-center font-semibold text-xs border border-slate-600">
              {currentUser.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs text-slate-200 truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-teal-400 truncate flex items-center gap-1">
                {userRole === 'ADMIN' ? (
                  <ShieldCheck className="w-3 h-3 text-teal-400 shrink-0" />
                ) : (
                  <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span>{currentUser.roleTitle}</span>
              </div>
            </div>
          </div>

          {/* Quick role toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-md border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => switchRole('ADMIN')}
              className={`py-1 text-center font-medium rounded transition-colors ${
                userRole === 'ADMIN'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مدیر
            </button>
            <button
              type="button"
              onClick={() => switchRole('VIEWER')}
              className={`py-1 text-center font-medium rounded transition-colors ${
                userRole === 'VIEWER'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مشاهده‌گر
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
