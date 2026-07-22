'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Flame, Calendar } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

interface ActivityDay {
  date: string
  count: number
  tasks: number
  notes: number
  scripts: number
  videos: number
  files: number
  events: number
}

interface ActivityData {
  days: ActivityDay[]
  total: number
  activeDays: number
  range: number
}

const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function intensityClass(count: number): string {
  if (count === 0) return 'bg-muted/40'
  if (count <= 1) return 'bg-primary/25'
  if (count <= 2) return 'bg-primary/45'
  if (count <= 4) return 'bg-primary/65'
  if (count <= 6) return 'bg-primary/85'
  return 'bg-primary'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ActivityHeatmap() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [hovered, setHovered] = useState<ActivityDay | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; maxWidth: number }>({ x: 0, y: 0, maxWidth: 300 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch<ActivityData>('/api/activity?days=119')
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="h-4 w-32 shimmer rounded mb-4" />
        <div className="flex gap-1">
          {Array.from({ length: 17 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="w-3 h-3 rounded-sm shimmer" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Arrange days into week columns (Mon-Sun)
  // Find the first day and align to Monday
  const days = data.days
  if (days.length === 0) return null

  const firstDate = new Date(days[0].date + 'T00:00:00')
  const firstDayOfWeek = (firstDate.getDay() + 6) % 7 // 0 = Monday

  // Pad the start with nulls so the first column starts on Monday
  const padded: (ActivityDay | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...days,
  ]
  // Pad end to complete the last week
  while (padded.length % 7 !== 0) padded.push(null)

  const weeks: (ActivityDay | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7))
  }

  // Month labels: figure out which month each week column starts in
  const monthCols: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, col) => {
    const firstDay = week.find((d) => d !== null)
    if (firstDay) {
      const m = new Date(firstDay.date + 'T00:00:00').getMonth()
      if (m !== lastMonth) {
        monthCols.push({ label: MONTH_LABELS[m], col })
        lastMonth = m
      }
    }
  })

  const maxStreak = computeStreak(days)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full grad-warm opacity-10 blur-2xl" />
      <div className="relative flex items-start justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl grad-warm flex items-center justify-center shadow-md">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Studio Activity
              <span className="text-[10px] font-normal text-muted-foreground">
                last {Math.round(data.range / 7)} weeks
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{data.total}</span> contributions ·{' '}
              <span className="font-semibold text-foreground">{data.activeDays}</span> active days ·{' '}
              <span className="font-semibold text-foreground">{maxStreak}</span> day streak
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-muted/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/25" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/45" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/65" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/85" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </div>

      <div className="relative overflow-x-auto scroll-styled pb-1" ref={containerRef}>
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels row */}
          <div className="flex gap-1 pl-9 mb-0.5 h-3">
            {weeks.map((_, col) => {
              const m = monthCols.find((x) => x.col === col)
              return (
                <div key={col} className="w-3 text-[9px] text-muted-foreground/70 font-medium">
                  {m?.label ?? ''}
                </div>
              )
            })}
          </div>
          {/* Grid: weekday labels + cells */}
          <div className="flex gap-1">
            {/* Weekday labels */}
            <div className="flex flex-col gap-1 w-8 shrink-0">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="h-3 text-[9px] text-muted-foreground/70 font-medium flex items-center">
                  {label}
                </div>
              ))}
            </div>
            {/* Week columns */}
            {weeks.map((week, col) => (
              <div key={col} className="flex flex-col gap-1">
                {week.map((day, row) => (
                  <div
                    key={row}
                    className={`w-3 h-3 rounded-sm transition-all ${
                      day === null
                        ? 'opacity-0'
                        : `${intensityClass(day.count)} hover:ring-1 hover:ring-primary hover:ring-offset-0 hover:scale-125 cursor-pointer`
                    }`}
                    onMouseEnter={(e) => {
                      if (day) {
                        setHovered(day)
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        const containerRect = containerRef.current?.getBoundingClientRect()
                        setTooltipPos({
                          x: rect.left - (containerRect?.left ?? 0) + 6,
                          y: rect.top - (containerRect?.top ?? 0) - 8,
                          maxWidth: containerRef.current?.clientWidth ?? 300,
                        })
                      }
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none glass-strong rounded-lg px-3 py-2 shadow-xl border border-border/60 text-xs whitespace-nowrap"
            style={{
              left: Math.min(tooltipPos.x, tooltipPos.maxWidth - 200),
              top: tooltipPos.y,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="font-semibold mb-1">{formatDate(hovered.date)}</div>
            {hovered.count === 0 ? (
              <div className="text-muted-foreground">No activity</div>
            ) : (
              <div className="space-y-0.5 text-[11px]">
                <div className="font-medium text-primary">{hovered.count} contribution{hovered.count > 1 ? 's' : ''}</div>
                {hovered.tasks > 0 && <div className="text-muted-foreground">{hovered.tasks} task{hovered.tasks > 1 ? 's' : ''}</div>}
                {hovered.notes > 0 && <div className="text-muted-foreground">{hovered.notes} note{hovered.notes > 1 ? 's' : ''}</div>}
                {hovered.scripts > 0 && <div className="text-muted-foreground">{hovered.scripts} script{hovered.scripts > 1 ? 's' : ''}</div>}
                {hovered.videos > 0 && <div className="text-muted-foreground">{hovered.videos} video{hovered.videos > 1 ? 's' : ''}</div>}
                {hovered.files > 0 && <div className="text-muted-foreground">{hovered.files} file{hovered.files > 1 ? 's' : ''}</div>}
                {hovered.events > 0 && <div className="text-muted-foreground">{hovered.events} event{hovered.events > 1 ? 's' : ''}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {data.total === 0 && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          Start creating tasks, notes, and scripts to fill your activity graph!
        </div>
      )}
    </motion.div>
  )
}

function computeStreak(days: ActivityDay[]): number {
  // Count the trailing consecutive days with activity > 0 (including today/yesterday)
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      streak++
    } else if (streak > 0) {
      break
    }
  }
  return streak
}
