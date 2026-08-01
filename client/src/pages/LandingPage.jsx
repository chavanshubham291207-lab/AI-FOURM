import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, Vote, Award, ArrowRight, CheckCircle, Sparkles, Layers, EyeOff, BarChart3, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const LandingPage = () => {
  const [phase, setPhase] = useState('REGISTRATION');

  useEffect(() => {
    fetchCompetitionPhase();
  }, []);

  const fetchCompetitionPhase = async () => {
    try {
      const res = await api.get('/student/submission').catch(() => null);
      if (res && res.competition) {
        setPhase(res.competition.phase);
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
            Design the Future Identity of <span className="text-gradient">AI Forum</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Submit your creative logo entry or cast anonymous ratings in our blind voting system. Powered by AI aesthetics and complete voting fairness.
          </motion.p>

          {/* Portal Selector Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left"
          >
            {/* Student Card */}
            <div className="group relative rounded-2xl glass-card p-8 glass-card-hover border border-blue-500/30 hover:border-blue-400 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Student Portal</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Register as a student designer, submit your custom logo entry with title & description, and track competition results.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Upload 1 Logo Entry</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Edit submission before deadline</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> View official winner result</li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                <Link
                  to="/student/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-gradient text-white text-sm font-semibold shadow-lg"
                >
                  Enter Student Portal <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Voting Card */}
            <div className="group relative rounded-2xl glass-card p-8 glass-card-hover border border-purple-500/30 hover:border-purple-400 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <Vote className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Voting Portal</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Rate all uploaded logo designs on a 1–5 star scale under a 100% anonymous Blind Voting System.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> Anonymous Entry IDs (AI-001)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> Rate each logo only once</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> Complete student anonymity</li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                <Link
                  to="/voter/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg transition-all"
                >
                  Enter Voting Portal <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Admin Card */}
            <div className="group relative rounded-2xl glass-card p-8 glass-card-hover border border-pink-500/30 hover:border-pink-400 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Admin Portal</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Monitor statistics, manage competition phases, map entry IDs to student identities, and announce the winner.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-pink-400" /> Real-time Analytics & Charts</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-pink-400" /> Student Participant Roster</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-pink-400" /> Export Results to CSV</li>
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
            <h2 className="text-3xl font-bold text-white font-sans">Guaranteed Fairness & Anonymity</h2>
            <p className="text-slate-400 text-sm mt-2">Built specifically to prevent bias during evaluation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl glass-panel border border-white/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                <EyeOff className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Blind Voting Shield</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Student names, roll numbers, and emails are hidden during voting. Logos are identified strictly by codes like AI-001.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl glass-panel border border-white/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Automated Leaderboard</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Average star ratings are updated dynamically in real-time to compute transparent standings.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl glass-panel border border-white/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Strict Role Separation</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Student and Voter accounts are strictly separated. Cross-portal access with mismatched emails is blocked automatically.
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
            <span className="text-cyan-400 font-mono">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
