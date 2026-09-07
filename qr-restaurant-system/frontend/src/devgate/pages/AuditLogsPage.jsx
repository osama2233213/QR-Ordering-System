import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Filter, Calendar, User, Store } from 'lucide-react';
import { devgateApi } from '../../api/devgateApi';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalCount: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await devgateApi.getAuditLogs({ page, limit: 20, action: actionFilter });
      if (res.data?.success) {
        setLogs(res.data.data.logs || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 20, totalCount: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'TENANT_APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            TENANT_APPROVED
          </span>
        );
      case 'TENANT_SUSPENDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
            TENANT_SUSPENDED
          </span>
        );
      case 'TENANT_REACTIVATED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
            TENANT_REACTIVATED
          </span>
        );
      case 'TENANT_CREATED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
            TENANT_CREATED
          </span>
        );
      case 'ACCESS_RESET':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            ACCESS_RESET
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all super-administrative operations and tenant lifecycle mutations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs(pagination.page)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            {[
              { id: 'all', label: 'All Actions' },
              { id: 'TENANT_APPROVED', label: 'Approvals' },
              { id: 'TENANT_SUSPENDED', label: 'Suspensions' },
              { id: 'TENANT_REACTIVATED', label: 'Reactivations' },
              { id: 'TENANT_CREATED', label: 'Tenant Creation' },
              { id: 'ACCESS_RESET', label: 'Credential Resets' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  actionFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Total records: {pagination.totalCount}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Restaurant</th>
                <th className="py-3 px-4">Super-Admin Actor</th>
                <th className="py-3 px-4">Metadata Payload</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <ShieldCheck size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">Zero audit entries recorded</p>
                    <p className="text-[11px] mt-0.5">Platform actions will automatically stream into this registry.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {getActionBadge(log.action)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Store size={13} className="text-slate-400" />
                        {log.targetRestaurantName || 'Restaurant Tenant'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {log.targetRestaurantId}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        {log.actorName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {log.actorEmail}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {log.metadata && Object.keys(log.metadata).length > 0
                        ? JSON.stringify(log.metadata)
                        : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page <span className="font-bold text-slate-800">{pagination.page}</span> of{' '}
            <span className="font-bold text-slate-800">{pagination.totalPages}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
