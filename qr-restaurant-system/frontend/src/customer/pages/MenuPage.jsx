import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Utensils } from 'lucide-react';
import { CategoryPills } from '../components/CategoryPills';
import { MenuItemCard } from '../components/MenuItemCard';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { CartPill } from '../components/CartPill';
import { useGuestSession } from '../../context/GuestSessionContext';
import { menuApi } from '../../api/menuApi';
import socketClient from '../../sockets/socketClient';

export const MenuPage = () => {
  const { restaurantId, tableId } = useParams();
  const { addToCart, restaurantInfo, tableInfo } = useGuestSession();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMenu = useCallback((isInitial = false) => {
    if (!restaurantId) return;
    if (isInitial) setLoading(true);

    menuApi
      .getPublicMenu(restaurantId)
      .then((res) => {
        const menuData = res.data?.data || {};
        setCategories(menuData.categories || []);
        setItems(menuData.items || []);
        setError(null);
      })
      .catch((err) => {
        console.error('[MenuPage] Failed to fetch menu:', err);
        if (isInitial) {
          setError(err.response?.data?.message || 'Failed to load menu. Please try again.');
        }
      })
      .finally(() => {
        if (isInitial) setLoading(false);
      });
  }, [restaurantId]);

  useEffect(() => {
    fetchMenu(true);
  }, [fetchMenu]);

  // Real-time live sync: listen for menu updates (availability 86, price, items, categories)
  useEffect(() => {
    if (!restaurantId) return;

    const socket = socketClient.connect();
    socketClient.joinRestaurantRoom(restaurantId);

    const handleConnect = () => {
      socketClient.joinRestaurantRoom(restaurantId);
    };

    const handleMenuUpdated = () => {
      // Re-fetch latest menu silently without blanking the screen
      fetchMenu(false);
    };

    socket.on('connect', handleConnect);
    socket.on('menu:updated', handleMenuUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('menu:updated', handleMenuUpdated);
    };
  }, [restaurantId, fetchMenu]);

  // Filter items by selected category (null means "All Items")
  const filteredItems = selectedCat
    ? items.filter((item) => item.categoryId === selectedCat)
    : items;

  // Derive display values from restaurantInfo and tableInfo
  const restaurantName = restaurantInfo?.name || 'DineFlow Kitchen';
  const tableLabel = tableInfo?.tableNumber ? `Table ${tableInfo.tableNumber}` : `Table #${tableId || '12'}`;

  return (
    <div className="min-h-screen pb-28">
      {/* Sticky Top Header with Restaurant & Table Information */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-3">
            <h1 className="font-black text-slate-900 text-base sm:text-lg lg:text-xl truncate leading-tight tracking-tight">
              {restaurantName}
            </h1>
            <p className="text-xs sm:text-sm text-brand-600 font-semibold mt-0.5">
              {tableLabel}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold border border-emerald-100 flex-shrink-0 flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Open
          </span>
        </div>
      </header>

      {/* Main Content Area in Responsive Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Horizontal Category Filter Pills */}
        <div className="mt-3 sm:mt-5">
          <CategoryPills
            categories={categories}
            activeId={selectedCat}
            onSelect={setSelectedCat}
          />
        </div>

        {/* Main Content: Loading Skeletons, Error State, or Food Item Cards */}
        <main className="mt-4 sm:mt-6">
          {loading ? (
            // Loading Skeletons in Responsive Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-100 shadow-xs flex items-center gap-3.5 animate-pulse"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-5 bg-slate-200 rounded w-1/3 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error Message with Retry
            <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-xs mt-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                !
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Unable to Load Menu</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-brand-600 transition-colors shadow-xs"
              >
                Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            // Empty Category State
            <div className="p-10 sm:p-16 text-center bg-white rounded-3xl border border-slate-100 shadow-xs mt-2 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Utensils className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">No Dishes Available</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                There are currently no items available in this category.
              </p>
            </div>
          ) : (
            // Render Food Dish Cards in Responsive 1 / 2 / 3 Column Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item._id || item.id}
                  item={item}
                  onAdd={addToCart}
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* In-Page Item Detail Modal (Pure State, No History Push) */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />

      {/* Floating View Cart Bar */}
      <CartPill />
    </div>
  );
};
