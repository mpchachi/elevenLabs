import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROFILE_FALLBACKS } from '../config/profiles';
import ScoreGauge from '../components/postmortem/ScoreGauge';
import Timeline from '../components/postmortem/Timeline';
import KeyMoments from '../components/postmortem/KeyMoments';
import ImprovementTips from '../components/postmortem/ImprovementTips';
import HistoryChart from '../components/postmortem/HistoryChart';

// ─── Data helpers ─────────────────────────────────────────────────────────────

function buildExchanges(session) {
  if (!session?.transcript) return [];

  const exchanges = [];
  let agentText = null;
  let userTurnIdx = 0;

  for (let i = 0; i < session.transcript.length; i++) {
    const msg = session.transcript[i];

    if (msg.role === 'agent') {
      agentText = msg.text;
    } else {
      const metrics = session.messageMetrics?.[userTurnIdx] ?? null;
      const wasInterrupted = session.interruptedTurns?.some(t => t.turn === userTurnIdx + 1) ?? false;

      let quality = 'ok';
      if (metrics) {
        const structureScore = { green: 100, yellow: 50, red: 0 }[metrics.structure] ?? 0;
        const composite = metrics.clarityScore * 0.65 + structureScore * 0.25 + Math.min(100, metrics.dataPoints * 25) * 0.10;
        quality = composite >= 72 ? 'good' : composite >= 45 ? 'ok' : 'poor';
        if (wasInterrupted) quality = 'poor';
      }

      exchanges.push({
        id: `ex-${i}`,
        agentText: agentText ?? '',
        userText: msg.text,
        userTurnIndex: userTurnIdx,
        quality,
        wasInterrupted,
        metrics,
      });

      agentText = null;
      userTurnIdx++;
    }
  }

  // Trailing agent message (last question, no user response)
  if (agentText) {
    exchanges.push({
      id: `ex-trailing`,
      agentText,
      userText: null,
      userTurnIndex: null,
      quality: undefined,
      wasInterrupted: false,
      metrics: null,
    });
  }

  return exchanges;
}

function computeKeyMoments(exchanges) {
  const userEx = exchanges.filter(e => e.userText && e.metrics);
  if (userEx.length === 0) return [];

  const scored = [...userEx].map(e => {
    const m = e.metrics;
    const structureScore = { green: 100, yellow: 50, red: 0 }[m.structure] ?? 0;
    return {
      ...e,
      composite: m.clarityScore * 0.6 + structureScore * 0.3 + Math.min(100, m.dataPoints * 25) * 0.1,
    };
  }).sort((a, b) => b.composite - a.composite);

  const moments = [];

  if (scored.length >= 1) moments.push({ type: 'best', exchange: scored[0] });
  if (scored.length >= 2) moments.push({ type: 'worst', exchange: scored[scored.length - 1] });

  const interrupted = userEx.find(e => e.wasInterrupted);
  const usedIds = new Set(moments.map(m => m.exchange.id));
  if (interrupted && !usedIds.has(interrupted.id)) {
    moments.push({ type: 'interrupt', exchange: interrupted });
  } else if (scored.length >= 3) {
    const mid = scored[Math.floor(scored.length / 2)];
    if (!usedIds.has(mid.id)) moments.push({ type: 'notable', exchange: mid });
  }

  return moments.slice(0, 3);
}

function formatDuration(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatRow({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/45">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-bold ${color}`}>{value}</span>
        {sub && <span className="ml-1.5 text-[10px] text-white/25">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PostMortem() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [tips, setTips] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    // Load session
    try {
      const raw = localStorage.getItem('mockmaster_last_session');
      if (!raw) { navigate('/'); return; }
      const s = JSON.parse(raw);
      setSession(s);

      // Load history for chart
      const hist = JSON.parse(localStorage.getItem('mockmaster_sessions') ?? '[]');
      setHistory(
        hist.map(h => ({
          date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: h.overallScore ?? 0,
          profile: h.profileEmoji ?? '🎙️',
        }))
      );

      // Fetch LLM tips
      setTipsLoading(true);
      fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: s.transcript,
          metrics: {
            ...s.aggregateMetrics,
            interruptCount: s.aggregateMetrics?.interruptCount ?? 0,
          },
          profileName: s.profileName,
        }),
      })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(data => setTips(data.tips))
        .catch(e => setTipsError(e.message))
        .finally(() => setTipsLoading(false));
    } catch (e) {
      console.error('PostMortem load error:', e);
      navigate('/');
    }
  }, [navigate]);

  const profile = PROFILE_FALLBACKS.find(p => p.id === session?.profileId);
  const exchanges = useMemo(() => buildExchanges(session), [session]);
  const keyMoments = useMemo(() => computeKeyMoments(exchanges), [exchanges]);

  const agg = session?.aggregateMetrics ?? {};
  const ratioColor = agg.talkRatio >= 60 && agg.talkRatio <= 70 ? 'text-green-400'
    : agg.talkRatio >= 50 && agg.talkRatio <= 80 ? 'text-yellow-400' : 'text-red-400';
  const fillerColor = agg.fillerCount <= 2 ? 'text-green-400'
    : agg.fillerCount <= 5 ? 'text-yellow-400' : 'text-red-400';

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-16">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/5 bg-dark-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎙️</span>
          <div>
            <span className="font-bold text-white text-sm">MockMaster</span>
            <span className="text-white/30 text-sm"> · Post-Mortem</span>
          </div>
          {profile && (
            <div className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-gradient-to-r ${profile.color} bg-clip-text text-transparent text-xs font-semibold border ${profile.borderColor}`}>
              {profile.emoji} {profile.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/interview/${session.profileId}`)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-white/8 hover:bg-white/12 text-white/70 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/8 text-white/50 transition-colors"
          >
            ← Home
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 flex flex-col gap-6">

        {/* Row 1: Score + Stats */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Score gauge */}
          <div className="lg:col-span-1">
            <ScoreGauge score={session.overallScore ?? 0} />
          </div>

          {/* Quick stats */}
          <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-dark-700/50 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/30">Session Stats</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <StatRow
                  label="Talk Ratio"
                  value={`${agg.talkRatio ?? 0}%`}
                  sub="(ideal 60–70%)"
                  color={ratioColor}
                />
                <StatRow
                  label="Filler Words"
                  value={agg.fillerCount ?? 0}
                  sub="detected"
                  color={fillerColor}
                />
                <StatRow
                  label="Data Points Cited"
                  value={agg.dataPoints ?? 0}
                  sub="metrics / numbers"
                  color={(agg.dataPoints ?? 0) >= 3 ? 'text-green-400' : (agg.dataPoints ?? 0) >= 1 ? 'text-yellow-400' : 'text-red-400'}
                />
              </div>
              <div>
                <StatRow
                  label="Avg Clarity"
                  value={`${agg.clarityAvg ?? 0}/100`}
                  color={(agg.clarityAvg ?? 0) >= 70 ? 'text-green-400' : (agg.clarityAvg ?? 0) >= 40 ? 'text-yellow-400' : 'text-red-400'}
                />
                <StatRow
                  label="Interruptions"
                  value={agg.interruptCount ?? 0}
                  sub="by interviewer"
                  color={(agg.interruptCount ?? 0) === 0 ? 'text-green-400' : 'text-amber-400'}
                />
                <StatRow
                  label="Duration"
                  value={formatDuration(session.durationSeconds)}
                />
              </div>
            </div>

            {/* Score breakdown bar */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Score Breakdown</p>
              <div className="space-y-2">
                {[
                  { label: 'Clarity', value: agg.clarityAvg ?? 0, weight: '30%' },
                  { label: 'Structure', value: { green: 100, yellow: 50, red: 0 }[agg.structureLabel] ?? 0, weight: '20%' },
                  { label: 'Filler words', value: Math.max(0, 100 - (agg.fillerCount ?? 0) * 8), weight: '20%' },
                  { label: 'Talk ratio', value: agg.talkRatio >= 60 && agg.talkRatio <= 70 ? 100 : agg.talkRatio >= 50 ? 70 : 40, weight: '15%' },
                  { label: 'Data points', value: Math.min(100, (agg.dataPoints ?? 0) * 20), weight: '15%' },
                ].map(({ label, value, weight }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-20 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/25 w-6 text-right">{weight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Timeline */}
        <Timeline
          exchanges={exchanges}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Row 3: Key Moments + Improvement Tips */}
        <div className="grid gap-6 lg:grid-cols-2">
          <KeyMoments moments={keyMoments} profile={profile} />
          <ImprovementTips tips={tips} loading={tipsLoading} error={tipsError} />
        </div>

        {/* Row 4: History chart */}
        {history.length > 1 && <HistoryChart history={history} />}

        {/* CTA */}
        <div className="flex justify-center gap-4 pt-2">
          <button
            onClick={() => navigate(`/interview/${session.profileId}`)}
            className={`rounded-xl px-6 py-3 text-sm font-bold text-white bg-gradient-to-r ${profile?.color ?? 'from-indigo-600 to-violet-600'} hover:opacity-90 transition-opacity shadow-lg`}
          >
            Practice Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl px-6 py-3 text-sm font-bold text-white/60 bg-white/8 hover:bg-white/12 transition-colors"
          >
            Try Another Interviewer
          </button>
        </div>
      </main>
    </div>
  );
}
