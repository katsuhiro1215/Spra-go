/**
 * 仮のキャラクター表示。正式なキャラクターデザインができるまでのプレースホルダー。
 */
export function CharacterPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`animate-character-bounce ${className ?? ""}`}>
      <svg viewBox="0 0 120 165" className="h-full w-full drop-shadow-xl">
        <defs>
          <linearGradient id="character-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>

        <ellipse cx="60" cy="154" rx="34" ry="6" fill="black" opacity="0.15" />

        <line
          x1="60"
          y1="28"
          x2="60"
          y2="12"
          stroke="#f59e0b"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="60" cy="10" r="7" fill="#fbbf24" />

        <path
          d="M60 28 C95 28 112 60 112 95 C112 132 90 152 60 152 C30 152 8 132 8 95 C8 60 25 28 60 28 Z"
          fill="url(#character-body)"
        />

        <circle cx="38" cy="100" r="8" fill="#fca5a5" opacity="0.6" />
        <circle cx="82" cy="100" r="8" fill="#fca5a5" opacity="0.6" />

        <circle cx="42" cy="85" r="6" fill="#1f2937" />
        <circle cx="78" cy="85" r="6" fill="#1f2937" />
        <circle cx="44" cy="83" r="2" fill="white" />
        <circle cx="80" cy="83" r="2" fill="white" />

        <path
          d="M45 108 Q60 120 75 108"
          stroke="#1f2937"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
