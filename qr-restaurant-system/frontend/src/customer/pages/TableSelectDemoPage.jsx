import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, Store, Users, ArrowRight, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export const TableSelectDemoPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchTables = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/public/demo-tables');
      if (res.data?.success) {
        setRestaurants(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch demo tables:', err);
      setError(err.response?.data?.message || 'Failed to load restaurant tables from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        {/* Navigation back */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Development Launchpad</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-3 shadow-lg">
            <QrCode size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Select Restaurant Table</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Choose any active table below to simulate a customer scanning a physical QR code with live session creation.
          </p>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Fetching active restaurants & tables from database...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between mb-6">
            <span>{error}</span>
            <button
              onClick={fetchTables}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-white font-semibold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Restaurant & Table Cards */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {restaurants.length === 0 ? (
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 text-center text-slate-400">
                <Store size={32} className="mx-auto mb-3 text-slate-500" />
                <h3 className="text-sm font-bold text-white">No Active Restaurants Found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure restaurants are approved and active in DevGate.
                </p>
              </div>
            ) : (
              restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-black">
                        {rest.name ? rest.name.charAt(0).toUpperCase() : 'R'}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">{rest.name}</h2>
                        <p className="text-[11px] text-slate-400">
                          {rest.address || 'Partner Venue'} · Currency: {rest.currency}
                        </p>
                      </div>
                    </div>
                  </div>

                  {rest.tables.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/40 text-center text-xs text-slate-500">
                      No tables registered for this venue yet. Create tables via Restaurant Admin.
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Layers size={13} /> Available Tables ({rest.tables.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {rest.tables.map((tbl) => (
                          <button
                            key={tbl.id}
                            onClick={() => navigate(`/r/${rest.id}/t/${tbl.id}`)}
                            className="bg-slate-900/80 hover:bg-brand-600/15 hover:border-brand-500/50 border border-slate-700/60 p-4 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-base font-black text-white group-hover:text-brand-400 transition-colors">
                                Table {tbl.tableNumber}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                {tbl.capacity || 4} seats
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-brand-400">
                              <span>Launch QR Menu</span>
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
