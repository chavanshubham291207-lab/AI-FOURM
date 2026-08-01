import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import StarRating from '../components/StarRating';
import api from '../services/api';
import {
  Vote,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Sparkles,
  Lock,
  Layers,
  Info,
  Check
} from 'lucide-react';

const VoterDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [logos, setLogos] = useState([]);
  const [phase, setPhase] = useState('VOTING');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [viewMode, setViewMode] = useState('focus'); // 'focus' (1-by-1 mode) or 'grid'

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/voter/logos');
      if (res.success) {
        setLogos(res.logos || []);
        setPhase(res.phase || 'VOTING');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentLogo = logos[currentIndex] || null;

  const handleVoteSubmit = async (ratingVal) => {
    if (!currentLogo) return;
    const valToSubmit = ratingVal || selectedRating;
    if (!valToSubmit) {
      toast.error('Please select a star rating (1–5) first');
      return;
    }

    try {
      setSubmittingVote(true);
      const res = await api.post('/voter/vote', {
        logoId: currentLogo.id,
        rating: valToSubmit
      });

      if (res.success) {
        toast.success('Thank you for voting.');

        // Update local state for current logo
        setLogos((prevLogos) =>
          prevLogos.map((l) =>
            l.id === currentLogo.id
              ? {
                  ...l,
                  hasVoted: true,
                  userRating: valToSubmit,
                  averageRating: res.entry.averageRating,
                  totalVotes: res.entry.totalVotes
                }
              : l
          )
        );
        setSelectedRating(0);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmittingVote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse">Loading Blind Voting Gallery...</p>
        </div>
      </div>
    );
  }

  const isVotingOpen = phase === 'VOTING';
  const votedCount = logos.filter((l) => l.hasVoted).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar currentPhase={phase} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Banner */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold w-fit mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Blind Voting System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Anonymous Logo Rating Gallery
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Rate every entry from 1 to 5 stars. All entries are identified solely by unique Entry IDs.
            </p>
          </div>

          {/* Stats Progress & View Switcher */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Your Voting Progress</p>
              <p className="text-base font-extrabold text-purple-400 mt-0.5">
                {votedCount} / {logos.length} Logos Evaluated
              </p>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('focus')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'focus' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Focus Mode
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Grid Gallery
              </button>
            </div>
          </div>
        </div>

        {!isVotingOpen && (
          <div className="p-6 rounded-2xl glass-panel border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              Voting is currently disabled. Competition is in <strong className="uppercase">{phase}</strong> phase.
            </div>
          </div>
        )}

        {logos.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center border border-white/10 max-w-lg mx-auto my-12">
            <Layers className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">No Logo Submissions Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Check back once students have uploaded their competition entries!
            </p>
          </div>
        ) : viewMode === 'focus' && currentLogo ? (
          /* FOCUS MODE (Single Card Slider) */
          <div className="glass-card p-8 rounded-2xl border border-purple-500/30 max-w-4xl mx-auto relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-base font-mono font-extrabold shadow-glow-purple">
                  Entry ID: {currentLogo.anonymousCode}
                </span>
                {currentLogo.hasVoted && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Rated ⭐ {currentLogo.userRating}/5
                  </span>
                )}
              </div>

              {/* Slider Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setCurrentIndex((prev) => prev - 1);
                    setSelectedRating(0);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700"
                  title="Previous Logo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono text-slate-400 font-semibold px-2">
                  {currentIndex + 1} of {logos.length}
                </span>
                <button
                  disabled={currentIndex === logos.length - 1}
                  onClick={() => {
                    setCurrentIndex((prev) => prev + 1);
                    setSelectedRating(0);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700"
                  title="Next Logo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Anonymous Logo Focus */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Logo Display (NO STUDENT DETAILS) */}
              <div className="w-full md:w-96 h-96 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-6 relative overflow-hidden group shadow-2xl shrink-0">
                <img
                  src={currentLogo.image}
                  alt={`Logo Entry ${currentLogo.anonymousCode}`}
                  className="w-full h-full object-contain transition-transform group-hover:scale-105"
                />
              </div>

              {/* Interactive Rating Box */}
              <div className="flex-1 w-full space-y-6 text-left">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">{currentLogo.title}</h2>
                  <p className="text-xs text-slate-400 mt-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800 leading-relaxed">
                    {currentLogo.description}
                  </p>
                </div>

                {/* Rating Card */}
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Rate this Logo Entry (1–5 Stars)
                    </span>
                    {currentLogo.hasVoted && (
                      <span className="text-xs text-emerald-400 font-semibold">"Thank you for voting."</span>
                    )}
                  </div>

                  {currentLogo.hasVoted ? (
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-400">Your Submitted Rating</p>
                      <div className="flex justify-center">
                        <StarRating rating={currentLogo.userRating} readOnly size="lg" />
                      </div>
                      <p className="text-xs text-slate-500 italic pt-1">
                        Ratings cannot be edited once submitted.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center py-2 bg-slate-950/60 rounded-xl border border-slate-800">
                        <StarRating
                          rating={selectedRating}
                          onRate={(val) => setSelectedRating(val)}
                          readOnly={!isVotingOpen}
                          size="xl"
                        />
                      </div>

                      <button
                        disabled={!isVotingOpen || !selectedRating || submittingVote}
                        onClick={() => handleVoteSubmit(selectedRating)}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
                      >
                        {submittingVote ? 'Submitting Rating...' : 'Submit Rating'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Student identity is completely concealed to guarantee voting fairness.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* GRID GALLERY MODE */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {logos.map((logo, idx) => (
              <motion.div
                key={logo.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-6 rounded-2xl border border-white/10 glass-card-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/30">
                      {logo.anonymousCode}
                    </span>
                    {logo.hasVoted && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Voted ({logo.userRating}⭐)
                      </span>
                    )}
                  </div>

                  <div className="w-full h-56 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden p-3 flex items-center justify-center mb-4">
                    <img src={logo.image} alt={logo.anonymousCode} className="w-full h-full object-contain" />
                  </div>

                  <h3 className="text-lg font-bold text-white">{logo.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{logo.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <StarRating rating={logo.hasVoted ? logo.userRating : logo.averageRating} readOnly size="sm" />
                  <button
                    onClick={() => {
                      setCurrentIndex(idx);
                      setViewMode('focus');
                    }}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                  >
                    {logo.hasVoted ? 'View Details' : 'Rate Entry →'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};

export default VoterDashboard;
