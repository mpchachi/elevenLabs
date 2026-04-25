import { useState, useEffect } from 'react';

const GRADE = [
  { min: 85, label: 'Excellent', sub: 'Top candidate material' },
  { min: 70, label: 'Good', sub: 'Strong performance' },
  { min: 50, label: 'Developing', sub: 'Clear areas to improve' },
  { min: 0,  label: 'Needs Work', sub: 'Significant gaps identified' },
];

function getColor(score) {
  if (score >= 70) return { stroke: '#22c55e', text: 'text-green-400', glow: 'shadow-green-500/20' };
  if (score >= 50) return { stroke: '#eab308', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' };
  return { stroke: '#ef4444', text: 'text-red-400', glow: 'shadow-red-500/20' };
}

export default function ScoreGauge({ score = 0 }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  const R = 88;
  const C = 2 * Math.PI * R;
  const ARC = C * 0.75;           // 270° arc
  const progress = ARC * (animated / 100);
  const color = getColor(score);
  const grade = GRADE.find(g => score >= g.min);

  return (
    <div className={`flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-dark-700/50 p-6 shadow-xl ${color.glow}`}>
      <p className="text-xs font-bold uppercase tracking-widest text-white/30">Overall Score</p>

      <div className="relative">
        <svg width={220} height={220} viewBox="0 0 220 220">
          {/* Track */}
          <circle
            cx={110} cy={110} r={R}
            fill="none" stroke="#ffffff08" strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${ARC} ${C - ARC}`}
            transform="rotate(135 110 110)"
          />
          {/* Progress */}
          <circle
            cx={110} cy={110} r={R}
            fill="none" stroke={color.stroke} strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${C}`}
            transform="rotate(135 110 110)"
            style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(0.34,1.56,0.64,1), stroke 0.4s ease' }}
          />
          {/* Score number */}
          <text
            x={110} y={103}
            textAnchor="middle" dominantBaseline="central"
            fill={color.stroke} fontSize={54} fontWeight={800}
            style={{ fontFamily: 'inherit', transition: 'fill 0.4s ease' }}
          >
            {score}
          </text>
          <text
            x={110} y={140}
            textAnchor="middle"
            fill="#ffffff30" fontSize={13}
            style={{ fontFamily: 'inherit' }}
          >
            out of 100
          </text>
        </svg>
      </div>

      <div className="text-center">
        <p className={`text-xl font-bold ${color.text}`}>{grade?.label}</p>
        <p className="text-xs text-white/35 mt-0.5">{grade?.sub}</p>
      </div>
    </div>
  );
}
