import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Volume2, 
  VolumeX, 
  Clock, 
  Plus, 
  Flame, 
  Menu, 
  Users
} from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { restaurantApi } from '../../api/restaurantApi';

export const AdminLayout = () => {
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chimesEnabled, setChimesEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    occupiedTables: 0,
    totalTables: 0,
  });

  // Live real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch quick status counters for top bar
  useEffect(() => {
    restaurantApi
      .getDashboardSummary()
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          setStats({
            occupiedTables: data.occupiedTablesCount || 0,
            totalTables: data.totalTablesCount || 0,
          });
        }
      })
      .catch((err) => {
        console.warn('[AdminLayout] Header stats unavailable:', err.message);
      });
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
  const formattedDate = currentTime.toLocaleDateString([], { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-[#faf7f2] flex antialiased text-slate-900">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)} 
          />
          <div className="relative z-10 w-64 flex-1">
            <AdminSidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Administrative Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* SaaS Top Administrative Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/70 px-4 lg:px-8 py-3 flex items-center justify-between shadow-2xs">
          {/* Left: Mobile Toggle & Service Status Pills */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-stone-100"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Service Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Floor Service</span>
            </div>

            {/* Active Floor Capacity */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200/70">
              <Users size={13} className="text-stone-500" />
              <span>{stats.occupiedTables}/{stats.totalTables} Tables</span>
            </div>

            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-stone-500 font-medium px-2 py-1">
              <Clock size={13} className="text-stone-400" />
              <span>{formattedDate} · {formattedTime}</span>
            </div>
          </div>

          {/* Right: Sound Chime Toggle & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Chime Notification Toggle */}
            <button
              type="button"
              onClick={() => setChimesEnabled((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                chimesEnabled
                  ? 'bg-stone-100 text-stone-800 border-stone-200 hover:bg-stone-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
              title={chimesEnabled ? "Kitchen Chimes Enabled" : "Kitchen Chimes Muted"}
            >
              {chimesEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="hidden sm:inline">{chimesEnabled ? 'Chimes ON' : 'Chimes Muted'}</span>
            </button>

            {/* Service Status Tag */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold">
              <Flame size={13} className="text-brand-500" />
              <span>Operations Active</span>
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Order</span>
            </button>
          </div>
        </header>

        {/* Dynamic Canvas Area */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
