import React from 'react';

export const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
    <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </div>
);
