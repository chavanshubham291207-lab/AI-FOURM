import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (allowedRoles.includes('student')) return <Navigate to="/student/login" replace />;
    if (allowedRoles.includes('voter')) return <Navigate to="/voter/login" replace />;
    if (allowedRoles.includes('admin')) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;
    if (user.role === 'voter') return <Navigate to="/voter/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
