import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-base font-bold text-white tracking-wide">DineFlow OS</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying administrative access...</p>
      </div>
    );
  }

  // Not logged in -> redirect to login (devgate zone redirects to /devgate/login)
  if (!token || !user) {
    const loginTarget = location.pathname.startsWith('/devgate') ? '/devgate/login' : '/admin/login';
    return <Navigate to={loginTarget} state={{ from: location }} replace />;
  }

  // Role authorization check:
  // If active user role does not match the required role for this zone (e.g. devgate_admin on /admin),
  // redirect them directly to the appropriate zone login page instead of trapping them on a dead-end error screen.
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const loginTarget = location.pathname.startsWith('/devgate') ? '/devgate/login' : '/admin/login';
    return <Navigate to={loginTarget} state={{ from: location }} replace />;
  }

  return children;
};
