'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="max-w-md rounded-[var(--radius-lg)] border border-rose-200 bg-white p-8 text-center shadow-sm" role="alert">
        <h1 className="text-base font-bold text-slate-900">خطایی در پردازش درخواست رخ داد</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          مشکلی در نمایش این بخش وجود دارد. لطفاً دوباره تلاش کنید؛ در صورت تکرار با مدیر سامانه تماس بگیرید.
        </p>
        {error.digest && <p className="dir-ltr mt-2 font-mono text-[10px] text-slate-400">{error.digest}</p>}
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white transition-soft hover:bg-[var(--color-accent-strong)]"
        >
          تلاش مجدد
        </button>
      </div>
    </main>
  );
}
