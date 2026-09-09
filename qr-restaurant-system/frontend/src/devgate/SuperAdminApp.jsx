import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, HelpCircle } from "lucide-react";
import { DevGateSidebar } from "./components/DevGateSidebar";
import { useAuth } from "../context/AuthContext";

export const SuperAdminApp = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Simple title generator from path
  const getHeaderTitle = () => {
    if (location.pathname.includes("/devgate/pending"))
      return "Pending Approvals";
    if (location.pathname.includes("/devgate/analytics"))
      return "Platform Analytics";
    if (location.pathname.includes("/devgate/audit-logs"))
      return "Compliance Audit Logs";
    if (location.pathname.includes("/devgate/billing"))
      return "Subscription & Plans";
    if (location.pathname.match(/\/devgate\/restaurants\/.+/))
      return "Tenant Detail Control";
    return "Restaurant Directory";
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] flex font-sans">
      {/* DevGate Left Sidebar */}
      <DevGateSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 z-30">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {getHeaderTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick search input */}
            <div className="relative w-64 hidden sm:block">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search restaurants..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    navigate(
                      `/devgate/restaurants?search=${encodeURIComponent(e.target.value.trim())}`,
                      {
                        replace: true,
                      },
                    );
                  }
                }}
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => navigate("/devgate/pending", { replace: true })}
              title="Notifications"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            {/* Super Admin Avatar */}
            <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
