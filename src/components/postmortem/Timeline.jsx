import { useRef, useEffect } from 'react';

const QUALITY_CFG = {
  good:  { dot: 'bg-green-500',  ring: 'ring-green-500/40',  label: 'Strong' },
  ok:    { dot: 'bg-yellow-500', ring: 'ring-yellow-500/40', label: 'OK' },
  poor:  { dot: 'bg-red-500',    ring: 'ring-red-500/40',    label: 'Weak' },
  agent: { dot: 'bg-white/20',   ring: 'ring-white/10',      label: 'Q' },
};

export default function Timeline({ exchanges, selectedId, onSelect }) {
  const scrollRef = useRef(null);

  // Auto-scroll to selected item
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedId]);

  const selected = exchanges.find(e => e.id === selectedId);

  return (
    <div className="rounded-2xl border border-white/8 bg-dark-700/50 p-5">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">Interview Timeline</p>

      {/* Horizontal scrollable strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-thin"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff15 transparent' }}
      >
        {exchanges.map((ex, idx) => {
          const cfg = QUALITY_CFG[ex.quality ?? 'agent'];
          const isSelected = ex.id === selectedId;
          const isUser = ex.quality !== undefined && ex.quality !== 'agent';

          return (
            <div key={ex.id} data-id={ex.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {/* Interrupt flag */}
              {ex.wasInterrupted && (
                <span className="text-[10px] text-amber-400 font-bold">⚡</span>
              )}

              {/* Connector line */}
              <div className="flex items-center gap-1">
                {idx > 0 && <div className="h-px w-4 bg-white/10" />}

                {/* Dot */}
                <button
                  onClick={() => isUser ? onSelect(isSelected ? null : ex.id) : null}
                  className={`
                    relative rounded-full transition-all duration-200
                    ${isUser ? 'cursor-pointer hover:scale-125' : 'cursor-default'}
                    ${isUser ? 'h-5 w-5' : 'h-3 w-3'}
                    ${cfg.dot}
                    ${isSelected ? `ring-2 ${cfg.ring} scale-125` : ''}
                  `}
                  title={isUser ? `Response ${ex.userTurnIndex + 1}` : 'Interviewer'}
                />

                {idx < exchanges.length - 1 && <div className="h-px w-4 bg-white/10" />}
              </div>

              {/* Label */}
              <span className="text-[9px] text-white/25 font-medium">
                {isUser ? `#${(ex.userTurnIndex ?? 0) + 1}` : '···'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 mb-3">
        {[['good', 'Strong'], ['ok', 'OK'], ['poor', 'Weak']].map(([q, l]) => (
          <div key={q} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${QUALITY_CFG[q].dot}`} />
            <span className="text-[10px] text-white/30">{l}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-amber-400">⚡</span>
          <span className="text-[10px] text-white/30">Interrupted</span>
        </div>
      </div>

      {/* Selected exchange detail */}
      {selected && (
        <div className="mt-3 rounded-xl border border-white/8 bg-dark-800/60 p-4 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 text-base">🎤</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">Interviewer</p>
              <p className="text-sm text-white/70 leading-relaxed">{selected.agentText}</p>
            </div>
          </div>
          {selected.userText && (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 text-base">🧑‍💻</span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">You</p>
                <p className="text-sm text-white/80 leading-relaxed">{selected.userText}</p>
                {selected.metrics && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Chip label={`Clarity ${selected.metrics.clarityScore}`} value={selected.metrics.clarityScore} max={100} />
                    <Chip label={`${selected.metrics.dataPoints} data pts`} value={selected.metrics.dataPoints} max={4} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      selected.metrics.structure === 'green' ? 'border-green-500/30 text-green-400' :
                      selected.metrics.structure === 'yellow' ? 'border-yellow-500/30 text-yellow-400' :
                      'border-red-500/30 text-red-400'
                    }`}>
                      {selected.metrics.structure === 'green' ? 'STAR ✓' :
                       selected.metrics.structure === 'yellow' ? 'Partial' : 'No structure'}
                    </span>
                    {selected.wasInterrupted && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold border border-amber-500/30 text-amber-400">
                        ⚡ Interrupted
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!selected && exchanges.some(e => e.quality !== undefined) && (
        <p className="text-center text-xs text-white/20 italic mt-2">
          Click a colored dot to inspect that response
        </p>
      )}
    </div>
  );
}

function Chip({ label, value, max }) {
  const pct = Math.min(1, value / max);
  const color = pct >= 0.7 ? 'text-green-400 border-green-500/30' :
                pct >= 0.4 ? 'text-yellow-400 border-yellow-500/30' :
                             'text-red-400 border-red-500/30';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${color}`}>
      {label}
    </span>
  );
}
