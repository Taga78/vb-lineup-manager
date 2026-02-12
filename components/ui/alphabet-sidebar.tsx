'use client'

import { useState, useCallback, useRef } from 'react'

interface AlphabetSidebarProps {
  letters: string[]
  /** DOM id prefix for scroll targets — the sidebar will scroll to `${idPrefix}${letter}` */
  idPrefix: string
}

export function AlphabetSidebar({ letters, idPrefix }: AlphabetSidebarProps) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const scrollToLetter = useCallback((letter: string) => {
    const el = document.getElementById(`${idPrefix}${letter}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setActiveLetter(letter)
    setTimeout(() => setActiveLetter(null), 800)
  }, [idPrefix])

  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const letter = el?.getAttribute('data-letter')
    if (letter && letters.includes(letter)) {
      scrollToLetter(letter)
    }
  }, [letters, scrollToLetter])

  if (letters.length <= 1) return null

  return (
    <>
      <div
        ref={barRef}
        className="fixed right-1 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center py-1 select-none touch-none"
        onTouchMove={handleTouch}
        onTouchStart={handleTouch}
      >
        {letters.map((letter) => (
          <button
            key={letter}
            data-letter={letter}
            type="button"
            onClick={() => scrollToLetter(letter)}
            className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-full transition-colors ${
              activeLetter === letter
                ? 'bg-[var(--color-primary)] text-white scale-125'
                : 'text-[var(--color-primary)]'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Active letter overlay */}
      {activeLetter && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center text-3xl font-bold opacity-80">
            {activeLetter}
          </div>
        </div>
      )}
    </>
  )
}
