import { skillTier, overallSkill } from '@/lib/utils'

interface SkillRadarProps {
  skills: {
    skill_service: number
    skill_pass: number
    skill_attack: number
    skill_defense: number
  }
  size?: number
  showLabels?: boolean
}

// Axes: S (top), A (right), D (bottom), P (left)
const AXES = [
  { key: 'skill_service' as const, label: 'S', angle: -Math.PI / 2 },
  { key: 'skill_attack' as const, label: 'A', angle: 0 },
  { key: 'skill_defense' as const, label: 'D', angle: Math.PI / 2 },
  { key: 'skill_pass' as const, label: 'P', angle: Math.PI },
]

function pointOnAxis(angle: number, value: number, max: number, cx: number, cy: number, radius: number) {
  const r = (value / max) * radius
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function diamondPath(cx: number, cy: number, radius: number) {
  const points = AXES.map(({ angle }) => pointOnAxis(angle, 1, 1, cx, cy, radius))
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
}

export function SkillRadar({ skills, size = 48, showLabels }: SkillRadarProps) {
  const displayLabels = showLabels || size >= 64
  const cx = 50
  const cy = 50
  const radius = displayLabels ? 34 : 42
  const max = 10

  const overall = overallSkill(skills)
  const tier = skillTier(Math.round(overall))

  // Build data polygon
  const dataPoints = AXES.map(({ key, angle }) =>
    pointOnAxis(angle, skills[key], max, cx, cy, radius)
  )
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="flex-shrink-0"
    >
      {/* Guide diamonds at 25%, 50%, 75%, 100% */}
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <path
          key={pct}
          d={diamondPath(cx, cy, radius * pct)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={pct === 1 ? 1 : 0.5}
          opacity={0.6}
        />
      ))}

      {/* Axis lines */}
      {AXES.map(({ key, angle }) => {
        const end = pointOnAxis(angle, max, max, cx, cy, radius)
        return (
          <line
            key={key}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="var(--color-border)"
            strokeWidth={0.5}
            opacity={0.6}
          />
        )
      })}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill={`var(--skill-${tier})`}
        fillOpacity={0.2}
        stroke={`var(--skill-${tier})`}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={AXES[i].key}
          cx={p.x}
          cy={p.y}
          r={1.5}
          fill={`var(--skill-${tier})`}
        />
      ))}

      {/* Labels */}
      {displayLabels &&
        AXES.map(({ key, label, angle }) => {
          const labelR = radius + 10
          const pos = pointOnAxis(angle, max, max, cx, cy, labelR)
          return (
            <text
              key={key}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={600}
              fill="var(--color-text-secondary)"
            >
              {label}
            </text>
          )
        })}
    </svg>
  )
}
