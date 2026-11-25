import { useId } from 'react'

/*
 * Logo de chaque grade d'expérience : un écusson dont la couleur se réchauffe
 * avec le niveau (bleu glacier → orange du couchant → or), et un symbole
 * d'escalade différent à chaque grade.
 */

const SYMBOLS: string[] = [
  // 1 · Grimpeur en herbe : jeune pousse
  'M12 19v-6.5M12 12.5c0-3.6-2.6-5.5-6-5.5 0 3.6 2.6 5.5 6 5.5ZM12 10.5c0-2.8 2-4.5 5.5-4.5 0 2.8-2 4.5-5.5 4.5Z',
  // 2 · Premiers blocs : bloc posé sur un tapis
  'M5 17c0-4.6 3-9 7.5-9S19 12 19 17ZM3.5 17h17M10 12.5h.01M14 11h.01M15.5 14h.01',
  // 3 · Grimpeur du dimanche : prise d'escalade
  'M7.5 17.5c-2.6-1.4-3.6-4.6-2.2-7.2 1.2-2.3 3.8-3.1 5.6-4.9 1.6-1.6 4.6-1.7 6.3.1 2 2 1.8 5.2-.3 7-1.4 1.2-1.8 3-3.2 4.3-1.7 1.6-4.2 1.9-6.2.7ZM10.5 12.5a1.4 1.4 0 1 0 0-.1',
  // 4 · Habitué de la salle : mousqueton
  'M9.5 4.5h4.5a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-8a3 3 0 0 1 3.5-3ZM14.5 8.5v6.5',
  // 5 · Grimpeur aguerri : corde lovée
  'M12 6.5c4.1 0 7.5 2.5 7.5 5.5s-3.4 5.5-7.5 5.5-7.5-2.5-7.5-5.5 3.4-5.5 7.5-5.5ZM12 9.5c2.5 0 4.5 1.1 4.5 2.5s-2 2.5-4.5 2.5-4.5-1.1-4.5-2.5 2-2.5 4.5-2.5ZM17 16l2.5 4',
  // 6 · Ouvreur de voies : dégaine
  'M8.5 3.5h1.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2ZM14 13h1.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2ZM10.5 11l3 2',
  // 7 · Main de fer : main serrée
  'M7.5 11.5V7a1.4 1.4 0 0 1 2.8 0v3.5M10.3 10V5.8a1.4 1.4 0 0 1 2.8 0V10M13.1 10V6.8a1.4 1.4 0 0 1 2.8 0v4M15.9 11V9a1.4 1.4 0 0 1 2.8 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-.7a5.8 5.8 0 0 1-5.8-5.8v-2.4a1.4 1.4 0 0 1 2.8 0',
  // 8 · Alpiniste : piolet
  'M7 20.5 16 7M10.5 4.5c3 0 5.8 1 8 3l-3 .8c-1.4-1-2.9-1.5-4.8-1.6ZM14 5.2 12.5 3',
  // 9 · Maître de la paroi : grande paroi et ses prises
  'M5.5 20.5V6l3.5-2.5 3 3 2.5-1.5 3 4 1.5 1v10.5ZM10 10h.01M13.5 12.5h.01M9.5 15.5h.01M14 17h.01',
  // 10 · Légende des sommets : sommet, drapeau et étoile
  'M3 19.5 10 8l3 5 2-3 6 9.5ZM10 8V3.5l4 1.4L10 6.3M18.5 3.5l.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2Z',
]

const COLORS: [string, string][] = [
  ['#5fb3c7', '#2f6f7e'],
  ['#4fa3b8', '#245a68'],
  ['#3f93b0', '#1f4a66'],
  ['#f5a742', '#d2672a'],
  ['#f0902f', '#c4561f'],
  ['#f0782d', '#b8431f'],
  ['#e9623a', '#a8351c'],
  ['#e0482a', '#8f2a17'],
  ['#c8402a', '#6f1f12'],
  ['#ffd36b', '#d08a1e'],
]

export function GradeLogo({ level, size = 40, locked = false }: { level: number; size?: number; locked?: boolean }) {
  const id = useId().replace(/:/g, '')
  const i = Math.max(0, Math.min(SYMBOLS.length - 1, level - 1))
  const [c1, c2] = locked ? ['#6b7178', '#3a3d43'] : COLORS[i]
  return (
    <svg className="grade-logo" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={`gl${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      {/* écusson hexagonal arrondi */}
      <path
        d="M20 2.5c1 0 2 .3 2.8.8l11 6.4c1.8 1 2.8 2.9 2.8 4.9v10.8c0 2-1 3.9-2.8 4.9l-11 6.4a5.6 5.6 0 0 1-5.6 0l-11-6.4A5.6 5.6 0 0 1 3.4 25.4V14.6c0-2 1-3.9 2.8-4.9l11-6.4c.9-.5 1.8-.8 2.8-.8Z"
        fill={`url(#gl${id})`}
      />
      <path
        d="M20 5.5c.6 0 1.2.2 1.7.5l10 5.8c1.1.6 1.7 1.7 1.7 2.9v10.6c0 1.2-.6 2.3-1.7 2.9l-10 5.8a3.4 3.4 0 0 1-3.4 0l-10-5.8a3.4 3.4 0 0 1-1.7-2.9V14.7c0-1.2.6-2.3 1.7-2.9l10-5.8c.5-.3 1.1-.5 1.7-.5Z"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1"
      />
      <g transform="translate(8 8)">
        <path d={SYMBOLS[i]} fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
