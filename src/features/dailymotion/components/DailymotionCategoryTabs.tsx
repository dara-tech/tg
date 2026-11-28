import React, { memo } from 'react';
import { type DailymotionCategory, DAILYMOTION_CATEGORIES } from '@/services/dailymotion.service';

interface DailymotionCategoryTabsProps {
  activeCategory: DailymotionCategory;
  onSelectCategory: (cat: DailymotionCategory) => void;
  savedCount: number;
}

export const DailymotionCategoryTabs = memo(function DailymotionCategoryTabs({
  activeCategory,
  onSelectCategory,
  savedCount,
}: DailymotionCategoryTabsProps) {
  const tabs = DAILYMOTION_CATEGORIES.map((cat) => {
    if (cat.id === 'favorites') {
      return { ...cat, label: `Saved (${savedCount})` };
    }
    return cat;
  });

  return (
    <div className="px-3.5 pb-2 pt-0.5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map((cat) => {
        const active = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              active
                ? 'bg-tg-text text-tg-bg shadow-xs'
                : 'bg-tg-surface text-tg-text border border-tg-border/30 hover:bg-tg-surface/80 active:scale-95'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
});
