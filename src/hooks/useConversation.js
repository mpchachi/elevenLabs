import { useRef, useState, useCallback, useEffect } from 'react';

// ─── AudioWorklet processor (inlined to avoid public-dir headaches) ───────────
const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    // Send chunks of 4096 samples (≈256ms at 16kHz) — good balance of
    // latency vs. WebSocket overhead.
    this._chunkSamples = 4096;
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    for (let i = 0; i < ch.length; i++) this._buf.push(ch[i]);

    while (this._buf.length >= this._chunkSamples) {
      const chunk = this._buf.splice(0, this._chunkSamples);
      const pcm16 = new Int16Array(this._chunkSamples);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        pcm16[i] = s < 0 ? s * 32768 : s * 32767;
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.slice(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Decode raw signed-int16 PCM to a Web Audio AudioBuffer.
function decodePCM(base64, sampleRate, audioCtx) {
  const raw = base64ToArrayBuffer(base64);
  const samples = Math.floor(raw.byteLength / 2);
  const buf = audioCtx.createBuffer(1, samples, sampleRate);
  const ch = buf.getChannelData(0);
  const view = new DataView(raw);
  for (let i = 0; i < samples; i++) {
    ch[i] = view.getInt16(i * 2, true) / 32768;
  }
  return buf;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useConversation() {
  const [status, setStatus] = useState('idle');
  // idle | connecting | listening | speaking | ended | error
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const workletNodeRef = useRef(null);
  const silentGainRef = useRef(null);
  const outputFormatRef = useRef('pcm_16000');

  // Audio playback queue
  const queueRef = useRef([]);
  const playingRef = useRef(false);
  const currentNodeRef = useRef(null);

  // ── Playback queue ──────────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx || queueRef.current.length === 0) {
      playingRef.current = false;
      setStatus(s => (s === 'speaking' ? 'listening' : s));
      return;
    }

    playingRef.current = true;
    const buf = queueRef.current.shift();
    const node = audioCtx.createBufferSource();
    node.buffer = buf;
    node.connect(audioCtx.destination);
    node.onended = playNext;
    node.start();
    currentNodeRef.current = node;
  }, []);

  const enqueueAudio = useCallback(
    async (base64) => {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      let audioBuf;
      const fmt = outputFormatRef.current ?? 'pcm_16000';

      try {
        if (fmt.startsWith('pcm_')) {
          const sr = parseInt(fmt.split('_')[1], 10) || 16000;
          audioBuf = decodePCM(base64, sr, audioCtx);
        } else {
          // MP3 / Opus / etc. — let the browser decode it.
          const ab = base64ToArrayBuffer(base64);
          audioBuf = await audioCtx.decodeAudioData(ab.slice(0));
        }
      } catch (e) {
        // Format detection fallback: try PCM if encoded decode fails.
        try {
          audioBuf = decodePCM(base64, 16000, audioCtx);
        } catch {
          console.warn('Audio decode failed, skipping chunk:', e);
          return;
        }
      }

      queueRef.current.push(audioBuf);
      if (!playingRef.current) {
        setStatus('speaking');
        playNext();
      }
    },
    [playNext],
  );

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    if (currentNodeRef.current) {
      try {
        currentNodeRef.current.stop();
      } catch {
        // already stopped
      }
      currentNodeRef.current = null;
    }
    playingRef.current = false;
  }, []);

  // ── Transcript helpers ──────────────────────────────────────────────────────
  const addMessage = useCallback((role, text) => {
    if (!text?.trim()) return;
    setTranscript(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === role && last?.text === text) return prev;
      return [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }];
    });
  }, []);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearQueue();

    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    silentGainRef.current?.disconnect();
    silentGainRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, [clearQueue]);

  // ── WebSocket message handler ───────────────────────────────────────────────
  const handleMessage = useCallback(
    async (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'conversation_initiation_metadata': {
          const meta = msg.conversation_initiation_metadata_event ?? {};
          outputFormatRef.current = meta.agent_output_audio_format ?? 'pcm_16000';
          console.log('[WS] Conversation started. Output format:', outputFormatRef.current);

          // ── Start microphone streaming ──────────────────────────────────
          const audioCtx = audioCtxRef.current;
          const stream = streamRef.current;
          const ws = wsRef.current;
          if (!audioCtx || !stream || !ws) break;

          const micSource = audioCtx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');

          workletNode.port.onmessage = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const base64 = arrayBufferToBase64(e.data);
            ws.send(JSON.stringify({ user_audio_chunk: base64 }));
          };

          // Silent gain keeps the graph alive without echoing mic to speakers.
          const silentGain = audioCtx.createGain();
          silentGain.gain.value = 0;
          micSource.connect(workletNode);
          workletNode.connect(silentGain);
          silentGain.connect(audioCtx.destination);

          workletNodeRef.current = workletNode;
          silentGainRef.current = silentGain;

          setStatus('listening');
          break;
        }

        case 'audio': {
          const b64 = msg.audio_event?.audio_base_64;
          if (b64) {
            setStatus('speaking');
            await enqueueAudio(b64);
          }
          break;
        }

        case 'agent_response': {
          const text =
            msg.agent_response_event?.agent_response ??
            msg.agent_response;
          addMessage('agent', text);
          break;
        }

        case 'user_transcript': {
          const text =
            msg.user_transcription_event?.user_transcript ??
            msg.user_transcript_event?.user_transcript ??
            msg.user_transcript;
          // Filter internal interrupt signals — they're injected by useInterruptions
          // and should never appear in the visible transcript.
          if (text && !text.startsWith('[INTERRUPT:')) {
            addMessage('user', text);
          }
          break;
        }

        case 'interruption': {
          clearQueue();
          setStatus('listening');
          break;
        }

        case 'ping': {
          wsRef.current?.send(
            JSON.stringify({ type: 'pong', event_id: msg.ping_event?.event_id }),
          );
          break;
        }

        case 'internal_tentative_agent_response':
          // Agent is mid-thought — no UI update needed.
          break;

        default:
          console.debug('[WS] Unknown message type:', msg.type);
      }
    },
    [enqueueAudio, clearQueue, addMessage],
  );

  // ── Public: connect ─────────────────────────────────────────────────────────
  const connect = useCallback(
    async (profileId) => {
      setStatus('connecting');
      setError(null);
      setTranscript([]);

      try {
        // 1. Get signed URL from our backend (keeps API key server-side).
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Server error ${res.status}`);
        }

        const { signedUrl } = await res.json();

        // 2. Microphone access.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        // 3. Audio context + worklet.
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await audioCtx.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        // 4. WebSocket to ElevenLabs.
        const ws = new WebSocket(signedUrl);
        wsRef.current = ws;

        ws.onmessage = handleMessage;

        ws.onerror = () => {
          setError('WebSocket connection error. Check your API key and try again.');
          setStatus('error');
          cleanup();
        };

        ws.onclose = (e) => {
          const normal = e.code === 1000 || e.code === 1001;
          if (!normal) {
            setError(`Connection closed unexpectedly (code ${e.code}).`);
          }
          setStatus('ended');
          clearQueue();
          cleanup();
        };
      } catch (err) {
        console.error('[useConversation] connect error:', err);
        const msg = err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic access and try again.'
          : err.message;
        setError(msg);
        setStatus('error');
        cleanup();
      }
    },
    [handleMessage, clearQueue, cleanup],
  );

  // ── Public: disconnect ──────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User ended session');
      wsRef.current = null;
    }
    clearQueue();
    cleanup();
    setStatus('ended');
  }, [clearQueue, cleanup]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      wsRef.current?.close(1000, 'Component unmounted');
      cleanup();
    };
  }, [cleanup]);

  // Injects a text message into the live conversation (used by useInterruptions).
  // The agent's LLM sees it as a user message and responds in character.
  const sendContextualMessage = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ user_message: text }));
      console.debug('[WS] Contextual message sent:', text);
    }
  }, []);

  return { status, transcript, error, connect, disconnect, sendContextualMessage };
}
