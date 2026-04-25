const MOMENT_CFG = {
  best:      { icon: '🌟', label: 'Best Response',   border: 'border-green-500/25',  badge: 'bg-green-500/10 text-green-400' },
  worst:     { icon: '⚠️',  label: 'Weakest Response', border: 'border-red-500/25',   badge: 'bg-red-500/10 text-red-400' },
  interrupt: { icon: '⚡',  label: 'Interrupted Turn', border: 'border-amber-500/25', badge: 'bg-amber-500/10 text-amber-400' },
  notable:   { icon: '📌',  label: 'Notable Moment',  border: 'border-blue-500/25',  badge: 'bg-blue-500/10 text-blue-400' },
};

function miniAnalysis(type, exchange) {
  const m = exchange.metrics;
  if (!m) return null;

  if (type === 'best') {
    const good = [];
    if (m.clarityScore >= 70) good.push('clear language');
    if (m.structure === 'green') good.push('solid STAR structure');
    if (m.dataPoints >= 2) good.push(`${m.dataPoints} concrete metrics`);
    if (good.length === 0) good.push('most complete answer overall');
    return `Strong because: ${good.join(', ')}.`;
  }

  if (type === 'worst') {
    const issues = [];
    if (m.clarityScore < 45) issues.push('vague language without specifics');
    if (m.structure === 'red') issues.push('no clear STAR structure');
    if (m.dataPoints === 0 && m.wordCount > 30) issues.push('zero quantifiable data');
    if (m.wordCount < 30) issues.push('answer too brief to evaluate');
    if (issues.length === 0) issues.push('lowest composite score of the session');
    return `Gaps: ${issues.join(', ')}.`;
  }

  if (type === 'interrupt') {
    return 'The interviewer intervened — the answer may have been too long, vague, or lacking data.';
  }

  return 'Mid-session response worth reviewing for calibration.';
}

function MomentCard({ type, exchange }) {
  const cfg = MOMENT_CFG[type] ?? MOMENT_CFG.notable;
  const analysis = miniAnalysis(type, exchange);
  const truncate = (s, n) => s?.length > n ? s.slice(0, n) + '…' : s;

  return (
    <div className={`rounded-2xl border ${cfg.border} bg-dark-700/50 p-4 flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{cfg.icon}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cfg.badge}`}>
          {cfg.label}
        </span>
        {exchange.metrics && (
          <span className="ml-auto text-xs font-semibold text-white/30">
            {exchange.metrics.clarityScore}/100
          </span>
        )}
      </div>

      {exchange.agentText && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-1">Question</p>
          <p className="text-xs text-white/50 leading-snug italic">
            "{truncate(exchange.agentText, 140)}"
          </p>
        </div>
      )}

      {exchange.userText && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-1">Your answer</p>
          <p className="text-sm text-white/75 leading-relaxed">
            "{truncate(exchange.userText, 220)}"
          </p>
        </div>
      )}

      {analysis && (
        <p className={`text-xs leading-snug rounded-lg px-3 py-2 ${cfg.badge}`}>
          {analysis}
        </p>
      )}
    </div>
  );
}

export default function KeyMoments({ moments }) {
  if (!moments?.length) {
    return (
      <div className="rounded-2xl border border-white/8 bg-dark-700/50 p-5 flex items-center justify-center text-white/25 text-sm">
        Not enough responses to generate key moments
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-dark-700/50 p-5">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">Key Moments</p>
      <div className="flex flex-col gap-3">
        {moments.map(({ type, exchange }) => (
          <MomentCard key={`${type}-${exchange.id}`} type={type} exchange={exchange} />
        ))}
      </div>
    </div>
  );
}
