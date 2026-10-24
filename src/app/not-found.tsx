import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="max-w-md rounded-[var(--radius-lg)] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="num text-3xl font-extrabold text-[var(--color-accent)]">۴۰۴</p>
        <h1 className="mt-2 text-base font-bold text-slate-900">صفحه مورد نظر یافت نشد</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          نشانی وارد شده معتبر نیست یا این پرونده حذف شده است.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white transition-soft hover:bg-[var(--color-accent-strong)]"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    </main>
  );
}
