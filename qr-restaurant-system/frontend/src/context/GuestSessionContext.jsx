import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sessionApi } from "../api/sessionApi";
import { tableApi } from "../api/tableApi";

const GuestSessionContext = createContext(null);

const SESSION_TOKEN_KEY = "guest_session_token";
const SESSION_DATA_KEY = "guest_session_data";

/**
 * Deterministic helper to scope cart storage per restaurant and table.
 * Prevents cart data from leaking across different restaurants or tables.
 */
const getCartStorageKey = (restaurantId, tableId) => {
  if (!restaurantId || !tableId) return null;
  return `dineflow_cart_${restaurantId}_${tableId}`;
};

/**
 * Deterministic cart line-item identity generator.
 * Items with differing notes or extras are kept as distinct cart lines.
 */
export const getCartLineItemId = (menuItemId, notes = "", extras = []) => {
  const cleanNotes = (notes || "").trim().toLowerCase();
  const cleanExtras = (extras || [])
    .map((e) => (typeof e === "string" ? e : e.id || e.name || ""))
    .sort()
    .join("|");
  return `${menuItemId}__n:${cleanNotes}__e:${cleanExtras}`;
};

export const GuestSessionProvider = ({ children, initialRestaurantId = null, initialTableId = null }) => {
  const [restaurantId, setRestaurantId] = useState(initialRestaurantId);
  const [tableId, setTableId] = useState(initialTableId);
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(SESSION_TOKEN_KEY));
  const [expiresAt, setExpiresAt] = useState(null);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [status, setStatus] = useState("idle"); // 'idle' | 'initializing' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);

  // Ref to prevent duplicate concurrent initializations (e.g. React StrictMode)
  const isInitializingRef = useRef(false);
  const activeSessionTargetRef = useRef("");

  /**
   * Safely load cart from localStorage for a specific restaurant and table.
   */
  const loadCartFromStorage = useCallback((targetRestaurantId, targetTableId) => {
    const key = getCartStorageKey(targetRestaurantId, targetTableId);
    if (!key) return [];
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Validate cart item schema
        return parsed.filter(
          (item) => item && item.menuItemId && typeof item.price === "number" && item.quantity > 0
        );
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  /**
   * Safely save cart to localStorage.
   */
  const persistCartToStorage = useCallback((targetRestaurantId, targetTableId, updatedCart) => {
    const key = getCartStorageKey(targetRestaurantId, targetTableId);
    if (!key) return;
    try {
      if (updatedCart && updatedCart.length > 0) {
        localStorage.setItem(key, JSON.stringify(updatedCart));
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error("[GuestSession] Failed to persist cart:", e);
    }
  }, []);

  /**
   * Clear session tokens and cached session metadata from storage.
   */
  const clearSessionStorage = useCallback(() => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_DATA_KEY);
  }, []);

  /**
   * Initialize or resume a guest session.
   * Handles 5 key states:
   * 1. Resuming existing non-expired session for same restaurant & table
   * 2. Detecting expired or invalid session and recreating it
   * 3. Detecting restaurant/table mismatch and starting fresh
   * 4. Validating restaurant & table existence via public API
   * 5. Loading scoped cart data safely
   */
  const initSession = useCallback(
    async (targetRestaurantId, targetTableId, forceNew = false) => {
      if (!targetRestaurantId || !targetTableId) {
        setStatus("error");
        setError("Restaurant ID and Table ID are required to start ordering.");
        return { success: false, error: "Missing parameters" };
      }

      const targetKey = `${targetRestaurantId}::${targetTableId}`;

      // Prevent concurrent duplicate executions in React StrictMode
      if (isInitializingRef.current && activeSessionTargetRef.current === targetKey && !forceNew) {
        return { success: true, inProgress: true };
      }

      isInitializingRef.current = true;
      activeSessionTargetRef.current = targetKey;
      setStatus("initializing");
      setError(null);

      try {
        // 1. Verify restaurant & table existence publicly
        const tableCheckRes = await tableApi.verifyTable(targetRestaurantId, targetTableId);
        const verification = tableCheckRes.data?.data;
        if (!verification || !verification.isValid) {
          throw new Error("Invalid or inactive restaurant or table QR code.");
        }

        const freshRestaurantInfo = verification.restaurant;
        const freshTableInfo = verification.table;

        setRestaurantId(targetRestaurantId);
        setTableId(targetTableId);
        setRestaurantInfo(freshRestaurantInfo);
        setTableInfo(freshTableInfo);

        // 2. Check for an existing persisted session to resume
        let existingToken = localStorage.getItem(SESSION_TOKEN_KEY);
        let existingData = null;
        try {
          const rawData = localStorage.getItem(SESSION_DATA_KEY);
          if (rawData) existingData = JSON.parse(rawData);
        } catch {
          existingData = null;
        }

        const canResume =
          !forceNew &&
          existingToken &&
          existingData &&
          existingData.restaurantId === targetRestaurantId &&
          existingData.tableId === targetTableId &&
          existingData.expiresAt &&
          new Date(existingData.expiresAt) > new Date();

        if (canResume) {
          try {
            // Validate the token against backend status endpoint
            const statusRes = await sessionApi.getSessionStatus();
            const sessionData = statusRes.data?.data;

            if (sessionData && sessionData.active) {
              // Session is confirmed valid by the server
              setSessionToken(existingToken);
              setExpiresAt(sessionData.expiresAt);
              setActiveOrderId(sessionData.activeOrderId || null);

              // Restore cart for this restaurant and table
              const restoredCart = loadCartFromStorage(targetRestaurantId, targetTableId);
              setCart(restoredCart);

              setStatus("ready");
              return { success: true, resumed: true };
            }
          } catch (statusErr) {
            // Status check failed (e.g. 401 session expired on server) -> clear stale storage
            console.warn("[GuestSession] Persisted session invalid or expired. Re-initializing...", statusErr);
            clearSessionStorage();
            existingToken = null;
          }
        }

        // 3. Initialize a brand new session with backend
        clearSessionStorage();
        const initRes = await sessionApi.initSession({
          restaurantId: targetRestaurantId,
          tableId: targetTableId,
        });

        const newSession = initRes.data?.data;
        if (!newSession || !newSession.sessionToken) {
          throw new Error("Server failed to issue a valid guest session token.");
        }

        // Persist token and session metadata
        localStorage.setItem(SESSION_TOKEN_KEY, newSession.sessionToken);
        localStorage.setItem(
          SESSION_DATA_KEY,
          JSON.stringify({
            sessionToken: newSession.sessionToken,
            restaurantId: targetRestaurantId,
            tableId: targetTableId,
            expiresAt: newSession.expiresAt,
            activeOrderId: null,
          })
        );

        setSessionToken(newSession.sessionToken);
        setExpiresAt(newSession.expiresAt);
        setActiveOrderId(null);

        // Load or reset scoped cart for this restaurant and table
        const initialCart = loadCartFromStorage(targetRestaurantId, targetTableId);
        setCart(initialCart);

        setStatus("ready");
        return { success: true, resumed: false };
      } catch (err) {
        console.error("[GuestSession] Session initialization error:", err);
        const errorMessage =
          err.response?.data?.message || err.message || "Failed to establish guest ordering session.";
        setError(errorMessage);
        setStatus("error");
        return { success: false, error: errorMessage };
      } finally {
        isInitializingRef.current = false;
      }
    },
    [clearSessionStorage, loadCartFromStorage]
  );

  /**
   * Switch active table within the same restaurant.
   */
  const switchTable = useCallback(
    async (newTableId) => {
      try {
        const res = await sessionApi.switchTable({ newTableId });
        const result = res.data?.data;

        // Update context and persisted session
        setTableId(newTableId);
        const stored = localStorage.getItem(SESSION_DATA_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.tableId = newTableId;
            localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(parsed));
          } catch (e) {
            console.error("[GuestSession] Error updating stored table:", e);
          }
        }

        // Migrate cart to new table key if items exist
        if (cart.length > 0 && restaurantId) {
          persistCartToStorage(restaurantId, newTableId, cart);
        }

        return { success: true, data: result };
      } catch (err) {
        const message = err.response?.data?.message || "Failed to switch table.";
        return { success: false, error: message };
      }
    },
    [cart, restaurantId, persistCartToStorage]
  );

  /**
   * Add item to cart, accounting for modifiers/notes to maintain distinct line-item identity.
   */
  const addToCart = useCallback(
    (item, quantity = 1, notes = "", extras = []) => {
      const sanitizedQuantity = Math.max(1, Math.floor(quantity) || 1);
      const menuItemId = item._id || item.id;
      const lineItemId = getCartLineItemId(menuItemId, notes, extras);

      setCart((prevCart) => {
        let updatedCart;
        const existingIndex = prevCart.findIndex((i) => i.lineItemId === lineItemId);

        if (existingIndex > -1) {
          updatedCart = prevCart.map((cartItem, idx) =>
            idx === existingIndex
              ? { ...cartItem, quantity: cartItem.quantity + sanitizedQuantity }
              : cartItem
          );
        } else {
          const newCartItem = {
            lineItemId,
            menuItemId,
            name: item.name,
            price: Number(item.price) || 0,
            imageUrl: item.imageUrl || "",
            quantity: sanitizedQuantity,
            notes: (notes || "").trim(),
            extras: Array.isArray(extras) ? extras : [],
          };
          updatedCart = [...prevCart, newCartItem];
        }

        if (restaurantId && tableId) {
          persistCartToStorage(restaurantId, tableId, updatedCart);
        }
        return updatedCart;
      });
    },
    [restaurantId, tableId, persistCartToStorage]
  );

  /**
   * Update quantity of a line item. Removes item if quantity <= 0.
   */
  const updateQuantity = useCallback(
    (lineItemId, quantity) => {
      const sanitizedQuantity = Math.floor(quantity);
      setCart((prevCart) => {
        let updatedCart;
        if (sanitizedQuantity <= 0) {
          updatedCart = prevCart.filter((item) => item.lineItemId !== lineItemId);
        } else {
          updatedCart = prevCart.map((item) =>
            item.lineItemId === lineItemId ? { ...item, quantity: sanitizedQuantity } : item
          );
        }

        if (restaurantId && tableId) {
          persistCartToStorage(restaurantId, tableId, updatedCart);
        }
        return updatedCart;
      });
    },
    [restaurantId, tableId, persistCartToStorage]
  );

  /**
   * Remove a line item completely from the cart.
   */
  const removeFromCart = useCallback(
    (lineItemId) => {
      setCart((prevCart) => {
        const updatedCart = prevCart.filter((item) => item.lineItemId !== lineItemId);
        if (restaurantId && tableId) {
          persistCartToStorage(restaurantId, tableId, updatedCart);
        }
        return updatedCart;
      });
    },
    [restaurantId, tableId, persistCartToStorage]
  );

  /**
   * Empty the cart and remove its persisted record.
   */
  const clearCart = useCallback(() => {
    setCart([]);
    if (restaurantId && tableId) {
      persistCartToStorage(restaurantId, tableId, []);
    }
  }, [restaurantId, tableId, persistCartToStorage]);

  /**
   * Derived cart financial totals.
   * Client totals are strictly for UX display; final pricing is computed authoritatively by backend.
   */
  const cartTotals = useMemo(() => {
    const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 0), 0);

    // Backend Restaurant model defines settings.taxRate, with fallback to settings.taxPercentage
    const effectiveTaxRate = Number(restaurantInfo?.settings?.taxRate ?? restaurantInfo?.settings?.taxPercentage) || 0;
    const tax = effectiveTaxRate > 0 ? (subtotal * effectiveTaxRate) / 100 : 0;
    const grandTotal = subtotal + tax;

    return {
      totalCount,
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }, [cart, restaurantInfo]);

  // Expose restaurant currency with default fallback to PKR
  const currency = restaurantInfo?.settings?.currency || "PKR";

  return (
    <GuestSessionContext.Provider
      value={{
        restaurantId,
        tableId,
        sessionToken,
        expiresAt,
        restaurantInfo,
        tableInfo,
        currency,
        activeOrderId,
        setActiveOrderId,
        status,
        error,
        isLoading: status === "initializing",
        isReady: status === "ready",
        initSession,
        switchTable,
        clearSession: clearSessionStorage,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotals,
      }}
    >
      {children}
    </GuestSessionContext.Provider>
  );
};

export const useGuestSession = () => {
  const context = useContext(GuestSessionContext);
  if (!context) {
    throw new Error("useGuestSession must be used within a GuestSessionProvider");
  }
  return context;
};

