'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type PlayerRow = {
  id: string
  name: string
  gender: string | null
  skill_service: number
  skill_pass: number
  skill_attack: number
  skill_defense: number
  is_active: boolean
  is_guest: boolean
}

type ActionResult = {
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getPlayers(): Promise<{ data: PlayerRow[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('id, name, gender, skill_service, skill_pass, skill_attack, skill_defense, is_active, is_guest')
    .order('name')

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

export async function getPlayer(id: string): Promise<{ data: PlayerRow | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('id, name, gender, skill_service, skill_pass, skill_attack, skill_defense, is_active, is_guest')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ---------------------------------------------------------------------------
// Attendance counts (for player list)
// ---------------------------------------------------------------------------

export type AttendanceCounts = Map<string, { attended: number; total: number }>

export async function getPlayersAttendanceCounts(): Promise<{ data: AttendanceCounts; error: string | null }> {
  const supabase = await createClient()

  // Total sessions count
  const { count: totalSessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  if (sessionsError) {
    return { data: new Map(), error: sessionsError.message }
  }

  const total = totalSessions ?? 0

  // Attendances grouped by player
  const { data: attendances, error: attError } = await supabase
    .from('attendances')
    .select('player_id')

  if (attError) {
    return { data: new Map(), error: attError.message }
  }

  const counts: AttendanceCounts = new Map()
  for (const row of attendances ?? []) {
    const prev = counts.get(row.player_id)
    counts.set(row.player_id, { attended: (prev?.attended ?? 0) + 1, total })
  }

  return { data: counts, error: null }
}

// ---------------------------------------------------------------------------
// Attendance history (for player detail)
// ---------------------------------------------------------------------------

export type AttendanceHistorySession = {
  id: string
  date: string
  label: string | null
  present: boolean
}

export type AttendanceHistory = {
  attended: number
  total: number
  sessions: AttendanceHistorySession[]
}

export async function getPlayerAttendanceHistory(
  playerId: string
): Promise<{ data: AttendanceHistory; error: string | null }> {
  const supabase = await createClient()

  // All sessions ordered by date DESC
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id, date, label')
    .order('date', { ascending: false })

  if (sessionsError) {
    return { data: { attended: 0, total: 0, sessions: [] }, error: sessionsError.message }
  }

  // Player's attendances
  const { data: attendances, error: attError } = await supabase
    .from('attendances')
    .select('session_id')
    .eq('player_id', playerId)

  if (attError) {
    return { data: { attended: 0, total: 0, sessions: [] }, error: attError.message }
  }

  const attendedSet = new Set((attendances ?? []).map((a) => a.session_id))
  const total = sessions?.length ?? 0
  const attended = attendedSet.size

  const historySessions: AttendanceHistorySession[] = (sessions ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    label: s.label,
    present: attendedSet.has(s.id),
  }))

  return { data: { attended, total, sessions: historySessions }, error: null }
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

function validatePlayerFields(formData: FormData): {
  valid: true
  values: {
    name: string
    gender: string
    skill_service: number
    skill_pass: number
    skill_attack: number
    skill_defense: number
  }
} | {
  valid: false
  error: string
} {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const genderRaw = (formData.get('gender') as string | null)?.trim() ?? ''

  if (!name) {
    return { valid: false, error: 'Le nom est requis.' }
  }

  if (name.length > 100) {
    return { valid: false, error: 'Le nom ne doit pas dépasser 100 caractères.' }
  }

  const gender = genderRaw || 'M'
  if (!['M', 'F'].includes(gender)) {
    return { valid: false, error: 'Genre invalide.' }
  }

  const skills = {
    skill_service: Number(formData.get('skill_service')),
    skill_pass: Number(formData.get('skill_pass')),
    skill_attack: Number(formData.get('skill_attack')),
    skill_defense: Number(formData.get('skill_defense')),
  }

  for (const [key, val] of Object.entries(skills)) {
    if (isNaN(val) || val < 1 || val > 10) {
      return { valid: false, error: `${key} doit être entre 1 et 10.` }
    }
  }

  return { valid: true, values: { name, gender, ...skills } }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPlayer(formData: FormData): Promise<ActionResult> {
  const result = validatePlayerFields(formData)
  if (!result.valid) {
    return { success: false, error: result.error }
  }

  const { name, gender, skill_service, skill_pass, skill_attack, skill_defense } = result.values

  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase.from('players').insert({
    name,
    gender,
    skill_service,
    skill_pass,
    skill_attack,
    skill_defense,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/players')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updatePlayer(id: string, formData: FormData): Promise<ActionResult> {
  const result = validatePlayerFields(formData)
  if (!result.valid) {
    return { success: false, error: result.error }
  }

  const { name, gender, skill_service, skill_pass, skill_attack, skill_defense } = result.values

  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('players')
    .update({ name, gender, skill_service, skill_pass, skill_attack, skill_defense })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/players')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Toggle guest status
// ---------------------------------------------------------------------------

export async function toggleGuestStatus(id: string, isGuest: boolean): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('players')
    .update({ is_guest: isGuest })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/players')
  revalidatePath(`/staff/players/${id}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Soft delete / restore
// ---------------------------------------------------------------------------

export async function deletePlayer(id: string): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('players')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/players')
  return { success: true }
}

export async function restorePlayer(id: string): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('players')
    .update({ is_active: true })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/players')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Hard delete (permanent)
// ---------------------------------------------------------------------------

export async function permanentDeletePlayer(id: string): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/players')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update guest skills
// ---------------------------------------------------------------------------

export async function updateGuestSkills(
  playerId: string,
  skills: { skill_service: number; skill_pass: number; skill_attack: number; skill_defense: number }
): Promise<ActionResult> {
  for (const [key, val] of Object.entries(skills)) {
    if (isNaN(val) || val < 1 || val > 10) {
      return { success: false, error: `${key} doit être entre 1 et 10.` }
    }
  }

  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  // Vérifier que c'est bien un invité
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('is_guest')
    .eq('id', playerId)
    .single()

  if (fetchError || !player) {
    return { success: false, error: 'Joueur introuvable.' }
  }

  if (!player.is_guest) {
    return { success: false, error: 'Seuls les invités peuvent être modifiés ici.' }
  }

  const { error } = await supabase
    .from('players')
    .update({ ...skills, skills_verified: true })
    .eq('id', playerId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/players')
  return { success: true }
}
