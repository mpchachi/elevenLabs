export default function ProfileCard({ profile, onSelect }) {
  return (
    <button
      onClick={() => onSelect(profile)}
      className={`
        group relative flex flex-col items-center gap-5 rounded-2xl border p-8
        bg-dark-700 hover:bg-dark-600
        ${profile.borderColor}
        transition-all duration-300 ease-out
        hover:scale-[1.03] hover:shadow-2xl ${profile.glowColor}
        focus:outline-none focus:ring-2 focus:ring-white/20
        text-left w-full
      `}
    >
      {/* Gradient glow behind avatar */}
      <div
        className={`
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10
          bg-gradient-to-br ${profile.color}
          transition-opacity duration-300
        `}
      />

      {/* Avatar */}
      <div
        className={`
          relative flex h-24 w-24 items-center justify-center rounded-2xl
          bg-gradient-to-br ${profile.color}
          shadow-lg text-5xl
          group-hover:scale-110 transition-transform duration-300
        `}
      >
        {profile.emoji}
      </div>

      {/* Info */}
      <div className="relative flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-bold text-white">{profile.name}</h2>
        <p className="text-sm font-medium text-white/50">{profile.tagline}</p>
        <p className="mt-1 text-sm text-white/60 leading-relaxed">{profile.description}</p>
      </div>

      {/* Trait badges */}
      <div className="relative flex flex-wrap justify-center gap-2">
        {profile.traits.map(trait => (
          <span
            key={trait}
            className={`
              rounded-full px-3 py-1 text-xs font-semibold
              bg-gradient-to-r ${profile.color} bg-clip-text text-transparent
              border ${profile.borderColor}
            `}
          >
            {trait}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div
        className={`
          relative mt-1 rounded-xl px-6 py-2.5 text-sm font-semibold text-white
          bg-gradient-to-r ${profile.color}
          opacity-0 group-hover:opacity-100
          translate-y-1 group-hover:translate-y-0
          transition-all duration-300
        `}
      >
        Start Interview →
      </div>
    </button>
  );
}
