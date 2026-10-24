import React, { useState } from 'react';
import { useApp, AppPage } from '../../context/AppContext';
import {
  Menu,
  Search,
  Bell,
  ShieldCheck,
  Eye,
  ChevronLeft,
  Building,
} from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';

export const TopBar: React.FC = () => {
  const {
    activePage,
    navigateTo,
    currentUser,
    userRole,
    switchRole,
    setGlobalSearchQuery,
    setIsMobileMenuOpen,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');

  const getBreadcrumbs = (): { label: string; page?: AppPage }[] => {
    switch (activePage) {
      case 'dashboard':
        return [{ label: 'داشبورد مدیریت و آمار' }];
      case 'applicants':
        return [{ label: 'بانک متقاضیان' }];
      case 'applicant-detail':
        return [{ label: 'بانک متقاضیان', page: 'applicants' }, { label: 'مشاهده پرونده متقاضی' }];
      case 'applicant-form':
        return [{ label: 'بانک متقاضیان', page: 'applicants' }, { label: 'فرم ثبت / ویرایش متقاضی' }];
      case 'vacancies':
        return [{ label: 'فرصت‌های شغلی و موقعیت‌ها' }];
      case 'vacancy-detail':
        return [{ label: 'فرصت‌های شغلی', page: 'vacancies' }, { label: 'جزئیات موقعیت و متقاضیان مرتبط' }];
      case 'reports':
        return [{ label: 'گزارش‌ها و تحلیل آماری' }];
      case 'organization':
        return [{ label: 'ساختار سازمان و شرکت‌های تابعه' }];
      case 'users':
        return [{ label: 'مدیریت کاربران و دسترسی‌ها' }];
      case 'audit':
        return [{ label: 'سوابق و لاگ رویدادها' }];
      case 'settings':
        return [{ label: 'تنظیمات و واژگان کنترل‌شده' }];
      default:
        return [{ label: 'سامانه راستا' }];
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setGlobalSearchQuery(localSearch.trim());
      navigateTo('applicants');
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Zone 1: Brand Identity & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="باز کردن منو"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Official Brand Identity in Header */}
        <div className="flex items-center gap-2 shrink-0">
          <BrandLogo size="xs" animate />
          <button
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-1.5 text-right hover:opacity-85 transition-opacity"
            title="سامانه راستا — صفحه اصلی"
          >
            <span className="font-extrabold text-slate-900 text-sm tracking-tight">راستا</span>
            <span className="text-[10px] text-teal-700 font-semibold hidden md:inline">
              · راهکار ارزیابی سوابق، تخصص و استعدادها
            </span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

        <nav className="flex items-center gap-1.5 text-xs text-slate-500 truncate" aria-label="مسیر جاری">
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              {bc.page ? (
                <button
                  onClick={() => navigateTo(bc.page!)}
                  className="hover:text-teal-700 transition-colors truncate font-medium"
                >
                  {bc.label}
                </button>
              ) : (
                <span className="text-slate-900 font-semibold truncate">{bc.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Zone 2: Fast Search */}
      <div className="hidden md:flex items-center max-w-xs w-full">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="جستجوی سریع نام، کد، مهارت..."
            className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-700"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Zone 3: Role Switcher & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
          <button
            onClick={() => switchRole('ADMIN')}
            className={`px-2.5 py-1 font-medium rounded transition-colors ${
              userRole === 'ADMIN'
                ? 'bg-white text-teal-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مدیر سامانه
          </button>
          <button
            onClick={() => switchRole('VIEWER')}
            className={`px-2.5 py-1 font-medium rounded transition-colors ${
              userRole === 'VIEWER'
                ? 'bg-white text-teal-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مشاهده‌گر منابع انسانی
          </button>
        </div>

        {/* User initials badge */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
          <div className="w-8 h-8 rounded-full bg-teal-800 text-white flex items-center justify-center font-medium text-xs shadow-xs">
            {currentUser.avatarInitials}
          </div>
          <div className="hidden xl:block text-right">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <span>{currentUser.department}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
