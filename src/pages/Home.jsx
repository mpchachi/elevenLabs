import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
import { PROFILE_FALLBACKS } from '../config/profiles';

export default function Home() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(PROFILE_FALLBACKS);
  const [apiOk, setApiOk] = useState(null); // null=loading, true=ok, false=error

  useEffect(() => {
    // Load profiles from backend (ensures voice IDs etc. are in sync).
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setProfiles(data);
      })
      .catch(() => {});

    // Health check — warn if API key is missing.
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setApiOk(data.apiKeySet))
      .catch(() => setApiOk(false));
  }, []);

  function handleSelect(profile) {
    navigate(`/interview/${profile.id}`);
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center px-6 py-16">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-14 text-center">
        <div className="text-5xl mb-2">🎙️</div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Mock<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Master</span>
        </h1>
        <p className="text-white/50 text-base max-w-md leading-relaxed">
          Real-time AI voice interviews. Pick your interviewer, grant mic access, and get grilled.
        </p>
      </div>

      {/* API key warning */}
      {apiOk === false && (
        <div className="mb-8 max-w-xl w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <strong>⚠️ Setup required:</strong> Copy{' '}
          <code className="font-mono text-red-200">.env.example</code> to{' '}
          <code className="font-mono text-red-200">.env</code> and add your{' '}
          <code className="font-mono text-red-200">ELEVENLABS_API_KEY</code>.
          Then restart the server.
        </div>
      )}

      {/* Profile grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl w-full">
        {profiles.map(profile => (
          <ProfileCard key={profile.id} profile={profile} onSelect={handleSelect} />
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-12 text-xs text-white/25 text-center">
        Powered by ElevenLabs Conversational AI · Microphone required
      </p>
    </div>
  );
}
