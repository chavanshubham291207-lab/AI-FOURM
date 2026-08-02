import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, ArrowLeft, Info, HelpCircle, Layers, Sparkles, Check, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const navigate = useNavigate();

  const [logos, setLogos] = useState([]);
  const [remainingLimit, setRemainingLimit] = useState(500);
  const [phase, setPhase] = useState('VOTING');
  const [loading, setLoading] = useState(true);

  // Voting Form States
  const [selectedLogoId, setSelectedLogoId] = useState(null);
  const [voterName, setVoterName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);

  useEffect(() => {
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
        setLogos(logosRes.logos || []);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to retrieve public voting configs');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLogoId) {
      toast.error('Please select a candidate logo from the gallery above first');
      return;
    }
    if (!voterName.trim() || !email.trim() || !department) {
      toast.error('Please fill in your name, email, and department');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/public/vote', {
        logoId: selectedLogoId,
        voterName: voterName.trim(),
        email: email.trim(),
        department
      });

      if (res.success) {
        toast.success('Your vote has been recorded successfully!');
        setVoteSuccess(true);
        setRemainingLimit(res.remainingLimit);
        setSelectedLogoId(null);
        setVoterName('');
        setEmail('');
        setDepartment('');
        
        // Reload settings
        setTimeout(() => {
          setVoteSuccess(false);
          fetchConfigAndLogos();
        }, 4000);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse text-center">Loading Candidate Ballot...</p>
        </div>
      </div>
    );
  }

  const isVotingOpen = phase === 'VOTING' && remainingLimit > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar currentPhase={phase} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        <div className="flex items-center justify-between">
          <Link to="/scan-to-vote" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Scanner
          </Link>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Remaining Ballot Capacity</span>
            <span className={`text-sm font-extrabold font-mono ${remainingLimit <= 0 ? 'text-rose-500' : 'text-cyan-400'}`}>
              {remainingLimit} of 500 scans remaining
            </span>
          </div>
        </div>

        {/* Introduction */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold shadow-glow-blue">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Blind Public Ballot
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Public Voting Gallery</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select one of the anonymous logo entries below, provide your details, and submit your official ballot. Candidate details are completely concealed to prevent evaluation bias.
          </p>
        </div>

        {voteSuccess && (
          <div className="max-w-xl mx-auto p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-pulse">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Your vote has been recorded successfully!</h4>
              <p className="text-xs text-emerald-400/80">Thank you for rating. The ballot is resetting for another scan.</p>
            </div>
          </div>
        )}

        {!isVotingOpen ? (
          <div className="max-w-xl mx-auto p-6 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-center space-y-2">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider">Voting Closed</h2>
            <p className="text-sm text-slate-300">
              {remainingLimit <= 0
                ? 'The maximum public voting cap of 500 successful ballots has been fulfilled.'
                : `Public voting is currently inactive. Phase: ${phase.replace('_', ' ')}`}
            </p>
            <div className="pt-4">
              <Link to="/scan-to-vote" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all">
                Return to Scanner
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Gallery Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" /> Candidate Logo Gallery
                </h3>
                <p className="text-xs text-slate-500">Click a card to select that candidate logo design.</p>
              </div>

              {logos.length === 0 ? (
                <div className="glass-card p-12 text-center border border-white/5 rounded-2xl">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No candidate logo submissions found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {logos.map((logo) => {
                    const isSelected = selectedLogoId === logo.id;
                    return (
                      <div
                        key={logo.id}
                        onClick={() => setSelectedLogoId(logo.id)}
                        className={`glass-card p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between select-none relative group ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20 shadow-lg'
                            : 'border-white/10 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center text-white shadow-md">
                            <Check className="w-3.5 h-3.5 font-bold" />
                          </div>
                        )}

                        <div>
                          <div className="mb-3">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/20">
                              {logo.anonymousCode}
                            </span>
                          </div>

                          <div className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center p-3 overflow-hidden">
                            <img src={logo.image} alt={logo.anonymousCode} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-[1.03]" />
                          </div>

                          <p className="text-[11px] text-slate-400 leading-relaxed mt-4 line-clamp-3">
                            {logo.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Voter Registration/Submission Form */}
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6 h-fit lg:sticky lg:top-24">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Vote className="w-5 h-5 text-indigo-400" /> Cast Official Ballot
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Fill in your details below to submit your vote for the selected candidate.
                </p>
              </div>

              <form onSubmit={handleVoteSubmit} className="space-y-4">
                {selectedLogoId ? (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-indigo-400">Selected Candidate</span>
                      <p className="text-xs font-mono font-bold text-white">
                        {logos.find(l => l.id === selectedLogoId)?.anonymousCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLogoId(null)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>Please select a candidate logo from the gallery on the left to start.</span>
                  </div>
                )}

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
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
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
                    placeholder="e.g. john@college.edu"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="" disabled>Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedLogoId}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.01]"
                >
                  <Vote className="w-4 h-4" /> {isSubmitting ? 'Recording Ballot...' : 'VOTE'}
                </button>
              </form>

              <div className="text-[10px] text-slate-500 flex items-start gap-1.5 pt-2 border-t border-slate-800">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Each email address is allowed exactly one vote per candidate entry. Submissions are checked for validity and duplicate matches.</span>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default PublicVote;
