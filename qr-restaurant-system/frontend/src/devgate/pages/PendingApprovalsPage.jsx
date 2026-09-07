import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Store, Mail, Phone, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { devgateApi } from '../../api/devgateApi';

export const PendingApprovalsPage = () => {
  const [pendingRestaurants, setPendingRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const res = await devgateApi.getRestaurants({ status: 'pending', limit: 50 });
      if (res.data?.success) {
        setPendingRestaurants(res.data.data.restaurants || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending restaurants', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id, name) => {
    setActionLoadingId(id);
    try {
      await devgateApi.approveRestaurant(id);
      setFeedbackMessage({ type: 'success', text: `Approved and activated ${name}!` });
      await fetchPending();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Approval failed: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reject the application for ${name}?`)) return;
    setActionLoadingId(id);
    try {
      await devgateApi.suspendRestaurant(id, 'Application rejected by super administrator');
      setFeedbackMessage({ type: 'info', text: `Rejected application for ${name}.` });
      await fetchPending();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Rejection failed: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pending Approvals</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-xs">
              {pendingRestaurants.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and verify incoming restaurant partner onboarding applications.
          </p>
        </div>

        <button
          onClick={fetchPending}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pending Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium">Checking pending verification queue...</p>
        </div>
      ) : pendingRestaurants.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-base font-black text-slate-900">All caught up!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently zero restaurants waiting for approval. When new restaurant tenants register, their verification cards will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pendingRestaurants.map((r) => {
            const initial = r.name ? r.name.charAt(0).toUpperCase() : 'R';
            const appliedDate = new Date(r.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const isProcessing = actionLoadingId === r.id;

            return (
              <div
                key={r.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top card bar: Avatar and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-600/10 border border-amber-600/20 text-amber-700 font-black text-lg flex items-center justify-center shadow-xs">
                      {initial}
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending Review
                    </span>
                  </div>

                  {/* Restaurant Title & Subtitle */}
                  <h3 className="text-lg font-black text-slate-900">{r.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {r.description || 'Restaurant Partner'} · {r.address || 'Address on file'}
                  </p>

                  {/* Key Metadata Table */}
                  <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Store size={13} /> Owner:
                      </span>
                      <span className="font-semibold text-slate-800">{r.ownerName}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Mail size={13} /> Email:
                      </span>
                      <span className="font-mono text-slate-700">{r.email}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar size={13} /> Applied:
                      </span>
                      <span className="text-slate-700 font-medium">{appliedDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Phone size={13} /> Phone:
                      </span>
                      <span className="text-slate-700 font-medium">{r.phone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Decision Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleReject(r.id, r.name)}
                    disabled={isProcessing}
                    className="py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(r.id, r.name)}
                    disabled={isProcessing}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Approve ✓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
