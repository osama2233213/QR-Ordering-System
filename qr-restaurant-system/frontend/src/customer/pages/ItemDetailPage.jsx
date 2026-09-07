import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Clock, 
  UtensilsCrossed, 
  Check, 
  ShoppingBag 
} from 'lucide-react';
import { useGuestSession } from '../../context/GuestSessionContext';
import { menuApi } from '../../api/menuApi';
import { CartPill } from '../components/CartPill';

export const ItemDetailPage = () => {
  const { restaurantId, tableId, itemId } = useParams();
  const navigate = useNavigate();
  const { addToCart, currency } = useGuestSession();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [imageError, setImageError] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  const timerRef = useRef(null);

  // Clean up pending navigation timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Fetch menu and locate the target dish
  useEffect(() => {
    if (!restaurantId || !itemId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    menuApi
      .getPublicMenu(restaurantId)
      .then((res) => {
        if (!isMounted) return;
        const allItems = res.data?.data?.items || [];
        const found = allItems.find((i) => (i._id || i.id) === itemId);

        if (found) {
          setItem(found);
        } else {
          setError('Dish not found in this menu.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[ItemDetailPage] Error fetching dish:', err);
        setError('Failed to load dish details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [restaurantId, itemId]);

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const handleAddToCart = () => {
    if (!item) return;
    addToCart(item, quantity, notes);
    setAddedToast(true);

    // Auto-navigate back to menu after short visual confirmation
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      navigate(`/r/${restaurantId}/t/${tableId}`);
    }, 800);
  };

  const hasImage = Boolean(item?.imageUrl) && !imageError;
  const unitPrice = Number(item?.price) || 0;
  const subtotal = unitPrice * quantity;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-base font-bold text-slate-800">DineFlow</h2>
        <p className="text-xs text-slate-500 mt-1">Loading dish details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mb-3 text-xl font-bold shadow-sm">
          !
        </div>
        <h3 className="font-bold text-slate-800 text-base">Dish Not Found</h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-xs">{error || 'This dish is currently unavailable.'}</p>
        <button
          type="button"
          onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
          className="mt-5 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition-colors shadow-xs"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto pb-24 relative">
      <div>
        {/* Floating Top Navigation Header */}
        <div className="p-4 flex items-center justify-between sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
            aria-label="Back to menu"
            className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700">Dish Details</span>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Dish Image Container (Display-only handling) */}
        <div className="px-4">
          <div className="w-full h-56 rounded-3xl overflow-hidden bg-slate-100 border border-slate-100 relative shadow-sm flex items-center justify-center">
            {hasImage ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 p-4 text-center">
                <UtensilsCrossed className="w-12 h-12 text-slate-300 stroke-[1.5] mb-2" />
                <span className="text-xs font-medium text-slate-400">Freshly Made to Order</span>
              </div>
            )}
          </div>
        </div>

        {/* Dish Info Card */}
        <div className="p-4 pt-4 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-black text-slate-900 leading-snug">
                {item.name}
              </h1>
              <span className="font-black text-lg text-brand-600 whitespace-nowrap">
                {currency || 'PKR'} {unitPrice.toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {item.description || 'Delicious dish prepared with high quality ingredients and traditional culinary craft.'}
            </p>

            {item.preparationTimeMinutes && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-3">
                <Clock className="w-3.5 h-3.5 text-brand-500" />
                <span>Est. prep time: {item.preparationTimeMinutes} mins</span>
              </div>
            )}
          </div>

          {/* Kitchen Notes / Custom Instructions Input */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
            <label
              htmlFor="special-instructions"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Special Instructions (Optional)
            </label>
            <textarea
              id="special-instructions"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Less spicy, dressing on the side, allergies..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Quantity Controls */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shadow-xs"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-sm text-slate-900 w-6 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                aria-label="Increase quantity"
                className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 active:scale-95 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar: Add to Cart */}
      <div className="p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={addedToast}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
            addedToast
              ? 'bg-emerald-500 text-white'
              : 'bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white'
          }`}
        >
          {addedToast ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart · {currency || 'PKR'} {subtotal.toLocaleString()}</span>
            </>
          )}
        </button>
      </div>

      {/* Floating Cart Bar (if items exist in session cart) */}
      <CartPill />
    </div>
  );
};
