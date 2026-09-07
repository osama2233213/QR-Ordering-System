import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Store,
  RefreshCw,
  Award,
  ArrowUpRight,
  PieChart
} from 'lucide-react';
import { devgateApi } from '../../api/devgateApi';

export const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await devgateApi.getAnalytics();
      if (res.data?.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch platform analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400 font-medium">Aggregating cross-platform analytics...</p>
      </div>
    );
  }

  const { tenants = {}, orders = {}, topByRevenue = [], topByOrders = [], monthlyGrowth = [] } = analytics || {};

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Platform Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cross-tenant gross merchandise volume, throughput, and platform scaling metrics.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* 4 Primary Platform KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Platform GMV</span>
            <DollarSign size={20} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            PKR {(orders.gmv || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> Total transacted platform volume
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Platform Orders</span>
            <ShoppingBag size={20} className="text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {(orders.total || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Completed & active table orders
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Order Value</span>
            <TrendingUp size={20} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            PKR {(orders.aov || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Per-ticket average across all venues
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Partner Venues</span>
            <Store size={20} className="text-purple-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {tenants.active || 0} / {tenants.total || 0}
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            {tenants.total > 0 ? Math.round(((tenants.active || 0) / tenants.total) * 100) : 0}% activation rate
          </p>
        </div>
      </div>

      {/* Breakdown Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Top 5 by GMV */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900">Top Tenants by Gross Revenue</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Platform GMV</span>
          </div>

          {topByRevenue.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No revenue records logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topByRevenue.map((item, index) => (
                <div
                  key={item.restaurantId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.orderCount} orders placed</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-slate-900">
                      PKR {item.revenue.toLocaleString()}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Top 5 by Order Volume */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" />
              <h3 className="font-extrabold text-sm text-slate-900">Top Tenants by Order Volume</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Order Throughput</span>
          </div>

          {topByOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No orders recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topByOrders.map((item, index) => (
                <div
                  key={item.restaurantId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.ownerName}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-slate-900">
                      {item.orderCount} orders
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      PKR {item.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <h3 className="font-extrabold text-sm text-slate-900 mb-4">Platform Ticket Status Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {['Placed', 'Received', 'Preparing', 'Ready', 'Served', 'Cancelled'].map((status) => {
            const count = orders.breakdown?.[status] || 0;
            return (
              <div key={status} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {status}
                </span>
                <span className="text-xl font-black text-slate-900">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
