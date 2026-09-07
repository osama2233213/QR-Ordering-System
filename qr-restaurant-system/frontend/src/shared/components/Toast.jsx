import React from 'react';

export const Toast = ({ message, type = 'info' }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm border border-slate-800">
      {message}
    </div>
  );
};
