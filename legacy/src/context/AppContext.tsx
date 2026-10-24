import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../mocks/mockData';

export type AppPage =
  | 'dashboard'
  | 'applicants'
  | 'applicant-detail'
  | 'applicant-form'
  | 'vacancies'
  | 'vacancy-detail'
  | 'reports'
  | 'organization'
  | 'users'
  | 'audit'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
}

interface AppContextType {
  currentUser: User;
  userRole: UserRole;
  switchRole: (role: UserRole) => void;
  activePage: AppPage;
  selectedApplicantId: string | null;
  selectedVacancyId: string | null;
  isEditingApplicant: boolean;
  navigateTo: (
    page: AppPage,
    options?: {
      applicantId?: string;
      vacancyId?: string;
      isEditing?: boolean;
    }
  ) => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type'], title?: string) => void;
  removeToast: (id: string) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  showDemoNotice: boolean;
  dismissDemoNotice: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [isEditingApplicant, setIsEditingApplicant] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [showDemoNotice, setShowDemoNotice] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const switchRole = (role: UserRole) => {
    const targetUser = INITIAL_USERS.find((u) => u.role === role) || {
      ...currentUser,
      role,
      roleTitle: role === 'ADMIN' ? 'مدیر سامانه' : 'کاربر مشاهده‌گر منابع انسانی',
    };
    setCurrentUser(targetUser);
    showToast(
      `حالت شبیه‌سازی به «${targetUser.roleTitle}» تغییر یافت.`,
      'info',
      'تغییر نقش دسترسی'
    );
  };

  const showToast = (
    message: string,
    type: ToastMessage['type'] = 'info',
    title?: string
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigateTo = (
    page: AppPage,
    options?: {
      applicantId?: string;
      vacancyId?: string;
      isEditing?: boolean;
    }
  ) => {
    if (options?.applicantId !== undefined) {
      setSelectedApplicantId(options.applicantId);
    }
    if (options?.vacancyId !== undefined) {
      setSelectedVacancyId(options.vacancyId);
    }
    setIsEditingApplicant(options?.isEditing ?? false);
    setActivePage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dismissDemoNotice = () => {
    setShowDemoNotice(false);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userRole: currentUser.role,
        switchRole,
        activePage,
        selectedApplicantId,
        selectedVacancyId,
        isEditingApplicant,
        navigateTo,
        toasts,
        showToast,
        removeToast,
        globalSearchQuery,
        setGlobalSearchQuery,
        showDemoNotice,
        dismissDemoNotice,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
