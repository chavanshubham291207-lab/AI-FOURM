import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTime = () => {
      const difference = new Date(targetDate) - new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
        <Clock className="w-4 h-4 text-purple-400" />
        <span>No active deadline set</span>
      </div>
    );
  }

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/30">
        <Clock className="w-4 h-4 text-amber-400" />
        <span>Deadline Expired</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span>Time Remaining:</span>
      </div>
      <div className="flex items-center gap-1 text-xs font-mono font-bold">
        <span className="px-2 py-1 rounded bg-slate-800 text-cyan-400 border border-slate-700">{timeLeft.days}d</span>
        <span className="text-slate-500">:</span>
        <span className="px-2 py-1 rounded bg-slate-800 text-purple-400 border border-slate-700">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="text-slate-500">:</span>
        <span className="px-2 py-1 rounded bg-slate-800 text-pink-400 border border-slate-700">{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span className="text-slate-500">:</span>
        <span className="px-2 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
