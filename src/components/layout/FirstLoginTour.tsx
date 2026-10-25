'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleHelp,
  FileSearch,
  Gauge,
  History,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

type TourStep = {
  target: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  adminOnly?: boolean;
};

type Rect = { top: number; left: number; width: number; height: number };
type Viewport = { width: number; height: number };

const ALL_STEPS: TourStep[] = [
  {
    target: 'dashboard-overview',
    eyebrow: 'شروع کار',
    title: 'به راستا خوش آمدید',
    description: 'راستا محل ثبت و ارزیابی پرونده‌های متقاضیان، بررسی سوابق سازمانی و پیگیری فرآیند جذب است. در این راهنمای کوتاه، بخش‌های اصلی را یکی‌یکی می‌بینید.',
    icon: Sparkles,
  },
  {
    target: 'dashboard-kpis',
    eyebrow: 'داشبورد',
    title: 'وضعیت کلی را در یک نگاه ببینید',
    description: 'کارت‌های بالای داشبورد تعداد پرونده‌ها، سوابق تأییدشده، استعلام‌های در انتظار و فرصت‌های شغلی باز را خلاصه می‌کنند. تغییر ارقام به اطلاعات ذخیره‌شده در سامانه وابسته است.',
    icon: Gauge,
  },
  {
    target: 'nav-applicants',
    eyebrow: 'بخش ۱ از ۶',
    title: 'بانک متقاضیان؛ نقطهٔ شروع کار',
    description: 'در این بخش می‌توانید پرونده‌ها را جست‌وجو و فیلتر کنید، مشخصات و سوابق را ببینید و با توجه به سطح دسترسی، پروندهٔ جدید ثبت یا اطلاعات را ویرایش کنید. اطلاعات حساس فقط باید در اختیار نقش‌های مجاز باشد.',
    icon: UsersRound,
  },
  {
    target: 'dashboard-recent',
    eyebrow: 'پیگیری روزانه',
    title: 'پرونده‌های تازه را دنبال کنید',
    description: 'جدول متقاضیان اخیر دسترسی سریع به آخرین پرونده‌های ثبت‌شده می‌دهد. برای بازکردن پرونده، روی «مشاهده» بزنید؛ برای فهرست کامل به بانک متقاضیان بروید.',
    icon: FileSearch,
  },
  {
    target: 'dashboard-priority',
    eyebrow: 'ارزیابی سوابق',
    title: 'اولویت سازمانی چگونه نمایش داده می‌شود؟',
    description: 'سامانه سوابق ثبت‌شده را بر اساس وضعیت استعلام و ارتباط سابقه با سازمان مادر یا شرکت‌های تابعه دسته‌بندی می‌کند. اولویت نمایش‌داده‌شده جایگزین بررسی مستندات و تصمیم نهایی مسئول منابع انسانی نیست.',
    icon: ShieldCheck,
  },
  {
    target: 'nav-vacancies',
    eyebrow: 'بخش ۲ از ۶',
    title: 'فرصت‌های شغلی و مراحل جذب',
    description: 'در صفحهٔ فرصت‌های شغلی، موقعیت‌ها را تعریف و وضعیت آن‌ها را پیگیری کنید. مدیران مجاز می‌توانند متقاضی را به یک فرصت متصل کنند و مرحلهٔ بررسی او را به‌روزرسانی کنند.',
    icon: BriefcaseBusiness,
  },
  {
    target: 'nav-organization',
    eyebrow: 'بخش ۳ از ۶',
    title: 'ساختار سازمانی',
    description: 'شرکت‌های تابعه و پروژه‌های مرتبط در این بخش نمایش داده می‌شوند. ساختار باید با اطلاعات واقعی و تأییدشدهٔ سازمان همخوان باشد تا دسته‌بندی سوابق به‌درستی انجام شود.',
    icon: Building2,
  },
  {
    target: 'nav-reports',
    eyebrow: 'بخش ۴ از ۶',
    title: 'گزارش‌ها و آمار',
    description: 'برای دیدن نمای تجمیعی از پرونده‌ها، فیلترها و خروجی‌های مجاز از گزارش‌ها استفاده کنید. فایل‌های خروجی را فقط از طریق مجاز و برای افراد دارای مجوز نگهداری یا ارسال کنید.',
    icon: BarChart3,
  },
  {
    target: 'nav-users',
    eyebrow: 'ویژهٔ مدیر سامانه',
    title: 'مدیریت کاربران و سطح دسترسی',
    description: 'مدیر سامانه می‌تواند برای کاربران مجاز حساب بسازد، نقش مدیر یا مشاهده‌گر را تعیین کند و حساب را فعال یا غیرفعال کند. کمترین سطح دسترسی لازم را به هر شخص بدهید.',
    icon: UsersRound,
    adminOnly: true,
  },
  {
    target: 'nav-audit',
    eyebrow: 'ویژهٔ مدیر سامانه',
    title: 'سوابق رویدادها',
    description: 'در بخش حسابرسی، رویدادهای مهم و تغییرات ثبت‌شده را برای پیگیری فعالیت‌ها بررسی کنید. مشاهدهٔ این گزارش‌ها نیز باید به کاربران مجاز محدود باشد.',
    icon: History,
    adminOnly: true,
  },
  {
    target: 'nav-settings',
    eyebrow: 'ویژهٔ مدیر سامانه',
    title: 'تنظیمات پایه',
    description: 'فهرست‌های کنترلی مانند شهرها و حوزه‌های شغلی از این قسمت مدیریت می‌شوند. تغییرات را با هماهنگی سازمان انجام دهید تا ثبت و گزارش‌گیری پرونده‌ها یکدست بماند.',
    icon: Settings2,
    adminOnly: true,
  },
  {
    target: 'help-button',
    eyebrow: 'هر زمان که نیاز داشتید',
    title: 'راهنما همیشه در دسترس است',
    description: 'می‌توانید این راهنما را ببندید و کارتان را شروع کنید. برای مرور دوبارهٔ مراحل، روی «راهنمای سامانه» در نوار بالای صفحه کلیک کنید. با انتخاب «رد کردن» یا پایان راهنما، نمایش خودکار آن برای این کاربر در همین مرورگر متوقف می‌شود.',
    icon: BookOpenCheck,
  },
];

function visibleTarget(name: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return elements.find((element) => {
    const style = window.getComputedStyle(element);
    return element.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }) ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function FirstLoginTour({
  userId,
  isAdmin,
  onMobileNavChange,
}: {
  userId: string;
  isAdmin: boolean;
  onMobileNavChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [startWhenHome, setStartWhenHome] = useState(false);
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1280, height: 800 });
  const [cardPosition, setCardPosition] = useState({ top: 18, left: 18, width: 390 });

  const storageKey = `rasta:onboarding:v1:${userId}`;
  const steps = useMemo(() => ALL_STEPS.filter((step) => isAdmin || !step.adminOnly), [isAdmin]);
  const current = steps[Math.min(stepIndex, steps.length - 1)] ?? steps[0];

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, 'complete');
    } catch {
      // The tour still closes if browser storage is disabled.
    }
    setIsOpen(false);
    setStartWhenHome(false);
    onMobileNavChange(false);
    setSpotlight(null);
  }, [onMobileNavChange, storageKey]);

  const start = useCallback(() => {
    if (pathname !== '/') {
      setStartWhenHome(true);
      router.push('/');
      return;
    }
    setStepIndex(0);
    setIsOpen(true);
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== '/') return;
    try {
      if (window.localStorage.getItem(storageKey) !== 'complete') {
        setStepIndex(0);
        setIsOpen(true);
      }
    } catch {
      // If storage is blocked, show the first-use tour for this page visit.
      setStepIndex(0);
      setIsOpen(true);
    }
  }, [pathname, storageKey]);

  useEffect(() => {
    if (!startWhenHome || pathname !== '/') return;
    setStepIndex(0);
    setIsOpen(true);
    setStartWhenHome(false);
  }, [pathname, startWhenHome]);

  useEffect(() => {
    if (!isOpen || !current) {
      onMobileNavChange(false);
      return;
    }

    const isNavStep = current.target.startsWith('nav-') || current.target === 'brand';
    const wantsMobileMenu = window.matchMedia('(max-width: 1023px)').matches && isNavStep;
    onMobileNavChange(wantsMobileMenu);

    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const target = visibleTarget(current.target);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        const rect = target.getBoundingClientRect();
        setSpotlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      } else {
        setSpotlight(null);
      }

      const width = Math.min(420, Math.max(280, window.innerWidth - 24));
      const cardHeight = cardRef.current?.getBoundingClientRect().height ?? 340;
      const rect = target?.getBoundingClientRect();
      let top = rect
        ? rect.bottom + cardHeight + 26 <= window.innerHeight
          ? rect.bottom + 18
          : rect.top - cardHeight - 18
        : (window.innerHeight - cardHeight) / 2;
      top = clamp(top, 12, Math.max(12, window.innerHeight - cardHeight - 12));
      const left = rect
        ? clamp(rect.left + rect.width / 2 - width / 2, 12, Math.max(12, window.innerWidth - width - 12))
        : (window.innerWidth - width) / 2;
      setCardPosition({ top, left, width });
    };

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(measure);
    });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [current, isOpen, onMobileNavChange, stepIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
      if (event.key === 'ArrowLeft' && stepIndex < steps.length - 1) {
        setStepIndex((value) => Math.min(value + 1, steps.length - 1));
      }
      if (event.key === 'ArrowRight' && stepIndex > 0) {
        setStepIndex((value) => Math.max(value - 1, 0));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish, isOpen, stepIndex, steps.length]);

  const goNext = () => {
    if (stepIndex >= steps.length - 1) {
      finish();
    } else {
      setStepIndex((value) => Math.min(value + 1, steps.length - 1));
    }
  };

  const goPrevious = () => setStepIndex((value) => Math.max(value - 1, 0));
  const Icon = current?.icon ?? Sparkles;

  const hasSpotlight = Boolean(spotlight);
  const gap = 10;
  const hole = spotlight
    ? {
        top: clamp(spotlight.top - gap, 0, viewport.height),
        left: clamp(spotlight.left - gap, 0, viewport.width),
        right: clamp(spotlight.left + spotlight.width + gap, 0, viewport.width),
        bottom: clamp(spotlight.top + spotlight.height + gap, 0, viewport.height),
      }
    : null;

  return (
    <>
      <button
        type="button"
        data-tour="help-button"
        onClick={start}
        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-soft hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900"
        aria-label="شروع دوباره راهنمای سامانه"
        title="راهنمای سامانه"
      >
        <CircleHelp className="h-4 w-4 text-teal-700" aria-hidden />
        <span className="hidden sm:inline">راهنمای سامانه</span>
      </button>

      {isOpen && current && (
        <div className="fixed inset-0 z-[10000]" aria-live="polite">
          {hasSpotlight && hole ? (
            <>
              <div
                className="rasta-tour-mask"
                style={{ top: 0, left: 0, width: viewport.width, height: hole.top }}
              />
              <div
                className="rasta-tour-mask"
                style={{ top: hole.top, left: 0, width: hole.left, height: Math.max(0, hole.bottom - hole.top) }}
              />
              <div
                className="rasta-tour-mask"
                style={{ top: hole.top, left: hole.right, width: Math.max(0, viewport.width - hole.right), height: Math.max(0, hole.bottom - hole.top) }}
              />
              <div
                className="rasta-tour-mask"
                style={{ top: hole.bottom, left: 0, width: viewport.width, height: Math.max(0, viewport.height - hole.bottom) }}
              />
              <div
                aria-hidden
                className="rasta-tour-spotlight-ring"
                style={{
                  top: hole.top,
                  left: hole.left,
                  width: Math.max(0, hole.right - hole.left),
                  height: Math.max(0, hole.bottom - hole.top),
                }}
              />
            </>
          ) : (
            <div className="rasta-tour-mask inset-0" />
          )}

          <div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rasta-tour-title"
            aria-describedby="rasta-tour-description"
            className="rasta-tour-card fixed max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 text-white shadow-2xl"
            style={{ top: cardPosition.top, left: cardPosition.left, width: cardPosition.width }}
          >
            <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-teal-900/90 via-slate-900 to-indigo-950 px-5 pb-5 pt-4 sm:px-6">
              <div className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-teal-400/15 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-200/20 bg-teal-300/10 text-teal-200 shadow-inner">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-teal-200">{current.eyebrow}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">راهنمای تعاملی راستا</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={finish}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="بستن راهنما"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <h2 id="rasta-tour-title" className="relative mt-5 text-lg font-extrabold leading-relaxed tracking-tight sm:text-xl">
                {current.title}
              </h2>
              <p id="rasta-tour-description" className="relative mt-2 text-xs leading-7 text-slate-300 sm:text-sm">
                {current.description}
              </p>
            </div>

            <div className="space-y-4 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-1.5" aria-label={`مرحله ${stepIndex + 1} از ${steps.length}`}>
                {steps.map((step, index) => (
                  <span
                    key={step.target}
                    className={`h-1.5 flex-1 rounded-full transition-all ${index <= stepIndex ? 'bg-teal-300' : 'bg-white/10'}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>مرحلهٔ {stepIndex + 1} از {steps.length}</span>
                <button type="button" onClick={finish} className="font-semibold text-slate-400 underline-offset-4 hover:text-teal-200 hover:underline">
                  رد کردن راهنما
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                  قبلی
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-teal-400 to-emerald-300 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-teal-950/30 transition hover:brightness-105"
                >
                  {stepIndex === steps.length - 1 ? (
                    <>
                      پایان راهنما
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    </>
                  ) : (
                    <>
                      مرحلهٔ بعد
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
