import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/SimpleLanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIModelManagement from './pages/admin/AIModelManagement';
import SubjectManagement from './pages/admin/SubjectManagement';
import UserManagement from './pages/admin/UserManagement';
import AdminLayout from './components/admin/AdminLayout';
import MainLayout from './components/layout/MainLayout';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import Grades from './pages/Grades';
import Skills from './pages/Skills';
import Support from './pages/Support';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import ManagementDashboard from './pages/ManagementDashboard';
import PricingPage from './pages/PricingPage';
import { useAuth } from './context/AuthContext'; // Import the useAuth hook
import SidebarTabsPage from './pages/admin/SidebarTabsPage';

function AppRoutes() {
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;

  // Show loading message while checking auth status
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Public routes */}
      {/* <Route path="/login" element={!isLoggedIn ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isLoggedIn ? <Register /> : <Navigate to="/dashboard" />} /> */}

      {/* App routes with MainLayout */}
      <Route path="/" element={isLoggedIn ? <MainLayout /> : <Navigate to="/" replace />}>
        <Route path="chat" element={<Chat />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="grades" element={<Grades />} />
        <Route path="skills" element={<Skills />} />
        <Route path="support" element={<Support />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Management Dashboard - accessible to all logged-in users for now */}
      <Route path="/management" element={isLoggedIn ? <ManagementDashboard /> : <Navigate to="/" replace />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/models" replace />} />
        <Route path="models" element={<AIModelManagement />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="sidebar-tabs" element={<SidebarTabsPage />} />
      </Route>

      {/* Catch-all route for 404 */}
      <Route path="*" element={<div>404 - Not Found</div>} />
    </Routes>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <div className="min-h-screen bg-background">
              <AppRoutes />
            </div>
          </Router>
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
