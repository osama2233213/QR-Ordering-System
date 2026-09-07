import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FolderPlus,
  RefreshCw,
  Power
} from 'lucide-react';
import { menuApi } from '../../api/menuApi';
import { useAuth } from '../../context/AuthContext';
import socketClient from '../../sockets/socketClient';

const FALLBACK_DISH_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

export const MenuManagementPage = () => {
  const { user } = useAuth();
  const currency = user?.restaurant?.settings?.currency || 'PKR';
  const restaurantId = user?.restaurantId || user?.restaurant?._id;

  // Data states
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // ALL, AVAILABLE, 86

  // UI / Modals states
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null); // null = create mode
  const [dishForm, setDishForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    preparationTimeMinutes: 15,
    description: '',
    imageUrl: '',
    isAvailable: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submittingDish, setSubmittingDish] = useState(false);

  // Category Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    displayOrder: 0,
  });
  const [submittingCategory, setSubmittingCategory] = useState(false);

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'dish'|'category', id, name }
  const [deleting, setDeleting] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch all categories and menu items
  const loadMenuData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [catRes, itemsRes] = await Promise.all([
        menuApi.getCategories({ isActive: true }),
        menuApi.getMenuItems(),
      ]);

      const catList = catRes.data?.data || [];
      const itemList = itemsRes.data?.data || [];

      setCategories(catList);
      setMenuItems(itemList);
    } catch (err) {
      console.error('[MenuManagement] Failed to load menu data:', err);
      showToast('Failed to load menu data. Please refresh.', 'error');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuData(true);
  }, []);

  // Socket.IO real-time menu sync
  useEffect(() => {
    if (!restaurantId) return;

    const socket = socketClient.connect();
    socketClient.joinRestaurantRoom(restaurantId);

    const handleMenuUpdate = () => {
      // Silently refresh items & categories
      loadMenuData(false);
    };

    socket.on('menu:updated', handleMenuUpdate);

    return () => {
      socket.off('menu:updated', handleMenuUpdate);
    };
  }, [restaurantId]);

  // Dish count per category
  const categoryCounts = useMemo(() => {
    const counts = { ALL: menuItems.length };
    categories.forEach((cat) => {
      counts[cat._id] = 0;
    });
    menuItems.forEach((item) => {
      const cId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
      if (cId && counts[cId] !== undefined) {
        counts[cId] += 1;
      }
    });
    return counts;
  }, [categories, menuItems]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return menuItems.filter((dish) => {
      // Category filter
      if (activeCategory !== 'ALL') {
        const cId = typeof dish.categoryId === 'object' ? dish.categoryId?._id : dish.categoryId;
        if (cId !== activeCategory) return false;
      }

      // Availability filter
      if (availabilityFilter === 'AVAILABLE' && !dish.isAvailable) return false;
      if (availabilityFilter === '86' && dish.isAvailable) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = dish.name?.toLowerCase().includes(query);
        const matchesDesc = dish.description?.toLowerCase().includes(query);
        return matchesName || matchesDesc;
      }

      return true;
    });
  }, [menuItems, activeCategory, availabilityFilter, searchTerm]);

  // -------------------------------------------------------------
  // 86 Availability Toggle Handler
  // -------------------------------------------------------------
  const handleToggleAvailability = async (dish) => {
    const newStatus = !dish.isAvailable;

    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((item) =>
        item._id === dish._id ? { ...item, isAvailable: newStatus } : item
      )
    );

    try {
      await menuApi.updateAvailability(dish._id, newStatus);
      showToast(
        newStatus
          ? `"${dish.name}" is now Available on customer menus`
          : `"${dish.name}" is 86'd — hidden from customer menus`,
        newStatus ? 'success' : 'error'
      );
    } catch (err) {
      console.error('[MenuManagement] Availability toggle error:', err);
      showToast('Failed to update availability. Reverting change.', 'error');
      // Rollback
      setMenuItems((prev) =>
        prev.map((item) =>
          item._id === dish._id ? { ...item, isAvailable: dish.isAvailable } : item
        )
      );
    }
  };

  // -------------------------------------------------------------
  // Dish Form Actions (Add / Edit)
  // -------------------------------------------------------------
  const handleOpenAddDish = () => {
    setEditingDish(null);
    setDishForm({
      name: '',
      categoryId: categories.length > 0 ? categories[0]._id : '',
      price: '',
      preparationTimeMinutes: 15,
      description: '',
      imageUrl: '',
      isAvailable: true,
    });
    setFormErrors({});
    setDishModalOpen(true);
  };

  const handleOpenEditDish = (dish) => {
    setEditingDish(dish);
    const cId = typeof dish.categoryId === 'object' ? dish.categoryId?._id : dish.categoryId;
    setDishForm({
      name: dish.name || '',
      categoryId: cId || '',
      price: dish.price !== undefined ? dish.price : '',
      preparationTimeMinutes: dish.preparationTimeMinutes || 15,
      description: dish.description || '',
      imageUrl: dish.imageUrl || '',
      isAvailable: dish.isAvailable !== false,
    });
    setFormErrors({});
    setDishModalOpen(true);
  };

  const validateDishForm = () => {
    const errs = {};
    if (!dishForm.name.trim()) errs.name = 'Dish name is required';
    if (!dishForm.categoryId) errs.categoryId = 'Please select a category';
    if (dishForm.price === '' || isNaN(dishForm.price) || Number(dishForm.price) < 0) {
      errs.price = 'Please enter a valid non-negative price';
    }
    if (dishForm.preparationTimeMinutes && Number(dishForm.preparationTimeMinutes) < 1) {
      errs.preparationTimeMinutes = 'Prep time must be at least 1 minute';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDish = async (e) => {
    e.preventDefault();
    if (!validateDishForm()) return;

    setSubmittingDish(true);
    const payload = {
      name: dishForm.name.trim(),
      categoryId: dishForm.categoryId,
      price: Number(dishForm.price),
      preparationTimeMinutes: Number(dishForm.preparationTimeMinutes) || 15,
      description: dishForm.description.trim(),
      imageUrl: dishForm.imageUrl.trim(),
    };

    try {
      if (editingDish) {
        // Update
        const res = await menuApi.updateMenuItem(editingDish._id, payload);
        const updated = res.data?.data;
        setMenuItems((prev) =>
          prev.map((item) => (item._id === editingDish._id ? updated : item))
        );
        showToast(`"${payload.name}" updated successfully`);
      } else {
        // Create
        const res = await menuApi.createMenuItem(payload);
        const created = res.data?.data;
        setMenuItems((prev) => [created, ...prev]);
        showToast(`"${payload.name}" added to menu`);
      }
      setDishModalOpen(false);
    } catch (err) {
      console.error('[MenuManagement] Failed to save dish:', err);
      showToast(err.response?.data?.message || 'Failed to save dish', 'error');
    } finally {
      setSubmittingDish(false);
    }
  };

  // -------------------------------------------------------------
  // Category Form Actions (Add / Edit)
  // -------------------------------------------------------------
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      displayOrder: categories.length + 1,
    });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name || '',
      description: cat.description || '',
      displayOrder: cat.displayOrder || 0,
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    setSubmittingCategory(true);
    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      displayOrder: Number(categoryForm.displayOrder) || 0,
    };

    try {
      if (editingCategory) {
        const res = await menuApi.updateCategory(editingCategory._id, payload);
        const updated = res.data?.data;
        setCategories((prev) =>
          prev.map((c) => (c._id === editingCategory._id ? updated : c))
        );
        showToast(`Category "${payload.name}" updated`);
      } else {
        const res = await menuApi.createCategory(payload);
        const created = res.data?.data;
        setCategories((prev) => [...prev, created]);
        showToast(`Category "${payload.name}" created`);
      }
      setCategoryModalOpen(false);
    } catch (err) {
      console.error('[MenuManagement] Failed to save category:', err);
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Actions
  // -------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);

    try {
      if (deleteConfirm.type === 'dish') {
        await menuApi.deleteMenuItem(deleteConfirm.id);
        setMenuItems((prev) => prev.filter((item) => item._id !== deleteConfirm.id));
        showToast(`Dish "${deleteConfirm.name}" removed from menu`);
      } else if (deleteConfirm.type === 'category') {
        await menuApi.deleteCategory(deleteConfirm.id);
        setCategories((prev) => prev.filter((c) => c._id !== deleteConfirm.id));
        if (activeCategory === deleteConfirm.id) {
          setActiveCategory('ALL');
        }
        showToast(`Category "${deleteConfirm.name}" deleted`);
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error('[MenuManagement] Delete error:', err);
      showToast(err.response?.data?.message || 'Failed to delete item', 'error');
    } finally {
      setDeleting(false);
    }
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

      {/* Top Header & Command Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            <span>Menu Catalog</span>
            <span>·</span>
            <span>Live Guest QR Sync</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Menu Management</span>
            <span className="text-xs font-sans font-bold px-2.5 py-1 rounded-full bg-stone-900 text-white shadow-2xs">
              {menuItems.length} {menuItems.length === 1 ? 'Dish' : 'Dishes'}
            </span>
          </h1>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleOpenAddCategory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-slate-800 hover:bg-stone-50 active:scale-95 text-xs font-bold shadow-2xs transition-all"
          >
            <FolderPlus size={15} className="text-brand-600" />
            <span>New Category</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddDish}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add New Dish</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search dishes by name or ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Availability Filter Pills */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold text-stone-600 self-start sm:self-auto">
          {[
            { id: 'ALL', label: 'All Dishes' },
            { id: 'AVAILABLE', label: 'Available' },
            { id: '86', label: '86’d (Out)' },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setAvailabilityFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                availabilityFilter === filter.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategory('ALL')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:text-slate-900 hover:bg-stone-50'
          }`}
        >
          <span>All Items</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeCategory === 'ALL' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'
          }`}>
            {categoryCounts.ALL}
          </span>
        </button>

        {categories.map((cat) => {
          const isActive = activeCategory === cat._id;
          const count = categoryCounts[cat._id] || 0;

          return (
            <div key={cat._id} className="relative flex items-center group">
              <button
                type="button"
                onClick={() => setActiveCategory(cat._id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:text-slate-900 hover:bg-stone-50'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'
                }`}>
                  {count}
                </span>
              </button>

              {/* Edit/Delete category actions for active or hovered tab */}
              <div className="hidden group-hover:flex items-center gap-0.5 ml-1 bg-white p-0.5 rounded-lg border border-stone-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleOpenEditCategory(cat)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded"
                  title="Edit category"
                >
                  <Edit3 size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ type: 'category', id: cat._id, name: cat.name })}
                  className="p-1 text-stone-400 hover:text-rose-600 rounded"
                  title="Delete category"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dish Catalog Grid or Loading / Empty States */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-3 border border-stone-200 animate-pulse space-y-3">
              <div className="h-44 bg-stone-100 rounded-2xl w-full" />
              <div className="h-4 bg-stone-100 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-1/2" />
              <div className="h-8 bg-stone-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredDishes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDishes.map((dish) => {
            const categoryName = typeof dish.categoryId === 'object' 
              ? dish.categoryId?.name 
              : categories.find((c) => c._id === dish.categoryId)?.name || 'Dish';

            const isAvailable = dish.isAvailable !== false;

            return (
              <div
                key={dish._id}
                className={`bg-white rounded-3xl p-3.5 border transition-all flex flex-col justify-between group ${
                  isAvailable
                    ? 'border-stone-200/90 hover:border-stone-300 shadow-xs hover:shadow-sm'
                    : 'border-amber-200/80 bg-stone-50/50 shadow-2xs'
                }`}
              >
                <div>
                  {/* Fixed container image with object-cover and fallback */}
                  <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-stone-100">
                    <img
                      src={dish.imageUrl || FALLBACK_DISH_IMAGE}
                      alt={dish.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_DISH_IMAGE;
                      }}
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        !isAvailable ? 'grayscale contrast-75' : ''
                      }`}
                    />

                    {/* Category badge */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
                      {categoryName}
                    </div>

                    {/* Quick 86'd Overlay Banner */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-3 text-center">
                        <span className="px-3 py-1 rounded-xl bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg">
                          86'd · Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Price */}
                  <div className="mt-3.5 flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate flex-1 leading-snug">
                      {dish.name}
                    </h3>
                    <span className="font-serif font-black text-brand-600 text-sm whitespace-nowrap">
                      {currency} {Number(dish.price || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                    {dish.description || 'No description provided for this dish.'}
                  </p>

                  {/* Meta tag: prep time */}
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold text-stone-400">
                    <span className="flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md">
                      <Clock size={11} />
                      <span>{dish.preparationTimeMinutes || 15} min prep</span>
                    </span>
                  </div>
                </div>

                {/* Card Bottom Controls: 86 Toggle & Edit/Delete Buttons */}
                <div className="pt-3.5 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  {/* 86 Availability Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(dish)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                    title={isAvailable ? "Click to 86 (mark unavailable)" : "Click to mark Available"}
                  >
                    <Power size={12} className={isAvailable ? 'text-emerald-600' : 'text-amber-600'} />
                    <span>{isAvailable ? 'Available' : '86’d'}</span>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditDish(dish)}
                      className="p-1.5 text-stone-500 hover:text-slate-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Edit dish details"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ type: 'dish', id: dish._id, name: dish.name })}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete dish"
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
            <UtensilsCrossed size={26} strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No dishes found</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
            {searchTerm
              ? `No dishes matched "${searchTerm}". Try a different search term or clear the filter.`
              : 'This category does not have any dishes yet. Click below to add your first dish.'}
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={handleOpenAddDish}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
            >
              <Plus size={15} />
              <span>Add Dish</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT DISH */}
      {/* ========================================================= */}
      {dishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="font-serif font-black text-slate-900 text-lg">
                  {editingDish ? 'Edit Dish Details' : 'Create New Dish'}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Live menu updates synchronize instantly with customer QR devices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDishModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-slate-800 rounded-lg hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="space-y-4 mt-4">
              {/* Dish Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wagyu Ribeye Steak"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all ${
                    formErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[10px] font-semibold text-rose-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Category & Price Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Category *
                  </label>
                  <select
                    value={dishForm.categoryId}
                    onChange={(e) => setDishForm({ ...dishForm, categoryId: e.target.value })}
                    className={`w-full px-3 py-2.5 bg-stone-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all ${
                      formErrors.categoryId ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && (
                    <p className="text-[10px] font-semibold text-rose-500 mt-1">{formErrors.categoryId}</p>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all ${
                      formErrors.price ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200'
                    }`}
                  />
                  {formErrors.price && (
                    <p className="text-[10px] font-semibold text-rose-500 mt-1">{formErrors.price}</p>
                  )}
                </div>
              </div>

              {/* Prep Time & Image URL Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Prep Time */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dishForm.preparationTimeMinutes}
                    onChange={(e) => setDishForm({ ...dishForm, preparationTimeMinutes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>

                {/* Image URL */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={dishForm.imageUrl}
                    onChange={(e) => setDishForm({ ...dishForm, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Image Preview Thumbnail */}
              {dishForm.imageUrl && (
                <div className="flex items-center gap-3 p-2 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-200 flex-shrink-0">
                    <img
                      src={dishForm.imageUrl}
                      alt="Preview"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_DISH_IMAGE;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-800 block">Image Preview</span>
                    <span className="text-[10px] text-stone-400 block truncate">{dishForm.imageUrl}</span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Description & Ingredients
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe culinary preparation, allergens, and flavor profile..."
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submittingDish}
                  onClick={() => setDishModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDish}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  {submittingDish ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <span>{editingDish ? 'Save Dish Changes' : 'Create Dish'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT CATEGORY */}
      {/* ========================================================= */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="font-serif font-black text-slate-900 text-lg">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Organize dishes into customer menu sections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-slate-800 rounded-lg hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Starters & Tapas"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  placeholder="1, 2, 3..."
                  value={categoryForm.displayOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Short description of this section..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submittingCategory}
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCategory}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  {submittingCategory ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <span>{editingCategory ? 'Save Category' : 'Create Category'}</span>
                  )}
                </button>
              </div>
            </form>
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
              Delete {deleteConfirm.type === 'dish' ? 'Dish' : 'Category'}?
            </h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800">"{deleteConfirm.name}"</strong>? 
              {deleteConfirm.type === 'dish' 
                ? ' This will archive the dish and hide it from customer QR menus.' 
                : ' Categories can only be deleted if they are not actively required.'}
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
