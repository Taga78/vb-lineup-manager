import { createClient } from '@/lib/supabase/server'

/**
 * Returns the authenticated user or throws.
 * Use in Server Actions that require staff access.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Non autorisé. Connectez-vous pour effectuer cette action.')
  }

  return { user, supabase }
}
