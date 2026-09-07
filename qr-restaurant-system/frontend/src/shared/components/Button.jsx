import React from 'react';

export const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow focus:ring-brand-500",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm focus:ring-slate-300",
    dark: "bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-900",
    danger: "bg-rose-500 hover:bg-rose-600 text-white focus:ring-rose-500",
    ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-200"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs font-semibold",
    md: "px-4 py-2 text-sm font-medium",
    lg: "px-5 py-2.5 text-base font-semibold",
  };

  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`} {...props}>
      {children}
    </button>
  );
};
