import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import CountdownTimer from '../components/CountdownTimer';
import GlassModal from '../components/GlassModal';
import api from '../services/api';
import {
  Upload,
  Image as ImageIcon,
  Edit3,
  Award,
  User,
  AlertCircle
} from 'lucide-react';

const StudentDashboard = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [submission, setSubmission] = useState(null);
  const [competition, setCompetition] = useState({ phase: 'REGISTRATION', deadline: null });
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / Profile Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(user ? user.name : '');
  const [profileRoll, setProfileRoll] = useState(user ? user.rollNumber : '');
  const [profileDept, setProfileDept] = useState(user ? user.department : '');

  useEffect(() => {
    fetchSubmissionData();
  }, []);

  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/submission');
      if (res.success) {
        setSubmission(res.submission);
        setCompetition(res.competition || { phase: 'REGISTRATION' });

        if (res.submission) {
          setTitle(res.submission.title);
          setDescription(res.submission.description);
        }

        // Trigger celebratory confetti if winner announced and this student won!
        if (
          res.competition &&
          res.competition.phase === 'WINNER_ANNOUNCED' &&
          res.competition.winner
        ) {
          if (
            res.submission &&
            res.competition.winner.anonymousCode === res.submission.anonymousCode
          ) {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          }
        }
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please enter title and description');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a logo image file');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('image', selectedFile);

      const res = await api.post('/student/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.success) {
        toast.success(res.message);
        setSubmission(res.submission);
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const res = await api.put('/student/submission', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.success) {
        toast.success('Submission updated successfully!');
        setSubmission(res.submission);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const success = await updateProfile({
      name: profileName,
      rollNumber: profileRoll,
      department: profileDept
    });
    if (success) {
      setIsProfileModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse">Loading Student Dashboard...</p>
        </div>
      </div>
    );
  }

  const isRegistrationPhase = competition.phase === 'REGISTRATION';

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar currentPhase={competition.phase} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 1. Welcome / Profile Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Welcome, {user ? user.name : 'Student'}</h1>
                <p className="text-xs text-slate-400">
                  {user ? `${user.department} | Roll: ${user.rollNumber}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <CountdownTimer targetDate={competition.deadline} />
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Winner Announcement Banner (If Announced) */}
        {competition.phase === 'WINNER_ANNOUNCED' && competition.winner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-2xl glass-panel border border-pink-500/40 bg-gradient-to-r from-purple-950/60 via-pink-950/50 to-slate-900 shadow-glow-pink relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-44 h-44 rounded-2xl overflow-hidden bg-slate-950 border-2 border-pink-500/50 shadow-2xl shrink-0">
                <img
                  src={competition.winner.image}
                  alt="Winner Logo"
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <div className="space-y-3 text-center md:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-bold uppercase tracking-wider">
                  <Award className="w-4 h-4 text-pink-400" /> Official Competition Winner
                </div>
                <h2 className="text-3xl font-extrabold text-white">{competition.winner.title}</h2>
                <p className="text-sm text-slate-300 italic">"{competition.winner.description}"</p>
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 justify-center md:justify-start">
                  <span className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700">
                    Winner ID: <strong className="text-pink-400">{competition.winner.anonymousCode}</strong>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700">
                    Designer: <strong className="text-cyan-300">{competition.winner.studentName}</strong> ({competition.winner.department})
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-amber-300">
                    Rating: ⭐ {competition.winner.averageRating} / 5 ({competition.winner.totalVotes} votes)
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. Main Content: My Submission OR Upload Form */}
        {submission ? (
          /* View Submission Section */
          <div className="glass-card p-8 rounded-2xl border border-blue-500/30 relative">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Logo Preview */}
              <div className="w-full md:w-80 h-80 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden p-4 relative group shrink-0">
                <img
                  src={submission.image}
                  alt={submission.title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/90 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold shadow-lg">
                  {submission.anonymousCode}
                </div>
              </div>

              {/* Submission Details */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                      Your Submitted Logo
                    </span>
                    <h2 className="text-3xl font-extrabold text-white mt-2">{submission.title}</h2>
                  </div>
                  {isRegistrationPhase && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl btn-gradient text-white text-xs font-semibold flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Submission
                    </button>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    {submission.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <p className="text-[11px] text-slate-400">Entry ID (Anonymous)</p>
                    <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{submission.anonymousCode}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <p className="text-[11px] text-slate-400">Average Rating</p>
                    <p className="text-lg font-bold text-amber-400 mt-0.5">
                      ⭐ {submission.averageRating ? submission.averageRating.toFixed(1) : '0.0'} / 5
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <p className="text-[11px] text-slate-400">Total Votes Received</p>
                    <p className="text-lg font-bold text-purple-400 mt-0.5">{submission.totalVotes || 0}</p>
                  </div>
                </div>

                {!isRegistrationPhase && (
                  <p className="text-xs text-amber-400/90 flex items-center gap-1.5 pt-2">
                    <AlertCircle className="w-4 h-4" /> Editing disabled as competition phase is currently {competition.phase}.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Upload Logo Form (If no submission yet) */
          <div className="glass-card p-8 rounded-2xl border border-blue-500/30">
            <div className="mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-400" /> Upload Your Logo Entry
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                You can upload only ONE logo design. Entry ID will be generated automatically.
              </p>
            </div>

            {!isRegistrationPhase ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-amber-500/30">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">Submissions Are Closed</h3>
                <p className="text-xs text-slate-400 mt-1">
                  The competition is currently in <strong className="text-amber-300">{competition.phase}</strong> phase. New uploads are disabled.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* File Upload Box */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      Logo Design Image
                    </label>
                    <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-900/50 transition-colors flex flex-col items-center justify-center min-h-[260px] cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {previewUrl ? (
                        <div className="w-full h-48 flex items-center justify-center">
                          <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                            <ImageIcon className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">Click or Drag & Drop Logo</p>
                            <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP or SVG (Max 5MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Logo Title
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. CyberPulse AI Emblem"
                        className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Logo Concept & Description
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the inspiration, design elements, and symbolism behind your logo design..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl btn-gradient text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Uploading Submission...' : 'Submit Logo Design'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

      </main>

      {/* Edit Submission Modal */}
      <GlassModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Logo Submission"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Logo Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Replace Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl btn-gradient text-white text-xs font-semibold"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Edit Profile Modal */}
      <GlassModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Update Profile Information"
      >
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Roll Number
            </label>
            <input
              type="text"
              required
              value={profileRoll}
              onChange={(e) => setProfileRoll(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Department
            </label>
            <input
              type="text"
              required
              value={profileDept}
              onChange={(e) => setProfileDept(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl btn-gradient text-white text-xs font-semibold"
            >
              Update Profile
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};

export default StudentDashboard;
