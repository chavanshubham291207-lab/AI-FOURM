import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Vote, Award, ArrowRight, CheckCircle, Sparkles, EyeOff, BarChart3, QrCode } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const LandingPage = () => {
  const [phase, setPhase] = useState('REGISTRATION');

  useEffect(() => {
    fetchCompetitionPhase();
  }, []);

  const fetchCompetitionPhase = async () => {
    try {
      const res = await api.get('/public/config').catch(() => null);
      if (res && res.phase) {
        setPhase(res.phase);
      }
    } catch (e) {
      // default phase
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar currentPhase={phase} />

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-20 md:py-24">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-cyan-500/30 text-xs font-semibold text-cyan-300 mb-6 shadow-glow-blue"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Official College AI Forum Competition 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto font-sans leading-[1.15]"
          >
            Select the Next Identity of <span className="text-gradient">AI Forum</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            A completely public blind voting gateway. Scan a generic voting QR code physically displayed on campus using your camera to open the public ballot and submit your vote.
          </motion.p>

          {/* Portal Selector Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left"
          >
            {/* Voting Card */}
            <div className="group relative rounded-2xl glass-card p-8 glass-card-hover border border-indigo-500/30 hover:border-indigo-400 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Scan To Vote</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  No account registration or login required. Go directly to our public scanner, scan the voting QR, and choose your favorite design.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Free public voting ballot access</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Maximum 500 votes scan cap globally</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Verified voter duplicate protection</li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                <Link
                  to="/scan-to-vote"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg transition-all"
                >
                  Open Scanner Portal <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Admin Card */}
            <div className="group relative rounded-2xl glass-card p-8 glass-card-hover border border-pink-500/30 hover:border-pink-400 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Admin Control</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Log in as administrator to upload candidate logos, configure phases, download voting flyers, and view full voting database records.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-pink-400" /> Manage candidate details & uploads</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-pink-400" /> View voter names, emails, & times</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-pink-400" /> 1-Click Winner selection & standings</li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                <Link
                  to="/admin/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-gradient-pink text-white text-sm font-semibold shadow-lg"
                >
                  Enter Admin Portal <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </motion.div>

        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="py-16 bg-slate-950/60 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white font-sans">Guaranteed Blind Public Voting</h2>
            <p className="text-slate-400 text-sm mt-2">Open access with structured limits and audit logs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl glass-panel border border-white/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Public QR Scanning</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Camera scans verify legitimate competition QR codes to unlock the voting ballot instantly.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl glass-panel border border-white/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <EyeOff className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Blind Gallery</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Only candidate design concepts are visible. Designer identities are hidden to keep scoring objective.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl glass-panel border border-white/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400 shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Scan Cap Limit</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  A strict cap of 500 successful votes triggers automatic competition closure to ensure controlled polling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center border-t border-white/10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 College AI Forum. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-slate-400">Production Ready MERN Stack</span>
            <span className="text-cyan-400 font-mono">v1.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
