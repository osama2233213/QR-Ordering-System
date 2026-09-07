import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { QrCode, Monitor, Shield, ArrowRight } from 'lucide-react';

// Customer Zone
import { CustomerApp } from './customer/CustomerApp';
import { MenuPage } from './customer/pages/MenuPage';
import { ItemDetailPage } from './customer/pages/ItemDetailPage';
import { CartPage } from './customer/pages/CartPage';
import { OrderConfirmationPage } from './customer/pages/OrderConfirmationPage';
import { OrderTrackingPage } from './customer/pages/OrderTrackingPage';

// Admin Zone
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminApp } from './admin/AdminApp';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { LiveKitchenPage } from './admin/pages/LiveKitchenPage';
import { OrdersPage } from './admin/pages/OrdersPage';
import { MenuManagementPage } from './admin/pages/MenuManagementPage';
import { TableManagementPage } from './admin/pages/TableManagementPage';
import { SalesPage } from './admin/pages/SalesPage';
import { RestaurantSettingsPage } from './admin/pages/RestaurantSettingsPage';

// DevGate Zone
import { SuperAdminApp } from './devgate/SuperAdminApp';
import { DevGateLoginPage } from './devgate/pages/DevGateLoginPage';
import { RestaurantListPage } from './devgate/pages/RestaurantListPage';
import { RestaurantDetailPage } from './devgate/pages/RestaurantDetailPage';
import { PendingApprovalsPage } from './devgate/pages/PendingApprovalsPage';
import { AnalyticsPage } from './devgate/pages/AnalyticsPage';
import { AuditLogsPage } from './devgate/pages/AuditLogsPage';
import { BillingPage } from './devgate/pages/BillingPage';

// Development Hub Landing Page
const DevLandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500 font-black text-2xl text-white shadow-lg mb-3">
            Q
          </div>
          <h1 className="text-3xl font-black tracking-tight">QuickServe POS & Ordering System</h1>
          <p className="text-slate-400 text-sm mt-1">POC Development Launchpad — Choose an interface zone to test</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Customer Menu */}
          <Link 
            to="/r/rest_123/t/table_4"
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-6 rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/50 flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-4">
                <QrCode size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Mobile Web
              </span>
              <h3 className="text-lg font-bold text-white mt-3">Customer Menu</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Table QR code diner experience: browse categories, add dishes to cart, and track order status live.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-brand-400 group-hover:translate-x-1 transition-transform">
              Launch Customer Flow <ArrowRight size={14} className="ml-1" />
            </div>
          </Link>

          {/* Card 2: Restaurant Admin */}
          <Link 
            to="/admin/login"
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-6 rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/50 flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Monitor size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Desktop Panel
              </span>
              <h3 className="text-lg font-bold text-white mt-3">Restaurant Admin</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Live kitchen order display, advance order status with real-time Socket.IO, manage menu and tables.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              Launch Admin Dashboard <ArrowRight size={14} className="ml-1" />
            </div>
          </Link>

          {/* Card 3: DevGate Super-Admin */}
          <Link 
            to="/devgate/login"
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-6 rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/50 flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <Shield size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Super Admin (POC)
              </span>
              <h3 className="text-lg font-bold text-white mt-3">DevGate Platform</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Platform control panel to onboard and approve new restaurant tenants across the multi-tenant system.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              Launch Super-Admin <ArrowRight size={14} className="ml-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Routes>
      {/* Dev Launcher Landing Page */}
      <Route path="/" element={<DevLandingPage />} />

      {/* Customer Mobile Zone (QR Entry) */}
      <Route path="/r/:restaurantId/t/:tableId" element={<CustomerApp />}>
        <Route index element={<MenuPage />} />
        <Route path="item/:itemId" element={<ItemDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="confirmation" element={<OrderConfirmationPage />} />
        <Route path="tracking/:orderId" element={<OrderTrackingPage />} />
      </Route>

      {/* Restaurant Admin Zone */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['restaurant_admin', 'kitchen_staff']}>
            <AdminApp />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="kitchen" element={<LiveKitchenPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="menu" element={<MenuManagementPage />} />
        <Route path="tables" element={<TableManagementPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="settings" element={<RestaurantSettingsPage />} />
      </Route>

      {/* DevGate Super-Admin Zone */}
      <Route path="/devgate/login" element={<DevGateLoginPage />} />
      <Route 
        path="/devgate" 
        element={
          <ProtectedRoute allowedRoles={['devgate_admin']}>
            <SuperAdminApp />
          </ProtectedRoute>
        }
      >
        <Route index element={<RestaurantListPage />} />
        <Route path="restaurants" element={<RestaurantListPage />} />
        <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="pending" element={<PendingApprovalsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>
    </Routes>
  );
}
