import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtext = '' }) => {
  const colorMap = {
    blue: {
      iconBg: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
      glow: 'group-hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]',
      border: 'hover:border-blue-500/40'
    },
    purple: {
      iconBg: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
      glow: 'group-hover:shadow-[0_0_25px_rgba(139,92,246,0.3)]',
      border: 'hover:border-purple-500/40'
    },
    pink: {
      iconBg: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
      glow: 'group-hover:shadow-[0_0_25px_rgba(236,72,153,0.3)]',
      border: 'hover:border-pink-500/40'
    },
    amber: {
      iconBg: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
      glow: 'group-hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]',
      border: 'hover:border-amber-500/40'
    },
    cyan: {
      iconBg: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
      glow: 'group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]',
      border: 'hover:border-cyan-500/40'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`group p-5 rounded-2xl glass-card border border-white/10 ${scheme.border} transition-all duration-300 ${scheme.glow} h-full flex flex-col justify-between min-w-0 w-full`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 font-sans tracking-tight truncate">{value}</p>
          {subtext && <p className="text-[11px] text-slate-400 mt-1 truncate">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl border shrink-0 ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
