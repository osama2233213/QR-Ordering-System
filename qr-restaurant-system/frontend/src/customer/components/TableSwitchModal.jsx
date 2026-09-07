import React from 'react';
import { Modal } from '../../shared/components/Modal';

export const TableSwitchModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch Table">
      <p className="text-xs text-slate-500 mb-4">
        Need to move to another table? Scan the new table QR code or select table number to transfer your active order session.
      </p>
      <div className="space-y-3">
        <input 
          type="text" 
          placeholder="Enter new Table #" 
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
        />
        <button className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600">
          Confirm Table Transfer
        </button>
      </div>
    </Modal>
  );
};
