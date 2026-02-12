interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'skill' | 'gender' | 'success' | 'warning' | 'info' | 'skill-level'
  skillLevel?: 1 | 2 | 3 | 4 | 5
  className?: string
  style?: React.CSSProperties
}

const variantStyles = {
  default: 'bg-[var(--color-border)] text-[var(--color-text-secondary)]',
  skill: 'bg-blue-100 text-blue-800',
  gender: 'bg-purple-100 text-purple-800',
  success: 'bg-[color-mix(in_srgb,var(--color-success)_15%,white)] text-[var(--color-success)]',
  warning: 'bg-[color-mix(in_srgb,var(--color-warning)_15%,white)] text-[var(--color-warning)]',
  info: 'bg-[color-mix(in_srgb,var(--color-primary)_15%,white)] text-[var(--color-primary)]',
  'skill-level': '', // handled dynamically
}

export function Badge({ children, variant = 'default', skillLevel, className = '', style }: BadgeProps) {
  const skillLevelStyle = variant === 'skill-level' && skillLevel
    ? { backgroundColor: `color-mix(in srgb, var(--skill-${skillLevel}) 15%, white)`, color: `var(--skill-${skillLevel})` }
    : undefined

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
      style={style ?? skillLevelStyle}
    >
      {children}
    </span>
  )
}
