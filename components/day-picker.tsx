'use client'

import { DAYS_OF_WEEK_SHORT_FR } from '@/lib/types'

interface DayPickerProps {
  value: number[]
  onChange: (days: number[]) => void
}

export function DayPicker({ value, onChange }: DayPickerProps) {
  function toggle(day: number) {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day))
    } else {
      onChange([...value, day].sort())
    }
  }

  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
        const selected = value.includes(day)
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              selected
                ? 'bg-(--color-primary) text-white'
                : 'bg-(--color-border) text-(--color-text-secondary) hover:bg-gray-200'
            }`}
          >
            {DAYS_OF_WEEK_SHORT_FR[day]}
          </button>
        )
      })}
    </div>
  )
}
