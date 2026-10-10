import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '@/features/landing/LandingPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { NewProjectPage } from '@/features/projects/NewProjectPage';
import { EditorPage } from '@/features/caption-editor/EditorPage';
import { SocialCaptionsPage } from '@/features/social-captions/SocialCaptionsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AppLayout } from '@/components/layout/AppLayout';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/editor/:projectId" element={<EditorPage />} />
          <Route path="/social-captions/:projectId" element={<SocialCaptionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
