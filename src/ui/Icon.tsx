/*
 * Icônes au trait (24 × 24), style application de sport.
 * Elles prennent la couleur du texte (currentColor).
 */

const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-5.5h3V20h5V9.5',
  calendar: 'M4 6.5h16V20H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5',
  // prise d'escalade
  hold: 'M7.5 17.5c-2.6-1.4-3.6-4.6-2.2-7.2 1.2-2.3 3.8-3.1 5.6-4.9 1.6-1.6 4.6-1.7 6.3.1 2 2 1.8 5.2-.3 7-1.4 1.2-1.8 3-3.2 4.3-1.7 1.6-4.2 1.9-6.2.7ZM10 12.5a1.6 1.6 0 1 0 0-.1',
  city: 'M3.5 20.5h17M5 20.5V10l4-2.5v13M9 20.5V5h6v15.5M15 20.5v-9h4.5v9M11.5 8h1M11.5 11h1M11.5 14h1',
  chart: 'M4 20.5h16M7 17v-5M12 17V7M17 17v-8',
  trophy: 'M8 4.5h8v4a4 4 0 0 1-8 0zM8 6.5H5a3 3 0 0 0 3 3.5M16 6.5h3a3 3 0 0 1-3 3.5M12 12.5v3.5M8.5 20h7M9.5 16h5v4h-5z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6',
  play: 'M8 5.5v13l10.5-6.5z',
  plus: 'M12 5v14M5 12h14',
  gift: 'M4 10h16v4H4zM5.5 14v6.5h13V14M12 10v10.5M12 10C10 6 6.5 6.5 7.5 9M12 10c2-4 5.5-3.5 4.5-1',
  chest: 'M3.5 10.5h17V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19zM3.5 10.5V9a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v1.5M10.5 12.5h3v3h-3z',
  coin: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5v9M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.5-2.6-1.5',
  flame: 'M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.6-5.3 3.6-8.4.9 1.6 1.4 2.8 1.4 4.2 1.6-1.2 2.7-3.4 2.4-6.2 3.3 2.1 5.6 6 5.6 10.4 0 3.5-2.6 6.1-6.5 6.1Z',
  mountain: 'M2.5 19.5 9 9l3.5 5 2.5-3.5 6.5 9zM9 9l1.8 3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  check: 'M5 12.5 10 17.5 19.5 7',
  chevron: 'M9.5 6l6 6-6 6',
  back: 'M14.5 6l-6 6 6 6',
  book: 'M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3zM5 16.5a3 3 0 0 1 3-3h11',
  dice: 'M5 5h14v14H5zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01',
  flag: 'M6 21V4M6 4.5h11l-2.5 4 2.5 4H6',
  bolt: 'M13 3 5.5 13.5H12L11 21l7.5-10.5H12z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2L10 21h4l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22, stroke = 1.8, fill = false, className }: { name: IconName; size?: number; stroke?: number; fill?: boolean; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
