import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase helpers
const mockSupabase = {
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(() =>
    Promise.resolve({ user: { id: 'user-1' }, supabase: mockSupabase })
  ),
}))

import { createSession, updateSession, deleteSession, toggleSessionOpen } from '../sessions'
import { requireAuth } from '@/lib/auth'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value)
  }
  return fd
}

// Fluent chain builder for mocking Supabase queries
function chainMock(finalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalResult)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult)
  // For terminal calls that just return { data, error }
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(finalResult))
  return chain
}

describe('createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing date', async () => {
    const fd = makeFormData({ nb_courts_planned: '2', preferred_team_size: '4' })
    const result = await createSession(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('date')
  })

  it('rejects label over 100 chars', async () => {
    const fd = makeFormData({
      date: '2025-01-15',
      label: 'a'.repeat(101),
      nb_courts_planned: '2',
      preferred_team_size: '4',
    })
    const result = await createSession(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('100')
  })

  it('rejects invalid nb_courts_planned', async () => {
    const fd = makeFormData({
      date: '2025-01-15',
      nb_courts_planned: '0',
      preferred_team_size: '4',
    })
    const result = await createSession(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('terrains')
  })

  it('rejects team size out of range', async () => {
    const fd = makeFormData({
      date: '2025-01-15',
      nb_courts_planned: '2',
      preferred_team_size: '7',
    })
    const result = await createSession(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('équipe')
  })

  it('rejects team size of 2 (too small)', async () => {
    const fd = makeFormData({
      date: '2025-01-15',
      nb_courts_planned: '2',
      preferred_team_size: '2',
    })
    const result = await createSession(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('équipe')
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const fd = makeFormData({
      date: '2025-01-15',
      nb_courts_planned: '2',
      preferred_team_size: '4',
    })
    const result = await createSession(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds with valid input', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      date: '2025-01-15',
      nb_courts_planned: '2',
      preferred_team_size: '4',
    })
    const result = await createSession(fd)
    expect(result.success).toBe(true)
    expect(chain.insert).toHaveBeenCalled()
  })

  it('returns Supabase error on insert failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'DB error' } })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      date: '2025-01-15',
      nb_courts_planned: '2',
      preferred_team_size: '4',
    })
    const result = await createSession(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing date', async () => {
    const fd = makeFormData({ nb_courts_planned: '2', preferred_team_size: '4' })
    const result = await updateSession('session-1', fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('date')
  })

  it('succeeds with valid input', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      date: '2025-01-15',
      nb_courts_planned: '3',
      preferred_team_size: '5',
    })
    const result = await updateSession('session-1', fd)
    expect(result.success).toBe(true)
    expect(chain.update).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'session-1')
  })
})

describe('deleteSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const result = await deleteSession('session-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds when delete works', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await deleteSession('session-1')
    expect(result.success).toBe(true)
    expect(chain.delete).toHaveBeenCalled()
  })
})

describe('toggleSessionOpen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const result = await toggleSessionOpen('session-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })
})
