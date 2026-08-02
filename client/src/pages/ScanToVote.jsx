import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, QrCode, StopCircle, ArrowLeft, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const ScanToVote = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [remainingLimit, setRemainingLimit] = useState(500);
  const [competitionPhase, setCompetitionPhase] = useState('VOTING');
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicConfig();
  }, []);

  useEffect(() => {
    let qrScanner = null;
    if (scannerActive) {
      qrScanner = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      }, false);

      qrScanner.render(
        (decodedText) => {
          // Check if QR matches the generic voting URL or has public-vote key
          if (decodedText.includes('/public-vote') || decodedText.toUpperCase() === 'AI_FORUM_PUBLIC_VOTE') {
            qrScanner.clear().catch(() => {});
            setScannerActive(false);
            toast.success('QR Code verified! Redirecting to public voting ballot...');
            navigate('/public-vote');
          } else {
            toast.error('Invalid QR Code. Please scan a valid AI Forum public voting QR.');
          }
        },
        (err) => {
          // Silent scan error to prevent log pollution
        }
      );
    }

    return () => {
      if (qrScanner) {
        qrScanner.clear().catch((e) => {});
      }
    };
  }, [scannerActive]);

  const fetchPublicConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/public/config');
      if (res.success) {
        setRemainingLimit(res.remainingLimit);
        setCompetitionPhase(res.phase);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch config details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse text-center">Loading Scanner Interface...</p>
        </div>
      </div>
    );
  }

  const isVotingOpen = competitionPhase === 'VOTING' && remainingLimit > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar currentPhase={competitionPhase} />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-12 flex flex-col justify-center space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-cyan-500/30 shadow-2xl relative overflow-hidden">
          {/* Decorative Corner Glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full" />
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-glow-blue">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Public Scan Gateway
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Scan To Vote</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Scan the generic AI Forum Voting QR code on physical displays using your camera to open the public ballot.
            </p>
          </div>

          {/* Remaining Scan Limit Display */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">Remaining Scan/Vote Limit</p>
            <p className={`text-2xl font-extrabold font-mono ${remainingLimit <= 0 ? 'text-rose-500' : 'text-cyan-400'}`}>
              {remainingLimit} / 500
            </p>
            {remainingLimit <= 0 && (
              <span className="inline-block text-[10px] text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20 uppercase animate-pulse">
                Voting Closed
              </span>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center">
            {!isVotingOpen ? (
              <div className="w-full p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Voting Closed</h3>
                <p className="text-xs text-slate-400">
                  {remainingLimit <= 0 
                    ? 'The maximum limit of 500 scan-based votes has been completed.' 
                    : `Voting is closed. Phase: ${competitionPhase.replace('_', ' ')}`}
                </p>
              </div>
            ) : scannerActive ? (
              <div className="w-full space-y-4">
                <div id="reader" className="w-full overflow-hidden rounded-xl border border-slate-700 bg-black shadow-inner"></div>
                <button
                  onClick={() => setScannerActive(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <StopCircle className="w-4 h-4 text-rose-500" /> Stop Camera Scanner
                </button>
              </div>
            ) : (
              <button
                onClick={() => setScannerActive(true)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Camera className="w-5 h-5" /> Start QR Scanner
              </button>
            )}
          </div>

          {/* Guidelines */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-[10px] text-slate-500 space-y-1.5">
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-500/60" /> No signup or login required to participate.</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-500/60" /> Limited to exactly 1 ballot submission per voter per logo.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScanToVote;
