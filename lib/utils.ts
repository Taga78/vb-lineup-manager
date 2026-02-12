import type { Player } from '@/lib/types'
import { SKILL_KEYS } from '@/lib/types'

/**
 * Returns the skill tier (1-5) for a given skill value (1-10).
 */
export function skillTier(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 2) return 1
  if (level <= 4) return 2
  if (level <= 6) return 3
  if (level <= 8) return 4
  return 5
}

/**
 * Returns a French label for a skill tier.
 */
export function skillLabel(level: number): string {
  switch (skillTier(level)) {
    case 1: return 'Débutant'
    case 2: return 'Intermédiaire'
    case 3: return 'Confirmé'
    case 4: return 'Avancé'
    case 5: return 'Expert'
  }
}

/**
 * Returns inline style object for skill level color coding using CSS vars.
 */
export function skillColor(level: number): { backgroundColor: string; color: string } {
  const tier = skillTier(level)
  return {
    backgroundColor: `color-mix(in srgb, var(--skill-${tier}) 15%, white)`,
    color: `var(--skill-${tier})`,
  }
}

/**
 * Returns the overall skill (average of 4 skills, rounded to 1 decimal).
 */
export function overallSkill(player: Pick<Player, 'skill_service' | 'skill_pass' | 'skill_attack' | 'skill_defense'>): number {
  const sum = SKILL_KEYS.reduce((acc, key) => acc + player[key], 0)
  return Math.round((sum / SKILL_KEYS.length) * 10) / 10
}

/**
 * Returns the composite skill (sum of 4 skills, used for sorting in the algorithm).
 */
export function compositeSkill(player: Pick<Player, 'skill_service' | 'skill_pass' | 'skill_attack' | 'skill_defense'>): number {
  return SKILL_KEYS.reduce((acc, key) => acc + player[key], 0)
}

/**
 * Format a date string in French locale.
 */
export function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
