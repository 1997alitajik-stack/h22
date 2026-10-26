'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  Building,
  History,
  Settings,
  Menu,
  X,
  LogOut,
  Eye,
  UserPlus,
  UserRound,
  LifeBuoy,
  Archive,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { FirstLoginTour } from './FirstLoginTour';
import { initialsOf } from '@/lib/persian';
import type { SessionUser } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'نمای کلی',
    items: [{ href: '/', label: 'داشبورد', icon: LayoutDashboard }],
  },
  {
    title: 'متقاضیان',
    items: [
      { href: '/applicants', label: 'بانک متقاضیان', icon: Users },
      { href: '/vacancies', label: 'فرصت‌های شغلی', icon: Briefcase },
      { href: '/vacancies/archive', label: 'بایگانی فرصت‌ها', icon: Archive },
    ],
  },
  {
    title: 'استعلام و سازمان',
    items: [
      { href: '/organization', label: 'ساختار سازمانی', icon: Building },
    ],
  },
  {
    title: 'گزارش‌ها',
    items: [{ href: '/reports', label: 'گزارش‌ها و آمار', icon: ShieldCheck }],
  },
  {
    title: 'راهنما',
    items: [{ href: '/support', label: 'پشتیبانی سامانه', icon: LifeBuoy }],
  },
  {
    title: 'مدیریت سامانه',
    items: [
      { href: '/users', label: 'مدیریت کاربران', icon: UserPlus, adminOnly: true },
      { href: '/audit', label: 'سوابق رویدادها', icon: History, adminOnly: true },
      { href: '/settings', label: 'تنظیمات پایه', icon: Settings, adminOnly: true },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/vacancies') {
    return (pathname === '/vacancies' || pathname.startsWith('/vacancies/')) &&
      !pathname.startsWith('/vacancies/archive');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Application shell: compact top bar (search + user menu) and a grouped,
 * collapsible sidebar that replaces the overcrowded legacy navigation.
 */
export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = user.role === 'ADMIN';

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--color-structure)] text-slate-200">
      <div className="relative flex min-h-20 shrink-0 items-center justify-center border-b border-slate-800/90 px-4 py-2">
        <Link
          href="/"
          data-tour="brand"
          aria-label="راستا، بازگشت به داشبورد"
          className="flex min-w-0 items-center justify-center"
          onClick={() => setMobileOpen(false)}
        >
          <BrandMark size="md" theme="dark" withText />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="mr-auto p-1 text-slate-400 hover:text-white lg:hidden"
          aria-label="بستن منو"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="ناوبری اصلی">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-tour={`nav-${item.href === '/' ? 'dashboard' : item.href.slice(1)}`}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium transition-soft ${
                          active
                            ? 'bg-[var(--color-accent)] font-semibold text-white'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-teal-200' : 'text-slate-400'}`} aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-800 bg-slate-950/60 p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-xs font-semibold text-teal-300">
            {initialsOf(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-200">{user.fullName}</p>
            <p className="flex items-center gap-1 truncate text-[11px] text-teal-400">
              {isAdmin ? <ShieldCheck className="h-3 w-3" aria-hidden /> : <Eye className="h-3 w-3" aria-hidden />}
              {isAdmin ? 'مدیر سامانه' : 'مشاهده‌گر منابع انسانی'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Sidebar — fixed right (RTL), off-canvas on mobile */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l border-slate-800 lg:block" aria-label="منوی کناری">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 right-0 w-72">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:mr-64">
        {/* Compact top bar: contextual title + actions only. Branding and
            navigation live in the sidebar — no duplication. */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
              aria-label="باز کردن منو"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <span data-tour="topbar-title" className="truncate text-sm font-semibold text-slate-900">
              سامانه راستا
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <FirstLoginTour
              userId={user.id}
              isAdmin={isAdmin}
              onMobileNavChange={setMobileOpen}
            />
            <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 hover:bg-slate-100 transition-soft"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-strong)] text-xs font-medium text-white">
                {initialsOf(user.fullName)}
              </div>
              <span className="hidden text-xs font-semibold text-slate-800 sm:block">{user.fullName}</span>
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1.5 w-56 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-1.5 shadow-lg"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800">{user.fullName}</p>
                  <p className="dir-ltr truncate text-[11px] text-slate-400">{user.email}</p>
                  <p className="mt-0.5 text-[11px] text-teal-700">
                    {isAdmin ? 'مدیر سامانه' : 'مشاهده‌گر منابع انسانی'}
                    {user.department ? ` · ${user.department}` : ''}
                  </p>
                </div>
                <a
                  href="/api/auth/signout"
                  className="hidden"
                  aria-hidden
                  tabIndex={-1}
                >
                  خروج
                </a>
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium text-slate-700 transition-soft hover:bg-teal-50 hover:text-teal-900"
                >
                  <UserRound className="h-3.5 w-3.5 text-teal-700" aria-hidden />
                  پروفایل من و ویرایش اطلاعات
                </Link>
                <form action="/api/auth/signout" method="post" className="p-0">
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-soft"
                  >
                    <LogOut className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    خروج از حساب
                  </button>
                </form>
              </div>
            )}
            </div>
          </div>
        </header>

        <main className="flex-1 pb-10">{children}</main>

        <footer className="no-print border-t border-slate-200/80 bg-white px-6 py-3 text-[11px] text-slate-400">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <span>سامانه راستا · نسخه ۲.۰ سازمانی</span>
            <span>دسترسی به اطلاعات محرمانه است و ثبت می‌شود</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
