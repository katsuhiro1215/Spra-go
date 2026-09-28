/** 出発の場面の飛行機(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-3)。右向き。Ownerのスプルが乗った飛行機の絵が届くまでの仮の絵 */
export function PlaneArt({ width = 170 }: { width?: number }) {
  return (
    <svg viewBox="0 0 170 80" width={width} aria-hidden>
      <path d="M24 36 L14 14 L28 14 L42 34Z" fill="#d8352a" stroke="#2b6fa3" strokeWidth={3} strokeLinejoin="round" />
      <path d="M70 48 L92 74 L106 74 L94 48Z" fill="#5db6e3" stroke="#2b6fa3" strokeWidth={3} strokeLinejoin="round" />
      <path d="M20 44 Q16 36 28 34 L130 30 Q156 30 162 40 Q156 50 130 50 L28 50 Q16 50 20 44Z" fill="#fffaf0" stroke="#2b6fa3" strokeWidth={3} />
      <path d="M70 34 L96 6 L110 6 L96 34Z" fill="#8fd3f0" stroke="#2b6fa3" strokeWidth={3} strokeLinejoin="round" />
      {[62, 82, 102, 122].map((x) => (
        <circle key={x} cx={x} cy={40} r={4} fill="#5db6e3" />
      ))}
    </svg>
  );
}
