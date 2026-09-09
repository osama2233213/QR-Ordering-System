import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DevGateLoginPage = () => {
  const { login, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('superadmin@devgate.internal');
  const [password, setPassword] = useState('Admin@123456');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      // Check stored user role
      const storedToken = localStorage.getItem('token');
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload.role !== 'devgate_admin') {
          logout();
          setErrorMessage('Access restricted: Only DevGate Super Administrators are authorized.');
          return;
        }
      } catch {
        // Continue
      }
      navigate('/devgate/restaurants', { replace: true });
    } else {
      setErrorMessage(result.message || 'Invalid super-admin credentials.');
    }
  };

  const handleFillDemo = () => {
    setEmail('superadmin@devgate.internal');
    setPassword('Admin@123456');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-xl">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">DevGate Control Center</h1>
          <p className="text-xs text-slate-400 mt-1">DineFlow Multi-Tenant SaaS Platform Operations</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Super-Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@devgate.internal"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting || isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Authenticate to DevGate <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo Helper Pill */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles size={14} className="text-indigo-400" />
              <span>Fill Seeded Super-Admin Credentials</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            ← Back to DineFlow Development Launchpad
          </Link>
        </div>
      </div>
    </div>
  );
};
