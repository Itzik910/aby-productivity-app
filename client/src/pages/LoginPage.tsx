import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { Eye, EyeOff, Mail, Lock, LogIn, ArrowLeft, ChevronLeft } from 'lucide-react';
import MobileAuthShell from '../components/mobile/MobileAuthShell';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading, error, isAuthenticated } = useAuthStore();
  const maybeAutoStart = useOnboardingStore((s) => s.maybeAutoStart);
  const navigate = useNavigate();
  const location = useLocation();

  console.log('[LOGIN PAGE] Current location:', location.pathname);
 
 // Redirect authenticated users to dashboard
 React.useEffect(() => {
   if (isAuthenticated) {
     console.log('[LOGIN PAGE] User already authenticated, redirecting to dashboard');
     navigate('/dashboard', { replace: true });
   }
 }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[LOGIN PAGE] Form submitted with data:', { email: email, password: '***' });
    
    if (!validateForm()) return;
    
    try {
      console.log('[LOGIN PAGE] Calling login function...');
      await login(email, password);
      console.log('[LOGIN PAGE] Login successful, navigating to dashboard');
      console.log('[LOGIN PAGE] Current location before navigate:', location.pathname);
      maybeAutoStart();
      navigate('/dashboard');
      console.log('[LOGIN PAGE] Navigation to dashboard called');
      // Check if navigation actually happened
      setTimeout(() => {
        console.log('[LOGIN PAGE] Location after navigate (delayed check):', window.location.pathname);
      }, 100);
    } catch (error) {
      console.error('[LOGIN PAGE] Login failed in handleSubmit catch block:', error);
    }
  };

  return (
    <>
      <MobileAuthShell>
        <button
          onClick={() => navigate('/')}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-white/[.18] text-white"
        >
          <ChevronLeft className="rtl-flip h-[18px] w-[18px]" />
        </button>
        <h1 className="mt-5 text-[26px] font-extrabold text-white">{t('mobile.auth.signinTitle')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('mobile.auth.signinSub')}</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
          {error && <p className="text-sm font-medium text-red-300">{error}</p>}
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-white/55">{t('mobile.auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-[52px] w-full rounded-2xl border border-white/[.16] bg-white/[.07] px-4 text-[15px] font-medium text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-white/55">{t('mobile.auth.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-[52px] w-full rounded-2xl border border-white/[.16] bg-white/[.07] px-4 text-[15px] font-medium text-white outline-none"
            />
          </label>
          <Link to="/forgot-password" className="self-start text-[13px] font-bold text-[#A79BFF]">
            {t('mobile.auth.forgotPassword')}
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 flex h-14 w-full items-center justify-center rounded-2xl text-[16px] font-extrabold text-white shadow-[0_16px_34px_-16px_rgba(124,92,255,.9)] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7C5CFF,#4436C6)' }}
          >
            {isLoading ? '…' : t('mobile.auth.signinCta')}
          </button>
          <div className="my-0.5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/[.14]" />
            <span className="text-[11.5px] font-semibold text-white/45">{t('mobile.auth.or')}</span>
            <span className="h-px flex-1 bg-white/[.14]" />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="h-[50px] w-full rounded-2xl bg-white text-sm font-bold text-aby-ink"
          >
            {t('mobile.auth.apple')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="h-[50px] w-full rounded-2xl border border-white/[.18] text-sm font-bold text-white"
          >
            {t('mobile.auth.google')}
          </button>
          <p className="mt-1 text-center text-[11.5px] leading-relaxed text-white/40">{t('mobile.auth.noAccount')}</p>
        </form>
      </MobileAuthShell>

      <div className="hidden md:flex auth-page min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your ABY account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Global Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-500"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-purple-600 hover:text-purple-500 font-semibold"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
      </div>
    </>
  );
};

export default LoginPage;