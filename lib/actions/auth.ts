'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function staffLogin(password: string): Promise<{ error?: string }> {
  const email = process.env.STAFF_EMAIL
  if (!email) {
    return { error: 'Configuration serveur manquante.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Mot de passe incorrect.' }
  }

  redirect('/staff')
}

export async function forgotPassword(): Promise<{ error?: string; success?: boolean }> {
  const email = process.env.STAFF_EMAIL
  if (!email) {
    return { error: 'Configuration serveur manquante.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') || ''

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: 'Erreur lors de l\'envoi. Réessayez.' }
  }

  return { success: true }
}

export async function changePassword(newPassword: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { error: 'Erreur lors du changement de mot de passe.' }
  }

  redirect('/staff')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
