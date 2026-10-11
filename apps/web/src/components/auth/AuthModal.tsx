import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { X, Mail, Lock, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signUpWithEmail,
  } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>(authModalMode || 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode with store when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode || 'signin');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = provider === 'google'
      ? await signInWithGoogle()
      : await signInWithGithub();

    if (res.error) {
      setErrorMessage(res.error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'signin') {
      const res = await signInWithEmail(email, password);
      if (res.error) {
        setErrorMessage(res.error);
      }
    } else {
      const res = await signUpWithEmail(email, password);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage('Account created! Please check your email to verify.');
      }
    }
    setLoading(false);
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setAuthModalMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-[340px] bg-[#FAF7F5] rounded-2xl border border-[#2F3020]/15 shadow-2xl p-5 text-[#2F3020] space-y-3.5 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Top Header: Logo & Close */}
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center gap-2">
            <img src="/capzee-icon.png" alt="Capzee" className="w-5 h-5 object-contain" />
            <span className="text-sm font-bold text-[#2F3020] tracking-tight">Capzee</span>
          </div>

          <button
            onClick={closeAuthModal}
            className="w-6 h-6 rounded-md text-[#2F3020]/45 hover:text-[#2F3020] hover:bg-[#2F3020]/10 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Segmented Tab Switcher */}
        <div className="flex p-0.5 bg-[#2F3020]/6 rounded-xl border border-[#2F3020]/8">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-[#2F3020] font-bold shadow-2xs border border-[#2F3020]/10'
                : 'text-[#2F3020]/60 hover:text-[#2F3020]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-[#2F3020] font-bold shadow-2xs border border-[#2F3020]/10'
                : 'text-[#2F3020]/60 hover:text-[#2F3020]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] leading-snug flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-snug flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-[#16A34A] mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Uniform Social Logins (Google & GitHub) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="h-9 px-3 bg-white hover:bg-[#FAF7F5] active:bg-stone-100 text-[#2F3020] font-medium text-xs rounded-xl border border-[#2F3020]/15 shadow-2xs hover:border-[#2F3020]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            title="Continue with Google"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google</span>
          </button>

          {/* GitHub */}
          <button
            type="button"
            onClick={() => handleOAuth('github')}
            disabled={loading}
            className="h-9 px-3 bg-white hover:bg-[#FAF7F5] active:bg-stone-100 text-[#2F3020] font-medium text-xs rounded-xl border border-[#2F3020]/15 shadow-2xs hover:border-[#2F3020]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            title="Continue with GitHub"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0 fill-[#2F3020]" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Minimal Divider */}
        <div className="relative flex items-center justify-center py-0.5">
          <div className="w-full border-t border-[#2F3020]/10" />
          <span className="absolute bg-[#FAF7F5] px-2 text-[10px] text-[#2F3020]/45 font-medium">
            or with email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#2F3020]/80 block">Email</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#2F3020]/40 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-9.5 bg-white border border-[#2F3020]/18 rounded-xl pl-10 pr-3 text-xs text-[#2F3020] placeholder:text-[#2F3020]/35 focus:outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#2F3020]/80 block">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#2F3020]/40 absolute left-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9.5 bg-white border border-[#2F3020]/18 rounded-xl pl-10 pr-3 text-xs text-[#2F3020] placeholder:text-[#2F3020]/35 focus:outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20 transition-all"
              />
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-9.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        {/* Clean Footer Link */}
        <p className="text-center text-[11px] text-[#2F3020]/60 pt-0.5">
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-[#16A34A] font-bold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-[#16A34A] font-bold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </p>

      </div>
    </div>
  );
}
