'use client';

import { useState, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/** Tabbed section with proper tablist/tab/tabpanel semantics. */
export function Tabs({ items, initialId }: { items: TabItem[]; initialId?: string }) {
  const [active, setActive] = useState(initialId ?? items[0]?.id ?? '');
  const activeItem = items.find((i) => i.id === active) ?? items[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="بخش‌های پرونده"
        className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-slate-200"
      >
        {items.map((item) => {
          const isActive = item.id === activeItem?.id;
          return (
            <button
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              onClick={() => setActive(item.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-medium transition-soft ${
                isActive
                  ? 'border-[var(--color-accent)] font-bold text-teal-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <span>{item.label}</span>
              {typeof item.count === 'number' && (
                <span
                  className={`num rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] ${
                    isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${activeItem?.id}`}
        aria-labelledby={`tab-${activeItem?.id}`}
        className="pt-5"
      >
        {activeItem?.content}
      </div>
    </div>
  );
}
