import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import GlassModal from '../components/GlassModal';
import StarRating from '../components/StarRating';
import api from '../services/api';
import {
  Users,
  ImageIcon,
  Vote,
  Star,
  Award,
  Download,
  Play,
  CheckCircle2,
  Lock,
  Layers,
  Search,
  Eye,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Clock
} from 'lucide-react';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [logos, setLogos] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogoModal, setSelectedLogoModal] = useState(null);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [targetPhase, setTargetPhase] = useState('REGISTRATION');
  const [updatingPhase, setUpdatingPhase] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, partRes, logosRes, analyticsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/participants'),
        api.get('/admin/logos'),
        api.get('/admin/analytics')
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (partRes.success) setParticipants(partRes.participants);
      if (logosRes.success) setLogos(logosRes.logos);
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.analytics);
        setLeaderboard(analyticsRes.leaderboard);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
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
    toast.info('Downloading competition results CSV...');
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse text-center">Loading Admin Control Panel...</p>
        </div>
      </div>
    );
  }

  // Filtered Participants
  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered Logos
  const filteredLogos = logos.filter(
    (l) =>
      l.anonymousCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.student && l.student.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Chart Data: Rating Distribution Bar Chart
  const ratingDistData = {
    labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
    datasets: [
      {
        label: 'Votes Cast',
        data: analytics
          ? [
              analytics.ratingDistribution[1] || 0,
              analytics.ratingDistribution[2] || 0,
              analytics.ratingDistribution[3] || 0,
              analytics.ratingDistribution[4] || 0,
              analytics.ratingDistribution[5] || 0
            ]
          : [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: '#8b5cf6',
        borderWidth: 1,
        borderRadius: 8
      }
    ]
  };

  // Chart Data: Department Submissions Doughnut Chart
  const deptLabels = analytics ? analytics.departmentStats.map((d) => d._id || 'General') : [];
  const deptCounts = analytics ? analytics.departmentStats.map((d) => d.studentCount) : [];

  const deptDoughnutData = {
    labels: deptLabels.length ? deptLabels : ['Computer Science', 'AI & DS', 'IT'],
    datasets: [
      {
        data: deptCounts.length ? deptCounts : [5, 3, 2],
        backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] overflow-x-hidden">
      <Navbar currentPhase={stats.competitionStatus} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Executive Control Panel Banner (No Overlap - Responsive Stack) */}
        <div className="glass-card p-5 sm:p-8 rounded-2xl border border-pink-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full h-auto min-h-0">
          <div className="space-y-2 min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-semibold w-fit shrink-0 whitespace-nowrap">
                <ShieldCheck className="w-4 h-4 text-pink-400" /> Executive Control Panel
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold w-fit shrink-0 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Status: {stats.competitionStatus.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              AI Forum Logo Competition Admin
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Full visibility into student details, real-time vote metrics, leaderboard standings, and winner declaration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                setTargetPhase(stats.competitionStatus);
                setIsPhaseModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg inline-flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto transition-all"
            >
              <Play className="w-4 h-4" /> Change Phase
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto transition-all"
            >
              <Download className="w-4 h-4 text-cyan-400" /> Export CSV
            </button>
          </div>
        </div>

        {/* 6 Key Stat Cards Grid (Equal Heights & Spacing) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
          <StatCard title="Total Students" value={stats.totalStudents} icon={Users} color="blue" />
          <StatCard title="Total Logos" value={stats.totalLogos} icon={ImageIcon} color="cyan" />
          <StatCard title="Total Votes" value={stats.totalVotes} icon={Vote} color="purple" />
          <StatCard title="Average Rating" value={`⭐ ${stats.averageRating}`} icon={Star} color="amber" />
          <StatCard title="Active Phase" value={stats.competitionStatus.replace('_', ' ')} icon={Layers} color="pink" />
          <StatCard
            title="Winner"
            value={stats.winner ? stats.winner.anonymousCode : 'Pending'}
            icon={Award}
            color="amber"
            subtext={stats.winner ? stats.winner.studentName : 'Not Announced'}
          />
        </div>

        {/* Admin Navigation Tabs (Scrollable on small screens) */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto w-full max-w-full scrollbar-thin">
          {[
            { id: 'overview', label: 'Analytics Overview', icon: TrendingUp },
            { id: 'participants', label: `Participants (${participants.length})`, icon: Users },
            { id: 'logos', label: `Logo Details & Mapping (${logos.length})`, icon: ImageIcon },
            { id: 'leaderboard', label: 'Live Leaderboard', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

        {/* TAB 1: OVERVIEW & CHARTS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 w-full">
            <div className="lg:col-span-2 glass-card p-5 sm:p-6 rounded-2xl border border-white/10 w-full min-w-0 h-auto">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Voting Rating Frequency Distribution
              </h3>
              <div className="relative w-full h-[260px] sm:h-[300px] max-w-full">
                <Bar data={ratingDistData} options={chartOptions} />
              </div>
            </div>

            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col justify-between w-full min-w-0 h-auto">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Department Submissions
              </h3>
              <div className="relative w-full h-[220px] sm:h-[250px] flex items-center justify-center">
                <Doughnut data={deptDoughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-4 italic">
                Breakdown of student registrations per college department.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: PARTICIPANTS TABLE */}
        {activeTab === 'participants' && (
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <h3 className="text-lg font-bold text-white">Registered Students Roster</h3>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search student, email, roll..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Student Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Roll Number</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Department</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Email</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Submission</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredParticipants.map((student) => (
                    <tr key={student.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">{student.name}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400 whitespace-nowrap">{student.rollNumber}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{student.department}</td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{student.email}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {student.hasSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                            {student.submission.anonymousCode} ({student.submission.title})
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No Upload Yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(student.registeredAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LOGO DETAILS & ANONYMOUS CODE MAPPING */}
        {activeTab === 'logos' && (
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <div>
                <h3 className="text-lg font-bold text-white">Logo Submissions & Identity Mapping</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admin-only mapping revealing which student created each anonymous Entry ID.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Entry ID, title, designer..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Preview</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Entry ID</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Title</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Student Designer (Admin View)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Average Rating</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Total Votes</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredLogos.map((logo) => (
                    <tr key={logo.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center">
                          <img src={logo.image} alt={logo.anonymousCode} className="w-full h-full object-contain" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">{logo.anonymousCode}</td>
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">{logo.title}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-purple-300">{logo.student.name}</span>
                        <div className="text-[10px] text-slate-400">
                          {logo.student.department} ({logo.student.rollNumber})
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-400 whitespace-nowrap">
                        ⭐ {logo.averageRating ? logo.averageRating.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-300 whitespace-nowrap">{logo.totalVotes}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLogoModal(logo)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Full Logo Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 space-y-6 w-full min-w-0">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" /> Competition Standings & Winner Selection
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sorted automatically by highest average rating. Click "Announce Winner" to finalize the competition.
              </p>
            </div>

            <div className="space-y-4 w-full">
              {leaderboard.map((item, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 transition-all w-full h-auto ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border-amber-500/50 shadow-glow-pink'
                        : isSecond
                        ? 'bg-slate-900/80 border-slate-400/30'
                        : isThird
                        ? 'bg-slate-900/60 border-amber-700/30'
                        : 'bg-slate-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full md:w-auto">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm font-mono shrink-0 ${
                          isFirst
                            ? 'bg-amber-400 text-slate-950 shadow-lg'
                            : isSecond
                            ? 'bg-slate-300 text-slate-950'
                            : isThird
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{item.rank}
                      </div>

                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0">
                        <img src={item.image} alt={item.anonymousCode} className="w-full h-full object-contain" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-cyan-400 text-xs sm:text-sm">{item.anonymousCode}</span>
                          <h4 className="text-sm sm:text-base font-bold text-white truncate">{item.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          Designer: <strong className="text-purple-300">{item.studentName}</strong> ({item.department})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-base sm:text-lg font-extrabold text-amber-400">
                          ⭐ {item.averageRating ? item.averageRating.toFixed(2) : '0.00'} / 5
                        </p>
                        <p className="text-[11px] text-slate-400">{item.totalVotes} Votes</p>
                      </div>

                      <button
                        onClick={() => handleAnnounceWinner(item.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all inline-flex items-center justify-center shrink-0 ${
                          stats.winner && stats.winner.logoId === item.id
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'btn-gradient-pink text-white'
                        }`}
                      >
                        {stats.winner && stats.winner.logoId === item.id
                          ? '👑 Winner Declared'
                          : 'Announce Winner'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Phase Switcher Modal */}
      <GlassModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        title="Update Competition Phase"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Select the new operational phase for the college competition:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {[
              { id: 'REGISTRATION', title: '1. Registration', desc: 'Students can upload logos' },
              { id: 'VOTING', title: '2. Voting Starts', desc: 'Voters can rate anonymous logos' },
              { id: 'CLOSED', title: '3. Voting Closed', desc: 'Lock ratings and calculate averages' },
              { id: 'WINNER_ANNOUNCED', title: '4. Winner Announced', desc: 'Publish winner on student portal' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTargetPhase(p.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  targetPhase === p.id
                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-glow-purple'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <p className="text-sm font-bold">{p.title}</p>
                <p className="text-[11px] opacity-80 mt-1">{p.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsPhaseModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdatePhase}
              disabled={updatingPhase}
              className="w-full sm:w-auto px-5 py-2 rounded-xl btn-gradient text-white text-xs font-semibold"
            >
              {updatingPhase ? 'Updating...' : 'Confirm Phase Change'}
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Selected Logo Full View Modal */}
      <GlassModal
        isOpen={Boolean(selectedLogoModal)}
        onClose={() => setSelectedLogoModal(null)}
        title={selectedLogoModal ? `Entry Details: ${selectedLogoModal.anonymousCode}` : ''}
        maxWidth="max-w-xl"
      >
        {selectedLogoModal && (
          <div className="space-y-4">
            <div className="w-full h-64 sm:h-72 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-4">
              <img src={selectedLogoModal.image} alt={selectedLogoModal.title} className="max-h-full max-w-full object-contain" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">{selectedLogoModal.title}</h3>
              <p className="text-xs text-slate-300 mt-2 bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {selectedLogoModal.description}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-1">
              <p className="font-bold text-purple-300">Identity Mapping (Admin Only):</p>
              <p className="text-slate-200">
                Student Name: <strong>{selectedLogoModal.student.name}</strong> ({selectedLogoModal.student.email})
              </p>
              <p className="text-slate-200">
                Roll: {selectedLogoModal.student.rollNumber} | Dept: {selectedLogoModal.student.department}
              </p>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};

export default AdminDashboard;
