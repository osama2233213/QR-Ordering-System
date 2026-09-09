import React, { useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { useGuestSession } from '../../context/GuestSessionContext';

export const MenuItemCard = ({ item, onAdd, onSelect }) => {
  const { addToCart, currency } = useGuestSession();
  const [imageError, setImageError] = useState(false);

  if (!item) return null;

  const handleCardClick = () => {
    if (typeof onSelect === 'function') {
      onSelect(item);
    } else if (typeof onAdd === 'function') {
      onAdd(item);
    } else {
      addToCart(item);
    }
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    if (typeof onAdd === 'function') {
      onAdd(item);
    } else {
      addToCart(item);
    }
  };

  const hasImage = Boolean(item.imageUrl) && !imageError;
  const formattedPrice = typeof item.price === 'number' 
    ? item.price.toLocaleString() 
    : item.price;

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5 group cursor-pointer h-full"
    >
      {/* Consistent Fixed-Dimension Image Container */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex-shrink-0 overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center relative">
        {hasImage ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 p-2 text-center">
            <UtensilsCrossed className="w-7 h-7 text-slate-300 stroke-[1.5]" />
            <span className="text-[10px] font-medium text-slate-400 mt-1 line-clamp-1">Freshly Made</span>
          </div>
        )}
      </div>

      {/* Item Body */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full">
        <div>
          <h4 className="font-semibold text-slate-900 text-sm sm:text-base truncate leading-snug">
            {item.name}
          </h4>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {item.description || 'Freshly prepared with quality ingredients.'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2.5 pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] font-semibold text-brand-600 uppercase">
              {currency || 'PKR'}
            </span>
            <span className="font-bold text-slate-900 text-sm sm:text-base">
              {formattedPrice}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${item.name} to cart`}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white flex items-center justify-center shadow-xs hover:shadow transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
