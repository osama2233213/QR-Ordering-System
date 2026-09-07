import React from 'react';

export const CategoryPills = ({ categories = [], activeId = null, onSelect }) => {
  // Sort categories by displayOrder if available
  const sortedCategories = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* "All Items" default option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
          !activeId
            ? 'bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/20'
            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        All Items
      </button>

      {/* Dynamic Backend Categories */}
      {sortedCategories.map((cat) => {
        const catId = cat._id || cat.id;
        const isActive = activeId === catId;

        return (
          <button
            key={catId}
            type="button"
            onClick={() => onSelect(catId)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
              isActive
                ? 'bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};
