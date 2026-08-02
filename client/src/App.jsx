import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import LandingPage from './pages/LandingPage';
import VoterLogin from './pages/VoterLogin';
import VoterRegister from './pages/VoterRegister';
import VoterDashboard from './pages/VoterDashboard';
import VoteLogoDetails from './pages/VoteLogoDetails';

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
            {/* Public Landing */}
            <Route path="/" element={<LandingPage />} />

            {/* Voter Routes */}
            <Route path="/voter/login" element={<VoterLogin />} />
            <Route path="/voter/register" element={<VoterRegister />} />
            <Route
              path="/voter/dashboard"
              element={
                <ProtectedRoute allowedRoles={['voter']}>
                  <VoterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vote-logo/:id"
              element={
                <ProtectedRoute allowedRoles={['voter']}>
                  <VoteLogoDetails />
                </ProtectedRoute>
              }
            />

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
