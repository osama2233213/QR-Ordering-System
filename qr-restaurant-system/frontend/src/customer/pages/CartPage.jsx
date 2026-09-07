import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, UtensilsCrossed, Loader2 } from 'lucide-react';
import { useGuestSession } from '../../context/GuestSessionContext';
import { orderApi } from '../../api/orderApi';

/**
 * Isolated thumbnail with image error fallback handling.
 */
const CartItemThumbnail = ({ imageUrl, name }) => {
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(imageUrl) && !imageError;

  return (
    <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center relative">
      {hasImage ? (
        <img
          src={imageUrl}
          alt={name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
          <UtensilsCrossed className="w-5 h-5 text-slate-300 stroke-[1.5]" />
        </div>
      )}
    </div>
  );
};

export const CartPage = () => {
  const { restaurantId, tableId } = useParams();
  const navigate = useNavigate();

  const {
    cart,
    cartTotals,
    currency,
    updateQuantity,
    removeFromCart,
    clearCart,
    tableInfo,
    setActiveOrderId,
  } = useGuestSession();

  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState(null);

  const tableLabel = tableInfo?.tableNumber
    ? `Table ${tableInfo.tableNumber}`
    : `Table #${tableId || '12'}`;

  /**
   * Submit active cart to the kitchen via POST /api/orders/place
   */
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setOrderError(null);

    try {
      // Build server-compliant order payload
      const orderPayload = {
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes || '',
        })),
        notes: orderNotes.trim(),
      };

      const response = await orderApi.placeOrder(orderPayload);
      const createdOrder = response.data?.data;

      if (!createdOrder || !createdOrder._id) {
        throw new Error('Order creation was acknowledged without a valid order identifier.');
      }

      // Record active order ID in guest context
      if (typeof setActiveOrderId === 'function') {
        setActiveOrderId(createdOrder._id);
      }

      // Empty cart upon successful order placement
      clearCart();

      // Navigate to order confirmation screen with created order details in navigation state
      navigate(`/r/${restaurantId}/t/${tableId}/confirmation`, {
        state: {
          orderId: createdOrder._id,
          order: createdOrder,
        },
      });
    } catch (err) {
      console.error('[CartPage] Order placement failed:', err);
      const message =
        err.response?.data?.message || err.message || 'Unable to place your order. Please check with staff.';
      setOrderError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto relative">
      {/* Sticky Top Bar */}
      <div>
        <header className="p-4 bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
              aria-label="Back to menu"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">Your Cart</h1>
              <p className="text-xs text-brand-600 font-semibold">{tableLabel}</p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 active:scale-95 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Clear
            </button>
          )}
        </header>

        {/* Content Area */}
        <main className="p-4 space-y-4">
          {/* Order Placement Error Notice */}
          {orderError && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                !
              </span>
              <div className="flex-1">
                <p className="font-semibold">Order could not be sent</p>
                <p className="mt-0.5 text-rose-600">{orderError}</p>
              </div>
            </div>
          )}

          {/* Empty Cart View */}
          {cart.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-100 shadow-xs mt-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 text-brand-500 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Your cart is empty</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Looks like you haven't added any dishes yet. Explore our freshly prepared menu!
              </p>
              <button
                type="button"
                onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
                className="mt-5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <>
              {/* Line Items List */}
              <div className="space-y-2.5">
                {cart.map((item) => {
                  const lineTotal = (Number(item.price) || 0) * (item.quantity || 0);

                  return (
                    <div
                      key={item.lineItemId}
                      className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs flex items-center gap-3"
                    >
                      {/* Thumbnail */}
                      <CartItemThumbnail imageUrl={item.imageUrl} name={item.name} />

                      {/* Info & Quantity Controls */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900 text-sm truncate">
                              {item.name}
                            </h3>
                            {item.notes && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 italic">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                            {currency || 'PKR'} {lineTotal.toLocaleString()}
                          </span>
                        </div>

                        {/* Quantity Stepper & Remove */}
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.lineItemId, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                            >
                              <Minus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.lineItemId, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.lineItemId)}
                            aria-label={`Remove ${item.name}`}
                            className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Instructions Input */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs">
                <label
                  htmlFor="kitchen-notes"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Special Instructions
                </label>
                <textarea
                  id="kitchen-notes"
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any dietary preferences or notes for the kitchen? (e.g. less spicy, serve together)"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Table Confirmation Card */}
              <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-3 flex items-center gap-2.5 text-emerald-800 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                <span className="font-medium">
                  Ordering for <strong>{tableLabel}</strong> (Dine-in)
                </span>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Bill Breakdown & Place Order CTA */}
      {cart.length > 0 && (
        <footer className="p-4 bg-white border-t border-slate-100 sticky bottom-0 z-30 shadow-lg">
          {/* Totals Breakdown */}
          <div className="space-y-1.5 mb-3.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal ({cartTotals?.totalCount || 0} items)</span>
              <span>
                {currency || 'PKR'} {(cartTotals?.subtotal || 0).toLocaleString()}
              </span>
            </div>

            {cartTotals?.tax > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span>
                  {currency || 'PKR'} {cartTotals.tax.toLocaleString()}
                </span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
              <span>Grand Total</span>
              <span className="text-brand-600">
                {currency || 'PKR'} {(cartTotals?.grandTotal || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Place Order Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending to Kitchen...</span>
              </>
            ) : (
              <span>
                Place Order · {currency || 'PKR'} {(cartTotals?.grandTotal || 0).toLocaleString()}
              </span>
            )}
          </button>
        </footer>
      )}
    </div>
  );
};
