import React from 'react';
import { ORDER_STATUS_CONFIG } from '../../shared/constants/orderStatus';

export const OrderQueueCard = ({ order, onAdvanceStatus }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="font-bold text-slate-900 text-base">Order #{order.orderNumber}</span>
            <p className="text-xs text-brand-600 font-semibold">Table {order.tableNumber}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${ORDER_STATUS_CONFIG[order.status]?.color}`}>
            {order.status}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-slate-700 font-medium">
              <span>{item.quantity}x {item.name}</span>
              <span className="text-slate-400">${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900">Total: ${order.total.toFixed(2)}</span>
        <button 
          onClick={() => onAdvanceStatus(order.id)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
        >
          Advance Status &rarr;
        </button>
      </div>
    </div>
  );
};
