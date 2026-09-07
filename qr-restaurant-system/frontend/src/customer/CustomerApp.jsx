import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { GuestSessionProvider, useGuestSession } from '../context/GuestSessionContext';

const CustomerAppContent = () => {
  const { restaurantId, tableId } = useParams();
  const { initSession, status, error } = useGuestSession();

  useEffect(() => {
    if (restaurantId && tableId) {
      initSession(restaurantId, tableId);
    }
  }, [restaurantId, tableId, initSession]);

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto shadow-2xl relative">
      {status === 'initializing' || status === 'idle' ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mb-4 shadow-sm animate-pulse">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-base font-bold text-slate-800">DineFlow</h2>
          <p className="text-xs text-slate-500 mt-1">Loading your dining experience...</p>
        </div>
      ) : status === 'error' ? (
        <div className="p-6 text-center pt-24">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-sm">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">QR Code Error</h2>
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            {error || 'Unable to verify restaurant table or start your ordering session.'}
          </p>
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
};

export const CustomerApp = () => {
  return (
    <GuestSessionProvider>
      <CustomerAppContent />
    </GuestSessionProvider>
  );
};
