import { useMemo } from 'react';

// ─── Static lookup tables ─────────────────────────────────────────────────────

const FILLER_WORDS = [
  'um', 'uh', 'er', 'hmm', 'hm',
  'like', 'you know',
  'basically', 'literally',
  'kind of', 'sort of',
  'i mean',
  'o sea', 'bueno', 'pues', 'este',
];

const VAGUE_WORDS = [
  'thing', 'stuff', 'somehow', 'something',
  'very', 'really', 'quite', 'pretty',
  'many', 'a lot', 'few', 'several', 'various',
  'some things', 'different things',
];

// STAR keyword banks — keyed by structural part
const STAR_BANKS = {
  situation: [
    'when i was', 'while i was', 'at the time', 'the situation', 'in my role',
    'working at', 'we were', 'i was working', 'in my previous', 'at my last',
    'context was', 'background',
  ],
  task: [
    'needed to', 'had to', 'my goal', 'my task', 'my responsibility',
    'challenge was', 'responsible for', 'assigned to', 'objective was',
    'i was asked', 'i was tasked',
  ],
  action: [
    'i decided', 'i implemented', 'i built', 'i created', 'i led', 'i managed',
    'i reached out', 'i worked', 'i developed', 'i designed', 'i initiated',
    'i proposed', 'i fixed', 'i refactored', 'i wrote', 'i deployed',
    'i coordinated', 'i analyzed', 'i identified', 'i set up',
  ],
  result: [
    'resulted in', 'as a result', 'achieved', 'improved', 'reduced', 'increased',
    'outcome was', 'impact was', 'we saw', 'it led to', 'ultimately', 'in the end',
    'we delivered', 'we shipped', 'launched', 'success', 'we saved',
  ],
};

// Patterns that count as a concrete data point
const DATA_PATTERNS = [
  /\d+\s*%/g,
  /\d+x\b/gi,
  /\$\s*[\d,]+/g,
  /\b\d+\s*(k|m|b)\b/gi,
  /\b\d+\s*(users?|customers?|people|requests?|servers?|engineers?|teams?|clients?|endpoints?|services?)/gi,
  /\b\d+\s*(ms|seconds?|minutes?|hours?|days?|weeks?|months?|years?)/gi,
  /\bp\d{2}\b/gi,
  /\b(doubled|tripled|halved|quadrupled)\b/gi,
  /\b\d+\s*(million|billion|thousand)\b/gi,
  /\b\d+\s*(times|fold)\b/gi,
  /\d{4}\b/g,   // years
];

// ─── Pure analysis functions ──────────────────────────────────────────────────

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countFillers(text) {
  const lower = text.toLowerCase();
  let count = 0;
  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const m = lower.match(re);
    if (m) count += m.length;
  }
  return count;
}

export function countDataPoints(text) {
  const seen = new Set();
  for (const pattern of DATA_PATTERNS) {
    const matches = text.match(pattern) ?? [];
    matches.forEach(m => seen.add(m.toLowerCase().trim()));
  }
  return seen.size;
}

export function scoreClarity(text) {
  if (!text || text.length < 10) return 0;
  const words = wordCount(text);
  if (words < 5) return 25;

  let score = 60;

  // Penalise vague language
  const lower = text.toLowerCase();
  let vagueHits = 0;
  for (const vw of VAGUE_WORDS) {
    const re = new RegExp(`\\b${vw.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const m = lower.match(re);
    if (m) vagueHits += m.length;
  }
  score -= Math.min(25, vagueHits * 4);

  // Reward concrete data
  const dp = countDataPoints(text);
  score += Math.min(25, dp * 6);

  // Length bonus for substantive answers
  if (words > 40) score += 5;
  if (words > 80) score += 5;

  // Penalise filler-heavy speech
  const fillers = countFillers(text);
  score -= Math.min(15, fillers * 3);

  // Rambling penalty (long + no data)
  if (words > 180 && dp === 0) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function detectStructure(text) {
  if (!text || wordCount(text) < 15) return null;

  const lower = text.toLowerCase();
  let parts = 0;
  for (const keywords of Object.values(STAR_BANKS)) {
    if (keywords.some(kw => lower.includes(kw))) parts++;
  }

  if (parts >= 3) return 'green';
  if (parts >= 1) return 'yellow';
  return 'red';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFeedback(transcript) {
  const userMsgs = useMemo(
    () => transcript.filter(m => m.role === 'user'),
    [transcript],
  );

  const agentMsgs = useMemo(
    () => transcript.filter(m => m.role === 'agent'),
    [transcript],
  );

  const lastUserText = userMsgs[userMsgs.length - 1]?.text ?? '';
  const allUserText = useMemo(() => userMsgs.map(m => m.text).join(' '), [userMsgs]);

  const fillerCount = useMemo(() => countFillers(allUserText), [allUserText]);
  const dataPoints = useMemo(() => countDataPoints(allUserText), [allUserText]);

  // Word-count-based talk ratio (good approximation without real timestamps)
  const talkRatio = useMemo(() => {
    const uWords = userMsgs.reduce((s, m) => s + wordCount(m.text), 0);
    const aWords = agentMsgs.reduce((s, m) => s + wordCount(m.text), 0);
    const total = uWords + aWords;
    return total === 0 ? 0 : Math.round((uWords / total) * 100);
  }, [userMsgs, agentMsgs]);

  // Per-message metrics (last message — for live panel)
  const clarityScore = useMemo(
    () => (lastUserText ? scoreClarity(lastUserText) : null),
    [lastUserText],
  );

  const structure = useMemo(
    () => (lastUserText ? detectStructure(lastUserText) : null),
    [lastUserText],
  );

  // Full per-message breakdown (for post-mortem timeline + scoring)
  const messageMetrics = useMemo(
    () => userMsgs.map((msg, idx) => ({
      userTurnIndex: idx,
      clarityScore: scoreClarity(msg.text),
      structure: detectStructure(msg.text),
      dataPoints: countDataPoints(msg.text),
      wordCount: wordCount(msg.text),
    })),
    [userMsgs],
  );

  const hasData = userMsgs.length > 0;

  const clarityAvg = useMemo(
    () => messageMetrics.length > 0
      ? Math.round(messageMetrics.reduce((s, m) => s + m.clarityScore, 0) / messageMetrics.length)
      : 0,
    [messageMetrics],
  );

  const overallScore = useMemo(() => {
    if (!hasData) return 0;
    const structureMap = { green: 100, yellow: 50, red: 0 };
    const structureAvg = messageMetrics.length > 0
      ? messageMetrics.reduce((s, m) => s + (structureMap[m.structure] ?? 0), 0) / messageMetrics.length
      : 0;
    const fillerScore = Math.max(0, 100 - fillerCount * 8);
    const ratioScore =
      talkRatio >= 60 && talkRatio <= 70 ? 100 :
      talkRatio >= 50 && talkRatio <= 80 ? 70 :
      talkRatio >= 40 && talkRatio <= 85 ? 40 : 20;
    const dataScore = Math.min(100, dataPoints * 20);
    return Math.round(
      clarityAvg * 0.30 +
      structureAvg * 0.20 +
      fillerScore * 0.20 +
      ratioScore * 0.15 +
      dataScore * 0.15,
    );
  }, [clarityAvg, messageMetrics, fillerCount, talkRatio, dataPoints, hasData]);

  return {
    clarityScore,
    structure,
    fillerCount,
    talkRatio,
    dataPoints,
    hasData,
    responseCount: userMsgs.length,
    messageMetrics,
    clarityAvg,
    overallScore,
  };
}
