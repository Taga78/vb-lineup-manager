'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type SessionWithCount = {
  id: string
  date: string
  label: string | null
  nb_courts_planned: number
  preferred_team_size: number
  is_open: boolean
  created_at: string
  created_by: string | null
  recurring_schedule_id: string | null
  attendance_count: number
}

export async function getSessions(): Promise<{
  data: SessionWithCount[]
  error: string | null
}> {
  const supabase = await createClient()

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*, attendances(count)')
    .order('date', { ascending: false })

  if (sessionsError) {
    return { data: [], error: sessionsError.message }
  }

  if (!sessions || sessions.length === 0) {
    return { data: [], error: null }
  }

  const data: SessionWithCount[] = sessions.map((s) => {
    const countArr = s.attendances as unknown as { count: number }[]
    return {
      id: s.id,
      date: s.date,
      label: s.label,
      nb_courts_planned: s.nb_courts_planned,
      preferred_team_size: s.preferred_team_size,
      is_open: s.is_open,
      created_at: s.created_at,
      created_by: s.created_by,
      recurring_schedule_id: s.recurring_schedule_id,
      attendance_count: countArr?.[0]?.count ?? 0,
    }
  })

  return { data, error: null }
}

export async function getSession(id: string): Promise<{
  data: SessionWithCount | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (sessionError) {
    return { data: null, error: sessionError.message }
  }

  // Fetch attendance count for this session
  const { count, error: countError } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', id)

  if (countError) {
    return { data: null, error: countError.message }
  }

  return {
    data: {
      id: session.id,
      date: session.date,
      label: session.label,
      nb_courts_planned: session.nb_courts_planned,
      preferred_team_size: session.preferred_team_size,
      is_open: session.is_open,
      created_at: session.created_at,
      created_by: session.created_by,
      recurring_schedule_id: session.recurring_schedule_id,
      attendance_count: count ?? 0,
    },
    error: null,
  }
}

export async function createSession(formData: FormData): Promise<{
  success: boolean
  error?: string
}> {
  const date = formData.get('date') as string | null
  const label = (formData.get('label') as string | null) || null
  const nbCourtsRaw = formData.get('nb_courts_planned') as string | null
  const teamSizeRaw = formData.get('preferred_team_size') as string | null

  // Validation
  if (!date) {
    return { success: false, error: 'La date est requise.' }
  }

  if (label && label.length > 100) {
    return { success: false, error: 'Le libellé ne doit pas dépasser 100 caractères.' }
  }

  const nbCourts = nbCourtsRaw ? parseInt(nbCourtsRaw, 10) : NaN
  if (isNaN(nbCourts) || nbCourts < 1) {
    return { success: false, error: 'Le nombre de terrains doit être au moins 1.' }
  }

  const teamSize = teamSizeRaw ? parseInt(teamSizeRaw, 10) : NaN
  if (isNaN(teamSize) || teamSize < 3 || teamSize > 6) {
    return { success: false, error: 'La taille d\'équipe doit être entre 3 et 6.' }
  }

  let supabase, user
  try {
    ;({ supabase, user } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase.from('sessions').insert({
    date: new Date(date).toISOString(),
    label: label?.trim() || null,
    nb_courts_planned: nbCourts,
    preferred_team_size: teamSize,
    created_by: user.id,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/sessions')
  return { success: true }
}

export async function updateSession(
  id: string,
  formData: FormData
): Promise<{
  success: boolean
  error?: string
}> {
  const date = formData.get('date') as string | null
  const label = (formData.get('label') as string | null) || null
  const nbCourtsRaw = formData.get('nb_courts_planned') as string | null
  const teamSizeRaw = formData.get('preferred_team_size') as string | null

  // Validation
  if (!date) {
    return { success: false, error: 'La date est requise.' }
  }

  if (label && label.length > 100) {
    return { success: false, error: 'Le libellé ne doit pas dépasser 100 caractères.' }
  }

  const nbCourts = nbCourtsRaw ? parseInt(nbCourtsRaw, 10) : NaN
  if (isNaN(nbCourts) || nbCourts < 1) {
    return { success: false, error: 'Le nombre de terrains doit être au moins 1.' }
  }

  const teamSize = teamSizeRaw ? parseInt(teamSizeRaw, 10) : NaN
  if (isNaN(teamSize) || teamSize < 3 || teamSize > 6) {
    return { success: false, error: 'La taille d\'équipe doit être entre 3 et 6.' }
  }

  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('sessions')
    .update({
      date: new Date(date).toISOString(),
      label: label?.trim() || null,
      nb_courts_planned: nbCourts,
      preferred_team_size: teamSize,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/sessions')
  revalidatePath(`/staff/sessions/${id}`)
  return { success: true }
}

export async function toggleSessionOpen(id: string): Promise<{
  success: boolean
  error?: string
}> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  // First, fetch the current session state
  const { data: session, error: fetchError } = await supabase
    .from('sessions')
    .select('is_open')
    .eq('id', id)
    .single()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const willOpen = !session.is_open

  if (willOpen) {
    // Close ALL other open sessions first
    const { error: closeError } = await supabase
      .from('sessions')
      .update({ is_open: false })
      .eq('is_open', true)

    if (closeError) {
      return { success: false, error: closeError.message }
    }
  }

  // Toggle this session
  const { error: toggleError } = await supabase
    .from('sessions')
    .update({ is_open: willOpen })
    .eq('id', id)

  if (toggleError) {
    return { success: false, error: toggleError.message }
  }

  revalidatePath('/staff/sessions')
  revalidatePath(`/staff/sessions/${id}`)
  return { success: true }
}

export async function deleteSession(id: string): Promise<{
  success: boolean
  error?: string
}> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase.from('sessions').delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/staff/sessions')
  return { success: true }
}
