import React, { memo } from 'react';

export type CategoryFilter = 'all' | 'khmer-music' | 'lofi' | 'tech' | 'favorites';

interface CategoryTabsProps {
  activeCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  savedCount: number;
}

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'khmer-music', label: 'Khmer' },
  { id: 'lofi', label: 'Lo-Fi' },
  { id: 'tech', label: 'Tech' },
];

export const CategoryTabs = memo(function CategoryTabs({
  activeCategory,
  onSelectCategory,
  savedCount,
}: CategoryTabsProps) {
  const allTabs = [
    ...CATEGORIES,
    { id: 'favorites' as CategoryFilter, label: `Saved (${savedCount})` },
  ];

  return (
    <div className="px-4 pb-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
      {allTabs.map((cat) => {
        const active = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              active
                ? 'bg-tg-text text-tg-bg font-semibold shadow-sm'
                : 'bg-tg-surface text-tg-text border border-tg-border/30 hover:bg-tg-surface/80'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
});
