// Client-side profile metadata (visual config only — no secrets here).
// The authoritative profile list comes from GET /api/profiles.

export const PROFILE_FALLBACKS = [
  {
    id: 'amazonian',
    name: 'The Amazonian',
    tagline: 'Leadership Principles enforcer',
    description: 'Obsessed with LP, demands STAR format, relentless follow-ups.',
    emoji: '🦅',
    color: 'from-orange-600 to-amber-500',
    borderColor: 'border-orange-500/40',
    glowColor: 'shadow-orange-500/20',
    traits: ['STAR Method', 'Ownership', 'Bias for Action'],
  },
  {
    id: 'googler',
    name: 'The Googler',
    tagline: 'Algorithms & scale obsessive',
    description: 'Everything is O(n²) until proven otherwise. Think bigger, faster.',
    emoji: '🔍',
    color: 'from-blue-600 to-cyan-500',
    borderColor: 'border-blue-500/40',
    glowColor: 'shadow-blue-500/20',
    traits: ['Big-O', 'System Design', 'Scale'],
  },
  {
    id: 'startup',
    name: 'The Startup Bro',
    tagline: 'Chaos agent, product thinker',
    description: 'Unconventional questions, absurd scenarios, zero conventional wisdom.',
    emoji: '⚡',
    color: 'from-green-600 to-emerald-500',
    borderColor: 'border-green-500/40',
    glowColor: 'shadow-green-500/20',
    traits: ['Product Thinking', 'First Principles', 'Move Fast'],
  },
];
