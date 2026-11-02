import { Fragment, useMemo, useState } from 'react'
import { Activity, ChevronDown, Footprints, Gauge, MoveUpRight, PersonStanding, Waves, Zap } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipProps } from 'recharts'
import type { ActivityStat, CalendarEvent, Checkin, GpsMetric, Profile } from '../types'

interface GpsTabProps {
  metrics: GpsMetric[]
  profiles: Profile[]
  events: CalendarEvent[]
  selectedPlayer: Profile | null
  canCompare: boolean
}

const format = new Intl.NumberFormat('en-SG')

interface SessionChartPoint {
  maxSpeed: number
  totalDistance: number
  hsrDistance: number
  hmlDistance: number | null
  accelerations: number | null
  decelerations: number | null
  date: string
  dateLabel: string
  eventType: 'training' | 'match' | null
  sessionId: string | null
  playerName: string
}

function formatSessionDate(date: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  if (!date) return '—'
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-SG', options)
}

function normalizeEventType(eventType: string | null | undefined): 'training' | 'match' | null {
  const normalized = eventType?.trim().toLowerCase()
  return normalized === 'training' || normalized === 'match' ? normalized : null
}

function SessionChartTooltip({ active, payload }: TooltipProps<number, string>) {
  const session = payload?.[0]?.payload as SessionChartPoint | undefined
  if (!active || !session) return null

  const details = [
    { label: 'Total distance', value: session.totalDistance == null ? '—' : `${format.format(session.totalDistance)} m` },
    { label: 'High-speed running / HSR', value: session.hsrDistance == null ? '—' : `${format.format(session.hsrDistance)} m` },
    { label: 'HML distance', value: session.hmlDistance == null ? '—' : `${format.format(session.hmlDistance)} m` },
    { label: 'Max speed', value: session.maxSpeed == null ? '—' : `${format.format(session.maxSpeed)} km/h` },
    { label: 'Accelerations', value: session.accelerations == null ? '—' : format.format(session.accelerations), tone: 'acceleration' },
    { label: 'Decelerations', value: session.decelerations == null ? '—' : format.format(session.decelerations), tone: 'deceleration' },
  ]

  return (
    <div className="gps-chart-tooltip">
      <div className="gps-chart-tooltip-heading">
        <strong>{session.date ? formatSessionDate(session.date, { day: 'numeric', month: 'short', year: 'numeric' }) : session.dateLabel}</strong>
        <span className={`gps-event-badge ${session.eventType ?? 'unknown'}`}>{session.eventType === 'match' ? 'Match' : session.eventType === 'training' ? 'Training' : 'Unknown'}</span>
      </div>
      <p>{session.playerName}{session.sessionId ? ` · ${session.sessionId}` : ''}</p>
      <dl>
        {details.map(({ label, value, tone }) => <div key={label} className={tone ? `gps-chart-tooltip-${tone}` : ''}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </div>
  )
}

export function GpsTab({ metrics, profiles, events, selectedPlayer, canCompare }: GpsTabProps) {
  const [eventFilter, setEventFilter] = useState<'all' | 'training' | 'match'>('all')
  const [sort, setSort] = useState('newest')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const playerIds = useMemo(() => new Set(profiles.map((profile) => profile.id)), [profiles])
  const teamIds = useMemo(() => new Set(profiles.map((profile) => profile.team_id)), [profiles])
  const eventTypeByDate = useMemo(() => {
    const types = new Map<string, 'training' | 'match'>()
    events.forEach((event) => {
      if (!teamIds.has(event.team_id)) return
      const eventType = normalizeEventType(event.event_type)
      if (eventType === 'match' || (eventType === 'training' && !types.has(event.date))) types.set(event.date, eventType)
    })
    return types
  }, [events, teamIds])
  const getEventType = (metric: GpsMetric) => {
    const metricEventType = metric.event_type?.trim()
    return metricEventType ? normalizeEventType(metricEventType) : eventTypeByDate.get(metric.date) ?? null
  }
  const current = metrics.filter((metric) => playerIds.has(metric.player_id) && (!selectedPlayer || metric.player_id === selectedPlayer.id))
  const filtered = current.filter((metric) => eventFilter === 'all' || getEventType(metric) === eventFilter).sort((a, b) => {
    if (sort === 'lowest') return a.total_distance - b.total_distance
    if (sort === 'highest') return b.total_distance - a.total_distance
    return sort === 'oldest' ? (a.date ?? '').localeCompare(b.date ?? '') : (b.date ?? '').localeCompare(a.date ?? '')
  })
  const chosen = filtered[0]
  const chosenEventType = chosen ? getEventType(chosen) : null
  const comparable = metrics.filter((metric) => playerIds.has(metric.player_id) && (eventFilter === 'all' || getEventType(metric) === eventFilter))
  const average = (key: 'max_speed' | 'total_distance' | 'hsr_distance') => comparable.length ? comparable.reduce((sum, row) => sum + Number(row[key]), 0) / comparable.length : 0
  const chartData: SessionChartPoint[] = [...filtered]
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .slice(-8)
    .map((metric) => ({
      maxSpeed: metric.max_speed,
      totalDistance: metric.total_distance,
      hsrDistance: metric.hsr_distance,
      hmlDistance: metric.hml_distance ?? null,
      accelerations: metric.accelerations ?? null,
      decelerations: metric.decelerations ?? null,
      date: metric.date,
      dateLabel: formatSessionDate(metric.date),
      eventType: getEventType(metric),
      sessionId: metric.session_id ?? null,
      playerName: profiles.find((profile) => profile.id === metric.player_id)?.full_name ?? selectedPlayer?.full_name ?? 'Player',
    }))
  const metricsCards = [
    { label: 'Total distance', value: chosen ? `${format.format(chosen.total_distance)}` : '—', unit: 'm', icon: Footprints, color: 'blue' },
    { label: 'Distance / min', value: chosen ? `${chosen.dist_per_min}` : '—', unit: 'm/min', icon: Activity, color: 'orange' },
    { label: 'Max speed', value: chosen ? `${chosen.max_speed}` : '—', unit: 'km/h', icon: Gauge, color: 'purple' },
    { label: 'High-speed running', value: chosen ? `${format.format(chosen.hsr_distance)}` : '—', unit: 'm', icon: MoveUpRight, color: 'green' },
    { label: 'HML Distance', value: chosen?.hml_distance != null ? format.format(chosen.hml_distance) : '—', unit: 'm', icon: Waves, color: 'purple' },
    { label: 'Sprints', value: chosen ? `${chosen.sprint_count}` : '—', unit: 'efforts', icon: Zap, color: 'orange' },
    { label: 'Accelerations', value: chosen?.accelerations != null ? `${chosen.accelerations}` : '—', unit: 'actions', icon: PersonStanding, color: 'blue' },
    { label: 'Decelerations', value: chosen?.decelerations != null ? `${chosen.decelerations}` : '—', unit: 'actions', icon: Activity, color: 'green' },
  ]
  return (
    <div className="tab-stack">
      <div className="section-heading gps-heading"><div><p className="eyebrow">PERFORMANCE MONITORING</p><h2>Training load &amp; GPS</h2><p className="muted">{selectedPlayer ? `Latest available session for ${selectedPlayer.full_name}.` : 'Session metrics across the selected squad.'}</p></div>
      <div className="filter-controls"><select aria-label="Sort sessions" className="select-control" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="lowest">Distance ↑</option><option value="highest">Distance ↓</option></select></div>
      </div>
      {canCompare && comparable.length > 1 && <div className="benchmark-note"><span className="benchmark-dot" /> Team average benchmark is anonymized and includes {comparable.length} session{comparable.length === 1 ? '' : 's'}.</div>}
      {!canCompare && <div className="benchmark-note personal-note">Only your personal performance records are visible to your player account.</div>}
      <div className="metric-grid">{metricsCards.map(({ label, value, unit, icon: Icon, color }) => <article className="surface metric-card" key={label}><div className={`metric-icon ${color}`}><Icon size={18} /></div><p>{label}</p><div className="metric-value">{value}<small>{unit}</small></div><span className="metric-caption">{chosenEventType === 'match' ? 'Match day' : chosenEventType === 'training' ? 'Training session' : chosen ? 'Session type unavailable' : 'No session data'}</span></article>)}</div>
      <section className="surface gps-sessions">
        <div className="chart-title"><div><h3>Session records</h3><p className="muted">Date, event type, and session identifier. Expand a session to view its GPS metrics.</p></div></div>
        <div className="gps-session-scroll">
          <table className="gps-session-table" aria-label="GPS session records">
            <thead><tr><th scope="col">Date</th><th scope="col">Event</th><th scope="col">Session</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((metric, index) => {
                const rowId = metric.id ?? `${metric.player_id}-${metric.session_id ?? metric.date ?? 'session'}-${index}`
                const eventType = getEventType(metric)
                const isExpanded = expandedSession === rowId
                const playerName = profiles.find((profile) => profile.id === metric.player_id)?.full_name ?? selectedPlayer?.full_name ?? 'Player'
                const details = [
                  ['Total distance', metric.total_distance != null ? `${format.format(metric.total_distance)} m` : '—'],
                  ['Distance per minute', metric.dist_per_min != null ? `${metric.dist_per_min} m/min` : '—'],
                  ['High-speed running', metric.hsr_distance != null ? `${format.format(metric.hsr_distance)} m` : '—'],
                  ['HML distance', metric.hml_distance != null ? `${format.format(metric.hml_distance)} m` : '—'],
                  ['Maximum speed', metric.max_speed != null ? `${metric.max_speed} km/h` : '—'],
                  ['Sprints', metric.sprint_count ?? '—'],
                  ['Accelerations', metric.accelerations ?? '—'],
                  ['Decelerations', metric.decelerations ?? '—'],
                ] as const
                return (
                  <Fragment key={rowId}>
                    <tr>
                      <td>{formatSessionDate(metric.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td><span className={`gps-event-badge ${eventType ?? 'unknown'}`}>{eventType === 'match' ? 'Match' : eventType === 'training' ? 'Training' : 'Unknown'}</span></td>
                      <td>{metric.session_id || '—'}</td>
                      <td><button className="gps-detail-toggle" type="button" aria-expanded={isExpanded} aria-controls={`gps-details-${rowId}`} onClick={() => setExpandedSession(isExpanded ? null : rowId)}><span>{isExpanded ? 'Hide metrics' : 'View metrics'}</span><ChevronDown size={14} className={isExpanded ? 'expanded' : ''} /></button></td>
                    </tr>
                    {isExpanded && <tr className="gps-detail-row"><td colSpan={4}><div className="gps-detail-panel" id={`gps-details-${rowId}`}><h4>{playerName} · GPS metrics · {formatSessionDate(metric.date, { day: 'numeric', month: 'short', year: 'numeric' })}</h4><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></td></tr>}
                  </Fragment>
                )
              }) : <tr><td className="gps-session-empty" colSpan={4}>No sessions match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="surface chart-card"><div className="chart-title"><div><h3>Session output comparison</h3><p className="muted">Distance is shown as a shaded area; intensity and speed are shown as smooth lines.</p></div><div className="gps-chart-controls"><div className="segmented-control" role="group" aria-label="Filter sessions by event type">{(['all', 'match', 'training'] as const).map((filter) => <button key={filter} type="button" aria-pressed={eventFilter === filter} onClick={() => setEventFilter(filter)} className={eventFilter === filter ? 'selected' : ''}>{filter === 'all' ? 'All Sessions' : filter === 'match' ? 'Matches Only' : 'Trainings Only'}</button>)}</div><div className="gps-chart-legend"><span><i className="gps-chart-total-distance" />Total distance</span><span><i className="gps-chart-hsr" />HSR</span><span><i className="gps-chart-hml" />HML distance</span><span><i className="gps-chart-speed" />Max speed</span><span><i className="gps-chart-accelerations" />Accelerations</span><span><i className="gps-chart-decelerations" />Decelerations</span></div></div></div>
        {chartData.length > 0 ? <div className="chart-area gps-area-line-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}><CartesianGrid stroke="#edf1f7" vertical={false} /><XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} /><YAxis yAxisId="distance" tickLine={false} axisLine={false} tick={{ fill: '#65738a', fontSize: 10 }} width={54} label={{ value: 'Distance (m) / count', angle: -90, position: 'insideLeft', fill: '#8490a2', fontSize: 9 }} /><YAxis yAxisId="speed" orientation="right" domain={[0, 35]} ticks={[0, 5, 10, 15, 20, 25, 30, 35]} unit=" km/h" tickLine={false} axisLine={false} tick={{ fill: '#1e3a8a', fontSize: 10 }} width={62} /><Tooltip content={<SessionChartTooltip />} /><Area yAxisId="distance" type="monotone" dataKey="totalDistance" name="Total distance" stroke="#ff6b00" strokeWidth={2} fill="#ff6b00" fillOpacity={0.12} connectNulls={false} /><Line yAxisId="distance" type="monotone" dataKey="hsrDistance" name="HSR" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} /><Line yAxisId="distance" type="monotone" dataKey="hmlDistance" name="HML distance" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} /><Line yAxisId="speed" type="monotone" dataKey="maxSpeed" name="Max speed" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} /><Line yAxisId="distance" type="monotone" dataKey="accelerations" name="Accelerations" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} /><Line yAxisId="distance" type="monotone" dataKey="decelerations" name="Decelerations" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} /></ComposedChart></ResponsiveContainer></div> : <div className="empty-state">No sessions match this filter.</div>}
        {canCompare && comparable.length > 0 && <div className="average-row"><span><i className="average-dash" /> Squad average — Max speed <strong>{average('max_speed').toFixed(1)} km/h</strong></span><span>Total distance <strong>{format.format(Math.round(average('total_distance')))} m</strong></span><span>HSR <strong>{format.format(Math.round(average('hsr_distance')))} m</strong></span></div>}
      </section>
    </div>
  )
}

interface ActivityTabProps { stat: ActivityStat | undefined; metrics: GpsMetric[]; checkins: Checkin[]; selectedPlayer: Profile | null }

export function ActivityTab({ stat, metrics, checkins, selectedPlayer }: ActivityTabProps) {
  const [minutesTarget] = useState(1800)
  const ratio = Math.min(100, Math.round(((stat?.minutes_played ?? 0) / minutesTarget) * 100))
  const weekly = useMemo(() => {
    const weeks = Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (5 - index) * 7)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const sessions = metrics.filter((metric) => metric.player_id === selectedPlayer?.id && metric.date && metric.date >= key && metric.date < new Date(date.getTime() + 7 * 86400000).toISOString().slice(0, 10))
      const load = sessions.reduce((sum, metric) => {
        const rpe = checkins.find((checkin) => checkin.player_id === metric.player_id && checkin.date === metric.date)?.session_rpe_0to10
        const duration = metric.dist_per_min > 0 ? metric.total_distance / metric.dist_per_min : 0
        return sum + (rpe ?? 0) * duration
      }, 0)
      return { week: `W${index + 1}`, load, level: load === 0 ? 'No load' : load < 1000 ? 'Low' : load < 1800 ? 'Moderate' : load < 2600 ? 'High' : 'Very high' }
    })
    return weeks
  }, [checkins, metrics, selectedPlayer])
  const levelColors: Record<string, string> = { 'No load': '#e2e8f0', Low: '#93c5fd', Moderate: '#60a5fa', High: '#ff9a52', 'Very high': '#ef4444' }
  return (
    <div className="tab-stack">
      <div className="section-heading"><div><p className="eyebrow">SEASON 2026 / 27</p><p className="muted">{selectedPlayer ? `A season snapshot for ${selectedPlayer.full_name}.` : 'Playing time, contribution, and weekly workload.'}</p></div><span className="season-pill">2026 / 27 season</span></div>
      <div className="activity-grid">
        <section className="surface minutes-card"><div className="card-topline"><div><p className="eyebrow">PLAYING TIME</p><h3>Minutes played</h3></div><span className="muted">Season target · {minutesTarget.toLocaleString()} min</span></div><div className="minutes-content"><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(#ff6b00 ${ratio * 3.6}deg, #edf1f7 0deg)` }}><div className="donut-inner"><strong>{ratio}%</strong><span>of target</span></div></div></div><div className="minutes-breakdown"><div><span><i className="dot orange-dot" /> Minutes played</span><strong>{(stat?.minutes_played ?? 0).toLocaleString()} <small>min</small></strong></div><div><span>Started matches</span><strong>{stat?.started_matches ?? 0}</strong></div><div><span>Sub appearances</span><strong>{stat?.sub_matches ?? 0}</strong></div><div className="progress-track"><span style={{ width: `${ratio}%` }} /></div><small className="muted">{Math.max(0, minutesTarget - (stat?.minutes_played ?? 0)).toLocaleString()} min to season target</small></div></div></section>
        <div className="activity-kpis"><article className="surface activity-kpi"><div className="kpi-icon blue"><Activity size={18} /></div><span>Training attendance</span><strong>{stat?.training_attendance_pct ?? 0}<small>%</small></strong><div className="progress-track"><span style={{ width: `${stat?.training_attendance_pct ?? 0}%` }} /></div></article><article className="surface activity-kpi"><div className="kpi-icon orange"><MoveUpRight size={18} /></div><span>Total goals</span><strong>{stat?.total_goals ?? 0}</strong><small className="muted">This season</small></article><article className="surface activity-kpi"><div className="kpi-icon purple"><PersonStanding size={18} /></div><span>Total assists</span><strong>{stat?.total_assists ?? 0}</strong><small className="muted">This season</small></article></div>
      </div>
      <section className="surface chart-card weekly-card"><div className="chart-title"><div><h3>Weekly training load</h3><p className="muted">Estimated sRPE × duration · workload category by week</p></div><span className="load-legend">{Object.entries(levelColors).map(([level, color]) => <span key={level}><i style={{ background: color }} />{level}</span>)}</span></div><div className="workload-grid">{weekly.map((week) => <div className="workload-week" key={week.week}><div className="workload-column"><div className="workload-bar" style={{ height: `${Math.max(8, Math.min(100, week.load / 30))}%`, background: levelColors[week.level] }} /><small>{week.load.toLocaleString(undefined, { maximumFractionDigits: 0 })}</small></div><span>{week.week}</span><em>{week.level}</em></div>)}</div></section>
      <p className="method-note">Weekly load = session RPE × estimated session duration. Duration is derived from GPS total distance ÷ distance per minute; a session is counted when a matching daily RPE is available.</p>
    </div>
  )
}
