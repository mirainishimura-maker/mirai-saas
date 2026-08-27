'use client'

// Posiciones fijas (nada de azar) para que el árbol se vea idéntico en el
// servidor y en el navegador. El orden importa: las hojas aparecen de abajo
// hacia arriba conforme avanza el mes.
const HOJAS = [
  [96, 196, -34], [150, 186, 22], [72, 168, -48], [176, 172, 40],
  [110, 158, -12], [136, 150, 14], [64, 140, -56], [186, 142, 52],
  [92, 128, -28], [156, 122, 30], [120, 116, 4], [76, 108, -44],
  [172, 104, 44], [104, 94, -18], [144, 88, 20], [124, 78, 0],
  [88, 74, -36], [162, 70, 36], [112, 58, -10], [136, 54, 12],
  [100, 42, -24], [148, 38, 26], [124, 28, 2], [124, 16, 0],
]

const MONEDAS = [
  [102, 178], [158, 160], [82, 132], [176, 118], [116, 100], [140, 66],
]

/**
 * Árbol de la Riqueza. No es decoración: cada parte lee un número real.
 *   copa    → avance del mes contra la meta de retiro
 *   monedas → sesiones cobradas este mes
 *   raíces  → fondo semilla acumulado
 */
export default function ArbolDeRiqueza({ avance = 0, sesionesCobradas = 0, raices = 0 }) {
  const hojasVisibles = Math.round((Math.min(100, Math.max(0, avance)) / 100) * HOJAS.length)
  const monedasVisibles = Math.min(MONEDAS.length, Math.floor(sesionesCobradas / 6))
  const profundidad = Math.min(1, Math.max(0, raices / 100))

  return (
    <svg viewBox="0 0 248 340" className="h-auto w-full max-w-sm" role="img" aria-label="Árbol de la riqueza">
      <defs>
        <linearGradient id="tierra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-surface-container-high)" />
          <stop offset="100%" stopColor="var(--color-surface-container-highest)" />
        </linearGradient>
      </defs>

      {/* Tierra: una insinuación, no una caja */}
      <ellipse cx="124" cy="244" rx="112" ry="14" fill="url(#tierra)" opacity="0.7" />
      <path
        d="M12 244 C 60 238, 188 238, 236 244"
        stroke="var(--color-border-sand)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Raíces: se hunden conforme crece el fondo semilla */}
      <g stroke="var(--color-primary-container)" fill="none" strokeLinecap="round">
        {[
          ['M124 246 C 124 272, 123 296, 124 322', 2.8],
          ['M124 246 C 118 270, 108 288, 98 314', 2.2],
          ['M124 246 C 130 270, 140 288, 150 314', 2.2],
          ['M123 250 C 112 268, 98 280, 84 300', 1.6],
          ['M125 250 C 136 268, 150 280, 164 300', 1.6],
          ['M105 296 C 100 300, 98 308, 99 316', 1.1],
          ['M143 296 C 148 300, 150 308, 149 316', 1.1],
        ].map(([d, ancho], i) => (
          <path
            key={i}
            d={d}
            strokeWidth={ancho}
            opacity={0.12 + profundidad * 0.5}
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - profundidad}
            style={{ transition: 'stroke-dashoffset 900ms ease, opacity 900ms ease' }}
          />
        ))}
      </g>

      {/* Semilla */}
      <ellipse
        cx="124"
        cy="252"
        rx="7"
        ry="9"
        fill="var(--color-tertiary-container)"
        opacity={0.35 + profundidad * 0.5}
      />

      {/* Tronco y ramas */}
      <g stroke="var(--color-primary-container)" fill="none" strokeLinecap="round">
        <path d="M124 236 C 122 200, 126 160, 124 20" strokeWidth="6" />
        <path d="M124 196 C 110 190, 100 186, 88 178" strokeWidth="3" />
        <path d="M124 186 C 138 180, 150 178, 162 170" strokeWidth="3" />
        <path d="M124 150 C 108 144, 96 138, 82 126" strokeWidth="2.5" />
        <path d="M124 140 C 142 134, 156 128, 170 116" strokeWidth="2.5" />
        <path d="M124 104 C 112 98, 104 92, 96 82" strokeWidth="2" />
        <path d="M124 96 C 136 90, 146 84, 154 74" strokeWidth="2" />
      </g>

      {/* Copa */}
      <g>
        {HOJAS.map(([x, y, rot], i) => {
          const visible = i < hojasVisibles
          return (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="13"
              ry="7"
              transform={`rotate(${rot} ${x} ${y})`}
              fill={i % 3 === 0 ? 'var(--color-secondary)' : 'var(--color-secondary-fixed-dim)'}
              opacity={visible ? (i % 3 === 0 ? 0.85 : 0.7) : 0}
              style={{ transition: `opacity 600ms ease ${i * 35}ms` }}
            />
          )
        })}
      </g>

      {/* Sesiones cobradas */}
      <g>
        {MONEDAS.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="5"
            fill="var(--color-tertiary-fixed-dim)"
            stroke="var(--color-tertiary)"
            strokeWidth="1"
            opacity={i < monedasVisibles ? 0.9 : 0}
            style={{ transition: `opacity 700ms ease ${i * 90}ms` }}
          />
        ))}
      </g>
    </svg>
  )
}
