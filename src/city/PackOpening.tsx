import { useState } from 'react'
import type { Card, CityState, Pack } from './economy'
import { PACK_INFO, openPack } from './economy'
import { RARITIES, buildingById } from './buildings'
import { BuildingThumb } from './iso'
import { beep, buzz, unlockAudio } from '../workout/sound'

interface Props {
  packs: Pack[]
  city: CityState
  onCity: (fn: (c: CityState) => CityState) => void
  onClose: () => void
}

type Phase = 'closed' | 'shaking' | 'revealed'

export function PackOpening({ packs, city, onCity, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('closed')
  const [cards, setCards] = useState<Card[]>([])
  const [bonusCoins, setBonusCoins] = useState(0)
  const pack = packs[index]
  const info = PACK_INFO[pack?.kind ?? 'seance']
  const remaining = packs.length - index - 1

  const open = () => {
    if (phase !== 'closed' || !pack) return
    unlockAudio()
    setPhase('shaking')
    buzz(60)
    setTimeout(() => {
      // tirage à partir de l'état actuel de la ville, puis enregistrement
      const res = openPack(city, pack)
      onCity(() => res.city)
      setCards(res.cards)
      setBonusCoins(res.bonusCoins)
      setPhase('revealed')
      const best = res.cards.reduce((m, c) => Math.max(m, ['commun', 'rare', 'epique', 'legendaire'].indexOf(buildingById(c.id)?.rarity ?? 'commun')), 0)
      beep(660, 120)
      setTimeout(() => beep(880, 140), 140)
      if (best >= 2) setTimeout(() => beep(1320, 260), 320)
      buzz(best >= 2 ? [80, 60, 160] : 80)
    }, 700)
  }

  const next = () => {
    setIndex((i) => i + 1)
    setCards([])
    setBonusCoins(0)
    setPhase('closed')
  }

  if (!pack) return null

  return (
    <div className="pack-overlay" role="dialog" aria-label="Ouverture de pack">
      <div className="pack-top">
        <button type="button" className="round" aria-label="Fermer" onClick={onClose}>
          ✕
        </button>
        {packs.length > 1 && (
          <span className="pack-count">
            Pack {index + 1} / {packs.length}
          </span>
        )}
      </div>

      {phase !== 'revealed' ? (
        <div className="pack-stage">
          <button type="button" className={`pack-box ${phase === 'shaking' ? 'shake' : 'float'}`} style={{ '--pc': info.color } as React.CSSProperties} onClick={open}>
            <span className="pack-ribbon" />
            <span className="pack-emoji">{info.emoji}</span>
          </button>
          <h2 className="pack-title">{info.label}</h2>
          <p className="pack-hint">{info.hint}</p>
          <p className="pack-tap">{phase === 'closed' ? 'Touche le pack pour l\'ouvrir' : 'Ouverture…'}</p>
        </div>
      ) : (
        <div className="pack-stage">
          <h2 className="pack-title">{info.label}</h2>
          <div className={`pack-cards n${cards.length}`}>
            {cards.map((c, i) => {
              const b = buildingById(c.id)!
              const r = RARITIES[b.rarity]
              return (
                <div key={i} className="pack-card" style={{ animationDelay: `${i * 0.35}s`, '--rc': r.color, '--rg': r.glow } as React.CSSProperties}>
                  <span className="pack-rarity">{r.label}</span>
                  <BuildingThumb b={b} size={78} />
                  <b className="pack-name">{b.name}</b>
                  {c.coins > 0 ? (
                    <span className="pack-tag dup">Doublon · +{c.coins} 🪙</span>
                  ) : c.isNew ? (
                    <span className="pack-tag new">Nouveau !</span>
                  ) : (
                    <span className="pack-tag">+1 exemplaire</span>
                  )}
                </div>
              )
            })}
          </div>
          {bonusCoins > 0 && <p className="pack-hint">+ {bonusCoins} 🪙 dans le coffre</p>}
          <div className="pack-actions">
            {remaining > 0 ? (
              <>
                <button type="button" className="btn" onClick={onClose}>
                  Voir ma ville
                </button>
                <button type="button" className="btn primary" onClick={next}>
                  Pack suivant ({remaining})
                </button>
              </>
            ) : (
              <button type="button" className="btn primary huge" onClick={onClose}>
                Placer dans ma ville
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
