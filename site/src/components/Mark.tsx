/** The jury: nine seats, eight agree, one dissents. */
export default function Mark({ size = 24, title = 'Wildjury' }: { size?: number; title?: string }) {
  const seats = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => [c, r] as const))
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title}>
      <defs>
        <linearGradient id="wj-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D6FF5C" />
          <stop offset="0.55" stopColor="#3FE08A" />
          <stop offset="1" stopColor="#11A8A0" />
        </linearGradient>
      </defs>
      {seats.map(([c, r]) => {
        const dissent = c === 2 && r === 2
        return (
          <rect
            key={`${c}${r}`}
            x={2 + c * 16}
            y={2 + r * 16}
            width="12"
            height="12"
            rx="3"
            fill={dissent ? '#FFB547' : 'url(#wj-g)'}
          />
        )
      })}
    </svg>
  )
}
