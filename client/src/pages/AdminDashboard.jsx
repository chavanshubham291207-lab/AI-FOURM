import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import GlassModal from '../components/GlassModal';
import EditLogoModal from '../components/EditLogoModal';
import AddNewLogoModal from '../components/AddNewLogoModal';
import api from '../services/api';
import { MAX_VOTES } from '../utils/constants';
import {
  Users,
  ImageIcon,
  Star,
  Award,
  Download,
  Play,
  Layers,
  Search,
  TrendingUp,
  ShieldCheck,
  Clock,
  Edit,
  Trash2,
  QrCode,
  RefreshCw,
  FileText,
  ExternalLink,
  AlertCircle,
  PlusCircle,
  RotateCcw
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [logos, setLogos] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [failedImageMap, setFailedImageMap] = useState({});

  const [activeTab, setActiveTab] = useState('logos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [targetPhase, setTargetPhase] = useState('REGISTRATION');
  const [updatingPhase, setUpdatingPhase] = useState(false);

  // Reset Competition States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResettingCompetition, setIsResettingCompetition] = useState(false);

  const handleResetCompetitionSubmit = async () => {
    try {
      setIsResettingCompetition(true);
      const res = await api.post('/admin/reset-competition');
      if (res.success) {
        toast.success(res.message || 'Competition has been reset successfully.');
        setIsResetModalOpen(false);
        try {
          localStorage.removeItem('ai_forum_voted_logos');
          localStorage.removeItem('ai_forum_voter_token');
        } catch (e) {}
        await fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reset competition');
    } finally {
      setIsResettingCompetition(false);
    }
  };

  // Add New Logo Modal States
  const [isAddLogoModalOpen, setIsAddLogoModalOpen] = useState(false);
  const [isCreatingLogo, setIsCreatingLogo] = useState(false);

  const handleCreateLogoSubmit = async (formData) => {
    try {
      setIsCreatingLogo(true);
      const res = await api.post('/admin/logos', formData);

      if (res.success) {
        toast.success(res.message || 'Logo added successfully.');
        setIsAddLogoModalOpen(false);
        fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add logo');
    } finally {
      setIsCreatingLogo(false);
    }
  };

  // Edit Logo Modal States
  const [editingLogo, setEditingLogo] = useState(null);
  const [isEditLogoModalOpen, setIsEditLogoModalOpen] = useState(false);
  const [isSavingLogoImage, setIsSavingLogoImage] = useState(false);

  const handleOpenEditLogoModal = (logo) => {
    setEditingLogo(logo);
    setIsEditLogoModalOpen(true);
  };

  const handleSaveLogoImage = async (logoId, payload, newLogoCode) => {
    try {
      setIsSavingLogoImage(true);
      let formData;
      if (payload instanceof FormData) {
        formData = payload;
      } else {
        formData = new FormData();
        if (payload) formData.append('image', payload);
        if (newLogoCode) formData.append('anonymousCode', newLogoCode);
      }

      const res = await api.put(`/admin/logos/${logoId}`, formData);

      if (res.success) {
        toast.success(res.message || 'Participant information updated successfully.');
        setIsEditLogoModalOpen(false);
        setEditingLogo(null);
        fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update participant information');
    } finally {
      setIsSavingLogoImage(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, partRes, logosRes, analyticsRes, votesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/participants'),
        api.get('/admin/logos'),
        api.get('/admin/analytics'),
        api.get('/admin/votes')
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (partRes.success) setParticipants(partRes.participants);
      if (logosRes.success) {
        setLogos(logosRes.logos);
        setFailedImageMap((prev) => {
          const next = { ...prev };
          (logosRes.logos || []).forEach((l) => {
            if (next[l.id]) delete next[l.id];
          });
          return next;
        });
      }
      if (analyticsRes.success) {
        setLeaderboard(analyticsRes.leaderboard);
      }
      if (votesRes.success) {
        setVotes(votesRes.votes || []);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch admin metrics');
    } finally {
      setLoading(false);
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

  const handleSyncDrive = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post('/admin/import-local');
      if (res.success) {
        toast.success(res.message);
        fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to import local logos');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePhase = async () => {
    try {
      setUpdatingPhase(true);
      const res = await api.put('/admin/phase', { phase: targetPhase });
      if (res.success) {
        toast.success(res.message);
        setIsPhaseModalOpen(false);
        fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingPhase(false);
    }
  };

  const handleAnnounceWinner = async (logoId) => {
    try {
      const res = await api.post('/admin/announce-winner', { logoId });
      if (res.success) {
        toast.success(res.message);
        fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/admin/export', '_blank');
    toast.info('Downloading logo rating results CSV...');
  };

  const handleOpenEditModal = (logo) => {
    setEditingLogo(logo);
    setEditTitle(logo.title);
    setEditDescription(logo.description);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsUpdatingLogo(true);
      const payload = { title: editTitle, description: editDescription };

      const res = await api.put(`/admin/logos/${editingLogo.id}`, payload);

      if (res.success) {
        toast.success('Logo details updated successfully');
        setEditingLogo(null);
        fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update logo details');
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  const [deletingLogoId, setDeletingLogoId] = useState(null);

  const handleDeleteLogo = async (logoId) => {
    if (deletingLogoId) return; // Prevent duplicate API calls from rapid double-clicks

    if (!window.confirm('Are you sure you want to delete this logo design candidate? All associated ratings will be permanently deleted.')) {
      return;
    }

    try {
      setDeletingLogoId(logoId);
      const res = await api.delete(`/admin/logos/${logoId}`);
      if (res.success) {
        toast.success(res.message);
        // Optimistically remove logo from local state to prevent UI flicker
        setLogos((prev) => prev.filter((l) => l.id !== logoId));
        await fetchAdminData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete logo entry');
    } finally {
      setDeletingLogoId(null);
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse text-center">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  const filteredVotes = votes.filter(
    (v) =>
      v.voterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.selectedCandidate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogos = logos.filter(
    (l) =>
      l.anonymousCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topRatedCandidateCode = leaderboard[0] ? leaderboard[0].anonymousCode : 'Pending';
  const topRatedCandidateRating = leaderboard[0] ? `${leaderboard[0].averageRating.toFixed(2)} ★` : 'Not Rated';

  const leaderboardChartData = {
    labels: leaderboard.map(l => l.anonymousCode),
    datasets: [{
      label: 'Average Rating',
      data: leaderboard.map(l => l.averageRating),
      backgroundColor: 'rgba(236, 72, 153, 0.5)',
      borderColor: 'rgb(236, 72, 153)',
      borderWidth: 1
    }]
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] overflow-x-hidden">
      <Navbar currentPhase={stats.competitionStatus} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        <div className="glass-card p-5 sm:p-8 rounded-2xl border border-pink-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-semibold w-fit shrink-0 whitespace-nowrap">
                <ShieldCheck className="w-4 h-4 text-pink-400" /> Executive Control Panel
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold w-fit shrink-0 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Status: {stats.competitionStatus.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              Logo Design Rating System Manager
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Upload logo candidates, view individual star rating logs, export audit files, and transition phases.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                setTargetPhase(stats.competitionStatus);
                setIsPhaseModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all"
            >
              <Play className="w-4 h-4" /> Change Phase
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all"
            >
              <Download className="w-4 h-4 text-cyan-400" /> Export CSV
            </button>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/50 text-rose-300 hover:text-white text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all shadow-md"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" /> Reset Competition
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
          <StatCard title="Total Unique Voters" value={stats.totalUniqueVoters ?? stats.totalVoters} icon={Users} color="purple" />
          <StatCard title="Total Votes Cast" value={stats.totalVotes} icon={Star} color="pink" />
          <StatCard title="Duplicate Vote Attempts" value={stats.duplicateAttempts ?? 0} icon={AlertCircle} color="rose" />
          <StatCard title="Remaining Limit" value={`${stats.remainingVotesLimit} / ${MAX_VOTES}`} icon={Clock} color="blue" />
          <StatCard
            title="Highest Rated Logo"
            value={topRatedCandidateCode}
            icon={Award}
            color="amber"
            subtext={topRatedCandidateRating}
          />
        </div>

        {stats.genericQrCode && (
          <div className="glass-card p-5 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-900/40">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white p-1 rounded-xl overflow-hidden shrink-0 border border-slate-700 shadow-inner">
                <img src={stats.genericQrCode} alt="General public voting QR code" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-cyan-400 animate-pulse" /> Official Public Voting QR Code
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  Print and display this QR code on flyers/boards around campus. Scanning this QR code will route students directly to the public logo rating system.
                </p>
              </div>
            </div>
            <a
              href={stats.genericQrCode}
              download="AI_Forum_Public_Rating_QR.png"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Download Voting QR
            </a>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto w-full scrollbar-thin">
          {[
            { id: 'logos', label: `Candidates (${logos.length})`, icon: ImageIcon },
            { id: 'votes', label: `Rating Audit Logs (${votes.length})`, icon: Star },
            { id: 'leaderboard', label: 'Standings (Average Rating)', icon: Award },
            { id: 'analytics', label: 'Score Distribution', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-glow-pink'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'logos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-bold text-white">Logo Candidates</h3>
                <button
                  onClick={() => setIsAddLogoModalOpen(true)}
                  className="px-4 py-2 rounded-xl btn-gradient-pink text-white text-xs font-extrabold shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                >
                  <PlusCircle className="w-4 h-4 text-white" /> Add New Logo
                </button>
                <button
                  onClick={handleSyncDrive}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-55"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Import Local Logos'}
                </button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by code, title, or student..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            {filteredLogos.length === 0 ? (
              <div className="glass-card p-12 text-center border border-white/5 rounded-2xl">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-white text-sm font-semibold">No Logo Entries Match Search</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredLogos.map((logo) => (
                  <div key={logo.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
                    <div>
                      {/* LARGE CENTERED DIRECT LOGO IMAGE OR PDF PREVIEW DISPLAY AT TOP */}
                      <div className="w-full h-64 sm:h-72 bg-slate-950/90 border border-slate-900 rounded-xl flex items-center justify-center p-3 overflow-hidden relative group">
                        {isPdfSubmission(logo) || failedImageMap[logo.id] === 'PDF_PREVIEW' ? (
                          <iframe
                            src={getPdfPreviewUrl(logo)}
                            className="w-full h-full rounded-lg border-0 bg-slate-900"
                            title={logo.title || 'PDF Preview'}
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
                            alt={logo.title}
                            referrerPolicy="no-referrer"
                            onError={() => {
                              if (!failedImageMap[logo.id]) {
                                setFailedImageMap((prev) => ({ ...prev, [logo.id]: 'FALLBACK' }));
                              } else if (failedImageMap[logo.id] === 'FALLBACK') {
                                setFailedImageMap((prev) => ({ ...prev, [logo.id]: 'PDF_PREVIEW' }));
                              }
                            }}
                            className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                      </div>

                      {/* Header status - Anonymous Code & Title */}
                      <div className="flex items-center justify-between mt-4 border-b border-white/5 pb-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-pink-300 font-mono font-bold text-xs border border-pink-500/25">
                          {logo.anonymousCode}
                        </span>
                        <h4 className="text-xs font-extrabold text-white font-mono tracking-wide line-clamp-1">
                          {logo.title}
                        </h4>
                      </div>

                      {/* Student & Rating Details Grid */}
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-950/65 border border-slate-900 text-xs text-slate-400 space-y-2 font-sans">
                        <p className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-400"><Users className="w-3.5 h-3.5 text-cyan-400" /> Student Name:</span>
                          <strong className="text-slate-200 font-semibold">{logo.studentName || 'Anonymous'}</strong>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Email:</span>
                          <span className="text-slate-300 font-mono text-[11px] select-all">{logo.studentEmail || 'N/A'}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-400"><Layers className="w-3.5 h-3.5 text-pink-400" /> Department:</span>
                          <span className="text-slate-300">{logo.studentDepartment || 'N/A'}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-400"><Award className="w-3.5 h-3.5 text-amber-400" /> Roll Number:</span>
                          <span className="text-slate-300 font-mono">{logo.studentRollNumber || logo.rollNumber || 'N/A'}</span>
                        </p>
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="text-slate-400">Average Rating: <strong className="text-amber-400 font-mono">{logo.averageRating.toFixed(2)} ★</strong></span>
                          <span className="text-slate-400 font-mono">({logo.totalVotes} votes)</span>
                        </div>
                      </div>

                      {logo.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-2.5 leading-relaxed">{logo.description}</p>
                      )}
                    </div>

                    {/* Bottom Actions & Small "View Submission PDF" Button */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <a
                        href={logo.pdfUrl || logo.rawImage || logo.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-indigo-300 hover:text-white text-[11px] font-semibold border border-slate-800 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>View Submission PDF</span>
                      </a>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditLogoModal(logo)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Edit className="w-3 h-3 text-cyan-400" /> Edit Logo
                        </button>
                        <button
                          onClick={() => handleDeleteLogo(logo.id)}
                          disabled={deletingLogoId !== null}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                            deletingLogoId === logo.id
                              ? 'bg-rose-950 text-rose-300 cursor-not-allowed opacity-80'
                              : deletingLogoId !== null
                              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-50'
                              : 'bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400'
                          }`}
                        >
                          {deletingLogoId === logo.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin"></div>
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 text-rose-500" /> Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILED RATING AUDIT LOGS */}
        {activeTab === 'votes' && (
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <div>
                <h3 className="text-lg font-bold text-white">Public Auditable Rating Logs</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Audit log of all registered ratings cast by students.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by reviewer name, email, department..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            {filteredVotes.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-xl border border-white/5">
                <p className="text-slate-400 text-xs">No rating logs found matching query.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-slate-800/85">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap">Voter Name</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Email Address</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Department</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Rating Stars</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Rated Logo candidate</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Rating Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredVotes.map((vote) => (
                      <tr key={vote.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-4 px-4 font-bold text-white whitespace-nowrap">{vote.voterName}</td>
                        <td className="py-4 px-4 text-slate-300 font-medium whitespace-nowrap">{vote.email}</td>
                        <td className="py-4 px-4 text-slate-400 whitespace-nowrap">{vote.department}</td>
                        <td className="py-4 px-4 font-mono font-bold text-amber-400 whitespace-nowrap flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {vote.rating} / 5
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-pink-300 whitespace-nowrap">
                          {vote.selectedCandidate}
                        </td>
                        <td className="py-4 px-4 text-slate-400 whitespace-nowrap font-mono">
                          {new Date(vote.voteTime).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STANDINGS SORTED BY HIGHEST AVERAGE RATING */}
        {activeTab === 'leaderboard' && (
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 space-y-6 w-full">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Standings Leaderboard (Sorted by Rating)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Rankings calculated by highest average star rating score.</p>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-white/5">
                <p className="text-slate-400 text-xs">No entries available in the standings yet.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Rank</th>
                      <th className="py-3.5 px-4">Entry ID</th>
                      <th className="py-3.5 px-4">Logo</th>
                      <th className="py-3.5 px-4">Student Name</th>
                      <th className="py-3.5 px-4">Student Contact (Email & Dept)</th>
                      <th className="py-3.5 px-4 text-center">Average Rating</th>
                      <th className="py-3.5 px-4 text-center">Total Reviews</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {leaderboard.map((logo, idx) => (
                      <tr key={logo.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-400 font-mono">
                          {idx === 0 ? '👑 1' : idx + 1}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-pink-300">{logo.anonymousCode}</td>
                        <td className="py-4 px-4">
                          <div className="w-10 h-10 rounded bg-slate-950 p-1 border border-slate-800 flex items-center justify-center overflow-hidden">
                            <img src={logo.image} alt={logo.anonymousCode} className="max-h-full max-w-full object-contain" />
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-white text-xs">{logo.studentName || 'Anonymous'}</td>
                        <td className="py-4 px-4 space-y-0.5 text-left">
                          <p className="text-[10px] text-slate-300 font-mono">{logo.studentEmail || 'N/A'}</p>
                          <p className="text-[10px] text-slate-500">{logo.studentDepartment || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-amber-400 font-mono">
                          <span className="inline-flex items-center gap-1 justify-center">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {logo.averageRating.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-indigo-400 font-mono">{logo.totalVotes}</td>
                        <td className="py-4 px-4 text-right">
                          {stats.competitionStatus === 'WINNER_ANNOUNCED' && stats.winner?.logoId === logo.id ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                              Winner Declared
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAnnounceWinner(logo.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-semibold text-[10px] uppercase tracking-wider transition-colors"
                            >
                              Declare Winner
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ANALYTICS CHART */}
        {activeTab === 'analytics' && (
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 w-full h-auto">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-400" /> Leaderboard Ratings Analytics (Average Stars)
            </h3>
            <div className="relative w-full h-[320px] sm:h-[400px]">
              <Bar
                data={leaderboardChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
                  },
                  scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { min: 0, max: 5, ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                  }
                }}
              />
            </div>
          </div>
        )}

      </main>

      {/* Add New Logo Modal */}
      {isAddLogoModalOpen && (
        <AddNewLogoModal
          isOpen={isAddLogoModalOpen}
          onClose={() => setIsAddLogoModalOpen(false)}
          onSave={handleCreateLogoSubmit}
          isSaving={isCreatingLogo}
        />
      )}

      {/* Edit Logo Modal */}
      {isEditLogoModalOpen && editingLogo && (
        <EditLogoModal
          isOpen={isEditLogoModalOpen}
          onClose={() => {
            setIsEditLogoModalOpen(false);
            setEditingLogo(null);
          }}
          logo={editingLogo}
          onSave={handleSaveLogoImage}
          isSaving={isSavingLogoImage}
        />
      )}

      {/* Change Phase modal */}
      <GlassModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        title="Change Competition Phase"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Updating the competition phase immediately updates what operations are available to voters.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['REGISTRATION', 'VOTING', 'CLOSED', 'WINNER_ANNOUNCED'].map((phaseOpt) => (
              <button
                key={phaseOpt}
                onClick={() => setTargetPhase(phaseOpt)}
                className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  targetPhase === phaseOpt
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {phaseOpt.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsPhaseModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdatePhase}
              disabled={updatingPhase}
              className="px-5 py-2 rounded-xl btn-gradient-pink text-white text-xs font-semibold"
            >
              {updatingPhase ? 'Updating...' : 'Update Phase'}
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Reset Competition Modal */}
      <GlassModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Competition"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-rose-200 block">Warning: Irreversible Voting Reset</span>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                This will permanently delete all rating logs, votes cast, and duplicate-vote tracking records. Every candidate logo's stats will be reset to 0 votes and 0 average rating.
              </p>
              <p className="text-[11px] font-semibold text-emerald-300 pt-1">
                ✓ Candidate logo images, participant information, and PDF submissions will remain 100% intact.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResettingCompetition}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleResetCompetitionSubmit}
              disabled={isResettingCompetition}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isResettingCompetition ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirm Reset</span>
                </>
              )}
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

export default AdminDashboard;
