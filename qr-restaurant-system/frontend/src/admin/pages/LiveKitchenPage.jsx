import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flame, 
  Clock, 
  CheckCircle2, 
  Bell, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  MessageSquare, 
  Sparkles, 
  Utensils, 
  Search, 
  CheckSquare, 
  Square
} from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import socketClient from '../../sockets/socketClient';

/**
 * Web Audio API synthesizer for crisp, cross-browser kitchen bell chimes
 * Zero external MP3 dependencies.
 */
const playKitchenChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.45);

    // Tone 2: A5 (880.00 Hz) chime accent
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (err) {
    console.warn('[KDS Audio] Chime error:', err);
  }
};

/**
 * Helper to compute elapsed minutes & urgency
 */
const getElapsedInfo = (dateString) => {
  if (!dateString) return { text: '0m', minutes: 0, urgency: 'normal' };
  const diffMs = Math.max(0, Date.now() - new Date(dateString).getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);

  let urgency = 'normal'; // < 10m
  if (diffMins >= 20) {
    urgency = 'critical'; // > 20m
  } else if (diffMins >= 10) {
    urgency = 'warning'; // 10 - 20m
  }

  const text = diffMins === 0 ? `${diffSecs}s` : `${diffMins}m ${diffSecs}s`;
  return { text, minutes: diffMins, urgency };
};

export const LiveKitchenPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [chimesEnabled, setChimesEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [checkedItems, setCheckedItems] = useState({});

  const restaurantId = user?.restaurantId || user?.restaurant?._id;

  // Real-time ticking timer for elapsed duration accuracy
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active kitchen orders
  const fetchKitchenOrders = () => {
    setLoading(true);
    orderApi
      .getRestaurantOrders()
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data)) {
          // Keep active kitchen tickets (Placed, Received, Preparing, Ready)
          // Exclude Served and Cancelled from active board
          const active = data.filter((o) => 
            ['Placed', 'Received', 'Preparing', 'Ready'].includes(o.status)
          );
          setOrders(active);
        }
      })
      .catch((err) => {
        console.error('[LiveKitchenPage] Failed to fetch orders:', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchKitchenOrders();
  }, []);

  // Socket.IO real-time event integration
  useEffect(() => {
    if (!restaurantId) return;

    const socket = socketClient.connect();
    socketClient.joinRestaurantRoom(restaurantId);

    const handleConnect = () => {
      setSocketConnected(true);
      socketClient.joinRestaurantRoom(restaurantId);
      fetchKitchenOrders();
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    if (socket.connected) {
      setSocketConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Listener 1: New order placed by customer QR
    const handleOrderCreated = (newOrder) => {
      setOrders((prev) => {
        // Prevent duplicates
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });

      if (chimesEnabled) {
        playKitchenChime();
      }

      // Flash banner alert
      const tableNum = newOrder.tableId?.tableNumber || newOrder.tableNumber || 'Table';
      setNewOrderAlert(`New Ticket #${(newOrder._id || '').slice(-4).toUpperCase()} from Table ${tableNum}!`);
      setTimeout(() => setNewOrderAlert(null), 5000);
    };

    // Listener 2: Order status updated (from another terminal or waiter)
    const handleStatusUpdated = ({ orderId, status }) => {
      setOrders((prev) => {
        if (['Served', 'Cancelled'].includes(status)) {
          // Remove from active kitchen board
          return prev.filter((o) => o._id !== orderId);
        }
        return prev.map((o) => (o._id === orderId ? { ...o, status } : o));
      });
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:status_updated', handleStatusUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('order:created', handleOrderCreated);
      socket.off('order:status_updated', handleStatusUpdated);
    };
  }, [restaurantId, chimesEnabled]);

  // Handle item prep checklist toggle
  const toggleItemCheck = (orderId, itemIdx) => {
    const key = `${orderId}_${itemIdx}`;
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Status transition handler
  const advanceOrderStatus = async (orderId, targetStatus) => {
    setUpdatingId(orderId);
    // Optimistic UI update
    setOrders((prev) => {
      if (['Served', 'Cancelled'].includes(targetStatus)) {
        return prev.filter((o) => o._id !== orderId);
      }
      return prev.map((o) => (o._id === orderId ? { ...o, status: targetStatus } : o));
    });

    try {
      await orderApi.updateOrderStatus(orderId, targetStatus);
    } catch (err) {
      console.error(`[LiveKitchen] Failed to advance status to ${targetStatus}:`, err.message);
      // Rollback by refetching orders
      fetchKitchenOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter orders by search term (ticket ID or table number)
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter((o) => {
      const ticketId = (o._id || '').slice(-4).toLowerCase();
      const tableNum = String(o.tableId?.tableNumber || o.tableNumber || '').toLowerCase();
      return ticketId.includes(term) || tableNum.includes(term);
    });
  }, [orders, searchTerm]);

  // Group into 3 Kanban columns
  const newOrders = useMemo(
    () => filteredOrders.filter((o) => ['Placed', 'Received'].includes(o.status)),
    [filteredOrders]
  );
  const preparingOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'Preparing'),
    [filteredOrders]
  );
  const readyOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'Ready'),
    [filteredOrders]
  );

  return (
    <div className="space-y-5">
      {/* Top Header & KDS Operations Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            <span>Kitchen Display System</span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
              <span>{socketConnected ? 'Socket Live' : 'Connecting Stream'}</span>
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Live Kitchen Board</span>
            <span className="text-xs font-sans font-bold px-2.5 py-1 rounded-full bg-stone-900 text-white shadow-2xs">
              {orders.length} Active {orders.length === 1 ? 'Ticket' : 'Tickets'}
            </span>
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search table or ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white rounded-xl border border-stone-200 text-xs font-medium placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-44 sm:w-52 shadow-2xs"
            />
          </div>

          {/* Sound Notification Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !chimesEnabled;
              setChimesEnabled(next);
              if (next) playKitchenChime();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
              chimesEnabled
                ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
            }`}
            title={chimesEnabled ? 'Chime sound is active on new orders' : 'Chimes muted'}
          >
            {chimesEnabled ? <Volume2 size={15} className="text-brand-600" /> : <VolumeX size={15} />}
            <span className="hidden sm:inline">{chimesEnabled ? 'Chimes Active' : 'Muted'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={fetchKitchenOrders}
            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-slate-900 hover:bg-stone-50 shadow-2xs transition-colors"
            title="Refresh kitchen orders"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Real-time Order Alert Toast */}
      {newOrderAlert && (
        <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <Bell size={15} className="animate-bounce" />
            <span>{newOrderAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setNewOrderAlert(null)}
            className="text-white/80 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ========================================================= */}
        {/* COLUMN 1: NEW ORDERS (Placed / Received) */}
        {/* ========================================================= */}
        <div className="bg-stone-100/70 p-3.5 rounded-3xl border border-stone-200 flex flex-col min-h-[600px]">
          {/* Column Header */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
              <h2 className="font-serif font-black text-slate-900 text-base">New Orders</h2>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white text-amber-800 border border-amber-200 shadow-2xs">
              {newOrders.length}
            </span>
          </div>

          {/* Ticket Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-0.5">
            {newOrders.length > 0 ? (
              newOrders.map((order) => {
                const tableNum = order.tableId?.tableNumber || order.tableNumber || 'N/A';
                const ticketId = (order._id || '').slice(-4).toUpperCase();
                const elapsed = getElapsedInfo(order.createdAt);
                const isBusy = updatingId === order._id;

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Ticket Top Meta */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                            #DF-{ticketId}
                          </span>
                          <span className="text-xs font-black text-slate-900 bg-stone-100 px-2 py-0.5 rounded-md">
                            Table {tableNum}
                          </span>
                        </div>

                        {/* Urgency elapsed badge */}
                        <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          elapsed.urgency === 'critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                            : elapsed.urgency === 'warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-50 text-stone-500'
                        }`}>
                          <Clock size={12} />
                          <span>{elapsed.text}</span>
                        </div>
                      </div>

                      {/* General Order Notes Alert */}
                      {order.notes && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-50/90 border border-amber-200/70 text-[11px] text-amber-900 font-medium flex items-start gap-1.5">
                          <MessageSquare size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>{order.notes}</span>
                        </div>
                      )}

                      {/* Item Details */}
                      <div className="divide-y divide-stone-50 my-3">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="py-2 flex items-start justify-between text-xs">
                            <div className="flex items-start gap-2 min-w-0 pr-2">
                              <span className="font-black text-brand-600 bg-stone-100 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                                {item.quantity}×
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">
                                  {item.nameSnapshot || item.name || 'Dish'}
                                </span>
                                {item.notes && (
                                  <span className="text-[10px] font-medium text-amber-700 block italic mt-0.5">
                                    "{item.notes}"
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action: Advance to Preparing */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => advanceOrderStatus(order._id, 'Preparing')}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    >
                      {isBusy ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Flame size={14} />
                          <span>Accept & Fire Ticket</span>
                          <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 size={24} className="text-stone-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Queue Clear</p>
                <p className="text-[11px] text-stone-400 mt-0.5">No new orders waiting to fire</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: PREPARING (Active Cooking) */}
        {/* ========================================================= */}
        <div className="bg-stone-100/70 p-3.5 rounded-3xl border border-stone-200 flex flex-col min-h-[600px]">
          {/* Column Header */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
              <h2 className="font-serif font-black text-slate-900 text-base">Preparing</h2>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white text-indigo-800 border border-indigo-200 shadow-2xs">
              {preparingOrders.length}
            </span>
          </div>

          {/* Ticket Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-0.5">
            {preparingOrders.length > 0 ? (
              preparingOrders.map((order) => {
                const tableNum = order.tableId?.tableNumber || order.tableNumber || 'N/A';
                const ticketId = (order._id || '').slice(-4).toUpperCase();
                const elapsed = getElapsedInfo(order.updatedAt || order.createdAt);
                const isBusy = updatingId === order._id;

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Ticket Top Meta */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            #DF-{ticketId}
                          </span>
                          <span className="text-xs font-black text-slate-900 bg-stone-100 px-2 py-0.5 rounded-md">
                            Table {tableNum}
                          </span>
                        </div>

                        {/* Cooking timer badge */}
                        <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          elapsed.urgency === 'critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                            : elapsed.urgency === 'warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          <Clock size={12} />
                          <span>Cooking {elapsed.text}</span>
                        </div>
                      </div>

                      {/* General Order Notes Alert */}
                      {order.notes && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-50/90 border border-amber-200/70 text-[11px] text-amber-900 font-medium flex items-start gap-1.5">
                          <MessageSquare size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>{order.notes}</span>
                        </div>
                      )}

                      {/* Item Prep Checklist (interactive line items) */}
                      <div className="divide-y divide-stone-50 my-3">
                        {(order.items || []).map((item, idx) => {
                          const isDone = checkedItems[`${order._id}_${idx}`];
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleItemCheck(order._id, idx)}
                              className="py-2 flex items-start justify-between text-xs cursor-pointer select-none hover:bg-stone-50/80 px-1 rounded-lg transition-colors"
                            >
                              <div className="flex items-start gap-2 min-w-0 pr-2">
                                <span className={`font-black px-1.5 py-0.5 rounded text-[11px] flex-shrink-0 ${
                                  isDone ? 'bg-stone-100 text-stone-400 line-through' : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {item.quantity}×
                                </span>
                                <div className="min-w-0">
                                  <span className={`font-bold block truncate ${
                                    isDone ? 'text-stone-400 line-through' : 'text-slate-900'
                                  }`}>
                                    {item.nameSnapshot || item.name || 'Dish'}
                                  </span>
                                  {item.notes && (
                                    <span className="text-[10px] font-medium text-amber-700 block italic mt-0.5">
                                      "{item.notes}"
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button type="button" className="text-stone-400 hover:text-indigo-600 ml-2 mt-0.5">
                                {isDone ? (
                                  <CheckSquare size={14} className="text-emerald-600" />
                                ) : (
                                  <Square size={14} />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action: Advance to Ready */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => advanceOrderStatus(order._id, 'Ready')}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    >
                      {isBusy ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Mark Ready to Plate</span>
                          <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <Utensils size={24} className="text-stone-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Pans & Hearth Clear</p>
                <p className="text-[11px] text-stone-400 mt-0.5">No orders currently on cook line</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: READY TO SERVE (At Hot Pass) */}
        {/* ========================================================= */}
        <div className="bg-stone-100/70 p-3.5 rounded-3xl border border-stone-200 flex flex-col min-h-[600px]">
          {/* Column Header */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <h2 className="font-serif font-black text-slate-900 text-base">Ready To Serve</h2>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
              {readyOrders.length}
            </span>
          </div>

          {/* Ticket Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-0.5">
            {readyOrders.length > 0 ? (
              readyOrders.map((order) => {
                const tableNum = order.tableId?.tableNumber || order.tableNumber || 'N/A';
                const ticketId = (order._id || '').slice(-4).toUpperCase();
                const elapsed = getElapsedInfo(order.updatedAt || order.createdAt);
                const isBusy = updatingId === order._id;

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Ticket Top Meta */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            #DF-{ticketId}
                          </span>
                          <span className="text-xs font-black text-slate-900 bg-stone-100 px-2 py-0.5 rounded-md">
                            Table {tableNum}
                          </span>
                        </div>

                        {/* Pass waiting timer */}
                        <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          elapsed.minutes >= 5
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <Clock size={12} />
                          <span>At Pass {elapsed.text}</span>
                        </div>
                      </div>

                      {/* Hot Pass Lamp Alert */}
                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 font-bold flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-emerald-600" />
                          <span>Hot Pass Lamp Ready</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-normal">Runner Alerted</span>
                      </div>

                      {/* Item Details */}
                      <div className="divide-y divide-stone-50 my-3">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity}×
                              </span>
                              <span className="font-bold text-slate-800 truncate">
                                {item.nameSnapshot || item.name || 'Dish'}
                              </span>
                            </div>
                            <Check size={14} className="text-emerald-600" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action: Mark Served to Table */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => advanceOrderStatus(order._id, 'Served')}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    >
                      {isBusy ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Mark Served to Table</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 size={24} className="text-stone-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Hot Pass Clear</p>
                <p className="text-[11px] text-stone-400 mt-0.5">All prepared tickets have been served</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
