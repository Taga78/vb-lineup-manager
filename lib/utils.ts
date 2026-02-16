import type { Player, TeamSkillAverages } from '@/lib/types'
import { SKILL_KEYS } from '@/lib/types'

// ── Compétences : classification et affichage ────────────────────────────

/**
 * Palier de compétence (1-5) à partir d'une note brute (1-10).
 * Utilisé pour le code couleur et les libellés textuels.
 */
export function skillTier(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 2) return 1
  if (level <= 4) return 2
  if (level <= 6) return 3
  if (level <= 8) return 4
  return 5
}

/**
 * Libellé français d'un palier de compétence.
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
 * Style inline (fond + texte) pour le code couleur d'une compétence.
 * Utilise les variables CSS --skill-1 à --skill-5 définies dans globals.css.
 */
export function skillColor(level: number): { backgroundColor: string; color: string } {
  const tier = skillTier(level)
  return {
    backgroundColor: `color-mix(in srgb, var(--skill-${tier}) 15%, white)`,
    color: `var(--skill-${tier})`,
  }
}

// ── Compétences : calculs numériques ─────────────────────────────────────

/**
 * Moyenne des 4 compétences d'un joueur, arrondie à 1 décimale.
 * Utilisée pour l'affichage du niveau global dans les listes et badges.
 */
export function overallSkill(player: Pick<Player, 'skill_service' | 'skill_pass' | 'skill_attack' | 'skill_defense'>): number {
  const sum = SKILL_KEYS.reduce((acc, key) => acc + player[key], 0)
  return Math.round((sum / SKILL_KEYS.length) * 10) / 10
}

/**
 * Somme brute des 4 compétences (sans arrondi).
 * Utilisée par l'algorithme de génération pour le tri par niveau.
 */
export function compositeSkill(player: Pick<Player, 'skill_service' | 'skill_pass' | 'skill_attack' | 'skill_defense'>): number {
  return SKILL_KEYS.reduce((acc, key) => acc + player[key], 0)
}

/**
 * Moyennes de compétences d'une équipe (par dimension + globale).
 * Partagée entre le server action `teams.ts` et le composant `TeamDisplay`.
 */
export function computeTeamAvgSkills(
  players: Pick<Player, 'skill_service' | 'skill_pass' | 'skill_attack' | 'skill_defense'>[]
): TeamSkillAverages {
  if (players.length === 0) {
    return { skill_service: 0, skill_pass: 0, skill_attack: 0, skill_defense: 0, overall: 0 }
  }
  const avgs = {} as Record<string, number>
  let totalSum = 0
  for (const key of SKILL_KEYS) {
    const sum = players.reduce((acc, p) => acc + p[key], 0)
    avgs[key] = Math.round((sum / players.length) * 10) / 10
    totalSum += avgs[key]
  }
  return {
    skill_service: avgs.skill_service,
    skill_pass: avgs.skill_pass,
    skill_attack: avgs.skill_attack,
    skill_defense: avgs.skill_defense,
    overall: Math.round((totalSum / SKILL_KEYS.length) * 10) / 10,
  }
}

// ── Formatage ────────────────────────────────────────────────────────────

/**
 * Formate une date ISO en français complet (ex: « mardi 15 avril 2025 »).
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
