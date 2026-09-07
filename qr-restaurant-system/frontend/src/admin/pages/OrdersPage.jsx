import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Eye, 
  RefreshCw, 
  X 
} from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import { ORDER_STATUS_CONFIG } from '../../shared/constants/orderStatus';
import socketClient from '../../sockets/socketClient';

export const OrdersPage = () => {
  const { user } = useAuth();
  const currency = user?.restaurant?.settings?.currency || 'PKR';
  const restaurantId = user?.restaurantId || user?.restaurant?._id;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = (isInitial = false) => {
    if (isInitial) setLoading(true);
    orderApi
      .getRestaurantOrders()
      .then((res) => {
        setOrders(res.data?.data || []);
      })
      .catch((err) => {
        console.error('[OrdersPage] Failed to fetch orders:', err);
      })
      .finally(() => {
        if (isInitial) setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders(true);
  }, []);

  // Real-time Socket.IO orders synchronization
  useEffect(() => {
    if (!restaurantId) return;

    const socket = socketClient.connect();
    socketClient.joinRestaurantRoom(restaurantId);

    const handleOrderCreated = (newOrder) => {
      setOrders((prev) => {
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleStatusUpdated = ({ orderId, status }) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status } : o))
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
      }
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:status_updated', handleStatusUpdated);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:status_updated', handleStatusUpdated);
    };
  }, [restaurantId, selectedOrder]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('[OrdersPage] Status update failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const idMatch = (o._id || '').slice(-6).toLowerCase().includes(query);
        const tableMatch = String(o.tableId?.tableNumber || o.tableNumber || '').toLowerCase().includes(query);
        return idMatch || tableMatch;
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            <span>Orders Management</span>
            <span>·</span>
            <span>Master Service Feed</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Customer Orders</span>
            <span className="text-xs font-sans font-bold px-2.5 py-1 rounded-full bg-stone-900 text-white shadow-2xs">
              {orders.length} Total
            </span>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => loadOrders(false)}
          className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-slate-900 hover:bg-stone-50 shadow-2xs transition-colors self-start sm:self-auto"
          title="Refresh orders list"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search order ID or table number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold text-stone-600 overflow-x-auto">
          {['ALL', 'Placed', 'Preparing', 'Ready', 'Served', 'Cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All Orders' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3 animate-pulse">
            <div className="h-6 bg-stone-100 rounded w-1/4 mx-auto" />
            <div className="h-4 bg-stone-100 rounded w-1/3 mx-auto" />
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Ticket ID</th>
                  <th className="py-3 px-3">Table</th>
                  <th className="py-3 px-3">Items Summary</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Placed At</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredOrders.map((order) => {
                  const tableNum = order.tableId?.tableNumber || order.tableNumber || 'N/A';
                  const ticketId = (order._id || '').slice(-6).toUpperCase();
                  const timeFormatted = order.createdAt
                    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Recent';

                  const itemsCount = (order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
                  const summaryText = (order.items || [])
                    .map((i) => `${i.quantity}× ${i.nameSnapshot || i.name || 'Dish'}`)
                    .join(', ');

                  return (
                    <tr key={order._id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-brand-600 whitespace-nowrap">
                        #DF-{ticketId}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        Table {tableNum}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 max-w-xs truncate font-medium">
                        {summaryText || `${itemsCount} Items`}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {currency} {Number(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          ORDER_STATUS_CONFIG[order.status]?.color || 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-stone-400 whitespace-nowrap font-medium">
                        {timeFormatted}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 text-[11px] font-bold transition-colors"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Receipt size={32} className="text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No orders match filter</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Guest orders will appear here in real time as they are placed.
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h3 className="font-serif font-black text-slate-900 text-lg">
                  Order #DF-{(selectedOrder._id || '').slice(-6).toUpperCase()}
                </h3>
                <span className="text-xs font-bold text-brand-600 block mt-0.5">
                  Table {selectedOrder.tableId?.tableNumber || selectedOrder.tableNumber || 'N/A'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-stone-400 hover:text-slate-800 rounded-lg hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Order Meta */}
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Current Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  ORDER_STATUS_CONFIG[selectedOrder.status]?.color || 'bg-stone-100 text-stone-700'
                }`}>
                  {selectedOrder.status}
                </span>
              </div>

              {selectedOrder.notes && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                  <strong>Notes:</strong> {selectedOrder.notes}
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-stone-100 border-t border-b border-stone-100 my-3 py-1">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">
                        {item.quantity}× {item.nameSnapshot || item.name || 'Dish'}
                      </span>
                      {item.notes && (
                        <p className="text-[10px] italic text-amber-700 mt-0.5">"{item.notes}"</p>
                      )}
                    </div>
                    <span className="font-bold text-slate-800">
                      {currency} {Number((item.priceSnapshot || 0) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between text-sm font-black pt-1">
                <span>Total Amount:</span>
                <span className="text-brand-600">
                  {currency} {Number(selectedOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-stone-400 font-bold text-[10px]">SET:</span>
                {['Preparing', 'Ready', 'Served'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={updatingId === selectedOrder._id || selectedOrder.status === st}
                    onClick={() => handleUpdateStatus(selectedOrder._id, st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      selectedOrder.status === st
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
