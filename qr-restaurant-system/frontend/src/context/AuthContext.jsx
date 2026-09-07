import React, { createContext, useContext, useState, useEffect } from "react";

import { authApi } from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const [isLoading, setIsLoading] = useState(Boolean(localStorage.getItem("token")));

  const [error, setError] = useState(null);

  // Rehydrate authenticated user on initial page load / refresh
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setIsLoading(true);
      authApi
        .getMe()
        .then((res) => {
          const userData = res.data?.data;
          if (userData) {
            setUser(userData);
            setToken(storedToken);
          }
        })
        .catch((err) => {
          console.warn("[AuthContext] Token expired or invalid. Clearing session.", err.message);
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Store login data only
  const setAuthData = (userData, authToken) => {
    setUser(userData);

    setToken(authToken);

    localStorage.setItem("token", authToken);

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

  const logout = () => {
    setUser(null);

    setToken(null);

    setError(null);

    localStorage.removeItem("token");
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
