'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { inputClass, selectClass } from '@/components/ui/Primitives';
import { Search } from 'lucide-react';

export function AuditToolbar({
  categories,
  currentCategory,
  currentQuery,
}: {
  categories: [string, string][];
  currentCategory: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);

  function push(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || value === 'ALL') params.delete(key);
      else params.set(key, value);
    }
    params.delete('page');
    startTransition(() => router.push(`/audit?${params.toString()}`));
  }

  return (
    <div className={`flex flex-col gap-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4 text-xs sm:flex-row sm:items-center ${pending ? 'opacity-60' : ''}`}>
      <div className="relative flex-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') push({ q });
          }}
          placeholder="جستجو در خلاصه رویداد، نام کاربر یا شناسه رکورد… (Enter)"
          aria-label="جستجوی رویدادها"
          className={`${inputClass} pr-10`}
        />
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
      <select
        value={currentCategory}
        onChange={(e) => push({ category: e.target.value })}
        className={selectClass}
        aria-label="فیلتر دسته‌بندی"
      >
        <option value="ALL">همه دسته‌بندی‌ها</option>
        {categories.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );
}
