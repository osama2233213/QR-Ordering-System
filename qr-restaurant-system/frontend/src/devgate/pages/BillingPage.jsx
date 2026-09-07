import React from 'react';
import { CreditCard, Check, Sparkles, Shield, ArrowRight } from 'lucide-react';

export const BillingPage = () => {
  const plans = [
    {
      name: 'Starter Tier',
      price: 'PKR 4,999',
      period: '/ month',
      description: 'Ideal for single-location cafes & bistros beginning their QR journey.',
      features: [
        'Up to 10 Active Tables',
        'Standard QR Generation',
        'Customer Digital Menu',
        'Basic Daily Sales Analytics',
        'Email Support',
      ],
      active: true,
      current: true,
    },
    {
      name: 'Professional Tier',
      price: 'PKR 12,999',
      period: '/ month',
      popular: true,
      description: 'High-throughput restaurants with full real-time Kitchen KDS needs.',
      features: [
        'Unlimited Tables & QR Stands',
        'Live Kitchen Display System (KDS)',
        'Real-time Socket.IO Sync',
        'Granular Dish 86 Inventory Controls',
        'Weekly & Monthly Aggregated Reports',
        'Priority Phone Support',
      ],
      active: true,
    },
    {
      name: 'Enterprise Franchise',
      price: 'Custom',
      period: '',
      description: 'Multi-branch restaurant chains requiring centralized management.',
      features: [
        'Multi-Branch Consolidated Dashboard',
        'Custom POS & Payment Gateway Integration',
        'Dedicated SLA & Platform Support',
        'Custom Domain & Brand Theming',
        'Super-Admin Cross-Tenant Impersonation',
      ],
      active: false,
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold mb-2">
          <Sparkles size={13} />
          <span>SaaS Platform Architecture Roadmap</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Plans & Billing</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure commercial subscription tiers, feature gates, and tenant invoicing limits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between relative shadow-xs ${
              plan.popular
                ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'border-slate-200/80'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Recommended
              </span>
            )}

            <div>
              <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
              <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

              <div className="mt-4 mb-6">
                <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                <span className="text-xs text-slate-400 ml-1 font-medium">{plan.period}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-700">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                disabled={!plan.active}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  plan.popular
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                Configure Tier Limits
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
