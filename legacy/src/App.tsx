import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DemoBanner } from './components/layout/DemoBanner';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ToastContainer } from './components/ui/ToastContainer';
import { DashboardView } from './features/dashboard/DashboardView';
import { ApplicantDirectory } from './features/applicants/ApplicantDirectory';
import { ApplicantProfile } from './features/applicants/ApplicantProfile';
import { ApplicantForm } from './features/applicants/ApplicantForm';
import { VacancyDirectory } from './features/vacancies/VacancyDirectory';
import { VacancyDetail } from './features/vacancies/VacancyDetail';
import { ReportsView } from './features/reports/ReportsView';
import { OrganizationView } from './features/organization/OrganizationView';
import { UserManagementView } from './features/users/UserManagementView';
import { AuditLogView } from './features/audit/AuditLogView';
import { SettingsView } from './features/settings/SettingsView';
import { LoginView } from './features/auth/LoginView';
import { BrandLogo } from './components/ui/BrandLogo';
import { LogIn, Download } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activePage,
    selectedApplicantId,
    selectedVacancyId,
    isEditingApplicant,
  } = useApp();

  const [isShowingLoginDemo, setIsShowingLoginDemo] = useState(false);

  if (isShowingLoginDemo) {
    return <LoginView onSuccess={() => setIsShowingLoginDemo(false)} />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardView />;
      case 'applicants':
        return <ApplicantDirectory />;
      case 'applicant-detail':
        return <ApplicantProfile applicantId={selectedApplicantId || 'APP-1403-101'} />;
      case 'applicant-form':
        return (
          <ApplicantForm
            applicantId={selectedApplicantId || undefined}
            isEditing={isEditingApplicant}
          />
        );
      case 'vacancies':
        return <VacancyDirectory />;
      case 'vacancy-detail':
        return <VacancyDetail vacancyId={selectedVacancyId || 'VAC-101'} />;
      case 'reports':
        return <ReportsView />;
      case 'organization':
        return <OrganizationView />;
      case 'users':
        return <UserManagementView />;
      case 'audit':
        return <AuditLogView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 selection:bg-teal-700 selection:text-white">
      {/* Prototype Notice Banner */}
      <DemoBanner />

      {/* Main Shell */}
      <div className="flex-1 flex flex-row">
        {/* Persistent RTL Sidebar */}
        <Sidebar />

        {/* Content Area (offset on large screens for 64 width / 16rem right sidebar) */}
        <div className="flex-1 flex flex-col min-w-0 lg:mr-64 transition-all">
          <TopBar />

          <main className="flex-1 pb-16">
            {renderActivePage()}
          </main>

          {/* Discreet Footer with Official Branding & Actions */}
          <footer className="border-t border-slate-200/80 bg-white py-3.5 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="xs" />
              <span className="font-extrabold text-slate-900">راستا</span>
              <span className="text-slate-300">·</span>
              <span className="text-teal-700 font-medium hidden md:inline">راهکار ارزیابی سوابق، تخصص و استعدادها</span>
              <span className="text-slate-300 hidden md:inline">·</span>
              <span className="text-slate-400">نسخه ۱.۲ سازمانی</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap justify-end">
              <a
                href="/RASTA_HR_System_v1_Frontend_Checkpoint.zip"
                download="RASTA_HR_System_v1_Frontend_Checkpoint.zip"
                className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1.5 transition-colors"
                title="دانلود بسته کامل پروژه به صورت فایل ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود بسته پروژه (ZIP)</span>
              </a>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setIsShowingLoginDemo(true)}
                className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition-colors"
                title="مشاهده و تست صفحه لاگین دمو"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>صفحه ورود شبیه‌سازی‌شده</span>
              </button>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Toast Feedback */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
