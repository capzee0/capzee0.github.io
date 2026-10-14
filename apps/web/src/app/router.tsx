import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '@/features/landing/LandingPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { EditorPage } from '@/features/caption-editor/EditorPage';
import { NewProjectPage } from '@/features/projects/NewProjectPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SocialCaptionsPage } from '@/features/social-captions/SocialCaptionsPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Protected Routes (Sign in required) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/editor/:projectId" element={<EditorPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects/new" element={<NewProjectPage />} />
            <Route path="/social-captions/:projectId" element={<SocialCaptionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
