import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageSpinner } from '@/components/ui';
import { RequireAdmin, RequireAuth } from '@/features/auth/RequireAuth';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage } from '@/features/auth/AuthPages';
import { LandingPage } from '@/features/landing/LandingPage';

const RoadmapPage = lazy(() => import('@/features/curriculum/RoadmapPage').then((m) => ({ default: m.RoadmapPage })));
const TopicPage = lazy(() => import('@/features/curriculum/TopicPage').then((m) => ({ default: m.TopicPage })));
const ExercisePage = lazy(() => import('@/features/practice/ExercisePage').then((m) => ({ default: m.ExercisePage })));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const SubmissionPage = lazy(() => import('@/features/history/SubmissionPage').then((m) => ({ default: m.SubmissionPage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const UsagePage = lazy(() => import('@/features/profile/UsagePage').then((m) => ({ default: m.UsagePage })));
const AdminPage = lazy(() => import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const ExerciseFormPage = lazy(() => import('@/features/admin/ExerciseFormPage').then((m) => ({ default: m.ExerciseFormPage })));
const SettingsPage = lazy(() => import('@/features/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/learn" element={<RoadmapPage />} />
            <Route path="/topics/:topicId" element={<TopicPage />} />
            <Route path="/exercises/:exerciseId" element={<ExercisePage />} />
            <Route path="/submissions" element={<HistoryPage />} />
            <Route path="/submissions/:id" element={<SubmissionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/usage" element={<UsagePage />} />
            <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
            <Route path="/admin/exercises/new" element={<RequireAdmin><ExerciseFormPage /></RequireAdmin>} />
            <Route path="/admin/exercises/:id" element={<RequireAdmin><ExerciseFormPage /></RequireAdmin>} />
            <Route path="/admin/settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
