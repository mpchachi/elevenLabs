import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversation } from '../hooks/useConversation';
import { useFeedback } from '../hooks/useFeedback';
import { useInterruptions } from '../hooks/useInterruptions';
import { PROFILE_FALLBACKS } from '../config/profiles';
import StatusIndicator from '../components/StatusIndicator';
import TranscriptPanel from '../components/TranscriptPanel';
import FeedbackPanel from '../components/FeedbackPanel';

function loadChillMode() {
  try { return localStorage.getItem('mockmaster_chill') === 'true'; }
  catch { return false; }
}

export default function Interview() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { status, transcript, error, connect, disconnect, sendContextualMessage } = useConversation();
  const feedback = useFeedback(transcript);
  const hasConnected = useRef(false);

  const [chillMode, setChillMode] = useState(loadChillMode);

  function toggleChill() {
    setChillMode(prev => {
      const next = !prev;
      try { localStorage.setItem('mockmaster_chill', String(next)); } catch {}
      return next;
    });
  }

  const { interruptCount, interruptedTurns } = useInterruptions({
    status,
    transcript,
    sendContextualMessage,
    enabled: !chillMode && (status === 'listening' || status === 'speaking'),
  });

  const profile = PROFILE_FALLBACKS.find(p => p.id === profileId);

  // Track session start time (first time mic goes live)
  const sessionStartRef = useRef(null);
  useEffect(() => {
    if (status === 'listening' && !sessionStartRef.current) {
      sessionStartRef.current = Date.now();
    }
  }, [status]);

  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;
    connect(profileId);
  }, [profileId, connect]);

  function handleEnd() {
    // Persist session to localStorage before navigating
    if (transcript.length > 0 && profile) {
      const session = {
        id: String(Date.now()),
        date: new Date().toISOString(),
        profileId: profile.id,
        profileName: profile.name,
        profileEmoji: profile.emoji,
        profileColor: profile.color,
        transcript,
        messageMetrics: feedback.messageMetrics,
        overallScore: feedback.overallScore,
        aggregateMetrics: {
          clarityAvg: feedback.clarityAvg,
          talkRatio: feedback.talkRatio,
          fillerCount: feedback.fillerCount,
          dataPoints: feedback.dataPoints,
          structureLabel: feedback.structure ?? 'none',
          interruptCount,
        },
        interruptedTurns,
        durationSeconds: sessionStartRef.current
          ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
          : 0,
      };
      try {
        const history = JSON.parse(localStorage.getItem('mockmaster_sessions') ?? '[]');
        history.push(session);
        if (history.length > 30) history.splice(0, history.length - 30);
        localStorage.setItem('mockmaster_sessions', JSON.stringify(history));
        localStorage.setItem('mockmaster_last_session', JSON.stringify(session));
      } catch (e) {
        console.warn('Could not save session to localStorage:', e);
      }
    }

    disconnect();
    navigate(transcript.length > 0 ? '/results' : '/');
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-white/50">
        Unknown profile.{' '}
        <button onClick={() => navigate('/')} className="ml-2 underline">
          Go back
        </button>
      </div>
    );
  }

  const canEnd = status !== 'connecting' && status !== 'idle';
  const isActive = status === 'listening' || status === 'speaking';

  return (
    // h-screen + overflow-hidden keeps transcript/panel scrollable without page scroll
    <div className="flex flex-col bg-dark-900" style={{ height: '100dvh' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex flex-shrink-0 items-center justify-between px-4 py-3 border-b border-white/5 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Interviewer avatar */}
          <div
            className={`
              relative flex h-10 w-10 flex-shrink-0 items-center justify-center
              rounded-xl bg-gradient-to-br ${profile.color} text-xl shadow-md
            `}
          >
            {profile.emoji}
            {isActive && (
              <span className="absolute -inset-0.5 rounded-xl border border-white/20 animate-ping" />
            )}
          </div>

          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight truncate">{profile.name}</p>
            <p className="text-[11px] text-white/40 truncate">{profile.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block">
            <StatusIndicator status={status} />
          </div>

          {/* Chill mode toggle */}
          <button
            onClick={toggleChill}
            title={chillMode ? 'Interruptions disabled — click to enable pressure mode' : 'Pressure mode active — click to disable interruptions'}
            className={`
              hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5
              text-xs font-semibold transition-all duration-200
              ${chillMode
                ? 'bg-white/5 text-white/30 hover:bg-white/10'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20'
              }
            `}
          >
            {chillMode ? '😌 Chill' : `⚡ Pressure${interruptCount > 0 ? ` · ${interruptCount}` : ''}`}
          </button>

          <button
            onClick={handleEnd}
            disabled={!canEnd}
            className={`
              rounded-lg px-3 py-1.5 text-xs font-semibold transition-all
              ${canEnd
                ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
              }
            `}
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Status on mobile */}
      <div className="flex-shrink-0 sm:hidden px-4 py-2 border-b border-white/5 bg-dark-800/50">
        <StatusIndicator status={status} />
      </div>

      {/* ── Main content: conversation + sidebar ──────────────────────────── */}
      <main className="flex flex-1 overflow-hidden flex-col lg:flex-row">

        {/* ── Left: conversation area ──────── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Connecting */}
          {status === 'connecting' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-white/50">
              <div className="h-7 w-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <p className="text-sm">Setting up your session…</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-3xl">⚠️</p>
              <p className="text-white/80 font-semibold">Something went wrong</p>
              <p className="text-sm text-white/50 max-w-sm">{error}</p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => connect(profileId)}
                  className="rounded-xl bg-white/10 hover:bg-white/15 px-5 py-2.5 text-sm text-white font-medium transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="rounded-xl bg-dark-600 hover:bg-dark-500 px-5 py-2.5 text-sm text-white/60 font-medium transition-colors"
                >
                  Back to home
                </button>
              </div>
            </div>
          )}

          {/* Ended with no transcript */}
          {status === 'ended' && transcript.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-white/50">
              <p className="text-3xl">✅</p>
              <p className="text-sm">Interview ended.</p>
              <button
                onClick={() => navigate('/')}
                className="mt-2 rounded-xl bg-white/10 hover:bg-white/15 px-5 py-2.5 text-sm text-white font-medium transition-colors"
              >
                Back to home
              </button>
            </div>
          )}

          {/* Transcript — visible once active or we have messages */}
          {(isActive || status === 'ended' || transcript.length > 0) && (
            <div className="flex flex-1 flex-col overflow-hidden px-4 pt-4 sm:px-6 sm:pt-5">
              <TranscriptPanel transcript={transcript} profile={profile} />
            </div>
          )}

          {/* Mic hint bar */}
          {isActive && (
            <div
              className={`
                mx-4 my-3 sm:mx-6 flex-shrink-0
                rounded-2xl border px-4 py-3
                flex items-center justify-between gap-3
                transition-all duration-300
                ${status === 'listening'
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-orange-500/30 bg-orange-500/5'
                }
              `}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">
                  {status === 'listening' ? '🎤' : '🔊'}
                </span>
                <span className="text-xs text-white/55">
                  {status === 'listening'
                    ? 'Microphone active — start talking.'
                    : 'Interviewer speaking — you can interrupt.'}
                </span>
              </div>

              {status === 'listening' && (
                <div className="flex items-end gap-px h-4 flex-shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 rounded-full bg-green-400 animate-pulse-slow"
                      style={{
                        height: `${30 + i * 14}%`,
                        animationDelay: `${i * 0.18}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: feedback sidebar ──────────── */}
        {/* On mobile: fixed-height panel below conversation. On lg+: full-height sidebar */}
        <aside
          className={`
            flex-shrink-0 border-white/5
            lg:w-72 xl:w-80 lg:border-l lg:h-full
            h-64 border-t overflow-hidden
            bg-dark-800/30
            transition-opacity duration-500
            ${status === 'connecting' ? 'opacity-40 pointer-events-none' : 'opacity-100'}
          `}
        >
          <FeedbackPanel metrics={feedback} profile={profile} />
        </aside>
      </main>
    </div>
  );
}
