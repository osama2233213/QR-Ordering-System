import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell, 
  AlertTriangle, 
  Check, 
  Receipt 
} from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import socketClient from '../../sockets/socketClient';
import { useGuestSession } from '../../context/GuestSessionContext';
import { ORDER_STATUS_CONFIG } from '../../shared/constants/orderStatus';

const TRACKING_STEPS = [
  { 
    status: 'Placed', 
    label: 'Order Placed', 
    desc: 'Sent to the kitchen queue' 
  },
  { 
    status: 'Received', 
    label: 'Received by Kitchen', 
    desc: 'Kitchen staff acknowledged order' 
  },
  { 
    status: 'Preparing', 
    label: 'Preparing Dishes', 
    desc: 'Chef is freshly cooking your meal' 
  },
  { 
    status: 'Ready', 
    label: 'Order Ready', 
    desc: 'Ready for table delivery' 
  },
  { 
    status: 'Served', 
    label: 'Served to Table', 
    desc: 'Enjoy your meal!' 
  },
];

export const OrderTrackingPage = () => {
  const { restaurantId, tableId, orderId } = useParams();
  const navigate = useNavigate();
  const { restaurantInfo, tableInfo, currency } = useGuestSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Initial Order Fetch
  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    orderApi
      .trackOrder(orderId)
      .then((res) => {
        if (!isMounted) return;
        setOrder(res.data?.data || null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[OrderTracking] Failed to fetch order:', err);
        setError(err.response?.data?.message || 'Unable to track this order.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // 2. Real-time Live Status Updates via Socket.IO
  useEffect(() => {
    if (!orderId) return;

    const socket = socketClient.connect();

    // Join the specific order room
    socketClient.joinOrderRoom(orderId);

    // Re-join on reconnection
    const handleConnect = () => {
      socketClient.joinOrderRoom(orderId);
    };

    const handleStatusUpdated = (data) => {
      if (data?.orderId === orderId && data?.status) {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
    };

    socket.on('connect', handleConnect);
    socket.on('order:status_updated', handleStatusUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('order:status_updated', handleStatusUpdated);
    };
  }, [orderId]);

  const currentStatus = order?.status || 'Placed';
  const isCancelled = currentStatus === 'Cancelled';
  const isReady = currentStatus === 'Ready';
  const isServed = currentStatus === 'Served';

  const currentStepIndex = TRACKING_STEPS.findIndex((s) => s.status === currentStatus);
  const displayOrderId = orderId ? orderId.slice(-6).toUpperCase() : '---';
  const restaurantName = order?.restaurantId?.name || restaurantInfo?.name || 'DineFlow Kitchen';
  const tableNumber = order?.tableId?.tableNumber || tableInfo?.tableNumber || tableId || '12';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Connecting to Kitchen...</h2>
        <p className="text-xs text-slate-500 mt-1">Retrieving live tracking updates</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mb-3 text-xl font-bold shadow-sm">
          !
        </div>
        <h3 className="font-bold text-slate-800 text-base">Tracking Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-xs">{error}</p>
        <button
          type="button"
          onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
          className="mt-5 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition-colors shadow-xs"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto p-4 pb-8 relative">
      <div>
        {/* Header Bar */}
        <header className="flex items-center justify-between pb-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-slate-800">Live Order Tracking</h1>
            <p className="text-[11px] text-slate-400">Order #{displayOrderId}</p>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Live Order Status Badge Banner */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs mt-3 text-center relative overflow-hidden">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-2 shadow-xs ${
              isCancelled
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : isReady
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-brand-200 bg-brand-50 text-brand-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isCancelled ? 'bg-rose-500' : isReady ? 'bg-emerald-500 animate-ping' : 'bg-brand-500 animate-pulse'}`} />
            {ORDER_STATUS_CONFIG[currentStatus]?.label || currentStatus}
          </div>

          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {isCancelled
              ? 'Order Cancelled'
              : isServed
              ? 'Order Served'
              : isReady
              ? 'Your Food Is Ready!'
              : currentStatus === 'Preparing'
              ? 'Cooking in Kitchen'
              : 'Order Received'}
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            {restaurantName} · Table {tableNumber}
          </p>
        </div>

        {/* Special Notification Alert: Order Ready */}
        {isReady && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs animate-bounce">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">Ready for Your Table!</h4>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                Your dishes are plated and being brought to Table {tableNumber}.
              </p>
            </div>
          </div>
        )}

        {/* Cancelled Alert */}
        {isCancelled && (
          <div className="mt-3 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-900">Order Was Cancelled</h4>
              <p className="text-[11px] text-rose-700 mt-0.5 leading-snug">
                Please contact our staff or place a new order from the menu.
              </p>
            </div>
          </div>
        )}

        {/* Vertical Step Timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs mt-3.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Preparation Progress
            </h3>

            <div className="relative pl-1">
              {TRACKING_STEPS.map((step, idx) => {
                const isCompleted = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;
                const isLast = idx === TRACKING_STEPS.length - 1;

                return (
                  <div key={step.status} className="flex items-start gap-3.5 relative pb-6 last:pb-0">
                    {/* Vertical Connector Line */}
                    {!isLast && (
                      <div
                        className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    {/* Step Icon Indicator */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all flex-shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-brand-500 text-white ring-4 ring-brand-100 animate-pulse'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Step Text Details */}
                    <div className="flex-1 -mt-0.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isCurrent
                              ? 'text-brand-600'
                              : isCompleted
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Items Snapshot (Collapsible Summary) */}
        {order?.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs mt-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                Items in this order
              </span>
              <span>{order.items.length} items</span>
            </div>

            <div className="space-y-2 mt-2 max-h-36 overflow-y-auto pr-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                  <span className="text-slate-700">
                    <span className="font-semibold text-slate-900">{item.quantity}×</span>{' '}
                    {item.nameSnapshot || item.name || 'Dish'}
                  </span>
                  <span className="font-semibold text-slate-600">
                    {currency || 'PKR'} {((item.priceSnapshot || item.price || 0) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between items-center text-xs font-bold text-slate-900">
              <span>Total</span>
              <span className="text-brand-600">
                {currency || 'PKR'} {(order.totalAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Button: Back to Menu */}
      <div className="pt-6">
        <button
          type="button"
          onClick={() => navigate(`/r/${restaurantId}/t/${tableId}`)}
          className="w-full py-3.5 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-all text-center shadow-xs"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
};
