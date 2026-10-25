'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';
import { inputClass } from '@/components/ui/Primitives';
import type { ApplicantListRow } from '@/types';

interface Props {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function ApplicantLiveSearch({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  placeholder = 'جستجو بر اساس نام، شناسه، تخصص، مهارت یا سابقه کاری…',
  className = 'w-full',
}: Props) {
  const router = useRouter();
  const resultsId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const query = value === undefined ? uncontrolledValue : value;
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState(false);
  const [results, setResults] = useState<ApplicantListRow[]>([]);
  const term = query.trim();
  const showSuggestions = focused && term.length >= 2;

  function changeValue(nextValue: string) {
    if (value === undefined) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
  }

  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setRequestError(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setRequestError(false);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/applicants/search?q=' + encodeURIComponent(term), {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('SEARCH_FAILED');
        const payload = (await response.json()) as { results?: ApplicantListRow[] };
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setRequestError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedQuery = query.trim();
    setFocused(false);
    if (onSubmit) {
      onSubmit(submittedQuery);
    } else {
      router.push(submittedQuery ? '/applicants?q=' + encodeURIComponent(submittedQuery) : '/applicants');
    }
  }

  return (
    <form
      role="search"
      className={className}
      onSubmit={handleSubmit}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setFocused(false);
        }
      }}
    >
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => changeValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFocused(false);
          }}
          placeholder={placeholder}
          aria-label="جستجوی متقاضیان"
          aria-controls={resultsId}
          aria-expanded={showSuggestions}
          autoComplete="off"
          className={inputClass + ' pr-10 pl-9'}
        />
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        {query && (
          <button
            type="button"
            onClick={() => changeValue('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            aria-label="پاک کردن جستجو"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}

        {showSuggestions && (
          <div
            id={resultsId}
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-[var(--radius-lg)] border border-slate-200 bg-white shadow-lg"
            aria-label="پیشنهادهای جستجوی متقاضیان"
          >
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                در حال جستجو…
              </div>
            ) : requestError ? (
              <p className="px-4 py-3 text-xs text-rose-700" role="status">
                جستجو موقتاً در دسترس نیست. دوباره تلاش کنید.
              </p>
            ) : results.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {results.map((applicant) => (
                  <li key={applicant.id}>
                    <Link
                      href={'/applicants/' + applicant.id}
                      onClick={() => setFocused(false)}
                      className="block px-4 py-3 transition-soft hover:bg-teal-50/70 focus-visible:bg-teal-50"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-bold text-slate-900">{applicant.full_name}</span>
                        <span className="num shrink-0 text-[10px] text-slate-400">{applicant.public_code}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                        <span>{applicant.primary_job_title}</span>
                        <span aria-hidden>·</span>
                        <span>{applicant.primary_job_category}</span>
                        {applicant.residential_city && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{applicant.residential_city}</span>
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-xs text-slate-500" role="status">
                متقاضی مرتبطی پیدا نشد.
              </p>
            )}
            {!loading && !requestError && (
              <Link
                href={'/applicants?q=' + encodeURIComponent(term)}
                onClick={() => setFocused(false)}
                className="block border-t border-slate-100 px-4 py-3 text-xs font-semibold text-teal-700 hover:bg-slate-50"
              >
                مشاهده همه نتایج جستجو
              </Link>
            )}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {loading ? 'در حال جستجو' : results.length ? results.length + ' پیشنهاد یافت شد' : ''}
      </p>
    </form>
  );
}
