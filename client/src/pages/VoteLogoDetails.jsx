import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Vote, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const VoteLogoDetails = () => {
  const { id } = useParams();
  const toast = useToast();
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingPhase, setVotingPhase] = useState('REGISTRATION');
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    fetchLogoDetails();
  }, [id]);

  const fetchLogoDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/voter/logos/${id}`);
      if (res.success) {
        setLogo(res.logo);
        setVotingPhase(res.phase);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load logo details');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (votingPhase !== 'VOTING') {
      toast.error(`Voting is closed. Phase is currently ${votingPhase}`);
      return;
    }

    try {
      setIsVoting(true);
      const res = await api.post('/voter/vote', { logoId: id });
      if (res.success) {
        toast.success('Your vote has been recorded successfully!');
        setLogo((prev) => ({ ...prev, hasVoted: true, totalVotes: res.entry.totalVotes }));
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit vote');
    } finally {
      setIsVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse">Loading Logo Details...</p>
        </div>
      </div>
    );
  }

  if (!logo) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Logo Entry Not Found</h2>
          <p className="text-slate-400 text-sm mt-2">The scanned logo code or ID does not exist in our database.</p>
          <Link to="/voter/dashboard" className="mt-6 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isVotingOpen = votingPhase === 'VOTING';

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar currentPhase={votingPhase} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link to="/voter/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Voter Dashboard
        </Link>

        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-purple-500/20 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Logo Image View in Full Size */}
            <div className="w-full h-[360px] sm:h-[450px] rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-6 overflow-hidden relative shadow-inner">
              <img
                src={logo.image}
                alt={logo.title}
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold shadow-lg">
                {logo.anonymousCode}
              </div>
            </div>

            {/* Information & Voting Card */}
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Blind Voting Ballot
                </span>
                <h1 className="text-3xl font-extrabold text-white mt-2 leading-snug">{logo.title}</h1>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Design Concept</h4>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  {logo.description}
                </p>
              </div>

              {/* Vote Info or Success State */}
              {logo.hasVoted ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h5 className="text-sm font-bold">Your vote has been recorded successfully</h5>
                    <p className="text-xs text-emerald-400/80">Thank you for voting for this design entry.</p>
                  </div>
                </div>
              ) : !isVotingOpen ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300">
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <h5 className="text-sm font-bold">Voting is Closed</h5>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      The competition is currently in <strong className="uppercase">{votingPhase}</strong> phase.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleVote}
                  disabled={isVoting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl hover:shadow-purple-500/10 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  <Vote className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {isVoting ? 'Submitting Ballot...' : 'Vote for this Logo'}
                </button>
              )}

              {/* Dynamic QR Reference */}
              {logo.qrCode && (
                <div className="pt-4 border-t border-white/5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-white p-1 overflow-hidden shrink-0 border border-slate-700">
                    <img src={logo.qrCode} alt="Logo QR Code" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Unique Logo Entry QR Code</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Scanned dynamically by voters to display this ballot screen.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VoteLogoDetails;
