import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Receipt, ArrowRight, Utensils } from 'lucide-react';
import { useGuestSession } from '../../context/GuestSessionContext';
import { orderApi } from '../../api/orderApi';

export const OrderConfirmationPage = () => {
  const { restaurantId, tableId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { restaurantInfo, tableInfo, currency, activeOrderId } = useGuestSession();

  // Retrieve passed order from navigation state, or fall back to activeOrderId
  const initialOrder = location.state?.order || null;
  const targetOrderId = location.state?.orderId || initialOrder?._id || activeOrderId;

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder && Boolean(targetOrderId));

  // If order was not in navigation state (e.g. page refresh), fetch via trackOrder
  useEffect(() => {
    if (!order && targetOrderId) {
      let isMounted = true;
      setLoading(true);

      orderApi
        .trackOrder(targetOrderId)
        .then((res) => {
          if (!isMounted) return;
          setOrder(res.data?.data || null);
        })
        .catch((err) => {
          console.error('[OrderConfirmation] Failed to load order details:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [order, targetOrderId]);

  const restaurantName = restaurantInfo?.name || 'DineFlow Kitchen';
  const tableNumber = tableInfo?.tableNumber || tableId || '12';
  const displayOrderId = targetOrderId ? targetOrderId.slice(-6).toUpperCase() : 'NEW';

  // Estimated preparation time
  const estimatedTime = '20–25 mins';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-base font-bold text-slate-800">DineFlow</h2>
        <p className="text-xs text-slate-500 mt-1">Fetching your order confirmation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between w-full">
      <div className="max-w-xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-8 flex flex-col justify-between flex-1 relative">
        {/* Top Section: Celebration & Success Message */}
      <div className="pt-8">
        <div className="text-center">
          {/* Animated Success Checkmark */}
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
            <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Placed!</h1>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            The kitchen has received your order and started preparation.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs mt-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Order Number</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md tracking-wider">
              #{displayOrderId}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-slate-400" />
              Restaurant
            </span>
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
              {restaurantName}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Serving At
            </span>
            <span className="font-semibold text-slate-800">
              Table {tableNumber} (Dine-in)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              Estimated Time
            </span>
            <span className="font-bold text-brand-600">
              {estimatedTime}
            </span>
          </div>
        </div>

        {/* Order Summary Snapshot (if available) */}
        {order?.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs mt-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-semibold text-slate-800 mb-2.5">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                Ordered Items
              </span>
              <span>{order.items.length} dishes</span>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs py-1">
                  <div className="flex-1 pr-2">
                    <span className="font-medium text-slate-800">
                      {item.quantity}× {item.nameSnapshot || item.name || 'Dish'}
                    </span>
                    {item.notes && (
                      <p className="text-[10px] text-slate-400 italic">Note: {item.notes}</p>
                    )}
                  </div>
                  <span className="font-semibold text-slate-700 whitespace-nowrap">
                    {currency || 'PKR'} {((item.priceSnapshot || item.price || 0) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between items-center text-xs font-bold text-slate-900">
              <span>Total Amount</span>
              <span className="text-brand-600 text-sm">
                {currency || 'PKR'} {(order.totalAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Dual Action Buttons */}
      <div className="pt-6 space-y-2.5">
        {/* Primary CTA: Live Tracking */}
        {targetOrderId && (
          <button
            type="button"
            onClick={() => navigate(`/r/${restaurantId}/t/${tableId}/tracking/${targetOrderId}`)}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 group"
          >
            <span>Track Order Live</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Secondary CTA: Back to Menu */}
        <button
          type="button"
          onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
          className="w-full py-3 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-700 font-semibold text-xs rounded-2xl border border-slate-200 transition-all text-center"
        >
          Back to Menu
        </button>
      </div>
    </div>
  </div>
);
};
