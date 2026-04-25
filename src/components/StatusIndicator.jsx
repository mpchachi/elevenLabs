const STATUS_CONFIG = {
  idle: {
    dot: 'bg-gray-500',
    label: 'Ready',
    pulse: false,
  },
  connecting: {
    dot: 'bg-blue-400',
    label: 'Connecting…',
    pulse: true,
    spin: true,
  },
  listening: {
    dot: 'bg-green-400',
    label: 'Listening — speak now',
    pulse: true,
  },
  speaking: {
    dot: 'bg-orange-400',
    label: 'Interviewer speaking',
    pulse: true,
  },
  ended: {
    dot: 'bg-gray-600',
    label: 'Interview ended',
    pulse: false,
  },
  error: {
    dot: 'bg-red-500',
    label: 'Error',
    pulse: false,
  },
};

export default function StatusIndicator({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-3 w-3">
        {cfg.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-75`}
          />
        )}
        <span className={`relative inline-flex h-3 w-3 rounded-full ${cfg.dot}`} />
      </span>
      <span className="text-sm font-medium text-white/70">{cfg.label}</span>
    </div>
  );
}
