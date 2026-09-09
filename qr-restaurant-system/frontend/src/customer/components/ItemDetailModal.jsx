import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Clock, 
  UtensilsCrossed, 
  Check, 
  ShoppingBag 
} from 'lucide-react';
import { useGuestSession } from '../../context/GuestSessionContext';

export const ItemDetailModal = ({ item, isOpen, onClose }) => {
  const { addToCart, currency } = useGuestSession();

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [imageError, setImageError] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const timerRef = useRef(null);

  // Reset state when a new item is opened
  useEffect(() => {
    if (item && isOpen) {
      setQuantity(1);
      setNotes('');
      setImageError(false);
      setAddedToast(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [item, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const handleAddToCart = () => {
    addToCart(item, quantity, notes);
    setAddedToast(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onClose();
    }, 700);
  };

  const hasImage = Boolean(item.imageUrl) && !imageError;
  const unitPrice = Number(item.price) || 0;
  const subtotal = unitPrice * quantity;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-detail-title"
    >
      <div className="bg-slate-50 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-slate-100/50">
        {/* Top Header with Close Button */}
        <div className="p-4 flex items-center justify-between sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700">Dish Details</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dish details"
            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 space-y-4">
          {/* Dish Image */}
          <div className="w-full h-52 sm:h-64 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 relative shadow-xs flex items-center justify-center">
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

          {/* Dish Info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 id="dish-detail-title" className="text-xl font-black text-slate-900 leading-snug">
                {item.name}
              </h2>
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

          {/* Special Instructions Notes */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
            <label
              htmlFor="modal-special-instructions"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Special Instructions (Optional)
            </label>
            <textarea
              id="modal-special-instructions"
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

        {/* Bottom Sticky Action Bar */}
        <div className="p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 sticky bottom-0 z-20">
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
      </div>
    </div>
  );
};
