import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LogOut, LogIn, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { user, openAuthModal, signOut } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal('signin')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#2F3020] font-bold text-xs border border-[#2F3020]/20 shadow-2xs hover:border-[#16A34A] transition-all cursor-pointer"
        id="header-sign-in-btn"
      >
        <LogIn className="w-3.5 h-3.5 text-[#16A34A]" />
        <span>Sign In</span>
      </button>
    );
  }

  const email = user.email || 'User';
  const avatarUrl = user.user_metadata?.avatar_url;
  const initial = email[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/90 hover:bg-white border border-[#2F3020]/20 shadow-2xs hover:border-[#16A34A] transition-all cursor-pointer text-[#2F3020]"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={email} className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white font-bold text-[10px] flex items-center justify-center">
            {initial}
          </div>
        )}
        <span className="text-xs font-semibold max-w-[120px] truncate hidden sm:inline">{email}</span>
        <ChevronDown className="w-3 h-3 text-[#2F3020]/60" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#FAF7F5] border border-[#2F3020]/20 rounded-2xl shadow-xl p-2 z-50 text-[#2F3020] space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-[#2F3020]/10">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#2F3020]/50">Signed in as</p>
            <p className="text-xs font-bold truncate text-[#2F3020]">{email}</p>
          </div>

          <button
            onClick={() => {
              setDropdownOpen(false);
              signOut();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
