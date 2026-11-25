import { useId } from 'react'

/*
 * Illustrations de montagne vectorielles (légères, nettes sur tous les écrans),
 * aux couleurs de l'app : ciel bleu-pétrole, lumière orange du couchant.
 * Elles servent de « photos » sur les cartes de séance et les bandeaux.
 */

export type ArtVariant = 'peak' | 'wall' | 'boulder' | 'ridge' | 'dawn' | 'night'

const W = 320
const H = 200

function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** Ligne de crête : points en zigzag doux entre deux hauteurs */
function ridge(r: () => number, base: number, amp: number, steps: number) {
  const pts: string[] = [`0,${H}`]
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W
    const y = base - amp * (0.35 + r() * 0.65) * (i % 2 ? 1 : 0.55)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  pts.push(`${W},${H}`)
  return pts.join(' ')
}

export function MountainArt({ variant = 'peak', seed = 7, className }: { variant?: ArtVariant; seed?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const r = rng(seed * 97 + variant.length * 13)
  const night = variant === 'night'
  const dawn = variant === 'dawn'
  const moonX = 112 + r() * 30
  const sky = night ? ['#0f2530', '#0b1519'] : dawn ? ['#2c4660', '#e07a4a'] : ['#1f4352', '#101c22']

  return (
    <svg className={`mountain-art ${className ?? ''}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <linearGradient id={`lit${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="0.55" stopColor="#f0782d" />
          <stop offset="1" stopColor="#a8432a" />
        </linearGradient>
        <linearGradient id={`snow${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4ece6" />
          <stop offset="1" stopColor="#9fb3bf" />
        </linearGradient>
        <radialGradient id={`glow${id}`}>
          <stop offset="0" stopColor={dawn ? '#ffd9a0' : '#ffb380'} stopOpacity="0.9" />
          <stop offset="1" stopColor={dawn ? '#ffd9a0' : '#ffb380'} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#0d0e10" stopOpacity="0" />
          <stop offset="1" stopColor="#0d0e10" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#sky${id})`} />

      {/* astre : lune orangée ou soleil levant */}
      {dawn ? (
        <>
          <circle cx="196" cy="120" r="70" fill={`url(#glow${id})`} />
          <circle cx="196" cy="122" r="22" fill="#ffd9a0" />
        </>
      ) : (
        <>
          <circle cx={moonX} cy="46" r="34" fill={`url(#glow${id})`} opacity={night ? 0.35 : 0.5} />
          <circle cx={moonX} cy="46" r="13" fill={night ? '#f3e7d6' : '#f6a07a'} />
        </>
      )}
      {night &&
        Array.from({ length: 26 }, (_, i) => <circle key={i} cx={r() * W} cy={r() * 90} r={r() * 0.9 + 0.3} fill="#fff" opacity={0.4 + r() * 0.5} />)}

      {/* chaînes lointaines */}
      <polygon points={ridge(r, 128, 46, 9)} fill={dawn ? '#5a5a78' : '#2c4f5d'} opacity="0.75" />
      <polygon points={ridge(r, 150, 34, 7)} fill={dawn ? '#3d3f58' : '#1e3540'} />

      {variant === 'peak' || variant === 'night' ? (
        <>
          {/* grand sommet : face éclairée orange, face à l'ombre bleutée */}
          <polygon points="60,200 178,52 300,200" fill="#22323b" />
          <polygon points="178,52 300,200 214,200 196,140 186,96" fill={`url(#lit${id})`} opacity={night ? 0.45 : 1} />
          <polygon points="178,52 160,80 168,84 158,100 176,92 186,96" fill={`url(#snow${id})`} />
          <polygon points="178,52 186,96 198,88 206,104 196,70" fill="#ffd4b0" opacity={night ? 0.4 : 0.9} />
          <polygon points="20,200 110,118 170,200" fill="#18252c" />
        </>
      ) : variant === 'wall' ? (
        <>
          {/* falaise verticale et grimpeur encordé */}
          <polygon points="190,200 204,40 250,26 320,30 320,200" fill="#2a2a30" />
          <polygon points="204,40 250,26 262,60 236,120 222,200 190,200" fill={`url(#lit${id})`} />
          <path d="M228 200 C 226 150, 236 120, 232 88" stroke="#ffe3c9" strokeWidth="1.2" fill="none" opacity="0.8" />
          <g transform="translate(228 76)" fill="#0d0e10">
            <circle cx="0" cy="-8" r="3.4" />
            <path d="M-2 -4 L 3 -4 L 4 6 L -1 6 Z" />
            <path d="M3 -3 L 9 -12" stroke="#0d0e10" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M-2 -3 L -7 2" stroke="#0d0e10" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M0 6 L -5 15 M3 6 L 7 13" stroke="#0d0e10" strokeWidth="2.4" strokeLinecap="round" />
          </g>
          <polygon points="0,200 0,170 90,150 170,176 200,200" fill="#141d22" />
        </>
      ) : variant === 'boulder' ? (
        <>
          {/* bloc et ses prises colorées */}
          <path d="M70 200 C 60 150, 100 96, 170 92 C 236 88, 282 130, 276 200 Z" fill="#2d2e35" />
          <path d="M170 92 C 236 88, 282 130, 276 200 L 214 200 C 220 160, 206 120, 170 92 Z" fill={`url(#lit${id})`} opacity="0.9" />
          {[
            [118, 150, '#4fa3b8'],
            [140, 126, '#f5a742'],
            [172, 112, '#e0482a'],
            [204, 120, '#7cc36a'],
            [232, 142, '#f3f3f4'],
            [150, 168, '#e0482a'],
          ].map(([x, y, c], i) => (
            <ellipse key={i} cx={x as number} cy={y as number} rx="6" ry="4.2" fill={c as string} />
          ))}
          <rect x="40" y="194" width="250" height="6" rx="3" fill="#3a3c44" />
        </>
      ) : variant === 'ridge' ? (
        <>
          {/* arête effilée et drapeau au sommet */}
          <polygon points="0,200 0,150 120,100 200,70 320,120 320,200" fill="#22323b" />
          <polygon points="120,100 200,70 320,120 320,140 210,96" fill={`url(#lit${id})`} />
          <path d="M200 70 V 46" stroke="#f3f3f4" strokeWidth="1.6" />
          <path d="M200 46 H 216 L 211 52 L 216 58 H 200" fill="#e0482a" />
          <polygon points="0,200 60,168 140,184 240,160 320,178 320,200" fill="#141d22" />
        </>
      ) : (
        <>
          {/* collines douces au lever du jour */}
          <path d="M0 160 C 60 130, 120 150, 170 140 C 230 128, 280 150, 320 140 V 200 H 0 Z" fill="#4b3a52" />
          <path d="M0 180 C 70 160, 150 176, 210 168 C 260 162, 300 172, 320 168 V 200 H 0 Z" fill="#2b2433" />
        </>
      )}
      <rect width={W} height={H} fill={`url(#fade${id})`} />
    </svg>
  )
}
