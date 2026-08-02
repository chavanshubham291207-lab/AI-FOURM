import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Cpu,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  HelpCircle as InfoIcon,
  Sparkles,
  Award,
  Layers
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'AI & Data Science',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other'
];

const PublicVote = () => {
  const toast = useToast();

  const [logos, setLogos] = useState([]);
  const [remainingLimit, setRemainingLimit] = useState(500);
  const [phase, setPhase] = useState('VOTING');
  const [loading, setLoading] = useState(true);

  // Rated Logos local tracker (stores array of logoIds rated during session)
  const [ratedLogoIds, setRatedLogoIds] = useState([]);

  // Star Rating Selection per LogoId state map { [logoId]: number }
  const [ratingsSelection, setRatingsSelection] = useState({});
  const [hoveredStars, setHoveredStars] = useState({}); // { [logoId]: number }

  // Voter Identity states
  const [voterName, setVoterName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [voterId, setVoterId] = useState('');
  
  // Modal Voter Profile Form trigger state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingRatingSubmit, setPendingRatingSubmit] = useState(null); // { logoId, rating }
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load or generate voter session identifier
    let storedVoterId = localStorage.getItem('ai_forum_voter_id');
    if (!storedVoterId) {
      storedVoterId = 'voter_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ai_forum_voter_id', storedVoterId);
    }
    setVoterId(storedVoterId);

    // Load voter details if already inputted previously
    const storedName = localStorage.getItem('ai_forum_voter_name');
    const storedEmail = localStorage.getItem('ai_forum_voter_email');
    const storedDept = localStorage.getItem('ai_forum_voter_dept');
    if (storedName) setVoterName(storedName);
    if (storedEmail) setEmail(storedEmail);
    if (storedDept) setDepartment(storedDept);

    // Load already rated designs list
    const storedRated = localStorage.getItem('ai_forum_rated_logos');
    if (storedRated) {
      try {
        setRatedLogoIds(JSON.parse(storedRated));
      } catch (e) {
        // error parsing
      }
    }

    fetchConfigAndLogos();
  }, []);

  const fetchConfigAndLogos = async () => {
    try {
      setLoading(true);
      const [configRes, logosRes] = await Promise.all([
        api.get('/public/config'),
        api.get('/public/logos')
      ]);

      if (configRes.success) {
        setRemainingLimit(configRes.remainingLimit);
        setPhase(configRes.phase);
      }
      if (logosRes.success) {
        setLogos(logosRes.logos);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch candidate details');
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (logoId, starValue) => {
    setRatingsSelection((prev) => ({
      ...prev,
      [logoId]: starValue
    }));
  };

  const handleStarHover = (logoId, starValue) => {
    setHoveredStars((prev) => ({
      ...prev,
      [logoId]: starValue
    }));
  };

  const handleRatingSubmitAttempt = (logoId) => {
    const selectedRating = ratingsSelection[logoId];
    if (!selectedRating) {
      toast.warning('Please select a star rating first');
      return;
    }

    // Check if voter details are missing in localStorage
    if (!voterName.trim() || !email.trim() || !department.trim()) {
      setPendingRatingSubmit({ logoId, rating: selectedRating });
      setIsProfileModalOpen(true);
    } else {
      executeSubmitRating(logoId, selectedRating);
    }
  };

  const handleSaveProfileAndSubmit = async (e) => {
    e.preventDefault();
    if (!voterName.trim() || !email.trim() || !department.trim()) {
      toast.error('All profile fields are required');
      return;
    }

    // Save profile details to localStorage
    localStorage.setItem('ai_forum_voter_name', voterName.trim());
    localStorage.setItem('ai_forum_voter_email', email.trim());
    localStorage.setItem('ai_forum_voter_dept', department.trim());

    setIsProfileModalOpen(false);

    if (pendingRatingSubmit) {
      const { logoId, rating } = pendingRatingSubmit;
      setPendingRatingSubmit(null);
      executeSubmitRating(logoId, rating);
    }
  };

  const executeSubmitRating = async (logoId, ratingValue) => {
    try {
      setIsSubmitting(true);
      const res = await api.post('/public/vote', {
        logoId,
        voterId,
        voterName: voterName.trim(),
        email: email.trim(),
        department: department.trim(),
        rating: ratingValue
      });

      if (res.success) {
        toast.success('Your rating has been recorded successfully!');
        
        // Update local rated list
        const updatedRated = [...ratedLogoIds, logoId];
        setRatedLogoIds(updatedRated);
        localStorage.setItem('ai_forum_rated_logos', JSON.stringify(updatedRated));

        // Refresh configuration (to update remaining scan count)
        fetchConfigAndLogos();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit logo rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse">Loading Logo Rating Center...</p>
        </div>
      </div>
    );
  }

  const isVotingClosed = phase !== 'VOTING' || remainingLimit <= 0;

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col overflow-x-hidden">
      <Navbar currentPhase={phase} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Banner Header */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              🗳️ Logo Rating Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Rate every candidate logo design from 1 to 5 stars. Select a rating, and click submit. You can rate each logo entry exactly once.
            </p>
          </div>

          {/* Statistics Box */}
          <div className="flex flex-row items-center gap-6 shrink-0 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="text-center sm:text-right">
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Remaining limit</span>
              <span className={`text-xl font-extrabold font-mono ${remainingLimit <= 0 ? 'text-rose-500' : 'text-cyan-400'}`}>
                {remainingLimit} <span className="text-xs text-slate-500">/ 500</span>
              </span>
            </div>
            {isVotingClosed && (
              <span className="px-3 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider animate-pulse">
                Closed
              </span>
            )}
          </div>
        </div>

        {/* Voting Phase validation check */}
        {isVotingClosed ? (
          <div className="glass-card p-12 text-center border border-rose-500/20 rounded-2xl bg-rose-950/5">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Rating Session Closed</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-2 leading-relaxed">
              {remainingLimit <= 0 
                ? 'Thank you! The global evaluation quota of 500 successful ballots has been completed.' 
                : 'The official rating phase is currently inactive. Please wait for administrators to transition the phase.'}
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white hover:bg-slate-850 font-bold transition-all"
            >
              Return Home
            </Link>
          </div>
        ) : logos.length === 0 ? (
          <div className="glass-card p-12 text-center border border-white/5 rounded-2xl">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-white text-sm font-semibold">No Logo Candidates Available</h3>
            <p className="text-slate-500 text-xs mt-1">Check back later once candidates upload designs.</p>
          </div>
        ) : (
          /* RESPONSIVE LOGO RATINGS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {logos.map((logo) => {
              const hasBeenRated = ratedLogoIds.includes(logo.id);
              const selectedStars = ratingsSelection[logo.id] || 0;
              const currentHover = hoveredStars[logo.id] || 0;

              return (
                <div
                  key={logo.id}
                  className={`glass-card p-5 sm:p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all ${
                    hasBeenRated 
                      ? 'border-emerald-500/20 bg-emerald-950/5' 
                      : 'border-white/10 hover:border-indigo-500/30'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header badge */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/25">
                        {logo.anonymousCode}
                      </span>
                      {hasBeenRated && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Rated
                        </span>
                      )}
                    </div>

                    {/* Logo Image */}
                    <div className="w-full h-56 bg-slate-950/95 border border-slate-900 rounded-xl flex items-center justify-center p-4 overflow-hidden relative group">
                      <img src={logo.image} alt={logo.title} className="max-h-full max-w-full object-contain" />
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="text-base font-bold text-white line-clamp-1">{logo.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-3 mt-1.5 leading-relaxed">
                        {logo.description}
                      </p>
                    </div>
                  </div>

                  {/* Rating Selector Block */}
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    {hasBeenRated ? (
                      <div className="py-2 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
                        You have submitted your rating for this logo.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Rate Design:</span>
                          <span className="text-xs font-bold text-indigo-400">
                            {selectedStars ? `${selectedStars} / 5 Stars` : 'Select rating'}
                          </span>
                        </div>

                        {/* Interactive stars bar */}
                        <div className="flex items-center gap-2 justify-center py-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = currentHover >= star || (!currentHover && selectedStars >= star);
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleStarClick(logo.id, star)}
                                onMouseEnter={() => handleStarHover(logo.id, star)}
                                onMouseLeave={() => handleStarHover(logo.id, 0)}
                                className="focus:outline-none transition-transform active:scale-90"
                              >
                                <Star
                                  className={`w-7 h-7 transition-all ${
                                    isFilled 
                                      ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.3)] scale-110' 
                                      : 'text-slate-600 hover:text-slate-500'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        {/* Submit button */}
                        <button
                          onClick={() => handleRatingSubmitAttempt(logo.id)}
                          disabled={isSubmitting || !selectedStars}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                            selectedStars 
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:scale-[1.01]' 
                              : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          Submit Rating
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Voter Profile Modal (Triggered on first rating submission) */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 sm:p-8 rounded-2xl border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full" />
              
              <div className="text-center space-y-2 mb-6">
                <span className="inline-flex p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 mb-2">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="text-xl font-bold text-white">Voter Profile Registry</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Provide your academic details to submit ratings. Student identities are kept strictly anonymous to candidates.
                </p>
              </div>

              <form onSubmit={handleSaveProfileAndSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. johndoe@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Academic Department
                  </label>
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-900 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setPendingRatingSubmit(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold"
                  >
                    Save & Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicVote;
