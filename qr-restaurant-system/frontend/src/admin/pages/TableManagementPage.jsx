import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  QrCode, 
  Plus, 
  Search, 
  Users, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Sparkles,
  Layers
} from 'lucide-react';
import { tableApi } from '../../api/tableApi';
import { useAuth } from '../../context/AuthContext';
import socketClient from '../../sockets/socketClient';

export const TableManagementPage = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || user?.restaurant?._id;
  const restaurantName = user?.restaurantName || user?.restaurant?.name || 'DineFlow Bistro';

  // Data states
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, available, occupied, reserved

  // Modal states
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null); // null = add, object = edit
  const [tableForm, setTableForm] = useState({
    tableNumber: '',
    capacity: 4,
    status: 'available',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // QR Preview & Print Modal
  const [qrModalTable, setQrModalTable] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const printCardRef = useRef(null);

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load tables
  const loadTables = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await tableApi.getTables();
      setTables(res.data?.data || []);
    } catch (err) {
      console.error('[TableManagement] Failed to load tables:', err);
      showToast('Failed to load tables. Please refresh.', 'error');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadTables(true);
  }, []);

  // Socket.IO real-time table status updates
  useEffect(() => {
    if (!restaurantId) return;

    const socket = socketClient.connect();
    socketClient.joinRestaurantRoom(restaurantId);

    const handleConnect = () => {
      socketClient.joinRestaurantRoom(restaurantId);
    };

    const handleTableUpdate = (updatedTable) => {
      if (!updatedTable?._id) return;
      setTables((prev) => {
        const exists = prev.some((t) => t._id === updatedTable._id);
        if (exists) {
          if (updatedTable.isActive === false) {
            return prev.filter((t) => t._id !== updatedTable._id);
          }
          return prev.map((t) => (t._id === updatedTable._id ? { ...t, ...updatedTable } : t));
        }
        if (updatedTable.isActive !== false) {
          return [...prev, updatedTable];
        }
        return prev;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('table:updated', handleTableUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('table:updated', handleTableUpdate);
    };
  }, [restaurantId]);

  // Derived Summary Metrics
  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === 'available').length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const reserved = tables.filter((t) => t.status === 'reserved').length;
    const totalCapacity = tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    return { total, available, occupied, reserved, totalCapacity };
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (statusFilter !== 'ALL' && table.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return String(table.tableNumber).toLowerCase().includes(term);
      }
      return true;
    });
  }, [tables, statusFilter, searchTerm]);

  // -------------------------------------------------------------
  // Quick Status Update
  // -------------------------------------------------------------
  const handleQuickStatusChange = async (table, newStatus) => {
    // Optimistic UI update
    setTables((prev) =>
      prev.map((t) => (t._id === table._id ? { ...t, status: newStatus } : t))
    );

    try {
      await tableApi.updateTableStatus(table._id, newStatus);
      showToast(`Table ${table.tableNumber} is now marked as ${newStatus}`);
    } catch (err) {
      console.error('[TableManagement] Quick status update failed:', err);
      showToast('Failed to update table status', 'error');
      // Rollback
      setTables((prev) =>
        prev.map((t) => (t._id === table._id ? { ...t, status: table.status } : t))
      );
    }
  };

  // -------------------------------------------------------------
  // Add / Edit Table Form
  // -------------------------------------------------------------
  const handleOpenAdd = () => {
    setEditingTable(null);
    setTableForm({
      tableNumber: '',
      capacity: 4,
      status: 'available',
      isActive: true,
    });
    setFormErrors({});
    setTableModalOpen(true);
  };

  const handleOpenEdit = (table) => {
    setEditingTable(table);
    setTableForm({
      tableNumber: table.tableNumber || '',
      capacity: table.capacity || 4,
      status: table.status || 'available',
      isActive: table.isActive !== false,
    });
    setFormErrors({});
    setTableModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!String(tableForm.tableNumber).trim()) {
      errs.tableNumber = 'Table number/name is required';
    }
    if (!tableForm.capacity || Number(tableForm.capacity) < 1) {
      errs.capacity = 'Capacity must be at least 1 guest';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const payload = {
      tableNumber: String(tableForm.tableNumber).trim(),
      capacity: Number(tableForm.capacity),
      status: tableForm.status,
      isActive: tableForm.isActive,
    };

    try {
      if (editingTable) {
        const res = await tableApi.updateTable(editingTable._id, payload);
        const updated = res.data?.data;
        setTables((prev) =>
          prev.map((t) => (t._id === editingTable._id ? updated : t))
        );
        showToast(`Table ${payload.tableNumber} updated successfully`);
      } else {
        const res = await tableApi.createTable(payload);
        const created = res.data?.data;
        setTables((prev) => [...prev, created]);
        showToast(`Table ${payload.tableNumber} created with QR Code`);
      }
      setTableModalOpen(false);
    } catch (err) {
      console.error('[TableManagement] Save table error:', err);
      const msg = err.response?.data?.message || 'Failed to save table';
      if (err.response?.status === 409 || msg.toLowerCase().includes('already exists')) {
        setFormErrors({ tableNumber: 'This table number already exists' });
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Table
  // -------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);

    try {
      await tableApi.deleteTable(deleteConfirm._id);
      setTables((prev) => prev.filter((t) => t._id !== deleteConfirm._id));
      showToast(`Table ${deleteConfirm.tableNumber} removed`);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('[TableManagement] Delete table error:', err);
      showToast(err.response?.data?.message || 'Failed to delete table', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // QR Actions: Copy Link, Download PNG, Print
  // -------------------------------------------------------------
  const getCustomerUrl = (table) => {
    const origin = window.location.origin;
    return `${origin}/r/${restaurantId}/t/${table._id}`;
  };

  const handleCopyLink = (table) => {
    const url = getCustomerUrl(table);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    showToast('Customer QR ordering URL copied to clipboard');
  };

  const handleDownloadQR = (table) => {
    if (!table.qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = table.qrCodeUrl;
    a.download = `table-${table.tableNumber}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Table ${table.tableNumber} QR downloaded`);
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            <span>Floor Operations</span>
            <span>·</span>
            <span>Seating & QR Dispatches</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Tables & QR Codes</span>
            <span className="text-xs font-sans font-bold px-2.5 py-1 rounded-full bg-stone-900 text-white shadow-2xs">
              {tables.length} {tables.length === 1 ? 'Table' : 'Tables'}
            </span>
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold shadow-xs transition-all self-start md:self-auto"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add New Table</span>
        </button>
      </div>

      {/* 4 Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Tables */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Total Tables
            </span>
            <span className="text-2xl lg:text-3xl font-black text-slate-900 mt-1 block">
              {stats.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Layers size={18} />
          </div>
        </div>

        {/* Available Tables */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Available
            </span>
            <span className="text-2xl lg:text-3xl font-black text-emerald-600 mt-1 block">
              {stats.available}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Occupied Tables */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Occupied
            </span>
            <span className="text-2xl lg:text-3xl font-black text-amber-600 mt-1 block">
              {stats.occupied}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        {/* Seating Capacity */}
        <div className="bg-white p-4 lg:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Floor Capacity
            </span>
            <span className="text-2xl lg:text-3xl font-black text-slate-900 mt-1 block">
              {stats.totalCapacity} <span className="text-xs font-medium text-stone-400">seats</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs sm:max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search table number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold text-stone-600 self-start sm:self-auto">
          {[
            { id: 'ALL', label: 'All Tables' },
            { id: 'available', label: 'Available' },
            { id: 'occupied', label: 'Occupied' },
            { id: 'reserved', label: 'Reserved' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid or Loading / Empty States */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-5 border border-stone-200 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 bg-stone-100 rounded w-20" />
                <div className="h-5 bg-stone-100 rounded-full w-16" />
              </div>
              <div className="h-32 bg-stone-100 rounded-2xl w-full" />
              <div className="h-9 bg-stone-100 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredTables.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTables.map((table) => {
            const isOccupied = table.status === 'occupied';
            const isReserved = table.status === 'reserved';

            return (
              <div
                key={table._id}
                className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Table Number & Status Pill */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <h3 className="font-serif font-black text-slate-900 text-lg">
                        Table {table.tableNumber}
                      </h3>
                      <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mt-0.5">
                        <Users size={12} />
                        <span>{table.capacity || 4} Guests Capacity</span>
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      isOccupied
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : isReserved
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {table.status.toUpperCase()}
                    </span>
                  </div>

                  {/* QR Code Card Thumbnail Preview */}
                  <div 
                    onClick={() => setQrModalTable(table)}
                    className="my-4 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100/80 transition-colors group/qr"
                    title="Click to view full QR code and print stand card"
                  >
                    {table.qrCodeUrl ? (
                      <img
                        src={table.qrCodeUrl}
                        alt={`QR Code Table ${table.tableNumber}`}
                        className="w-28 h-28 object-contain rounded-lg transition-transform group-hover/qr:scale-105"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-stone-200 flex items-center justify-center text-stone-400">
                        <QrCode size={36} />
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-brand-600 mt-2 flex items-center gap-1">
                      <QrCode size={11} />
                      <span>View & Print QR</span>
                    </span>
                  </div>

                  {/* Quick Status Toggle Buttons */}
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-stone-500 bg-stone-100/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(table, 'available')}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        table.status === 'available'
                          ? 'bg-white text-emerald-700 shadow-2xs font-black'
                          : 'hover:text-slate-800'
                      }`}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(table, 'occupied')}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        table.status === 'occupied'
                          ? 'bg-white text-amber-700 shadow-2xs font-black'
                          : 'hover:text-slate-800'
                      }`}
                    >
                      Occupied
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(table, 'reserved')}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        table.status === 'reserved'
                          ? 'bg-white text-indigo-700 shadow-2xs font-black'
                          : 'hover:text-slate-800'
                      }`}
                    >
                      Reserved
                    </button>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3.5 mt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setQrModalTable(table)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-brand-600 transition-colors"
                  >
                    <Printer size={13} />
                    <span>Print Card</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(table)}
                      className="p-1.5 text-stone-400 hover:text-slate-800 rounded-lg hover:bg-stone-100 transition-colors"
                      title="Edit table details"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(table)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete table"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 border border-stone-200/80 shadow-xs text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400 mx-auto mb-4">
            <QrCode size={26} strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No tables found</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
            {searchTerm
              ? `No tables match "${searchTerm}". Check the spelling or reset filter.`
              : 'Add tables to generate QR codes for customer self-ordering.'}
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
            >
              <Plus size={15} />
              <span>Add First Table</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT TABLE */}
      {/* ========================================================= */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="font-serif font-black text-slate-900 text-lg">
                  {editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Add New Restaurant Table'}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Server automatically generates immutable QR code on creation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTableModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-slate-800 rounded-lg hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Table Number or Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1, 02, T-14, Patio A"
                  value={tableForm.tableNumber}
                  onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                  className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all ${
                    formErrors.tableNumber ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200'
                  }`}
                />
                {formErrors.tableNumber && (
                  <p className="text-[10px] font-semibold text-rose-500 mt-1">{formErrors.tableNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Seating Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all ${
                      formErrors.capacity ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200'
                    }`}
                  />
                  {formErrors.capacity && (
                    <p className="text-[10px] font-semibold text-rose-500 mt-1">{formErrors.capacity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Status
                  </label>
                  <select
                    value={tableForm.status}
                    onChange={(e) => setTableForm({ ...tableForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Table Active on Floor</span>
                  <span className="text-[10px] text-stone-400 block">
                    Inactive tables reject new guest QR sessions.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={tableForm.isActive}
                  onChange={(e) => setTableForm({ ...tableForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <span>{editingTable ? 'Save Table Changes' : 'Create Table & QR'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QR CODE PREVIEW & PRINTABLE CARD */}
      {/* ========================================================= */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="font-serif font-black text-slate-900 text-lg">
                  Table {qrModalTable.tableNumber} QR Stand Card
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Scan to preview live customer ordering flow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalTable(null)}
                className="p-1.5 text-stone-400 hover:text-slate-800 rounded-lg hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Table Stand Card Container */}
            <div 
              id="printable-qr-card" 
              className="my-5 p-6 bg-gradient-to-b from-[#1c1917] to-[#0c0a09] text-stone-100 rounded-3xl border border-stone-800 shadow-xl text-center relative overflow-hidden"
            >
              {/* Luxury Accent border highlight */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-brand-500 to-amber-600" />

              {/* Brand Logo & Name */}
              <div className="mb-4">
                <span className="font-serif font-black text-xl tracking-tight text-white block">
                  {restaurantName}
                </span>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mt-0.5">
                  Dine-In Self Ordering
                </span>
              </div>

              {/* Table Number Badge */}
              <div className="inline-block mb-4 px-4 py-1 rounded-full bg-stone-800/90 border border-stone-700/80">
                <span className="text-sm font-black tracking-wide text-white">
                  TABLE {qrModalTable.tableNumber}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-2xl flex items-center justify-center">
                {qrModalTable.qrCodeUrl ? (
                  <img
                    src={qrModalTable.qrCodeUrl}
                    alt={`Table ${qrModalTable.tableNumber} QR Code`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode size={64} className="text-stone-300" />
                )}
              </div>

              {/* Scan Instructions */}
              <div className="mt-4 max-w-xs mx-auto">
                <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Scan with your phone camera</span>
                </p>
                <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                  Browse our chef-crafted menu, customize your order, and track kitchen preparation in real-time.
                </p>
              </div>

              {/* Card Footer Tag */}
              <div className="mt-5 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[9px] text-stone-400">
                <span>DineFlow Touchless QR</span>
                <span>Powered by Bistro OS</span>
              </div>
            </div>

            {/* Target Customer URL Link */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Customer Ordering URL
                </span>
                <span className="text-xs font-mono text-slate-700 truncate block mt-0.5">
                  {getCustomerUrl(qrModalTable)}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyLink(qrModalTable)}
                  className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-slate-900 shadow-2xs transition-colors"
                  title="Copy link"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
                <a
                  href={getCustomerUrl(qrModalTable)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-slate-900 shadow-2xs transition-colors"
                  title="Open in new tab to test customer flow"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleDownloadQR(qrModalTable)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold transition-colors"
              >
                <Download size={14} />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCard}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold shadow-xs transition-all"
              >
                <Printer size={14} />
                <span>Print Table Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Delete Table {deleteConfirm.tableNumber}?
            </h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              This will archive Table {deleteConfirm.tableNumber}. Active guest sessions or QR scans for this table will be rejected.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {deleting ? <RefreshCw size={13} className="animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
