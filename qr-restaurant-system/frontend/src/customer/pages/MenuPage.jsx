import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Utensils } from 'lucide-react';
import { CategoryPills } from '../components/CategoryPills';
import { MenuItemCard } from '../components/MenuItemCard';
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
    <div className="pb-28">
      {/* Sticky Top Header with Restaurant & Table Information */}
      <header className="p-4 bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-3">
            <h1 className="font-bold text-slate-900 text-base truncate leading-tight">
              {restaurantName}
            </h1>
            <p className="text-xs text-brand-600 font-semibold mt-0.5">
              {tableLabel}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 flex-shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Open
          </span>
        </div>
      </header>

      {/* Horizontal Category Filter Pills */}
      <div className="px-4 mt-3">
        <CategoryPills
          categories={categories}
          activeId={selectedCat}
          onSelect={setSelectedCat}
        />
      </div>

      {/* Main Content: Loading Skeletons, Error State, or Food Item Cards */}
      <main className="p-4 space-y-3">
        {loading ? (
          // Loading Skeletons
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs flex items-center gap-3.5 animate-pulse"
            >
              <div className="w-24 h-24 bg-slate-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-5 bg-slate-200 rounded w-1/3 mt-2" />
              </div>
            </div>
          ))
        ) : error ? (
          // Error Message with Retry
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs mt-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
              !
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Unable to Load Menu</h3>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition-colors shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          // Empty Category State
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 shadow-xs mt-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Utensils className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">No Dishes Available</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              There are currently no items available in this category.
            </p>
          </div>
        ) : (
          // Render Food Dish Cards
          filteredItems.map((item) => (
            <MenuItemCard
              key={item._id || item.id}
              item={item}
              onAdd={addToCart}
            />
          ))
        )}
      </main>

      {/* Floating View Cart Bar */}
      <CartPill />
    </div>
  );
};
