const CATEGORY_CFG = {
  clarity:    { color: 'border-blue-500/30 bg-blue-500/8',    badge: 'bg-blue-500/15 text-blue-400' },
  structure:  { color: 'border-violet-500/30 bg-violet-500/8', badge: 'bg-violet-500/15 text-violet-400' },
  data:       { color: 'border-green-500/30 bg-green-500/8',   badge: 'bg-green-500/15 text-green-400' },
  confidence: { color: 'border-orange-500/30 bg-orange-500/8', badge: 'bg-orange-500/15 text-orange-400' },
  brevity:    { color: 'border-pink-500/30 bg-pink-500/8',     badge: 'bg-pink-500/15 text-pink-400' },
};

function TipCard({ tip }) {
  const cfg = CATEGORY_CFG[tip.category] ?? CATEGORY_CFG.clarity;
  return (
    <div className={`rounded-xl border p-4 flex gap-3 items-start ${cfg.color}`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{tip.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-sm font-bold text-white/85">{tip.title}</p>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.badge}`}>
            {tip.category}
          </span>
        </div>
        <p className="text-xs text-white/55 leading-relaxed">{tip.tip}</p>
      </div>
    </div>
  );
}

function SkeletonTip() {
  return (
    <div className="rounded-xl border border-white/8 p-4 flex gap-3 items-start animate-pulse">
      <div className="h-7 w-7 rounded-lg bg-white/8 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/8 rounded w-2/3" />
        <div className="h-3 bg-white/8 rounded w-full" />
        <div className="h-3 bg-white/8 rounded w-4/5" />
      </div>
    </div>
  );
}

const FALLBACK_TIPS = [
  { emoji: '📊', title: 'Quantify your impact', category: 'data',
    tip: 'Always anchor answers with numbers. Instead of "improved performance", say "reduced P99 latency by 40%".' },
  { emoji: '🏗️', title: 'Use STAR consistently', category: 'structure',
    tip: 'Structure every behavioral answer: Situation (10%), Task (10%), Action (60%), Result (20%). Most time on Action.' },
  { emoji: '🎙️', title: 'Cut filler words', category: 'confidence',
    tip: 'Replace "um", "like", and "basically" with a confident pause. Silence sounds authoritative; filler sounds nervous.' },
  { emoji: '⏱️', title: 'Aim for 60-70% talk time', category: 'brevity',
    tip: 'If you\'re talking more than 75% of the time, you\'re monologuing. Pause and invite the interviewer back in.' },
];

export default function ImprovementTips({ tips, loading, error }) {
  const displayTips = tips ?? (error ? FALLBACK_TIPS : null);

  return (
    <div className="rounded-2xl border border-white/8 bg-dark-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">Improvement Tips</p>
        {tips && !error && (
          <span className="text-[10px] text-white/20 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            AI-generated
          </span>
        )}
        {error && (
          <span className="text-[10px] text-white/25 italic">fallback tips shown</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {loading && !displayTips && (
          <>
            <SkeletonTip />
            <SkeletonTip />
            <SkeletonTip />
            <SkeletonTip />
          </>
        )}

        {displayTips?.map((tip, i) => (
          <TipCard key={i} tip={tip} />
        ))}
      </div>
    </div>
  );
}
