import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Award,
  ArrowRight,
  CheckCircle,
  Sparkles,
  EyeOff,
  BarChart3,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Scan
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const LandingPage = () => {
  const [phase, setPhase] = useState('REGISTRATION');
  const [remainingLimit, setRemainingLimit] = useState(500);
  const [genericQrCode, setGenericQrCode] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    fetchCompetitionPhase();
    // Scroll to scanner section if URL hash present
    if (window.location.hash === '#scanner-section') {
      setTimeout(() => {
        document.getElementById('scanner-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  const fetchCompetitionPhase = async () => {
    try {
      setLoadingConfig(true);
      const res = await api.get('/public/config').catch(() => null);
      if (res && res.success) {
        setPhase(res.phase);
        setRemainingLimit(res.remainingLimit);
        setGenericQrCode(res.genericQrCode || '');
      }
    } catch (e) {
      // default configurations
    } finally {
      setLoadingConfig(false);
    }
  };

  const isVotingOpen = phase === 'VOTING' && remainingLimit > 0;

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
            A completely public blind voting gateway. Scan the official voting QR code displayed below using your own mobile camera to open the public ballot and cast your vote.
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
                  No registration or login required. Scroll down to our generated public QR Code, scan it with your phone's camera, and choose your favorite design.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Free public voting ballot access</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Maximum 500 votes limit globally</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Verified duplicate protection by email</li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                <a
                  href="#scanner-section"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('scanner-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg transition-all text-center"
                >
                  Go to QR Code Section <ArrowRight className="w-4 h-4" />
                </a>
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

      {/* EMBEDDED SCANNER SECTION (Static QR Display Mode) */}
      <div id="scanner-section" className="py-20 bg-slate-950/40 border-t border-white/5 scroll-mt-16">
        <div className="max-w-md mx-auto px-4 w-full">
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full" />
            
            <div className="text-center space-y-3">
              <span className="text-[20px] block" role="img" aria-label="ballot">🗳️</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Scan To Vote</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Scan the generated official QR code below using your own mobile device to open the blind voting gallery.
              </p>
            </div>

            {/* Scan Limit Metrics */}
            <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
              <div className="flex justify-around text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Scan Limit</span>
                  <span className="font-mono font-bold text-white">500</span>
                </div>
                <div className="border-r border-slate-800" />
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">Remaining</span>
                  <span className={`font-mono font-extrabold ${remainingLimit <= 0 ? 'text-rose-500' : 'text-cyan-400'}`}>
                    {remainingLimit}
                  </span>
                </div>
              </div>
              {remainingLimit <= 0 && (
                <div className="pt-2 border-t border-slate-800/60 mt-1">
                  <span className="inline-block text-[10px] text-rose-400 font-bold bg-rose-950/40 px-2.5 py-0.5 rounded border border-rose-500/20 uppercase animate-pulse">
                    Voting Closed
                  </span>
                </div>
              )}
            </div>

            {/* QR Viewport / Closed Message */}
            <div className="mt-8 flex flex-col items-center">
              {loadingConfig ? (
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              ) : !isVotingOpen ? (
                <div className="w-full p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Voting Closed</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {remainingLimit <= 0 
                      ? 'The maximum cap of 500 successful ballots has been fulfilled.' 
                      : `The voting phase is currently inactive. State: ${phase.replace('_', ' ')}`}
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-6 text-center">
                  <div className="w-60 h-60 mx-auto bg-white p-3.5 rounded-2xl border border-slate-700 flex items-center justify-center shadow-glow-blue overflow-hidden">
                    {genericQrCode ? (
                      <img src={genericQrCode} alt="Public Voting QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-xs text-slate-400">Loading QR...</div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left space-y-2.5">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <Smartphone className="w-4 h-4 text-cyan-400" /> Voting Instructions:
                    </h4>
                    <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
                      <li>Open your mobile phone camera or any preferred QR scanner app.</li>
                      <li>Point your camera lens at the QR code displayed above.</li>
                      <li>Tap the link notification pop-up to load the public blind ballot.</li>
                      <li>Select your candidate design and submit your details to cast a vote.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Checklist items */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
              <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500/50" /> QR Code points to verified public voting ballot link.</p>
              <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500/50" /> Successful votes decrease the remaining limit count.</p>
            </div>
          </div>
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
                <Scan className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Public QR Scanning</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Students scan the central QR code with their mobile devices to load the public voting ballot page.
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
            <span className="text-cyan-400 font-mono">v1.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
