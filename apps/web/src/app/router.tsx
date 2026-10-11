import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '@/features/landing/LandingPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { EditorPage } from '@/features/caption-editor/EditorPage';
import { SocialCaptionsPage } from '@/features/social-captions/SocialCaptionsPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuthStore } from '@/stores/authStore';

export function AppRouter() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <AuthModal />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor/:projectId" element={<EditorPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects/new" element={<Navigate to="/dashboard" replace />} />
          <Route path="/social-captions/:projectId" element={<SocialCaptionsPage />} />
          <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
