import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import LandingPage from './pages/LandingPage';
import ScanToVote from './pages/ScanToVote';
import PublicVote from './pages/PublicVote';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

import ProtectedRoute from './components/ProtectedRoute';
import AIChatModal from './components/AIChatModal';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Landing & Scan Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/scan-to-vote" element={<ScanToVote />} />
            <Route path="/public-vote" element={<PublicVote />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Floating AI Chat Modal Widget */}
          <AIChatModal />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
