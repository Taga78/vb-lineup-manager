'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { GUEST_LEVELS, type GuestLevel } from '@/lib/types'

export async function getOpenSession() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('id, date, label, nb_courts_planned, preferred_team_size, is_open')
    .eq('is_open', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getAttendance(sessionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendances')
    .select(`
      id,
      session_id,
      player_id,
      marked_by,
      created_at,
      players (
        name,
        gender,
        is_guest,
        skills_verified,
        skill_service,
        skill_pass,
        skill_attack,
        skill_defense
      )
    `)
    .eq('session_id', sessionId)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function checkIn(sessionId: string, playerId: string) {
  const supabase = await createClient()

  // Try to get current user for marked_by (staff actions)
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('attendances')
    .upsert(
      { session_id: sessionId, player_id: playerId, ...(user ? { marked_by: user.id } : {}) },
      { onConflict: 'session_id,player_id' }
    )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/attend')
  revalidatePath(`/staff/sessions/${sessionId}`)
  return { success: true }
}

export async function checkOut(sessionId: string, playerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('attendances')
    .delete()
    .eq('session_id', sessionId)
    .eq('player_id', playerId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/attend')
  revalidatePath(`/staff/sessions/${sessionId}`)
  return { success: true }
}

export async function registerGuest(
  sessionId: string,
  name: string,
  gender: 'M' | 'F',
  level: GuestLevel
) {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { success: false, error: 'Le nom est requis.' }
  }

  if (!['M', 'F'].includes(gender)) {
    return { success: false, error: 'Genre invalide.' }
  }

  if (!(level in GUEST_LEVELS)) {
    return { success: false, error: 'Niveau invalide.' }
  }

  const skillValue = GUEST_LEVELS[level].skills

  const supabase = await createClient()

  // Créer le joueur invité
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      name: trimmedName,
      gender,
      is_guest: true,
      is_active: true,
      skills_verified: false,
      skill_service: skillValue,
      skill_pass: skillValue,
      skill_attack: skillValue,
      skill_defense: skillValue,
    })
    .select('id, name, gender, skill_service, skill_pass, skill_attack, skill_defense, is_active, is_guest')
    .single()

  if (playerError) {
    return { success: false, error: playerError.message }
  }

  // Marquer la présence
  const { error: attendanceError } = await supabase
    .from('attendances')
    .insert({ session_id: sessionId, player_id: player.id })

  if (attendanceError) {
    return { success: false, error: attendanceError.message }
  }

  revalidatePath('/attend')
  revalidatePath(`/staff/sessions/${sessionId}`)
  return { success: true, player }
}

export async function getGuestsForSession(sessionId: string) {
  const supabase = await createClient()

  // 1. Récupérer les player_id présents à cette séance
  const { data: attendanceRows, error: attError } = await supabase
    .from('attendances')
    .select('player_id')
    .eq('session_id', sessionId)

  if (attError) {
    return { data: [], error: attError.message }
  }

  if (!attendanceRows || attendanceRows.length === 0) {
    return { data: [], error: null }
  }

  const playerIds = attendanceRows.map((r) => r.player_id)

  // 2. Parmi ceux-ci, trouver les invités non vérifiés
  const { data: guests, error: guestError } = await supabase
    .from('players')
    .select('id, name, skills_verified')
    .in('id', playerIds)
    .eq('is_guest', true)
    .eq('skills_verified', false)

  if (guestError) {
    return { data: [], error: guestError.message }
  }

  if (!guests || guests.length === 0) {
    return { data: [], error: null }
  }

  return { data: guests.map((g) => ({ id: g.id, name: g.name })), error: null }
}
