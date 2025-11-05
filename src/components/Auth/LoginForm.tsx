import React, { useState, useEffect } from 'react';
import clothesPattern from './clothes_icon_background.jpg';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff,  ArrowRight } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // no-op; we now use a provided image pattern for background

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const success = await login(email, password);
      if (!success) {
        throw new Error('Invalid email or password');
      }
      
      // Handle remember me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }
      
      // Add success animation delay before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6" style={{ backgroundColor: '#f9fafb' }}>
      {/* Apparel doodles image background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `url(${clothesPattern})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        opacity: 1,
        zIndex: 0
      }}></div>
      {/* Soft overlay to keep the content readable */}
      <div className="absolute inset-0" style={{
        background: 'rgba(255,255,255,0.72)',
        zIndex: 0.5 as unknown as number
      }}></div>
      
      <div className="relative w-full max-w-xl" style={{ zIndex: 1 }}>
        {/* Clean white card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <span className="text-indigo-600 font-bold">A</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Welcome to Ajio Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to manage your account</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  placeholder="e.g John_Doe"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 placeholder-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 placeholder-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-green-800 text-white font-medium py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden"
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
              {/* Ripple effect overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              )}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button className="text-indigo-600 hover:text-indigo-700 font-medium">Contact administrator</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
