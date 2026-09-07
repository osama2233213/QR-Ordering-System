import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  MapPin, 
  Clock, 
  DollarSign, 
  Percent, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { restaurantApi } from '../../api/restaurantApi';
import { useAuth } from '../../context/AuthContext';

const FALLBACK_LOGO = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&auto=format&fit=crop&q=80';

export const RestaurantSettingsPage = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    logoUrl: '',
    currency: 'PKR',
    taxRate: 0,
    openingHours: '11:00 AM - 11:00 PM',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load restaurant settings
  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await restaurantApi.getProfile();
      const data = res.data?.data;
      if (data) {
        setFormData({
          name: data.name || '',
          description: data.description || '',
          phone: data.phone || '',
          address: data.address || '',
          logoUrl: data.logoUrl || '',
          currency: data.settings?.currency || 'PKR',
          taxRate: data.settings?.taxRate !== undefined ? data.settings.taxRate : 0,
          openingHours: data.settings?.openingHours || '11:00 AM - 11:00 PM',
        });
      }
    } catch (err) {
      console.error('[RestaurantSettings] Failed to fetch profile:', err);
      showToast('Failed to load restaurant profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Restaurant name is required.', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      logoUrl: formData.logoUrl.trim(),
      settings: {
        currency: formData.currency.trim().toUpperCase(),
        taxRate: Number(formData.taxRate) || 0,
        openingHours: formData.openingHours.trim(),
      },
    };

    try {
      await restaurantApi.updateProfile(payload);
      showToast('Restaurant settings saved successfully!');
    } catch (err) {
      console.error('[RestaurantSettings] Save failed:', err);
      showToast(err.response?.data?.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
          toast.type === 'error'
            ? 'bg-rose-900 text-rose-100 border-rose-700'
            : 'bg-stone-900 text-stone-100 border-stone-700'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            <span>Configuration</span>
            <span>·</span>
            <span>Establishment Parameters</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif font-black text-slate-900 tracking-tight">
            Restaurant Settings
          </h1>
        </div>

        <button
          type="button"
          onClick={loadProfile}
          className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-slate-900 hover:bg-stone-50 shadow-2xs transition-colors self-start sm:self-auto"
          title="Reload settings"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-xs space-y-6 animate-pulse">
          <div className="h-6 bg-stone-100 rounded w-1/3" />
          <div className="h-10 bg-stone-100 rounded-xl" />
          <div className="h-20 bg-stone-100 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-stone-100 rounded-xl" />
            <div className="h-10 bg-stone-100 rounded-xl" />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Identity & Branding */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Building2 size={18} className="text-brand-600" />
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Identity & Branding
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Restaurant Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Restaurant Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. L'Ambroisie Bistro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              {/* Tagline / Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Restaurant Description & Philosophy
                </label>
                <textarea
                  rows="2"
                  placeholder="Artisanal French bistro offering farm-to-table dine-in specialties..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                />
              </div>

              {/* Logo URL */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Brand Logo / Header Image URL
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                  {formData.logoUrl && (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex-shrink-0">
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_LOGO;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact & Location */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <MapPin size={18} className="text-brand-600" />
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Contact & Address
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Physical Address */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Physical Street Address
                </label>
                <input
                  type="text"
                  placeholder="Plot 14-C, Main Boulevard, Gulberg III"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Financial & Operational Parameters */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <DollarSign size={18} className="text-brand-600" />
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Operational & Billing Parameters
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Currency */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Menu Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  <option value="PKR">PKR (Pakistani Rupee)</option>
                  <option value="USD">USD ($ US Dollar)</option>
                  <option value="EUR">EUR (€ Euro)</option>
                  <option value="GBP">GBP (£ British Pound)</option>
                  <option value="AED">AED (Dirham)</option>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                </select>
              </div>

              {/* Tax Percentage */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tax / GST Rate (%)
                </label>
                <div className="relative">
                  <Percent size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Service Shift / Hours
                </label>
                <div className="relative">
                  <Clock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="12:00 PM - 11:30 PM"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Restaurant Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
