import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  DollarSign,
  UtensilsCrossed,
  Layers,
  Users,
  ShieldCheck,
  Key,
  ExternalLink,
  RefreshCw,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { devgateApi } from '../../api/devgateApi';

export const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);

  // Reset access modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(null);

  const fetchTenantDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await devgateApi.getRestaurant(id);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch restaurant details', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenantDetail();
  }, [fetchTenantDetail]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await devgateApi.approveRestaurant(id);
      await fetchTenantDetail();
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    const reason = window.prompt('Enter reason for tenant suspension:', 'Policy violation or requested by owner');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await devgateApi.suspendRestaurant(id, reason);
      await fetchTenantDetail();
    } catch (err) {
      alert('Suspension failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      await devgateApi.reactivateRestaurant(id);
      await fetchTenantDetail();
    } catch (err) {
      alert('Reactivation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetAccess = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setResetSuccess(null);
    try {
      const res = await devgateApi.resetAccess(id, newPassword);
      setResetSuccess(res.data?.data);
      setNewPassword('');
    } catch (err) {
      alert('Password reset failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading restaurant control record...</p>
      </div>
    );
  }

  if (!data?.restaurant) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2" />
        <h3 className="text-base font-bold text-slate-800">Restaurant not found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested tenant ID could not be located.</p>
        <Link
          to="/devgate/restaurants"
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-amber-600 hover:underline"
        >
          <ArrowLeft size={14} /> Return to Directory
        </Link>
      </div>
    );
  }

  const { restaurant, stats, users = [], recentOrders = [], auditLogs = [] } = data;
  const initial = restaurant.name ? restaurant.name.charAt(0).toUpperCase() : 'R';
  const createdDate = new Date(restaurant.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Back Button */}
      <div>
        <Link
          to="/devgate/restaurants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Restaurant Directory</span>
        </Link>
      </div>

      {/* Tenant Master Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-700 font-black text-2xl flex items-center justify-center shrink-0 shadow-xs">
            {initial}
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{restaurant.name}</h2>
              {restaurant.status === 'active' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Tenant
                </span>
              )}
              {restaurant.status === 'pending' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending Approval
                </span>
              )}
              {restaurant.status === 'suspended' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Suspended
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-slate-400" /> {restaurant.address || 'Address not specified'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" /> Onboarded: {createdDate}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                ID: {restaurant.id}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchTenantDetail}
            title="Refresh"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw size={15} />
          </button>

          {restaurant.status === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Approve Tenant</span>
            </button>
          )}

          {restaurant.status === 'active' && (
            <button
              onClick={handleSuspend}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Ban size={15} />
              <span>Suspend Tenant</span>
            </button>
          )}

          {restaurant.status === 'suspended' && (
            <button
              onClick={handleReactivate}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Reactivate Tenant</span>
            </button>
          )}

          <button
            onClick={() => setShowResetModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Key size={14} />
            <span>Reset Access</span>
          </button>
        </div>
      </div>

      {/* 4 Statistics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total GMV Revenue</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {restaurant.settings?.currency || 'PKR'} {(stats?.revenue || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">From non-cancelled orders</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <FileText size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(stats?.orders || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lifetime customer tickets</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Tables</span>
            <Layers size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.tables || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Registered QR stations</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Menu Catalog</span>
            <UtensilsCrossed size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.menuItems || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{stats?.categories || 0} categories</p>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Settings' },
            { id: 'orders', label: `Orders (${recentOrders.length})` },
            { id: 'users', label: `Team Members (${users.length})` },
            { id: 'audit', label: `Audit Log (${auditLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Business Profile
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Legal Owner:</span>
                      <span className="font-bold text-slate-800">{restaurant.ownerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Primary Contact Email:</span>
                      <span className="font-mono text-slate-800">{restaurant.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone Number:</span>
                      <span className="font-semibold text-slate-800">{restaurant.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Physical Address:</span>
                      <span className="font-medium text-slate-800">{restaurant.address || 'Standard Location'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Platform Settings & Policy
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operational Currency:</span>
                      <span className="font-bold text-slate-800">{restaurant.settings?.currency || 'PKR'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax Surcharge Rate:</span>
                      <span className="font-bold text-slate-800">{restaurant.settings?.taxRate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operating Schedule:</span>
                      <span className="font-medium text-slate-800">{restaurant.settings?.openingHours || '11:00 AM - 11:00 PM'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Public Customer Link:</span>
                      <span className="font-mono text-amber-600 text-[11px] truncate max-w-[200px]">
                        /r/{restaurant.id}/t/[tableId]
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Orders */}
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Zero orders recorded for this restaurant tenant.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Table</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          Table {order.tableId?.tableNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {order.items?.length || 0} dishes
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {restaurant.settings?.currency || 'PKR'} {order.totalAmount}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 3: Users */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              {users.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No staff accounts registered under this tenant.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">User Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Account Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {u.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {u.email}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 4: Audit Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Zero administrative interventions logged for this tenant yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-white font-mono">
                          {log.action}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800">
                            Executed by {log.actorName} ({log.actorEmail})
                          </div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {JSON.stringify(log.metadata)}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Reset Access */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Reset Restaurant Admin Credentials</h3>
            <p className="text-xs text-slate-500 mb-4">
              Directly reset the master restaurant_admin password for {restaurant.name}.
            </p>

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                <div className="font-bold">Password Reset Successful!</div>
                <div>Admin Email: <span className="font-mono">{resetSuccess.email}</span></div>
                <div>Temporary Password: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">{resetSuccess.temporaryPassword}</span></div>
              </div>
            )}

            <form onSubmit={handleResetAccess} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  New Password (Optional, leave blank to auto-generate)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty for auto-generated strong pass"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSuccess(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
