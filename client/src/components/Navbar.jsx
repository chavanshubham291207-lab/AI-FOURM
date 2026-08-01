import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, LogOut, User, Shield, Vote, Menu, X, ChevronRight } from 'lucide-react';

const Navbar = ({ currentPhase }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPortalBadge = () => {
    if (!user) return null;
    if (user.role === 'student') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap w-fit shrink-0">
          <User className="w-3.5 h-3.5" /> Student Portal
        </span>
      );
    }
    if (user.role === 'voter') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap w-fit shrink-0">
          <Vote className="w-3.5 h-3.5" /> Voting Portal
        </span>
      );
    }
    if (user.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 whitespace-nowrap w-fit shrink-0">
          <Shield className="w-3.5 h-3.5" /> Admin Control
        </span>
      );
    }
  };

  const getPhaseBadge = () => {
    if (!currentPhase) return null;
    const colors = {
      REGISTRATION: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      VOTING: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse',
      CLOSED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      WINNER_ANNOUNCED: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border whitespace-nowrap w-fit shrink-0 max-w-max ${colors[currentPhase] || 'bg-slate-800 text-slate-300'}`}>
        <span className="w-2 h-2 rounded-full bg-current animate-ping shrink-0" />
        Phase: {currentPhase.replace('_', ' ')}
      </span>
    );
  };

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-[1px] shadow-glow-blue">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                <Cpu className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1 font-sans">
                AI FORUM <span className="text-gradient">COMPETITION</span>
              </span>
              <p className="text-[10px] text-slate-400 -mt-1 tracking-wider uppercase font-semibold">Logo Design 2026</p>
            </div>
          </Link>

          {/* Center Info / Responsive Badges */}
          <div className="hidden md:flex items-center gap-3 flex-wrap max-w-full overflow-hidden">
            {getPhaseBadge()}
            {getPortalBadge()}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {!user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/student/login"
                  className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Student
                </Link>
                <Link
                  to="/voter/login"
                  className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Voter
                </Link>
                <Link
                  to="/admin/login"
                  className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Admin
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-semibold text-white truncate max-w-[140px]">{user.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user.role} Account</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition-all group shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {getPhaseBadge()}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-white/10 px-4 pt-3 pb-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
            {getPhaseBadge()}
            {getPortalBadge()}
          </div>
          {!user ? (
            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/student/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-blue-900/30 text-blue-200 border border-blue-500/20 text-sm font-medium"
              >
                <span>Student Portal Login</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/voter/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-purple-900/30 text-purple-200 border border-purple-500/20 text-sm font-medium"
              >
                <span>Voting Portal Login</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-pink-900/30 text-pink-200 border border-pink-500/20 text-sm font-medium"
              >
                <span>Admin Portal Login</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="pt-2 flex flex-col gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
