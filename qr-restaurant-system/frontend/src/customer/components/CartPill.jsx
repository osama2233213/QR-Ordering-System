import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGuestSession } from '../../context/GuestSessionContext';

export const CartPill = () => {
  const { cart, cartTotals, currency } = useGuestSession();
  const navigate = useNavigate();
  const { restaurantId, tableId } = useParams();

  const totalCount = cartTotals?.totalCount ?? cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalPrice = cartTotals?.subtotal ?? cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  // Strictly hidden when cart is empty
  if (totalCount === 0) return null;

  const formattedPrice = typeof totalPrice === 'number'
    ? totalPrice.toLocaleString()
    : totalPrice;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md sm:max-w-lg lg:max-w-xl mx-auto z-40">
      <button 
        type="button"
        onClick={() => navigate(`/r/${restaurantId}/t/${tableId}/cart`)}
        className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between font-medium border border-slate-800/80 transition-all duration-150 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold shadow-xs">
            {totalCount}
          </div>
          <div className="flex items-center gap-1.5 text-slate-100 font-semibold text-sm">
            <ShoppingBag className="w-4 h-4 text-brand-400" />
            <span>View Cart</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-brand-400 font-medium">{currency || 'PKR'}</span>
            <span className="font-bold text-white text-sm">{formattedPrice}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>
    </div>
  );
};
