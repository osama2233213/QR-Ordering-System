import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Store,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  MoreVertical,
  X,
  AlertCircle,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { devgateApi } from '../../api/devgateApi';

export const RestaurantListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [restaurants, setRestaurants] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [metrics, setMetrics] = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState(searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [actionMenuId, setActionMenuId] = useState(null);

  // New restaurant form state
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    currency: 'PKR',
    taxRate: 0,
    openingHours: '11:00 AM - 11:00 PM',
  });

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    try {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const status = activeStatusFilter;
      const search = searchQuery;

      const res = await devgateApi.getRestaurants({ page, limit: 10, status, search });
      if (res.data?.success) {
        setRestaurants(res.data.data.restaurants || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 });
        setMetrics(res.data.data.metrics || { total: 0, active: 0, pending: 0, suspended: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch restaurants', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, activeStatusFilter, searchQuery]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleFilterChange = (status) => {
    setActiveStatusFilter(status);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (status === 'all') next.delete('status');
      else next.set('status', status);
      next.set('page', '1');
      return next;
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!searchQuery.trim()) next.delete('search');
      else next.set('search', searchQuery.trim());
      next.set('page', '1');
      return next;
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', newPage.toString());
        return next;
      });
    }
  };

  const handleQuickApprove = async (id) => {
    try {
      await devgateApi.approveRestaurant(id);
      fetchRestaurants();
      setActionMenuId(null);
    } catch (err) {
      alert('Failed to approve restaurant: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleQuickSuspend = async (id) => {
    if (!window.confirm('Are you sure you want to suspend this restaurant? Their staff and customers will be blocked.')) return;
    try {
      await devgateApi.suspendRestaurant(id, 'Admin manually suspended from directory');
      fetchRestaurants();
      setActionMenuId(null);
    } catch (err) {
      alert('Failed to suspend restaurant: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleQuickReactivate = async (id) => {
    try {
      await devgateApi.reactivateRestaurant(id);
      fetchRestaurants();
      setActionMenuId(null);
    } catch (err) {
      alert('Failed to reactivate restaurant: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await devgateApi.createRestaurant(formData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        ownerName: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        currency: 'PKR',
        taxRate: 0,
        openingHours: '11:00 AM - 11:00 PM',
      });
      fetchRestaurants();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create restaurant');
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Restaurants</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage all partner restaurants on the platform.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRestaurants}
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Restaurant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => handleFilterChange('all')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-slate-300 ${
            activeStatusFilter === 'all' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tenants</span>
            <Store size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.total}</div>
        </div>

        <div
          onClick={() => handleFilterChange('active')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-emerald-300 ${
            activeStatusFilter === 'active' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.active}</div>
        </div>

        <div
          onClick={() => handleFilterChange('pending')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-amber-300 ${
            activeStatusFilter === 'pending' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
            <Clock size={18} />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.pending}</div>
        </div>

        <div
          onClick={() => handleFilterChange('suspended')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-rose-300 ${
            activeStatusFilter === 'suspended' ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Suspended</span>
            <Ban size={18} />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.suspended}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, owner, email, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </form>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            {['all', 'active', 'pending', 'suspended'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleFilterChange(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  activeStatusFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4">Total GMV</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading tenants...
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Store size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No restaurants found</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your search query or status filter.</p>
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => {
                  const initial = r.name ? r.name.charAt(0).toUpperCase() : 'R';
                  const formattedDate = new Date(r.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/devgate/restaurants/${r.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors block">
                              {r.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                              {r.address || 'Standard Branch'}
                            </span>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {r.ownerName}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {r.email}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formattedDate}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {r.ordersCount || 0}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {r.settings?.currency || 'PKR'} {(r.totalRevenue || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(r.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right relative">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/devgate/restaurants/${r.id}`}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            Details
                          </Link>

                          <div className="relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === r.id ? null : r.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {actionMenuId === r.id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 text-left">
                                {r.status === 'pending' && (
                                  <button
                                    onClick={() => handleQuickApprove(r.id)}
                                    className="w-full px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CheckCircle2 size={14} /> Approve Tenant
                                  </button>
                                )}

                                {r.status === 'active' && (
                                  <button
                                    onClick={() => handleQuickSuspend(r.id)}
                                    className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Ban size={14} /> Suspend Tenant
                                  </button>
                                )}

                                {r.status === 'suspended' && (
                                  <button
                                    onClick={() => handleQuickReactivate(r.id)}
                                    className="w-full px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CheckCircle2 size={14} /> Reactivate
                                  </button>
                                )}

                                <Link
                                  to={`/devgate/restaurants/${r.id}`}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <ExternalLink size={14} /> View Details
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {restaurants.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{pagination.totalCount}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-semibold text-slate-800">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create Restaurant */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Building2 size={16} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Provision New Restaurant Tenant</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Saffron Bistro"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="e.g. Farhan Ali"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Admin Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@restaurant.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Admin Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location / Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Gulberg III, Lahore"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    placeholder="11:00 AM - 11:00 PM"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="PKR"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {createLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Provision Tenant</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
