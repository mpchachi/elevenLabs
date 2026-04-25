import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getProfile, getAllProfiles } from './agents.js';

const app = express();
const PORT = process.env.PORT || 3001;
const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';
const API_KEY = process.env.ELEVENLABS_API_KEY;

// ─── Agent ID cache (survives restarts via env vars) ──────────────────────────
const agentCache = {
  amazonian: process.env.AGENT_ID_AMAZONIAN || null,
  googler: process.env.AGENT_ID_GOOGLER || null,
  startup: process.env.AGENT_ID_STARTUP || null,
};

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// ─── ElevenLabs helpers ───────────────────────────────────────────────────────
function elHeaders() {
  return {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
  };
}

async function createAgent(profile) {
  const body = {
    name: `MockMaster — ${profile.name}`,
    conversation_config: {
      agent: {
        prompt: {
          prompt: profile.systemPrompt,
          llm: profile.llm,
          temperature: 1,
          max_tokens: 300,
        },
        first_message: profile.firstMessage,
        language: 'en',
      },
      tts: {
        voice_id: profile.voiceId,
        model_id: 'eleven_turbo_v2',
        stability: 0.5,
        similarity_boost: 0.75,
      },
    },
  };

  const res = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers: elHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs agent creation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.agent_id;
}

async function getOrCreateAgent(profileId) {
  if (agentCache[profileId]) return agentCache[profileId];

  const profile = getProfile(profileId);
  if (!profile) throw new Error(`Unknown profile: ${profileId}`);

  console.log(`[MockMaster] Creating ElevenLabs agent for "${profile.name}"...`);
  const agentId = await createAgent(profile);
  agentCache[profileId] = agentId;
  console.log(`[MockMaster] Agent created: ${agentId} (${profile.name})`);
  return agentId;
}

async function getSignedUrl(agentId) {
  const res = await fetch(
    `${ELEVENLABS_API}/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: elHeaders() },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get signed URL (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.signed_url;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    apiKeySet: Boolean(API_KEY),
    agentCache,
  });
});

app.get('/api/profiles', (_req, res) => {
  const profiles = getAllProfiles().map(({ id, name, tagline, description, emoji, color, borderColor, glowColor, traits }) => ({
    id, name, tagline, description, emoji, color, borderColor, glowColor, traits,
  }));
  res.json(profiles);
});

app.post('/api/sessions', async (req, res) => {
  const { profileId } = req.body;

  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not configured on the server' });
  }

  const profile = getProfile(profileId);
  if (!profile) {
    return res.status(404).json({ error: `Unknown profile: ${profileId}` });
  }

  try {
    const agentId = await getOrCreateAgent(profileId);
    const signedUrl = await getSignedUrl(agentId);

    res.json({
      signedUrl,
      profileId,
      agentId,
    });
  } catch (err) {
    console.error('[MockMaster] Session creation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/tips — LLM-generated coaching tips ────────────────────────────
app.post('/api/tips', async (req, res) => {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  const { transcript = [], metrics = {}, profileName = 'the interviewer' } = req.body;

  // Build a compact transcript (last 8 exchanges, user responses only for brevity)
  const exchanges = [];
  let agentQ = null;
  for (const msg of transcript) {
    if (msg.role === 'agent') { agentQ = msg.text; }
    else if (agentQ) {
      exchanges.push(`Q: ${agentQ.slice(0, 200)}\nA: ${msg.text.slice(0, 400)}`);
      agentQ = null;
    }
  }
  const transcriptSnippet = exchanges.slice(-6).join('\n\n');

  const prompt = `You are a technical interview coach. Analyze this interview session and provide 4 specific, actionable tips.

Interviewer profile: ${profileName}
Performance metrics:
- Clarity (avg): ${metrics.clarityAvg ?? '?'}/100
- Talk ratio: ${metrics.talkRatio ?? '?'}% (ideal 60-70%)
- Filler words: ${metrics.fillerCount ?? '?'}
- Data/metrics cited: ${metrics.dataPoints ?? '?'}
- Answer structure: ${metrics.structureLabel ?? '?'}
- Interruptions received: ${metrics.interruptCount ?? 0}

Recent interview exchanges:
${transcriptSnippet || '(no transcript available)'}

Return a JSON object with key "tips" — an array of exactly 4 objects, each with:
- "title": short title (4-6 words)
- "tip": specific actionable advice (1-2 sentences, reference real moments from transcript when possible)
- "category": one of clarity | structure | data | confidence | brevity
- "emoji": one relevant emoji`;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a technical interview coach. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI error ${openaiRes.status}: ${errText.slice(0, 200)}`);
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    res.json({ tips: parsed.tips ?? [] });
  } catch (err) {
    console.error('[MockMaster] Tips generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎙️  MockMaster backend running on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY is not set — copy .env.example to .env and fill it in.');
  } else {
    console.log('✅  ElevenLabs API key detected.');
  }
  console.log('');
});
