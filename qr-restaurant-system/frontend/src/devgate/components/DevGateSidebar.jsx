import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock,
  BarChart3,
  ShieldCheck,
  CreditCard,
  LogOut,
  ArrowLeft,
  LifeBuoy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { devgateApi } from '../../api/devgateApi';

export const DevGateSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  // Poll or fetch pending count for live notification badge
  useEffect(() => {
    let isMounted = true;
    const fetchPending = async () => {
      try {
        const res = await devgateApi.getRestaurants({ status: 'pending', limit: 1 });
        if (isMounted && res.data?.data?.metrics) {
          setPendingCount(res.data.data.metrics.pending || 0);
        }
      } catch {
        // DevGate API call failure handled silently
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const navItems = [
    {
      label: 'Restaurant Directory',
      path: '/devgate/restaurants',
      icon: Building2,
    },
    {
      label: 'Pending Approvals',
      path: '/devgate/pending',
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      label: 'Platform Analytics',
      path: '/devgate/analytics',
      icon: BarChart3,
    },
    {
      label: 'Compliance Audit Logs',
      path: '/devgate/audit-logs',
      icon: ShieldCheck,
    },
    {
      label: 'Billing & Plans',
      path: '/devgate/billing',
      icon: CreditCard,
      badge: 'Roadmap',
      badgeColor: 'bg-slate-800 text-slate-400 text-[10px]',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/devgate/login');
  };

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 min-h-screen p-5 flex flex-col justify-between border-r border-slate-900 select-none shrink-0 font-sans">
      <div>
        {/* Logo / Header */}
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-amber-600/30">
            DG
          </div>
          <div>
            <div className="font-extrabold text-base text-white tracking-wide flex items-center gap-1.5">
              DEVGATE
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              DineFlow Platform Control
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider px-3 mb-2">
          Management
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path ||
              (item.path === '/devgate/restaurants' && location.pathname.startsWith('/devgate/restaurants/'));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  active
                    ? 'bg-amber-600/15 text-amber-400 border border-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={17}
                    className={`transition-colors ${
                      active ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Super-admin Profile card & Footer */}
      <div className="pt-4 border-t border-slate-900 space-y-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
              SA
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || 'Platform Administrator'}
              </div>
              <div className="text-[10px] text-amber-400/90 font-medium truncate">
                Super Admin
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>

        <Link
          to="/"
          className="flex items-center justify-center gap-2 text-[11px] text-slate-300 hover:text-white transition-colors py-1.5 px-2 rounded-xl hover:bg-slate-900"
        >
          <ArrowLeft size={13} />
          <span>Back to demo launcher</span>
        </Link>
      </div>
    </aside>
  );
};
