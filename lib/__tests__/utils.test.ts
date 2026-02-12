import { describe, it, expect } from 'vitest'
import { overallSkill, skillTier, skillColor, compositeSkill, formatDateFr, skillLabel } from '@/lib/utils'

describe('overallSkill', () => {
  it('returns the average of 4 skills rounded to 1 decimal', () => {
    const result = overallSkill({
      skill_service: 6,
      skill_pass: 8,
      skill_attack: 4,
      skill_defense: 7,
    })
    // (6 + 8 + 4 + 7) / 4 = 6.25 -> rounded to 6.3
    expect(result).toBe(6.3)
  })

  it('returns exact value when average is already clean', () => {
    const result = overallSkill({
      skill_service: 5,
      skill_pass: 5,
      skill_attack: 5,
      skill_defense: 5,
    })
    expect(result).toBe(5)
  })

  it('handles minimum skills (all 1s)', () => {
    const result = overallSkill({
      skill_service: 1,
      skill_pass: 1,
      skill_attack: 1,
      skill_defense: 1,
    })
    expect(result).toBe(1)
  })

  it('handles maximum skills (all 10s)', () => {
    const result = overallSkill({
      skill_service: 10,
      skill_pass: 10,
      skill_attack: 10,
      skill_defense: 10,
    })
    expect(result).toBe(10)
  })
})

describe('skillTier', () => {
  it('returns 1 for levels 1-2', () => {
    expect(skillTier(1)).toBe(1)
    expect(skillTier(2)).toBe(1)
  })

  it('returns 2 for levels 3-4', () => {
    expect(skillTier(3)).toBe(2)
    expect(skillTier(4)).toBe(2)
  })

  it('returns 3 for levels 5-6', () => {
    expect(skillTier(5)).toBe(3)
    expect(skillTier(6)).toBe(3)
  })

  it('returns 4 for levels 7-8', () => {
    expect(skillTier(7)).toBe(4)
    expect(skillTier(8)).toBe(4)
  })

  it('returns 5 for levels 9-10', () => {
    expect(skillTier(9)).toBe(5)
    expect(skillTier(10)).toBe(5)
  })
})

describe('skillColor', () => {
  it('returns an object with backgroundColor and color', () => {
    const result = skillColor(5)
    expect(result).toHaveProperty('backgroundColor')
    expect(result).toHaveProperty('color')
  })

  it('uses the correct CSS variable for each tier', () => {
    for (let level = 1; level <= 10; level++) {
      const tier = skillTier(level)
      const result = skillColor(level)
      expect(result.color).toBe(`var(--skill-${tier})`)
      expect(result.backgroundColor).toContain(`var(--skill-${tier})`)
    }
  })

  it('backgroundColor uses color-mix with 15% opacity', () => {
    const result = skillColor(3)
    expect(result.backgroundColor).toBe('color-mix(in srgb, var(--skill-2) 15%, white)')
  })
})

describe('compositeSkill', () => {
  it('returns the sum of all 4 skills', () => {
    const result = compositeSkill({
      skill_service: 6,
      skill_pass: 8,
      skill_attack: 4,
      skill_defense: 7,
    })
    expect(result).toBe(25)
  })

  it('returns minimum composite for all 1s', () => {
    const result = compositeSkill({
      skill_service: 1,
      skill_pass: 1,
      skill_attack: 1,
      skill_defense: 1,
    })
    expect(result).toBe(4)
  })

  it('returns maximum composite for all 10s', () => {
    const result = compositeSkill({
      skill_service: 10,
      skill_pass: 10,
      skill_attack: 10,
      skill_defense: 10,
    })
    expect(result).toBe(40)
  })
})

describe('formatDateFr', () => {
  it('formats a date string in French locale', () => {
    const result = formatDateFr('2025-03-15')
    // Should contain French day/month names
    expect(result).toContain('mars')
    expect(result).toContain('2025')
    expect(result).toContain('15')
  })

  it('includes the weekday in French', () => {
    // 2025-03-15 is a Saturday
    const result = formatDateFr('2025-03-15')
    expect(result.toLowerCase()).toContain('samedi')
  })

  it('formats another date correctly', () => {
    // 2025-01-01 is a Wednesday
    const result = formatDateFr('2025-01-01')
    expect(result.toLowerCase()).toContain('mercredi')
    expect(result).toContain('janvier')
    expect(result).toContain('2025')
  })
})

describe('skillLabel', () => {
  it('returns correct French labels for each tier', () => {
    expect(skillLabel(1)).toBe('Débutant')
    expect(skillLabel(3)).toBe('Intermédiaire')
    expect(skillLabel(5)).toBe('Confirmé')
    expect(skillLabel(7)).toBe('Avancé')
    expect(skillLabel(9)).toBe('Expert')
  })
})
