import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../shared/components/Button";

export const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle login form submission
   * Calls async login from AuthContext, manages navigation and errors
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    // Clear any previous errors
    clearError();

    // Call async login from AuthContext
    const result = await login(email, password);

    // If successful, clear form and navigate to dashboard with history replace
    if (result.success) {
      setEmail("");
      setPassword("");
      navigate("/admin/dashboard", { replace: true });
    }
    // If failed, error is already set in AuthContext (displayed below)
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full">
        <h2 className="text-2xl font-black text-slate-900">Restaurant Admin</h2>
        <p className="text-xs text-slate-400 mt-1">
          Sign in to manage kitchen display & live orders.
        </p>

        {/* Error Message Display */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {/* Email Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              placeholder="you@restaurant.com"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 transition-opacity disabled:opacity-75"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Help Text */}
        <p className="text-xs text-slate-400 mt-4 text-center">
          Don't have an account?{" "}
          <span className="text-brand-600 font-semibold cursor-pointer">
            Contact support
          </span>
        </p>
      </div>
    </div>
  );
};
