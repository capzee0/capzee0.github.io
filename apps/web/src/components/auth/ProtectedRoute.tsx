import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { user, loading, openAuthModal } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal();
    }
  }, [loading, user, openAuthModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D96846] flex flex-col items-center justify-center text-[#FAF7F5] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#FAF7F5]/20 backdrop-blur-xs flex items-center justify-center p-2 shadow-lg">
          <img src="/capzee-icon.png" alt="Capzee" className="w-full h-full object-contain animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#FAF7F5]/90 tracking-wide">
          <Loader2 className="w-4 h-4 animate-spin text-[#FAF7F5]" />
          <span>Verifying access...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
