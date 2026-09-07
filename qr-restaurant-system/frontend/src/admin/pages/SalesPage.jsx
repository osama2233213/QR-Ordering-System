import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Flame, 
  RefreshCw, 
  BarChart3, 
  Sparkles
} from 'lucide-react';
import { restaurantApi } from '../../api/restaurantApi';
import { useAuth } from '../../context/AuthContext';

export const SalesPage = () => {
  const { user } = useAuth();
  const currency = user?.restaurant?.settings?.currency || 'PKR';

  const [period, setPeriod] = useState('7d'); // 'today', '7d', '30d'
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    periodRevenue: 0,
    periodOrderVolume: 0,
    completedOrders: 0,
    averageOrderValue: 0,
    dailyRevenue: 0,
    dailyOrders: 0,
    weeklyRevenue: 0,
    weeklyOrders: 0,
    monthlyRevenue: 0,
    monthlyOrders: 0,
    topDishes: [],
    trend: [],
  });

  const loadAnalytics = (selectedPeriod = period) => {
    setLoading(true);
    restaurantApi
      .getSalesAnalytics({ period: selectedPeriod })
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          setAnalytics(data);
        }
      })
      .catch((err) => {
        console.error('[SalesPage] Failed to fetch sales analytics:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAnalytics(period);
  }, [period]);

  // Max revenue in trend for relative bar heights
  const maxTrendRevenue = Math.max(
    ...analytics.trend.map((t) => t.revenue || 0),
    1
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Period Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            <span>Executive Insights</span>
            <span>·</span>
            <span>Revenue & Orders Intelligence</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Sales & Analytics</span>
          </h1>
        </div>

        {/* Filter Pills & Refresh */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl text-xs font-bold text-stone-600">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  period === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadAnalytics(period)}
            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-slate-900 hover:bg-stone-50 shadow-2xs transition-colors"
            title="Refresh sales figures"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 4 Main Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Period Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Period Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-black text-slate-900 block leading-none truncate">
              {currency} {Number(analytics.periodRevenue || 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mt-2">
              <span>Gross sales in selected filter</span>
            </span>
          </div>
        </div>

        {/* Order Volume */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Order Volume</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-black text-slate-900 block leading-none">
              {analytics.periodOrderVolume}
            </span>
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mt-2">
              <span>{analytics.completedOrders} orders served</span>
            </span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Average Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-black text-slate-900 block leading-none truncate">
              {currency} {Number(analytics.averageOrderValue || 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mt-2">
              <span>Per completed guest ticket</span>
            </span>
          </div>
        </div>

        {/* 30-Day Benchmark */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>30-Day Run Rate</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-black text-slate-900 block leading-none truncate">
              {currency} {Number(analytics.monthlyRevenue || 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mt-2">
              <span>{analytics.monthlyOrders} total monthly orders</span>
            </span>
          </div>
        </div>
      </div>

      {/* Dual Section: Revenue Trend Histogram & Top Dishes Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Revenue Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <BarChart3 size={18} className="text-brand-600" />
                  <span>Revenue & Orders Timeline</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Day-by-day revenue collection and fulfillment volume
                </p>
              </div>
              <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                {analytics.trend.length} Days Recorded
              </span>
            </div>

            {/* Visual Histogram Bars */}
            {analytics.trend.length > 0 ? (
              <div className="mt-8 space-y-4">
                <div className="h-48 flex items-end gap-2 sm:gap-3 pt-6 border-b border-stone-100">
                  {analytics.trend.map((day, idx) => {
                    const heightPercent = Math.max(12, Math.round((day.revenue / maxTrendRevenue) * 100));
                    const dateLabel = day.date ? day.date.slice(5) : `D${idx + 1}`;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap mb-1">
                          {currency} {Number(day.revenue).toLocaleString()} ({day.orders} orders)
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[36px] bg-gradient-to-t from-brand-500 to-amber-500 rounded-t-xl transition-all duration-300 group-hover:brightness-110 shadow-2xs"
                        />

                        {/* Date Label */}
                        <span className="text-[10px] font-bold text-stone-400 group-hover:text-slate-900 transition-colors">
                          {dateLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <BarChart3 size={28} className="text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No trend data available</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Orders placed in this period will populate the chart.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Milestone Footer */}
          <div className="mt-6 pt-4 border-t border-stone-100 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-2xl bg-stone-50">
              <span className="text-[10px] font-bold text-stone-400 uppercase block">Daily (Today)</span>
              <span className="text-sm font-black text-slate-800 block mt-0.5">
                {currency} {Number(analytics.dailyRevenue).toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-2xl bg-stone-50">
              <span className="text-[10px] font-bold text-stone-400 uppercase block">Weekly (7 Days)</span>
              <span className="text-sm font-black text-slate-800 block mt-0.5">
                {currency} {Number(analytics.weeklyRevenue).toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-2xl bg-stone-50">
              <span className="text-[10px] font-bold text-stone-400 uppercase block">Monthly (30 Days)</span>
              <span className="text-sm font-black text-slate-800 block mt-0.5">
                {currency} {Number(analytics.monthlyRevenue).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Top Selling Dishes Leaderboard (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flame size={16} className="text-brand-500" />
                <span>Top Selling Dishes</span>
              </h3>
              <span className="text-[10px] font-bold text-stone-400 uppercase">By Revenue</span>
            </div>

            {analytics.topDishes && analytics.topDishes.length > 0 ? (
              <div className="space-y-4 mt-4">
                {analytics.topDishes.map((dish, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-stone-100 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800 truncate">{dish.name}</h4>
                        <span className="text-[10px] text-stone-400">
                          {dish.quantity} portions served
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                      {currency} {Number(dish.revenue || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-xs font-semibold text-slate-700">No dishes recorded</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Top performing menu items will display as guests order.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <span className="text-[11px] font-semibold text-stone-400">
              Real-time calculations powered by MongoDB Aggregations
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
