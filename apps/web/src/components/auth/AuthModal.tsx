import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signUpWithEmail,
  } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setSuccessMessage('Account created! Please check your email to confirm registration or sign in.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FAF7F5] rounded-3xl border border-[#2F3020]/20 shadow-2xl p-6 sm:p-8 text-[#2F3020] space-y-6">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-[#2F3020]/60 hover:text-[#2F3020] rounded-full hover:bg-black/5 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#16A34A]/10 border border-[#16A34A]/25 mb-1">
            <img src="/capzee-icon.png" alt="Capzee" className="w-7 h-7 object-contain" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#2F3020]">
            {mode === 'signin' ? 'Welcome Back to Capzee' : 'Create Your Capzee Account'}
          </h2>
          <p className="text-xs text-[#2F3020]/65">
            {mode === 'signin'
              ? 'Sign in to access your video captioning studio'
              : 'Sign up to start creating viral captioned reels & shorts'}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* OAuth Buttons: Google & GitHub */}
        <div className="space-y-2.5">
          {/* Google Sign In */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full h-11 px-4 bg-white hover:bg-[#CDCBD6]/30 text-[#2F3020] font-semibold text-xs rounded-xl border border-[#2F3020]/20 shadow-2xs hover:border-[#2F3020]/40 transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>

          {/* GitHub Sign In */}
          <button
            onClick={() => handleOAuth('github')}
            disabled={loading}
            className="w-full h-11 px-4 bg-[#2F3020] hover:bg-[#1E1F15] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-[#2F3020]/15" />
          <span className="absolute bg-[#FAF7F5] px-3 text-[10px] uppercase font-mono tracking-wider text-[#2F3020]/50">
            or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#2F3020]/80">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#2F3020]/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-white border border-[#2F3020]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#2F3020] placeholder-[#2F3020]/40 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#2F3020]/80">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#2F3020]/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[#2F3020]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#2F3020] placeholder-[#2F3020]/40 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-1 text-xs text-[#2F3020]/70">
          {mode === 'signin' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className="text-[#16A34A] font-bold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className="text-[#16A34A] font-bold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
