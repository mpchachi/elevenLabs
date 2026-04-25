// ─── Small building blocks ────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
      {children}
    </p>
  );
}

function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded bg-white/5 ${className}`} />
  );
}

// Circular SVG score ring
function ScoreRing({ value }) {
  const R = 28;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - (value ?? 0) / 100);

  const stroke =
    value === null ? '#ffffff20'
    : value >= 70  ? '#22c55e'
    : value >= 40  ? '#eab308'
    :                '#ef4444';

  return (
    <svg width={72} height={72} viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx={36} cy={36} r={R} fill="none" stroke="#ffffff08" strokeWidth={7} />
      <circle
        cx={36} cy={36} r={R}
        fill="none"
        stroke={stroke}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.4s ease' }}
      />
      <text
        x={36} y={36}
        textAnchor="middle"
        dominantBaseline="central"
        fill={stroke}
        fontSize={value === null ? 10 : 15}
        fontWeight="700"
        style={{ transition: 'fill 0.4s ease', fontFamily: 'inherit' }}
      >
        {value === null ? '—' : value}
      </text>
    </svg>
  );
}

// Horizontal progress bar with optional target zone markers
function ProgressBar({ value, color, targetMin, targetMax, max = 100 }) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="relative h-2.5 w-full rounded-full bg-white/8 overflow-hidden">
      {/* Target zone highlight */}
      {targetMin !== undefined && (
        <div
          className="absolute top-0 h-full rounded-full bg-green-500/20"
          style={{
            left: `${targetMin}%`,
            width: `${targetMax - targetMin}%`,
          }}
        />
      )}
      {/* Filled bar */}
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Structure badge ──────────────────────────────────────────────────────────

const STRUCT_CFG = {
  green:  { label: 'STAR Detected',        dot: 'bg-green-400',  text: 'text-green-400',  hint: 'Great structure — keep it up.' },
  yellow: { label: 'Partial Structure',     dot: 'bg-yellow-400', text: 'text-yellow-400', hint: 'Add a clear Result to complete STAR.' },
  red:    { label: 'No Clear Structure',    dot: 'bg-red-400',    text: 'text-red-400',    hint: 'Try: Situation → Task → Action → Result.' },
};

function StructureBadge({ value }) {
  if (!value) {
    return <Skeleton className="h-7 w-full" />;
  }

  const cfg = STRUCT_CFG[value];
  return (
    <div
      className="flex flex-col gap-1 transition-all duration-500"
      key={value}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
        <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
      </div>
      <p className="pl-4 text-[11px] text-white/35 leading-snug">{cfg.hint}</p>
    </div>
  );
}

// ─── Counter chip ─────────────────────────────────────────────────────────────

function CountChip({ count, icon, good, warn, label, sublabel }) {
  const color =
    count >= good  ? 'text-green-400'
    : count >= warn ? 'text-yellow-400'
    :                 'text-white/40';

  const ring =
    count >= good  ? 'border-green-400/30'
    : count >= warn ? 'border-yellow-400/30'
    :                 'border-white/10';

  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl border ${ring} p-3 transition-all duration-400`}>
      <span className="text-xl">{icon}</span>
      <span className={`text-2xl font-bold tabular-nums transition-all duration-500 ${color}`}>
        {count}
      </span>
      <span className="text-[10px] font-medium text-white/40 text-center leading-tight">{label}</span>
      {sublabel && (
        <span className="text-[9px] text-white/20 text-center">{sublabel}</span>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export default function FeedbackPanel({ metrics }) {
  const { clarityScore, structure, fillerCount, talkRatio, dataPoints, hasData, responseCount } = metrics;

  const ratioColor =
    talkRatio >= 60 && talkRatio <= 70 ? 'bg-green-500'
    : talkRatio >= 50 && talkRatio <= 80 ? 'bg-yellow-500'
    : 'bg-red-500';

  const ratioLabel =
    !hasData           ? '—'
    : talkRatio < 40   ? 'Talk more'
    : talkRatio < 60   ? 'A bit quiet'
    : talkRatio <= 70  ? 'Perfect ✓'
    : talkRatio <= 80  ? 'Slightly high'
    :                    'Dominating';

  const fillerSeverity =
    fillerCount <= 2 ? 'green'
    : fillerCount <= 5 ? 'yellow'
    : 'red';

  const fillerColors = {
    green:  'text-green-400 border-green-400/30',
    yellow: 'text-yellow-400 border-yellow-400/30',
    red:    'text-red-400 border-red-400/30',
  };

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <span className="text-sm font-bold text-white/80">Live Feedback</span>
        </div>
        {responseCount > 0 && (
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40 font-medium">
            {responseCount} response{responseCount !== 1 ? 's' : ''} analyzed
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">

        {/* ── Clarity Score ─────────────────── */}
        <div className="rounded-xl border border-white/8 bg-dark-700/40 p-4">
          <SectionLabel>Clarity Score</SectionLabel>
          <div className="flex items-center gap-4">
            <ScoreRing value={clarityScore} />
            <div className="flex flex-col gap-1.5 flex-1">
              {clarityScore === null ? (
                <Skeleton className="h-3 w-full" />
              ) : (
                <>
                  <ProgressBar
                    value={clarityScore}
                    color={
                      clarityScore >= 70 ? 'bg-green-500'
                      : clarityScore >= 40 ? 'bg-yellow-500'
                      : 'bg-red-500'
                    }
                  />
                  <p className="text-[11px] text-white/35 leading-snug">
                    {clarityScore >= 70
                      ? 'Specific and concrete — good.'
                      : clarityScore >= 40
                      ? 'Add numbers or specific examples.'
                      : 'Too vague — be more concrete.'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Structure Check ───────────────── */}
        <div className="rounded-xl border border-white/8 bg-dark-700/40 p-4">
          <SectionLabel>Structure Check</SectionLabel>
          <StructureBadge value={structure} />
        </div>

        {/* ── Filler Words + Data Points ────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Filler Words */}
          <div className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all duration-400 ${fillerColors[fillerSeverity]}`}>
            <span className="text-xl">💬</span>
            <span className="text-2xl font-bold tabular-nums transition-all duration-500">
              {fillerCount}
            </span>
            <span className="text-[10px] font-medium text-white/40 text-center leading-tight">
              Filler Words
            </span>
            <span className="text-[9px] text-white/25 text-center">
              {fillerCount === 0 ? 'Clean!' : fillerCount <= 2 ? 'Fine' : fillerCount <= 5 ? 'Reduce' : 'Too many'}
            </span>
          </div>

          {/* Data Points */}
          <CountChip
            count={dataPoints}
            icon="📈"
            good={3}
            warn={1}
            label="Data Points"
            sublabel={dataPoints === 0 ? 'Add metrics' : dataPoints < 3 ? 'Add more' : 'Great!'}
          />
        </div>

        {/* ── Talk Ratio ────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-dark-700/40 p-4">
          <SectionLabel>Talk Ratio</SectionLabel>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-white/70">You</span>
              <span className={`text-lg font-bold tabular-nums transition-all duration-500 ${ratioColor.replace('bg-', 'text-')}`}>
                {hasData ? `${talkRatio}%` : '—'}
              </span>
            </div>
            <ProgressBar
              value={hasData ? talkRatio : 0}
              color={ratioColor}
              targetMin={60}
              targetMax={70}
            />
            <div className="flex items-center justify-between text-[10px] text-white/30">
              <span>0%</span>
              <span className="text-green-400/60 font-medium">target: 60–70%</span>
              <span>100%</span>
            </div>
            {hasData && (
              <p className={`text-[11px] font-medium transition-all duration-500 ${
                talkRatio >= 60 && talkRatio <= 70 ? 'text-green-400'
                : talkRatio >= 50 && talkRatio <= 80 ? 'text-yellow-400'
                : 'text-red-400'
              }`}>
                {ratioLabel}
              </p>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!hasData && (
          <p className="text-center text-xs text-white/20 italic pb-2">
            Metrics update as you speak
          </p>
        )}
      </div>
    </div>
  );
}
