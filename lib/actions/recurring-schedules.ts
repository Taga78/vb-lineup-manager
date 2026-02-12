'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { RecurringSchedule, ScheduleExclusion } from '@/lib/types'

// ── Schedules ────────────────────────────────────────

export async function getSchedules(): Promise<{
  data: RecurringSchedule[]
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recurring_schedules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getSchedule(id: string): Promise<{
  data: RecurringSchedule | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createSchedule(formData: FormData): Promise<{
  success: boolean
  error?: string
  id?: string
}> {
  const label = (formData.get('label') as string)?.trim()
  const daysRaw = formData.get('days_of_week') as string
  const sessionTime = formData.get('session_time') as string
  const openBeforeRaw = formData.get('open_before_minutes') as string
  const nbCourtsRaw = formData.get('nb_courts_planned') as string
  const teamSizeRaw = formData.get('preferred_team_size') as string
  const sessionLabelTemplate = (formData.get('session_label_template') as string)?.trim() || null

  if (!label) return { success: false, error: 'Le libellé est requis.' }
  if (!daysRaw) return { success: false, error: 'Sélectionnez au moins un jour.' }
  if (!sessionTime) return { success: false, error: "L'heure est requise." }

  const days = JSON.parse(daysRaw) as number[]
  if (days.length === 0) return { success: false, error: 'Sélectionnez au moins un jour.' }
  if (days.some((d) => d < 1 || d > 7)) return { success: false, error: 'Jours invalides.' }

  const openBefore = parseInt(openBeforeRaw, 10)
  if (isNaN(openBefore) || openBefore < 0) return { success: false, error: "Le délai d'ouverture doit être positif." }

  const nbCourts = parseInt(nbCourtsRaw, 10)
  if (isNaN(nbCourts) || nbCourts < 1) return { success: false, error: 'Le nombre de terrains doit être au moins 1.' }

  const teamSize = parseInt(teamSizeRaw, 10)
  if (isNaN(teamSize) || teamSize < 3 || teamSize > 6) return { success: false, error: "La taille d'équipe doit être entre 3 et 6." }

  let supabase, user
  try {
    ;({ supabase, user } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { data, error } = await supabase
    .from('recurring_schedules')
    .insert({
      label,
      days_of_week: days,
      session_time: sessionTime,
      open_before_minutes: openBefore,
      nb_courts_planned: nbCourts,
      preferred_team_size: teamSize,
      session_label_template: sessionLabelTemplate,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/staff/schedules')
  return { success: true, id: data.id }
}

export async function updateSchedule(id: string, formData: FormData): Promise<{
  success: boolean
  error?: string
}> {
  const label = (formData.get('label') as string)?.trim()
  const daysRaw = formData.get('days_of_week') as string
  const sessionTime = formData.get('session_time') as string
  const openBeforeRaw = formData.get('open_before_minutes') as string
  const nbCourtsRaw = formData.get('nb_courts_planned') as string
  const teamSizeRaw = formData.get('preferred_team_size') as string
  const sessionLabelTemplate = (formData.get('session_label_template') as string)?.trim() || null
  const isActive = formData.get('is_active') === 'true'

  if (!label) return { success: false, error: 'Le libellé est requis.' }
  if (!daysRaw) return { success: false, error: 'Sélectionnez au moins un jour.' }
  if (!sessionTime) return { success: false, error: "L'heure est requise." }

  const days = JSON.parse(daysRaw) as number[]
  if (days.length === 0) return { success: false, error: 'Sélectionnez au moins un jour.' }

  const openBefore = parseInt(openBeforeRaw, 10)
  if (isNaN(openBefore) || openBefore < 0) return { success: false, error: "Le délai d'ouverture doit être positif." }

  const nbCourts = parseInt(nbCourtsRaw, 10)
  if (isNaN(nbCourts) || nbCourts < 1) return { success: false, error: 'Le nombre de terrains doit être au moins 1.' }

  const teamSize = parseInt(teamSizeRaw, 10)
  if (isNaN(teamSize) || teamSize < 3 || teamSize > 6) return { success: false, error: "La taille d'équipe doit être entre 3 et 6." }

  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('recurring_schedules')
    .update({
      label,
      days_of_week: days,
      session_time: sessionTime,
      open_before_minutes: openBefore,
      nb_courts_planned: nbCourts,
      preferred_team_size: teamSize,
      session_label_template: sessionLabelTemplate,
      is_active: isActive,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/staff/schedules')
  revalidatePath(`/staff/schedules/${id}`)
  return { success: true }
}

export async function toggleScheduleActive(id: string): Promise<{
  success: boolean
  error?: string
}> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { data, error: fetchError } = await supabase
    .from('recurring_schedules')
    .select('is_active')
    .eq('id', id)
    .single()

  if (fetchError) return { success: false, error: fetchError.message }

  const { error } = await supabase
    .from('recurring_schedules')
    .update({ is_active: !data.is_active })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/staff/schedules')
  revalidatePath(`/staff/schedules/${id}`)
  return { success: true }
}

export async function deleteSchedule(id: string): Promise<{
  success: boolean
  error?: string
}> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase.from('recurring_schedules').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/staff/schedules')
  return { success: true }
}

// ── Exclusions ───────────────────────────────────────

export async function getExclusions(scheduleId: string): Promise<{
  data: ScheduleExclusion[]
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedule_exclusions')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('start_date', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function addExclusion(formData: FormData): Promise<{
  success: boolean
  error?: string
}> {
  const scheduleId = formData.get('schedule_id') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const reason = (formData.get('reason') as string)?.trim() || null

  if (!scheduleId) return { success: false, error: 'Planning manquant.' }
  if (!startDate || !endDate) return { success: false, error: 'Les dates sont requises.' }
  if (endDate < startDate) return { success: false, error: 'La date de fin doit être après la date de début.' }

  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase.from('schedule_exclusions').insert({
    schedule_id: scheduleId,
    start_date: startDate,
    end_date: endDate,
    reason,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/staff/schedules/${scheduleId}`)
  return { success: true }
}

export async function deleteExclusion(id: string, scheduleId: string): Promise<{
  success: boolean
  error?: string
}> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase.from('schedule_exclusions').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/staff/schedules/${scheduleId}`)
  return { success: true }
}
