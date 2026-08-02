import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  Vote,
  Sparkles,
  Layers,
  QrCode,
  CheckCircle,
  AlertCircle,
  Eye,
  Camera,
  StopCircle
} from 'lucide-react';

const VoterDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [logos, setLogos] = useState([]);
  const [phase, setPhase] = useState('VOTING');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' or 'scan'
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    fetchLogos();
  }, []);

  useEffect(() => {
    let qrScanner = null;
    if (activeTab === 'scan' && scannerActive) {
      // Start camera scanner
      qrScanner = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      }, false);

      qrScanner.render(
        (decodedText) => {
          // Decode URL (e.g. http://localhost:3000/vote-logo/ID)
          if (decodedText.includes('/vote-logo/')) {
            const parts = decodedText.split('/vote-logo/');
            const logoId = parts[parts.length - 1];
            qrScanner.clear().catch(() => {});
            setScannerActive(false);
            toast.success('QR Code scanned successfully! Redirecting...');
            navigate(`/vote-logo/${logoId}`);
          } else {
            toast.error('Invalid QR Code. Please scan an AI Forum Logo QR.');
          }
        },
        (err) => {
          // Scan errors are ignored to prevent flood logs
        }
      );
    }

    return () => {
      if (qrScanner) {
        qrScanner.clear().catch((e) => {});
      }
    };
  }, [activeTab, scannerActive]);

  const fetchLogos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/voter/logos');
      if (res.success) {
        setLogos(res.logos || []);
        setPhase(res.phase || 'VOTING');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load logos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse">Loading Blind Voting Portal...</p>
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
        
        {/* Header Summary Banner */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold w-fit mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Blind Voting Ballot
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Voter Balloting Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select logo designs below or scan a physical logo QR code using your webcam to cast your ballot.
            </p>
          </div>

          {/* Stats Summary & Tab Switcher */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Your Voting Progress</p>
              <p className="text-sm font-extrabold text-purple-400 mt-0.5">
                {votedCount} / {logos.length} Logos Voted
              </p>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('gallery');
                  setScannerActive(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'gallery' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" /> Gallery
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'scan' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" /> QR Scanner
              </button>
            </div>
          </div>
        </div>

        {/* Global Phase Status Banner */}
        {!isVotingOpen && (
          <div className="p-4 rounded-2xl glass-panel border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              Voting is closed. The competition phase is currently <strong className="uppercase">{phase}</strong>.
            </div>
          </div>
        )}

        {/* Dynamic Viewport */}
        {activeTab === 'scan' ? (
          /* SCANNER VIEW */
          <div className="max-w-md mx-auto glass-card p-6 rounded-2xl border border-purple-500/30 flex flex-col items-center gap-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-400" /> QR Code Scanner
            </h2>
            <p className="text-xs text-slate-400 text-center -mt-2">
              Position the logo's unique QR code inside the camera viewfinder frame to read and route automatically.
            </p>

            {scannerActive ? (
              <div className="w-full space-y-4">
                <div id="reader" className="w-full overflow-hidden rounded-xl border border-slate-700 bg-black"></div>
                <button
                  onClick={() => setScannerActive(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-4 h-4 text-rose-500" /> Stop Camera Scanner
                </button>
              </div>
            ) : (
              <button
                onClick={() => setScannerActive(true)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" /> Start Camera Scanner
              </button>
            )}
          </div>
        ) : (
          /* GALLERY VIEW */
          logos.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center border border-white/10 max-w-lg mx-auto my-12">
              <Layers className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">No Logo Entries</h3>
              <p className="text-xs text-slate-400 mt-1">
                There are no uploaded logo entries for this competition yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  className="glass-card p-6 rounded-2xl border border-white/10 glass-card-hover flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-lg bg-slate-900 text-purple-300 font-mono font-bold text-xs border border-purple-500/20">
                        {logo.anonymousCode}
                      </span>
                      {logo.hasVoted && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Voted
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
                    <span className="text-xs font-medium text-slate-400">
                      Votes: <strong className="text-purple-400 font-bold">{logo.totalVotes || 0}</strong>
                    </span>
                    <button
                      onClick={() => navigate(`/vote-logo/${logo.id}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Ballot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default VoterDashboard;
