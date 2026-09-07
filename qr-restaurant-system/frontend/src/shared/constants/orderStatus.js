/**
 * POC Order Status Lifecycle
 * Linear flow: Placed -> Received -> Preparing -> Ready -> Served
 * Branch: Cancelled (can occur before preparing)
 * 
 * Note: Paid / Closed deferred post-POC (manual cashier settlement)
 */
export const ORDER_STATUS = {
  PLACED: 'Placed',
  RECEIVED: 'Received',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  CANCELLED: 'Cancelled'
};

export const ORDER_STATUS_CONFIG = {
  Placed: { label: 'Placed', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  Received: { label: 'Received', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  Preparing: { label: 'Preparing', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  Ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  Served: { label: 'Served', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  Cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800 border-rose-300' },
};
