import { useEffect, useRef, useState } from 'react';
import { countDataPoints } from './useFeedback';

// How long (ms) a user turn can run before triggering a long-response interrupt.
const LONG_RESPONSE_MS = 90_000;

// Minimum word count for "too short" to trigger (avoids firing on "yes" / "no").
const TOO_SHORT_MIN_WORDS = 5;
const TOO_SHORT_MAX_WORDS = 29;

// Minimum words for "no data" to be meaningful (ignore very short answers).
const NO_DATA_MIN_WORDS = 50;

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useInterruptions({
  status,
  transcript,
  sendContextualMessage,
  enabled,
}) {
  const [interruptCount, setInterruptCount] = useState(0);
  const [lastTrigger, setLastTrigger] = useState(null);
  const [interruptedTurns, setInterruptedTurns] = useState([]); // [{ turn, type }]

  const prevUserCountRef = useRef(0);
  const cooldownUntilTurnRef = useRef(-1);

  function fire(type, currentUserTurn) {
    sendContextualMessage(`[INTERRUPT:${type}]`);
    setInterruptCount(c => c + 1);
    setLastTrigger(type);
    setInterruptedTurns(prev => [...prev, { turn: currentUserTurn, type }]);
    cooldownUntilTurnRef.current = currentUserTurn + 1;
    console.debug(`[interruptions] Fired: ${type} at turn ${currentUserTurn}`);
  }

  // ── Timer: 90s long-response interrupt ───────────────────────────────────
  // Effect restarts every time status changes. When status goes to 'listening'
  // (agent finished speaking, it's the user's turn), the 90s timer starts.
  // If status leaves 'listening' before the timer fires, the cleanup cancels it.
  useEffect(() => {
    if (!enabled || status !== 'listening') return;

    const timer = setTimeout(() => {
      const currentUserTurn = prevUserCountRef.current;
      fire('long_response', currentUserTurn);
    }, LONG_RESPONSE_MS);

    return () => clearTimeout(timer);
    // sendContextualMessage is stable (useCallback with no deps that change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, enabled]);

  // ── Post-turn: analyze each completed user utterance ─────────────────────
  useEffect(() => {
    const userMsgs = transcript.filter(m => m.role === 'user');
    const newCount = userMsgs.length;

    // No new user message — nothing to analyze.
    if (newCount === prevUserCountRef.current) return;
    prevUserCountRef.current = newCount;

    // Skip first response (warm-up) and respect cooldown.
    if (!enabled || newCount < 2 || newCount <= cooldownUntilTurnRef.current) return;

    const lastText = userMsgs[newCount - 1].text;
    const words = wordCount(lastText);

    // Priority 1: too short (but not a one-word answer — those get no tip)
    if (words >= TOO_SHORT_MIN_WORDS && words <= TOO_SHORT_MAX_WORDS) {
      fire('too_short', newCount);
      return;
    }

    // Priority 2: substantive answer with zero quantitative data
    if (words >= NO_DATA_MIN_WORDS && countDataPoints(lastText) === 0) {
      fire('no_data', newCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, enabled]);

  return { interruptCount, lastTrigger, interruptedTurns };
}
