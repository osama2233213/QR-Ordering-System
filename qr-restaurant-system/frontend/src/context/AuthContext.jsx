import React, { createContext, useContext, useState, useEffect } from "react";

import { authApi } from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const getInitialToken = () => {
    const isDevGate = typeof window !== 'undefined' && window.location.pathname.startsWith('/devgate');
    return isDevGate
      ? (localStorage.getItem("devgate_token") || localStorage.getItem("token"))
      : (localStorage.getItem("admin_token") || localStorage.getItem("token"));
  };

  const [token, setToken] = useState(getInitialToken);

  const [isLoading, setIsLoading] = useState(Boolean(getInitialToken()));

  const [error, setError] = useState(null);

  // Rehydrate authenticated user on initial page load / refresh
  useEffect(() => {
    const isDevGate = window.location.pathname.startsWith('/devgate');
    const storedToken = isDevGate
      ? (localStorage.getItem("devgate_token") || localStorage.getItem("token"))
      : (localStorage.getItem("admin_token") || localStorage.getItem("token"));

    if (storedToken) {
      setIsLoading(true);
      authApi
        .getMe()
        .then((res) => {
          const userData = res.data?.data;
          if (userData) {
            setUser(userData);
            setToken(storedToken);
            if (userData.role === 'devgate_admin') {
              localStorage.setItem("devgate_token", storedToken);
              localStorage.setItem("devgate_user", JSON.stringify(userData));
            } else {
              localStorage.setItem("admin_token", storedToken);
              localStorage.setItem("admin_user", JSON.stringify(userData));
            }
          }
        })
        .catch((err) => {
          console.warn("[AuthContext] Token expired or invalid. Clearing zone session.", err.message);
          setUser(null);
          setToken(null);
          if (isDevGate) {
            localStorage.removeItem("devgate_token");
            localStorage.removeItem("devgate_user");
          } else {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
          }
          localStorage.removeItem("token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  }, []);

  // Store login data with zone separation
  const setAuthData = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);

    if (userData.role === 'devgate_admin') {
      localStorage.setItem("devgate_token", authToken);
      localStorage.setItem("devgate_user", JSON.stringify(userData));
    } else {
      localStorage.setItem("admin_token", authToken);
      localStorage.setItem("admin_user", JSON.stringify(userData));
    }

    setError(null);
  };

  /**
   * Login existing user
   */
  const login = async (email, password) => {
    setIsLoading(true);

    setError(null);

    try {
      const response = await authApi.login({
        email,
        password,
      });

      const { token: newToken, user: userData } = response.data.data;

      // Save JWT + user
      setAuthData(userData, newToken);

      return {
        success: true,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || "Login failed. Please try again.";

      setError(message);

      return {
        success: false,
        message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register restaurant admin
   *
   * IMPORTANT:
   * Registration does NOT login user.
   * Restaurant remains pending.
   */
  const register = async (formData) => {
    setIsLoading(true);

    setError(null);

    try {
      const response = await authApi.register(formData);

      const restaurant = response.data.data.restaurant;

      return {
        success: true,

        message: "Registration submitted. Waiting for DevGate approval.",

        restaurant,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || "Registration failed. Please try again.";

      setError(message);

      return {
        success: false,

        message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (zone = null) => {
    const isDevGate = zone === 'devgate' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/devgate'));
    if (isDevGate) {
      localStorage.removeItem("devgate_token");
      localStorage.removeItem("devgate_user");
    } else {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    }
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,

        token,

        isLoading,

        error,

        login,

        register,

        logout,

        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
