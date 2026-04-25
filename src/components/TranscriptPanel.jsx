import { useEffect, useRef } from 'react';

function Message({ msg, profile }) {
  const isAgent = msg.role === 'agent';

  return (
    <div className={`flex gap-3 ${isAgent ? 'justify-start' : 'justify-end'}`}>
      {isAgent && (
        <div
          className={`
            flex-shrink-0 flex h-8 w-8 items-center justify-center
            rounded-full text-base
            bg-gradient-to-br ${profile?.color ?? 'from-gray-600 to-gray-500'}
          `}
        >
          {profile?.emoji ?? '🤖'}
        </div>
      )}

      <div
        className={`
          max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isAgent
            ? 'bg-dark-600 text-white/90 rounded-tl-sm'
            : 'bg-white/10 text-white rounded-tr-sm'
          }
        `}
      >
        {msg.text}
      </div>

      {!isAgent && (
        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base">
          🧑‍💻
        </div>
      )}
    </div>
  );
}

export default function TranscriptPanel({ transcript, profile }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-white/30 text-sm italic select-none">
        The conversation will appear here…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1 pb-2">
      {transcript.map(msg => (
        <Message key={msg.id} msg={msg} profile={profile} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
