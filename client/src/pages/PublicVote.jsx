import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Award
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { MAX_VOTES } from '../utils/constants';

import { getVoterIdentifiers } from '../utils/fingerprint';

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Automation & Robotics',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other'
];

const PublicVote = () => {
  const toast = useToast();
  const { id: scannedLogoId } = useParams();

  const [logos, setLogos] = useState([]);
  const [remainingLimit, setRemainingLimit] = useState(MAX_VOTES);
  const [phase, setPhase] = useState('VOTING');
  const [loading, setLoading] = useState(true);

  const [fingerprint, setFingerprint] = useState('');

  // Rated Logos local tracker (stores array of logoIds rated by this voter)
  const [ratedLogoIds, setRatedLogoIds] = useState([]);
  const [failedImageMap, setFailedImageMap] = useState({});

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
    // Generate/retrieve voter device ID + browser fingerprint
    const ids = getVoterIdentifiers();
    setVoterId(ids.deviceId);
    setFingerprint(ids.fingerprint);

    // Load voter details if already inputted previously
    const storedName = localStorage.getItem('ai_forum_voter_name');
    const storedEmail = localStorage.getItem('ai_forum_voter_email');
    const storedDept = localStorage.getItem('ai_forum_voter_dept');
    if (storedName) setVoterName(storedName);
    if (storedEmail) setEmail(storedEmail);
    if (storedDept) setDepartment(storedDept);

    // LocalStorage rated logos check
    try {
      const storedRated = localStorage.getItem('ai_forum_rated_logos');
      if (storedRated) {
        setRatedLogoIds(JSON.parse(storedRated));
      }
    } catch (e) {}

    // Backend duplicate validation check to load rated logos for this voter
    checkVoterStatusBackend(ids.deviceId, ids.fingerprint, storedEmail);

    fetchConfigAndLogos();

    // Auto-refresh logos & config every 10 seconds for real-time DB sync
    const intervalId = setInterval(() => {
      fetchConfigAndLogos(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (scannedLogoId && logos.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`logo-card-${scannedLogoId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [scannedLogoId, logos]);

  const checkVoterStatusBackend = async (devId, fp, userEmail) => {
    try {
      const params = new URLSearchParams();
      if (devId) params.append('voterId', devId);
      if (fp) params.append('fingerprint', fp);
      if (userEmail) params.append('email', userEmail);

      const res = await api.get(`/public/voter-status?${params.toString()}`);
      if (res.ratedLogoIds && Array.isArray(res.ratedLogoIds)) {
        const combined = Array.from(new Set([...ratedLogoIds, ...res.ratedLogoIds]));
        setRatedLogoIds(combined);
        localStorage.setItem('ai_forum_rated_logos', JSON.stringify(combined));
      }
    } catch (e) {
      // Ignore network errors on check
    }
  };

  const fetchConfigAndLogos = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
        // Clear failed image overrides when new logo data arrives so edited logos retry loading
        setFailedImageMap((prev) => {
          const next = { ...prev };
          (logosRes.logos || []).forEach((l) => {
            if (next[l.id]) {
              delete next[l.id];
            }
          });
          return next;
        });
      }
    } catch (error) {
      if (!silent) toast.error(error.message || 'Failed to fetch candidate details');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const autoScrollToNextLogo = (currentId, updatedRatedIds) => {
    if (!logos || logos.length === 0) return;
    const currentIndex = logos.findIndex((l) => l.id === currentId);

    // Find next logo after currentIndex that hasn't been rated
    let nextLogo = logos.slice(currentIndex + 1).find((l) => !updatedRatedIds.includes(l.id));

    // If not found after currentIndex, wrap around to first unrated logo
    if (!nextLogo) {
      nextLogo = logos.find((l) => !updatedRatedIds.includes(l.id));
    }

    if (nextLogo) {
      setTimeout(() => {
        const el = document.getElementById(`logo-card-${nextLogo.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    }
  };

  const handleStarClick = (logoId, starValue) => {
    if (ratedLogoIds.includes(logoId)) {
      toast.error('You have already rated this logo.');
      return;
    }
    setRatingsSelection((prev) => ({
      ...prev,
      [logoId]: starValue
    }));
  };

  const handleStarHover = (logoId, starValue) => {
    if (ratedLogoIds.includes(logoId)) return;
    setHoveredStars((prev) => ({
      ...prev,
      [logoId]: starValue
    }));
  };

  const handleRatingSubmitAttempt = (logoId) => {
    if (ratedLogoIds.includes(logoId)) {
      toast.error('You have already rated this logo.');
      return;
    }

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
    if (ratedLogoIds.includes(logoId)) {
      toast.error('You have already rated this logo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/public/vote', {
        logoId,
        voterId,
        fingerprint,
        voterName: voterName.trim(),
        email: email.trim(),
        department: department.trim(),
        rating: ratingValue
      });

      if (res.success || res.alreadyVoted) {
        toast.success(res.message || 'Thank you! Your rating for this logo has been recorded.');

        const serverRated = res.ratedLogoIds || [];
        const updatedRated = Array.from(new Set([...ratedLogoIds, logoId, ...serverRated]));
        setRatedLogoIds(updatedRated);
        localStorage.setItem('ai_forum_rated_logos', JSON.stringify(updatedRated));

        // Auto advance to next unrated logo
        autoScrollToNextLogo(logoId, updatedRated);

        fetchConfigAndLogos();
      }
    } catch (error) {
      if (error.status === 409 || error.alreadyVoted || (error.message && error.message.includes('already'))) {
        toast.error('You have already rated this logo.');
        const updatedRated = Array.from(new Set([...ratedLogoIds, logoId]));
        setRatedLogoIds(updatedRated);
        localStorage.setItem('ai_forum_rated_logos', JSON.stringify(updatedRated));
      } else {
        toast.error(error.message || 'Failed to submit rating');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPdfSubmission = (logo) => {
    if (!logo) return false;
    const img = (logo.image || '').toLowerCase();
    if (img.includes('/api/public/logo-image/')) return false;
    const fileType = (logo.fileType || '').toLowerCase();
    const raw = (logo.rawImage || logo.image || logo.originalFilename || logo.filename || '').toLowerCase();
    return (
      fileType.includes('pdf') ||
      raw.endsWith('.pdf') ||
      raw.includes('/pdf') ||
      raw.includes('.pdf?') ||
      (raw.includes('drive.google.com') && !raw.includes('.png') && !raw.includes('.jpg') && !raw.includes('.jpeg') && !raw.includes('.webp'))
    );
  };

  const getPdfPreviewUrl = (logo) => {
    if (!logo) return '';
    let fileId = logo.driveFileId;
    const raw = logo.rawImage || logo.image || '';
    if (!fileId && raw) {
      if (raw.includes('id=')) {
        const match = raw.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      } else if (raw.includes('/d/')) {
        const match = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      }
    }

    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
      return raw;
    }
    
    return logo.image || '';
  };

  // Helper to resolve Google Drive thumbnail fallback or append timestamp version to prevent stale cache
  const getLogoImageSource = (logo) => {
    if (!logo) return '';
    if (failedImageMap[logo.id] === 'FALLBACK') {
      let fileId = logo.driveFileId;
      const raw = logo.rawImage || logo.image || '';
      if (!fileId && raw) {
        if (raw.includes('id=')) {
          const match = raw.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) fileId = match[1];
        } else if (raw.includes('/d/')) {
          const match = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) fileId = match[1];
        }
      }
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      }
    }
    const imgUrl = logo.image || '';
    if (imgUrl.startsWith('/api/public/logo-image/')) {
      const v = logo.updatedAt ? new Date(logo.updatedAt).getTime() : Date.now();
      return `${imgUrl}${imgUrl.includes('?') ? '&' : '?'}v=${v}`;
    }
    return imgUrl;
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
  const unratedCount = logos.filter((l) => !ratedLogoIds.includes(l.id)).length;
  const allLogosRated = logos.length > 0 && unratedCount === 0;

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col overflow-x-hidden">
      <Navbar currentPhase={phase} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Page Banner Header */}
        <div className="glass-card p-5 sm:p-8 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              🗳️ Public Logo Rating Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              {allLogosRated
                ? 'Awesome job! You have rated all candidate logo designs.'
                : 'Evaluate each candidate logo design and rate it 1 to 5 stars. You can rate each logo once!'}
            </p>
          </div>

          {/* Statistics Box - Tracks Logos Remaining to Rate for this Voter */}
          <div className="flex flex-row items-center gap-6 shrink-0 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="text-center sm:text-right">
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Logos Left to Rate</span>
              <span className={`text-xl font-extrabold font-mono ${unratedCount === 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {unratedCount} <span className="text-xs text-slate-500">/ {logos.length}</span>
              </span>
            </div>
            {isVotingClosed && (
              <span className="px-3 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider animate-pulse">
                Closed
              </span>
            )}
          </div>
        </div>

        {/* ALL LOGOS RATED BANNER */}
        {allLogosRated && !isVotingClosed && (
          <div className="glass-card p-6 sm:p-8 text-center border border-emerald-500/30 rounded-2xl bg-emerald-950/20 shadow-xl space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Great job! You have rated all candidate logos.</h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Thank you for evaluating all logo submissions. Your ratings have been securely recorded.
            </p>
          </div>
        )}

        {/* Voting Phase validation check */}
        {isVotingClosed ? (
          <div className="glass-card p-10 text-center border border-rose-500/20 rounded-2xl bg-rose-950/5">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Rating Session Closed</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-2 leading-relaxed">
              {remainingLimit <= 0
                ? 'Thank you! The global evaluation quota has been completed.'
                : 'The official rating phase is currently inactive. Please wait for competition administration.'}
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
          /* RESPONSIVE LOGO RATINGS GRID - PER LOGO VOTING FLOW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {logos.map((logo, index) => {
              const isRated = ratedLogoIds.includes(logo.id);
              const selectedStars = ratingsSelection[logo.id] || 0;
              const currentHover = hoveredStars[logo.id] || 0;

              const isScannedTarget = scannedLogoId === logo.id;
              const logoTitle = logo.anonymousCode || `Candidate Entry #${index + 1}`;

              return (
                <div
                  key={logo.id}
                  id={`logo-card-${logo.id}`}
                  className={`glass-card p-5 sm:p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all duration-300 ${isScannedTarget
                      ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                      : isRated
                        ? 'border-emerald-500/20 bg-emerald-950/5 opacity-80'
                        : 'border-white/10 hover:border-indigo-500/30'
                    }`}
                >
                  <div className="space-y-4">
                    {/* Header status - Candidate Anonymous Code */}
                    <div className="flex items-center justify-between h-7 border-b border-white/5 pb-3">
                      <span className="text-xs font-extrabold text-indigo-400 font-mono tracking-wide">
                        {logoTitle}
                      </span>
                      {isRated && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Rated
                        </span>
                      )}
                    </div>

                    {/* LARGE CENTERED DIRECT LOGO IMAGE OR PDF PREVIEW DISPLAY */}
                    <div className="w-full h-64 sm:h-72 bg-slate-950/90 border border-slate-900 rounded-xl flex items-center justify-center p-3 overflow-hidden relative group">
                      {isPdfSubmission(logo) || failedImageMap[logo.id] === 'PDF_PREVIEW' ? (
                        <iframe
                          src={getPdfPreviewUrl(logo)}
                          className="w-full h-full rounded-lg border-0 bg-slate-900"
                          title={logoTitle}
                          loading="lazy"
                        />
                      ) : failedImageMap[logo.id] === 'UNAVAILABLE' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                          <AlertCircle className="w-8 h-8 text-amber-400/80" />
                          <span className="text-xs font-bold text-slate-300">Preview unavailable</span>
                        </div>
                      ) : (
                        <img
                          src={getLogoImageSource(logo)}
                          alt={logoTitle}
                          referrerPolicy="no-referrer"
                          onError={() => {
                            if (!failedImageMap[logo.id]) {
                              // First fallback: try Google Drive thumbnail
                              setFailedImageMap((prev) => ({ ...prev, [logo.id]: 'FALLBACK' }));
                            } else if (failedImageMap[logo.id] === 'FALLBACK') {
                              // Second fallback: render PDF preview iframe if PDF, else mark UNAVAILABLE
                              if (isPdfSubmission(logo) || (logo.pdfUrl && logo.pdfUrl.trim())) {
                                setFailedImageMap((prev) => ({ ...prev, [logo.id]: 'PDF_PREVIEW' }));
                              } else {
                                setFailedImageMap((prev) => ({ ...prev, [logo.id]: 'UNAVAILABLE' }));
                              }
                            }
                          }}
                          className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                  </div>

                  {/* Rating Selector Block */}
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    {isRated ? (
                      <div className="py-3 px-3 text-center text-xs font-semibold text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>You have already rated this logo.</span>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rate Design:</span>
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {selectedStars ? `${selectedStars} / 5 Stars` : 'Tap to rate'}
                          </span>
                        </div>

                        {/* Touch-optimized Interactive 1-5 Star Bar */}
                        <div className="flex items-center gap-2 justify-center py-2 bg-slate-950/60 rounded-xl border border-slate-900">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = currentHover >= star || (!currentHover && selectedStars >= star);
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleStarClick(logo.id, star)}
                                onMouseEnter={() => handleStarHover(logo.id, star)}
                                onMouseLeave={() => handleStarHover(logo.id, 0)}
                                className="p-1 focus:outline-none transition-transform active:scale-90"
                                aria-label={`Rate ${star} star`}
                              >
                                <Star
                                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-all ${isFilled
                                      ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.4)] scale-110'
                                      : 'text-slate-700 hover:text-slate-500'
                                    }`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        {/* Mobile-optimized Submit Rating Button */}
                        <button
                          onClick={() => handleRatingSubmitAttempt(logo.id)}
                          disabled={isSubmitting || !selectedStars}
                          className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${selectedStars
                              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/20 active:scale-98'
                              : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                        >
                          {isSubmitting ? (
                            <span className="animate-pulse">Submitting Rating...</span>
                          ) : (
                            <span>Submit Vote</span>
                          )}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
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
                <h3 className="text-xl font-bold text-white">Voter Verification</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Please confirm your details to cast ratings. Your profile details are strictly confidential to candidate entries.
                </p>
              </div>

              <form onSubmit={handleSaveProfileAndSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Your Full Name
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
                    Save & Submit Vote
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
