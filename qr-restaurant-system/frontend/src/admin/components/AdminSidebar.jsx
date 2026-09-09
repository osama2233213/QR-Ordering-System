import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Flame, 
  Receipt, 
  UtensilsCrossed, 
  QrCode, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronDown,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminSidebar = ({ onClose }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Live Kitchen', path: '/admin/kitchen', icon: Flame },
    { label: 'Orders', path: '/admin/orders', icon: Receipt },
    { label: 'Menu Management', path: '/admin/menu', icon: UtensilsCrossed },
    { label: 'Tables & QR', path: '/admin/tables', icon: QrCode },
    { label: 'Sales Analytics', path: '/admin/sales', icon: BarChart3 },
    { label: 'Restaurant Settings', path: '/admin/settings', icon: Settings },
  ];

  const restaurantName = user?.restaurantName || user?.restaurant?.name || 'DineFlow Kitchen';
  const userName = user?.name || 'General Manager';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="h-full bg-[#121110] text-stone-200 p-4 flex flex-col justify-between border-r border-stone-800 shadow-2xl overflow-hidden">
      {/* Top Header with Brand and Restaurant Capsule (Fixed at Top) */}
      <div className="flex-shrink-0">
        {/* Top Header with Brand and Mobile Close */}
        <div className="flex items-center justify-between px-2 pt-1 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-lg text-white shadow-md">
              D
            </div>
            <div>
              <span className="font-serif font-black text-lg tracking-tight text-white block leading-none">
                DineFlow
              </span>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mt-1">
                Bistro OS
              </span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Restaurant Identity Capsule */}
        <div className="mt-1 mb-4 px-3 py-2.5 rounded-2xl bg-stone-900/90 border border-stone-800/80 flex items-center justify-between cursor-pointer hover:border-stone-700 transition-colors">
          <div className="min-w-0 pr-2">
            <h4 className="font-semibold text-xs text-white truncate">
              {restaurantName}
            </h4>
            <p className="text-[10px] text-stone-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Operations Dashboard
            </p>
          </div>
          <ChevronDown size={14} className="text-stone-400 flex-shrink-0" />
        </div>
      </div>

      {/* Navigation List - Scrollable Middle Area */}
      <nav className="space-y-1 flex-1 overflow-y-auto pr-0.5 my-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              replace
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm font-bold'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="w-5 h-5 rounded-full bg-brand-600/60 text-white text-[10px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom User Profile Card with Sign Out - Fixed at Bottom */}
      <div className="pt-4 border-t border-stone-800/80 mt-auto flex-shrink-0">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-950 border border-amber-600/40 text-amber-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
              {userInitials || 'OP'}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate leading-tight">
                {userName}
              </span>
              <span className="text-[10px] text-stone-400 block truncate leading-tight mt-0.5 capitalize">
                {user?.role ? user.role.replace('_', ' ') : 'Staff Member'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-900 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
