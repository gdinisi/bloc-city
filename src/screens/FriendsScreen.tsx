import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '../types'
import type { CityState } from '../city/economy'
import { migrateCity } from '../city/economy'
import { CityMap } from '../city/CityMap'
import type { Profile } from '../lib/cloud'
import {
  addFriend,
  clearInvite,
  cloudEnabled,
  computeStats,
  createProfile,
  getCity,
  inviteLink,
  listPlayers,
  pendingInvite,
  removeFriend,
  renameProfile,
  score,
  sendCode,
  signOut,
  verifyCode,
} from '../lib/cloud'
import type { SyncStatus } from '../lib/sync'

interface Props {
  userId: string | null
  email: string | null
  authReady: boolean
  profile: Profile | null
  profileLoaded: boolean
  onProfile: (p: Profile | null) => void
  sync: { status: SyncStatus; lastSync: number | null }
  sessions: Session[]
  weeklyGoal: number
}

export function FriendsScreen(p: Props) {
  if (!cloudEnabled) {
    return (
      <div className="screen">
        <section className="card">
          <h2>Amis</h2>
          <p className="muted">Le serveur n'est pas configuré dans cette version de l'app.</p>
        </section>
      </div>
    )
  }
  if (!p.authReady) return <div className="screen" />
  if (!p.userId) return <Login />
  if (!p.profileLoaded) return <div className="screen"><p className="muted center-text">Chargement…</p></div>
  if (!p.profile) return <ChoosePseudo userId={p.userId} sessions={p.sessions} weeklyGoal={p.weeklyGoal} onDone={p.onProfile} />
  return <Friends {...p} profile={p.profile} userId={p.userId} />
}

/* ---------- connexion par code reçu par e-mail ---------- */

function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invite = pendingInvite()

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <section className="card friends-hero">
        <div className="friends-hero-emoji">🏆</div>
        <h2>Grimpe avec tes amis</h2>
        <p className="muted">Crée ton compte pour sauvegarder ta progression, comparer ta semaine à celle de tes amis et visiter leurs villes.</p>
        {invite && (
          <p className="invite-note">
            Tu as été invité ! Code ami : <b>{invite}</b>. Il sera ajouté après ta connexion.
          </p>
        )}
      </section>

      <section className="card">
        {step === 'email' ? (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                await sendCode(email)
                setStep('code')
              })
            }}
          >
            <label className="field">
              <span>Ton adresse e-mail</span>
              <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" />
            </label>
            <button type="submit" className="btn primary" disabled={busy || !email.includes('@')}>
              {busy ? 'Envoi…' : 'Recevoir un code'}
            </button>
            <p className="muted small-text">Pas de mot de passe : on t'envoie un code à usage unique.</p>
          </form>
        ) : (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault()
              void run(() => verifyCode(email, code))
            }}
          >
            <p>
              Code envoyé à <b>{email}</b>. Regarde tes e-mails (et les indésirables).
            </p>
            <label className="field">
              <span>Code reçu</span>
              <input
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </label>
            <button type="submit" className="btn primary" disabled={busy || code.length < 6}>
              {busy ? 'Vérification…' : 'Se connecter'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setStep('email')}>
              Changer d'adresse
            </button>
          </form>
        )}
        {error && <p className="form-error">{error}</p>}
      </section>
    </div>
  )
}

/* ---------- premier passage : pseudo ---------- */

function ChoosePseudo({ userId, sessions, weeklyGoal, onDone }: { userId: string; sessions: Session[]; weeklyGoal: number; onDone: (p: Profile) => void }) {
  const [pseudo, setPseudo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="screen">
      <section className="card">
        <h2>Choisis ton pseudo</h2>
        <p className="muted">C'est le nom que verront tes amis dans le classement.</p>
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            createProfile(userId, pseudo, computeStats(sessions, weeklyGoal))
              .then(onDone)
              .catch((err: Error) => setError(err.message))
              .finally(() => setBusy(false))
          }}
        >
          <label className="field">
            <span>Pseudo</span>
            <input maxLength={20} value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Ex. Grimpeur du dimanche" />
          </label>
          <button type="submit" className="btn primary" disabled={busy || pseudo.trim().length < 2}>
            C'est parti
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn ghost" onClick={() => void signOut()}>
          Se déconnecter
        </button>
      </section>
    </div>
  )
}

/* ---------- classement, invitation, visite ---------- */

const MEDALS = ['🥇', '🥈', '🥉']

function Friends({ userId, email, profile, onProfile, sync, sessions, weeklyGoal }: Props & { userId: string; profile: Profile }) {
  const [players, setPlayers] = useState<Profile[]>([])
  const [period, setPeriod] = useState<'semaine' | 'mois'>('semaine')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [visit, setVisit] = useState<Profile | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [pseudo, setPseudo] = useState(profile.pseudo)

  const refresh = useCallback(() => {
    listPlayers()
      .then(setPlayers)
      .catch(() => setMsg({ ok: false, text: 'Impossible de charger le classement (connexion ?).' }))
  }, [])

  // ajoute l'ami d'un lien d'invitation en attente
  useEffect(() => {
    const invite = pendingInvite()
    if (!invite) return refresh()
    clearInvite()
    addFriend(invite)
      .then((f) => setMsg({ ok: true, text: `${f?.pseudo ?? 'Ton ami'} a été ajouté à tes amis !` }))
      .catch((e: Error) => setMsg({ ok: false, text: e.message }))
      .finally(refresh)
  }, [refresh])

  // mes propres chiffres sont toujours ceux du téléphone (les plus frais)
  const me: Profile = { ...profile, stats: computeStats(sessions, weeklyGoal) }
  const rows = [me, ...players.filter((x) => x.id !== userId)]
    .map((x) => ({ ...x, pct: score(x.stats, period) }))
    .sort((a, b) => b.pct - a.pct || (b.stats.streak ?? 0) - (a.stats.streak ?? 0))
  const friendsCount = rows.length - 1

  const onAdd = (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    addFriend(code)
      .then((f) => {
        setMsg({ ok: true, text: `${f?.pseudo ?? 'Ton ami'} a été ajouté !` })
        setCode('')
        refresh()
      })
      .catch((err: Error) => setMsg({ ok: false, text: err.message }))
      .finally(() => setBusy(false))
  }

  const share = async () => {
    const link = inviteLink(profile.friend_code)
    const text = `Rejoins-moi sur Bloc City ! Mon code ami : ${profile.friend_code}`
    try {
      if (navigator.share) await navigator.share({ title: 'Bloc City', text, url: link })
      else {
        await navigator.clipboard.writeText(`${text}\n${link}`)
        setMsg({ ok: true, text: 'Lien copié !' })
      }
    } catch {
      /* partage annulé */
    }
  }

  return (
    <div className="screen">
      <section className="card">
        <div className="card-title-row">
          <h2>Classement</h2>
          <div className="seg">
            {(['semaine', 'mois'] as const).map((k) => (
              <button key={k} type="button" className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>
                {k === 'semaine' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>
        <p className="muted small-text">
          {period === 'semaine' ? "Part de l'objectif de la semaine atteinte. Remise à zéro chaque lundi." : "Part de l'objectif du mois atteinte (objectif hebdo × semaines du mois)."}
        </p>
        <ol className="leaderboard">
          {rows.map((r, i) => {
            const mine = r.id === userId
            const goal = r.stats.goal ?? 3
            const done = period === 'semaine' ? (r.stats.week === me.stats.week ? r.stats.weekCount ?? 0 : 0) : r.stats.month === me.stats.month ? r.stats.monthCount ?? 0 : 0
            return (
              <li key={r.id} className={mine ? 'me' : ''}>
                <button type="button" className="lb-row" onClick={() => !mine && setVisit(r)} disabled={mine}>
                  <span className="lb-rank">{MEDALS[i] ?? i + 1}</span>
                  <span className="lb-body">
                    <span className="lb-name">
                      {r.pseudo}
                      {mine && <i> (toi)</i>}
                    </span>
                    <span className="lb-bar">
                      <i style={{ width: `${Math.min(100, r.pct * 100)}%` }} />
                    </span>
                    <span className="lb-sub">
                      {done} séance{done > 1 ? 's' : ''}
                      {period === 'semaine' ? ` / ${goal}` : ''} · 🔥 {r.stats.streak ?? 0} sem.
                    </span>
                  </span>
                  <span className="lb-pct">{Math.round(r.pct * 100)} %</span>
                </button>
              </li>
            )
          })}
        </ol>
        {friendsCount === 0 && <p className="muted small-text">Ajoute des amis avec ton code pour lancer le classement.</p>}
        {friendsCount > 0 && <p className="muted small-text">Touche un ami pour visiter sa ville.</p>}
      </section>

      <section className="card">
        <h2>Inviter des amis</h2>
        <div className="friend-code">
          <span className="muted small-text">Ton code ami</span>
          <b>{profile.friend_code}</b>
        </div>
        <button type="button" className="btn primary" onClick={() => void share()}>
          📨 Partager mon lien d'invitation
        </button>
        <form className="add-friend" onSubmit={onAdd}>
          <input value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code d'un ami" aria-label="Code d'un ami" />
          <button type="submit" className="btn" disabled={busy || code.trim().length < 6}>
            Ajouter
          </button>
        </form>
        {msg && <p className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</p>}
      </section>

      <section className="card">
        <h2>Mon compte</h2>
        {renaming ? (
          <form
            className="add-friend rename"
            onSubmit={(e) => {
              e.preventDefault()
              renameProfile(userId, pseudo)
                .then(() => {
                  onProfile({ ...profile, pseudo: pseudo.trim() })
                  setRenaming(false)
                })
                .catch((err: Error) => setMsg({ ok: false, text: err.message }))
            }}
          >
            <input maxLength={20} value={pseudo} onChange={(e) => setPseudo(e.target.value)} aria-label="Pseudo" />
            <button type="submit" className="btn" disabled={pseudo.trim().length < 2}>
              OK
            </button>
          </form>
        ) : (
          <p className="account-line">
            <b>{profile.pseudo}</b>
            <button type="button" className="btn small ghost" onClick={() => setRenaming(true)}>
              Modifier
            </button>
          </p>
        )}
        <p className="muted small-text">{email}</p>
        <p className={`sync-line ${sync.status}`}>{syncLabel(sync.status, sync.lastSync)}</p>
        <button type="button" className="btn ghost" onClick={() => void signOut()}>
          Se déconnecter
        </button>
      </section>

      {visit && (
        <VisitCity
          friend={visit}
          onClose={() => setVisit(null)}
          onRemoved={() => {
            setVisit(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function syncLabel(s: SyncStatus, last: number | null) {
  if (s === 'synchro') return '☁️ Sauvegarde en cours…'
  if (s === 'erreur') return '⚠️ Sauvegarde impossible pour le moment, nouvel essai automatique.'
  if (s === 'ok' && last) return `✅ Sauvegardé dans le cloud à ${new Date(last).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  return '☁️ Synchronisation…'
}

/* ---------- visite de la ville d'un ami ---------- */

function VisitCity({ friend, onClose, onRemoved }: { friend: Profile; onClose: () => void; onRemoved: () => void }) {
  const [city, setCity] = useState<CityState | null | 'vide'>(null)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    getCity(friend.id)
      .then((c) => setCity(c ? migrateCity(c) : 'vide'))
      .catch(() => setCity('vide'))
  }, [friend.id])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Ville de ${friend.pseudo}`}>
        <div className="sheet-handle" />
        <h2>🏙️ La ville de {friend.pseudo}</h2>
        {city === null && <p className="muted">Chargement…</p>}
        {city === 'vide' && <p className="muted">{friend.pseudo} n'a pas encore construit sa ville.</p>}
        {city && city !== 'vide' && (
          <>
            <CityMap city={city} className="visit-map" />
            <p className="muted small-text">
              {city.placed.length} bâtiment{city.placed.length > 1 ? 's' : ''} · 🔥 série de {friend.stats.streak ?? 0} semaine{(friend.stats.streak ?? 0) > 1 ? 's' : ''}
            </p>
          </>
        )}
        <div className="sheet-actions">
          {confirm ? (
            <button
              type="button"
              className="btn danger"
              onClick={() =>
                removeFriend(friend.id)
                  .then(onRemoved)
                  .catch(() => setConfirm(false))
              }
            >
              Confirmer : retirer {friend.pseudo}
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setConfirm(true)}>
              Retirer de mes amis
            </button>
          )}
          <button type="button" className="btn primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
