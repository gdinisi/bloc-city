import { createClient } from '@supabase/supabase-js'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import type { Session } from '../types'
import type { CityState } from '../city/economy'
import { countsByWeek, weeklyStreak } from './stats'
import { toKey, weekKey } from './dates'

/*
 * Lien avec Supabase : compte (code reçu par e-mail), sauvegarde, amis, classement.
 * Seule la clé « publishable » est utilisée ici ; les règles d'accès (RLS) côté
 * serveur garantissent que chacun ne lit que ses données et celles de ses amis.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const cloudEnabled = Boolean(url && key)

/** Arrivée par le lien « mot de passe oublié » (à lire avant que Supabase ne nettoie l'adresse) */
const recoveryInUrl = /type=recovery/.test(location.hash)

// flux « implicit » : le lien reçu par e-mail marche même s'il s'ouvre dans Safari
// plutôt que dans l'app installée (pas de secret à retrouver sur l'appareil d'origine)
export const supabase = cloudEnabled
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'blocCity.auth' },
    })
  : null

/* ---------- compte ---------- */

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [recovery, setRecovery] = useState(recoveryInUrl)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s)
      if (e === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  return { session, ready, userId: session?.user.id ?? null, email: session?.user.email ?? null, recovery, endRecovery: () => setRecovery(false) }
}

/** Crée le compte ; renvoie true s'il faut d'abord confirmer l'adresse (lien reçu par e-mail) */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase!.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}` },
  })
  if (error) throw new Error(frenchError(error.message))
  // adresse déjà utilisée : Supabase renvoie un compte sans identité
  if (data.user && data.user.identities?.length === 0) throw new Error('Un compte existe déjà avec cette adresse : connecte-toi.')
  return !data.session
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(frenchError(error.message))
}

/** Envoie le lien pour choisir un nouveau mot de passe */
export async function resetPassword(email: string) {
  const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}${import.meta.env.BASE_URL}` })
  if (error) throw new Error(frenchError(error.message))
}

export async function updatePassword(password: string) {
  const { error } = await supabase!.auth.updateUser({ password })
  if (error) throw new Error(frenchError(error.message))
}

export async function signOut() {
  await supabase?.auth.signOut()
}

function frenchError(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes('rate limit') || m.includes('security purposes')) return "Trop d'e-mails demandés : réessaie dans quelques minutes."
  if (m.includes('different from the old')) return "Choisis un mot de passe différent de l'ancien."
  if (m.includes('session') && m.includes('missing')) return 'Le lien a expiré : redemande un e-mail de réinitialisation.'
  if (m.includes('not confirmed')) return "Adresse pas encore confirmée : clique sur le lien reçu par e-mail, puis reconnecte-toi."
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'E-mail ou mot de passe incorrect.'
  if (m.includes('password')) return 'Le mot de passe doit faire au moins 6 caractères.'
  if (m.includes('email')) return 'Adresse e-mail invalide.'
  if (m.includes('fetch') || m.includes('network')) return 'Pas de connexion internet.'
  return msg
}

/* ---------- profil et classement ---------- */

export interface Stats {
  /** lundi de la semaine des chiffres (YYYY-MM-DD) */
  week?: string
  weekCount?: number
  /** mois des chiffres (YYYY-MM) */
  month?: string
  monthCount?: number
  goal?: number
  streak?: number
}

export interface Profile {
  id: string
  pseudo: string
  friend_code: string
  stats: Stats
}

export const monthKey = (d = new Date()) => toKey(d).slice(0, 7)

export function computeStats(sessions: Session[], goal: number, today = new Date()): Stats {
  const week = weekKey(today)
  const month = monthKey(today)
  return {
    week,
    weekCount: countsByWeek(sessions).get(week) ?? 0,
    month,
    monthCount: sessions.filter((s) => s.type !== 'repos' && s.date.startsWith(month)).length,
    goal,
    streak: weeklyStreak(sessions, goal, today),
  }
}

/** Part de l'objectif atteinte (1 = 100 %) sur la semaine ou le mois en cours */
export function score(s: Stats, period: 'semaine' | 'mois', today = new Date()) {
  const goal = Math.max(1, s.goal ?? 3)
  if (period === 'semaine') return s.week === weekKey(today) ? (s.weekCount ?? 0) / goal : 0
  if (s.month !== monthKey(today)) return 0
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return (s.monthCount ?? 0) / ((goal * days) / 7)
}

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase!.from('profiles').select('id, pseudo, friend_code, stats').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function createProfile(userId: string, pseudo: string, stats: Stats) {
  const { data, error } = await supabase!.from('profiles').insert({ id: userId, pseudo: pseudo.trim(), stats }).select('id, pseudo, friend_code, stats').single()
  if (error) throw new Error(error.message.includes('check') ? 'Le pseudo doit faire entre 2 et 20 caractères.' : error.message)
  return data as Profile
}

export async function renameProfile(userId: string, pseudo: string) {
  const { error } = await supabase!.from('profiles').update({ pseudo: pseudo.trim() }).eq('id', userId)
  if (error) throw new Error('Le pseudo doit faire entre 2 et 20 caractères.')
}

/** Moi et mes amis (les règles d'accès ne renvoient rien d'autre) */
export async function listPlayers() {
  const { data, error } = await supabase!.from('profiles').select('id, pseudo, friend_code, stats')
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function addFriend(code: string) {
  const { data, error } = await supabase!.rpc('add_friend', { code })
  if (error) {
    if (error.message.includes('code_inconnu')) throw new Error('Aucun joueur avec ce code.')
    if (error.message.includes('soi_meme')) throw new Error("C'est ton propre code !")
    throw new Error(error.message)
  }
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; pseudo: string } | undefined
  return row
}

export async function removeFriend(id: string) {
  const { error } = await supabase!.rpc('remove_friend', { other: id })
  if (error) throw error
}

export async function getCity(userId: string) {
  const { data, error } = await supabase!.from('cities').select('city').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data?.city ?? null) as CityState | null
}

/* ---------- sauvegarde ---------- */

export interface Saved<T> {
  data: T
  updatedAt: number
}

export async function pullData<T>(userId: string): Promise<Saved<T> | null> {
  const { data, error } = await supabase!.from('user_data').select('data, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { data: data.data as T, updatedAt: new Date(data.updated_at as string).getTime() }
}

/** Envoie la sauvegarde, la ville (pour les visites) et les chiffres du classement */
export async function pushAll(userId: string, payload: unknown, updatedAt: number, city: CityState, stats: Stats, hasProfile: boolean) {
  const at = new Date(updatedAt).toISOString()
  const jobs: PromiseLike<{ error: unknown }>[] = [supabase!.from('user_data').upsert({ user_id: userId, data: payload, updated_at: at })]
  if (hasProfile) {
    jobs.push(supabase!.from('cities').upsert({ user_id: userId, city, updated_at: at }))
    jobs.push(supabase!.from('profiles').update({ stats, updated_at: at }).eq('id', userId))
  }
  const res = await Promise.all(jobs)
  const err = res.find((r) => r.error)?.error
  if (err) throw err
}

/* ---------- invitation par lien ---------- */

const PENDING = 'blocCity.invite'

/** Lit un éventuel ?ami=CODE dans l'adresse, le garde de côté et nettoie l'URL */
export function takeInviteFromUrl() {
  const q = new URLSearchParams(location.search)
  const code = q.get('ami')
  if (!code) return null
  try {
    localStorage.setItem(PENDING, code.toUpperCase())
  } catch {
    /* rien */
  }
  q.delete('ami')
  const rest = q.toString()
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''))
  return code.toUpperCase()
}

export const pendingInvite = () => {
  try {
    return localStorage.getItem(PENDING)
  } catch {
    return null
  }
}

export const clearInvite = () => {
  try {
    localStorage.removeItem(PENDING)
  } catch {
    /* rien */
  }
}

export const inviteLink = (code: string) => `${location.origin}${import.meta.env.BASE_URL}?ami=${code}`
