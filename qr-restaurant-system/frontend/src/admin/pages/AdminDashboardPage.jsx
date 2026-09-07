import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Flame, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Receipt,
  RefreshCw,
  Bell,
  Inbox,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { restaurantApi } from '../../api/restaurantApi';
import { ORDER_STATUS_CONFIG } from '../../shared/constants/orderStatus';

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    todayOrdersCount: 0,
    todayRevenue: 0,
    inKitchenCount: 0,
    totalTablesCount: 0,
    occupiedTablesCount: 0,
    avgPrepSpeedMinutes: null,
    recentOrders: [],
    popularDishes: [],
  });

  const restaurantName = user?.restaurantName || user?.restaurant?.name || 'DineFlow Kitchen';
  const currency = user?.restaurant?.settings?.currency || 'PKR';

  const fetchSummary = () => {
    setLoading(true);
    restaurantApi
      .getDashboardSummary()
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          setDashboardData({
            todayOrdersCount: data.todayOrdersCount || 0,
            todayRevenue: data.todayRevenue || 0,
            inKitchenCount: data.inKitchenCount || 0,
            totalTablesCount: data.totalTablesCount || 0,
            occupiedTablesCount: data.occupiedTablesCount || 0,
            avgPrepSpeedMinutes: data.avgPrepSpeedMinutes ?? null,
            recentOrders: data.recentOrders || [],
            popularDishes: data.popularDishes || [],
          });
        }
      })
      .catch((err) => {
        console.error('[AdminDashboard] Failed to fetch live summary:', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Map real backend recent orders to table format
  const displayOrders = (dashboardData.recentOrders || []).map((o) => {
    const tableNum = o.tableId?.tableNumber || o.tableNumber || 'N/A';
    const itemsSummary = (o.items || [])
      .map((i) => `${i.quantity}× ${i.nameSnapshot || i.name || 'Dish'}`)
      .join(', ');

    const orderTime = o.createdAt
      ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Just now';

    return {
      id: (o._id || '').slice(-6).toUpperCase(),
      rawId: o._id,
      tableNumber: tableNum,
      itemsSummary: itemsSummary || 'Standard Order',
      amount: o.totalAmount || 0,
      status: o.status || 'Placed',
      time: orderTime,
    };
  });

  // Filter orders by active tab
  const filteredOrders = displayOrders.filter((order) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'In Kitchen') return ['Placed', 'Received', 'Preparing'].includes(order.status);
    if (activeFilter === 'Ready') return order.status === 'Ready';
    if (activeFilter === 'Completed') return order.status === 'Served';
    return true;
  });

  const occupancyPercentage = dashboardData.totalTablesCount > 0
    ? Math.round((dashboardData.occupiedTablesCount / dashboardData.totalTablesCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Command Center Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">
            <span>Service Orchestrator</span>
            <span>·</span>
            <span>Live Restaurant Operations</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif font-black text-slate-900 tracking-tight">
            {restaurantName} Command Center
          </h1>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-600 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Service Dashboard</span>
          </div>

          <button
            type="button"
            onClick={fetchSummary}
            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 shadow-2xs transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 5 Real KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Today's Orders */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Today's Orders</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-black text-slate-900 block leading-none">
              {dashboardData.todayOrdersCount}
            </span>
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mt-2">
              <span>Orders placed today</span>
            </span>
          </div>
        </div>

        {/* Card 2: Floor Capacity */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Floor Capacity</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">
                {dashboardData.occupiedTablesCount}
              </span>
              <span className="text-sm font-bold text-stone-400">
                / {dashboardData.totalTablesCount}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-stone-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                className="bg-brand-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: In Kitchen */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>In Kitchen</span>
            <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Flame size={14} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">
                {dashboardData.inKitchenCount}
              </span>
              {dashboardData.inKitchenCount > 0 && (
                <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md">
                  Active
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-stone-400 block mt-2">
              {dashboardData.inKitchenCount === 0 ? 'Kitchen queue clear' : 'Awaiting fulfillment'}
            </span>
          </div>
        </div>

        {/* Card 4: Avg Prep Speed */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Avg Prep Speed</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-3">
            {dashboardData.avgPrepSpeedMinutes !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">
                  {dashboardData.avgPrepSpeedMinutes}
                </span>
                <span className="text-xs font-bold text-stone-400">min</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-slate-500 block leading-tight">
                No data yet
              </span>
            )}
            <span className="text-[11px] font-medium text-stone-400 block mt-2">
              {dashboardData.avgPrepSpeedMinutes !== null ? 'Order to table time' : 'Awaiting served orders'}
            </span>
          </div>
        </div>

        {/* Card 5: Gross Sales */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Gross Sales</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-black text-slate-900 block leading-none truncate">
              {currency} {Number(dashboardData.todayRevenue || 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mt-2">
              <span>Today's paid & active total</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual Column Layout: Live & Recent Orders (Left) vs Popular & Alerts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live & Recent Orders Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 lg:p-6 border border-stone-200/80 shadow-xs">
          {/* Table Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>Live & Recent Orders</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Real-time dine-in service feed</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl text-xs font-semibold text-stone-600">
              {['All', 'In Kitchen', 'Ready', 'Completed'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    activeFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table or Clean Production Empty State */}
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    <th className="py-3 px-2">Ticket</th>
                    <th className="py-3 px-2">Table</th>
                    <th className="py-3 px-2">Course & Items</th>
                    <th className="py-3 px-2">Amount</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredOrders.map((order) => (
                    <tr key={order.rawId || order.id} className="hover:bg-stone-50/80 transition-colors group">
                      <td className="py-3.5 px-2 font-bold text-brand-600 whitespace-nowrap">
                        #{order.id}
                      </td>
                      <td className="py-3.5 px-2 font-bold text-slate-900 whitespace-nowrap">
                        Table {order.tableNumber}
                      </td>
                      <td className="py-3.5 px-2 text-slate-600 max-w-xs truncate font-medium">
                        {order.itemsSummary}
                      </td>
                      <td className="py-3.5 px-2 font-bold text-slate-900 whitespace-nowrap">
                        {currency} {Number(order.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          ORDER_STATUS_CONFIG[order.status]?.color || 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right text-stone-400 whitespace-nowrap font-medium">
                        {order.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                <Inbox size={22} strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">No orders yet</h4>
              <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                Customer QR orders will appear here in real time as guests place them.
              </p>
            </div>
          )}

          {/* Table Footer */}
          {filteredOrders.length > 0 && (
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-stone-100 text-xs text-stone-400">
              <span>Showing {filteredOrders.length} active orders</span>
            </div>
          )}
        </div>

        {/* Right Column: Real Popular Dishes & Service Alerts (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Popular Dishes Tonight */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flame size={15} className="text-brand-500" />
                <span>Popular Dishes</span>
              </h3>
              <span className="text-[10px] font-semibold text-stone-400 uppercase">Top Sellers</span>
            </div>

            {dashboardData.popularDishes && dashboardData.popularDishes.length > 0 ? (
              <div className="space-y-3.5 mt-4">
                {dashboardData.popularDishes.map((dish, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-semibold text-slate-800 truncate">{dish.name}</h4>
                      <span className="text-[10px] text-stone-400">
                        {currency} {Number(dish.revenue || 0).toLocaleString()} revenue
                      </span>
                    </div>
                    <span className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                      {dish.soldCount} sold
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs font-semibold text-slate-600">No analytics available yet</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Top-selling dishes will display as orders are placed.
                </p>
              </div>
            )}
          </div>

          {/* Service & Operational Alerts */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell size={15} className="text-amber-500" />
                <span>Operational Alerts</span>
              </h3>
              <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                {dashboardData.inKitchenCount > 5 ? '1 High Load' : 'Status Normal'}
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {dashboardData.inKitchenCount > 5 ? (
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Kitchen Rush Alert</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    More than 5 orders are currently in preparation. Expediter attention recommended.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <h5 className="text-xs font-bold text-slate-800">No active service alerts</h5>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Kitchen workflow is operating under normal thresholds.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
