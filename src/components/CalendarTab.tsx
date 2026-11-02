import { useMemo, useState } from 'react'
import {
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'
import type { CSSProperties } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import type { CalendarEvent } from '../types'

interface CalendarTabProps {
  events: CalendarEvent[]
}

type EventCategory = 'match' | 'training' | 'gym' | 'meeting' | 'other'
type CalendarView = 'year' | 'month' | 'week'

const eventClasses: Record<EventCategory, string> = {
  match: 'match-event',
  training: 'training-event',
  gym: 'gym-event',
  meeting: 'meeting-event',
  other: 'default-event',
}

const categoryLabels: Record<EventCategory, string> = {
  match: 'Match',
  training: 'Training',
  gym: 'Gym',
  meeting: 'Meeting',
  other: 'Other',
}

const normalizeEventValue = (value: unknown) => String(value ?? '').trim().toLowerCase()
const normalizeEventTime = (value: unknown) => normalizeEventValue(value).match(/^(\d{1,2}:\d{2})/)?.[1] ?? normalizeEventValue(value)
const displayText = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : ''
const formatEventTime = (value: unknown) => typeof value === 'string' ? value.slice(0, 5) : ''

function getEventCategory(event: CalendarEvent): EventCategory {
  const type = normalizeEventValue(event.event_type)
  if (type === 'match' || type === 'training' || type === 'gym' || type === 'meeting') return type

  const title = normalizeEventValue(event.title).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (title.includes('match') || title.includes('partido')) return 'match'
  if (title.includes('training') || title.includes('entreno') || title.includes('entrenamiento')) return 'training'
  if (title.includes('gym') || title.includes('gimnasio')) return 'gym'
  if (title.includes('meeting') || title.includes('reunion')) return 'meeting'
  return 'other'
}

function getEventClass(event: CalendarEvent) {
  return eventClasses[getEventCategory(event)]
}

function getTimeInMinutes(value: unknown): number | null {
  const match = normalizeEventTime(value).match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

function getEventCategories(events: CalendarEvent[]) {
  return [...new Set(events.map(getEventCategory))]
}

function EventCardContent({ event }: { event: CalendarEvent }) {
  return (
    <>
      <span className="day-event-heading">
        <span className="day-event-time">{formatEventTime(event.time)}</span>
        <span className="day-event-title">{displayText(event.title)}</span>
      </span>
      {displayText(event.opponent) && <span className="day-event-opponent">vs {displayText(event.opponent)}</span>}
      {displayText(event.location) && (
        <span className="day-event-location"><MapPin size={10} aria-hidden="true" />{displayText(event.location)}</span>
      )}
      {displayText(event.details) && <span className="day-event-details">{displayText(event.details)}</span>}
    </>
  )
}

interface PositionedEvent {
  event: CalendarEvent
  minute: number
  lane: number
}

function positionDayEvents(events: CalendarEvent[]): Array<PositionedEvent & { laneCount: number }> {
  const laneEnds: number[] = []
  const positioned = events
    .map((event) => ({ event, minute: getTimeInMinutes(event.time) }))
    .filter((entry): entry is { event: CalendarEvent; minute: number } => entry.minute !== null)
    .sort((a, b) => a.minute - b.minute)
    .map(({ event, minute }) => {
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= minute)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = minute + 60
      return { event, minute, lane }
    })

  const laneCount = Math.max(1, laneEnds.length)
  return positioned.map((entry) => ({ ...entry, laneCount }))
}

export function CalendarTab({ events }: CalendarTabProps) {
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')

  const uniqueEvents = useMemo(() => {
    const deduplicated = new Map<string, CalendarEvent>()
    events.forEach((event) => {
      const key = JSON.stringify([
        event.date,
        normalizeEventTime(event.time),
        normalizeEventValue(event.event_type),
        normalizeEventValue(event.title),
        normalizeEventValue(event.location),
        normalizeEventValue(event.details),
        normalizeEventValue(event.opponent),
      ])
      if (!deduplicated.has(key)) deduplicated.set(key, event)
    })
    return [...deduplicated.values()]
  }, [events])

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>()
    uniqueEvents.forEach((event) => {
      const dateEvents = grouped.get(event.date) ?? []
      dateEvents.push(event)
      grouped.set(event.date, dateEvents)
    })
    grouped.forEach((dateEvents) => dateEvents.sort((a, b) => normalizeEventValue(a.time).localeCompare(normalizeEventValue(b.time))))
    return grouped
  }, [uniqueEvents])

  const getEvents = (date: Date) => eventsByDate.get(format(date, 'yyyy-MM-dd')) ?? []
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selected, { weekStartsOn: 1 }),
    end: endOfWeek(selected, { weekStartsOn: 1 }),
  })
  const yearMonths = Array.from({ length: 12 }, (_, index) => new Date(month.getFullYear(), index, 1))
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })

  const timedWeekEvents = weekDays.flatMap((date) => getEvents(date)
    .map((event) => getTimeInMinutes(event.time))
    .filter((minute): minute is number => minute !== null))
  const firstWeekHour = Math.min(6, Math.floor(Math.min(...timedWeekEvents, 360) / 60))
  const lastWeekHour = Math.max(22, Math.ceil((Math.max(...timedWeekEvents, 1320) + 90) / 60))
  const hourCount = lastWeekHour - firstWeekHour
  const hourHeight = 56

  const heading = view === 'year'
    ? String(month.getFullYear())
    : format(view === 'week' ? selected : month, 'MMMM yyyy')

  function navigatePeriod(direction: -1 | 1) {
    if (view === 'year') {
      const next = direction < 0 ? subYears(month, 1) : addYears(month, 1)
      setMonth(next)
      setSelected(new Date(next.getFullYear(), selected.getMonth(), 1))
      return
    }

    if (view === 'week') {
      const next = direction < 0 ? subWeeks(selected, 1) : addWeeks(selected, 1)
      setSelected(next)
      setMonth(startOfMonth(next))
      return
    }

    const next = direction < 0 ? subMonths(month, 1) : addMonths(month, 1)
    setMonth(next)
    setSelected(new Date(next.getFullYear(), next.getMonth(), 1))
  }

  function selectYearMonth(date: Date) {
    setMonth(date)
    setSelected(date)
    setView('month')
  }

  return (
    <div className="tab-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SQUAD SCHEDULE</p>
          <h2>Calendar</h2>
          <p className="muted">Stay ready. See what’s coming up for your squad.</p>
        </div>
        <div className="calendar-legend" aria-label="Event categories">
          {(['match', 'training', 'gym', 'meeting', 'other'] as const).map((category) => (
            <span key={category}><i className={`legend-square ${eventClasses[category]}`} />{categoryLabels[category]}</span>
          ))}
        </div>
      </div>

      <div className="calendar-layout">
        <section className="surface calendar-card">
          <div className="calendar-toolbar">
            <div className="calendar-month">
              <h3>{heading}</h3>
              <button className="icon-button" aria-label="Previous period" onClick={() => navigatePeriod(-1)}><ChevronLeft size={18} /></button>
              <button className="icon-button" aria-label="Next period" onClick={() => navigatePeriod(1)}><ChevronRight size={18} /></button>
            </div>
            <div className="segmented-control" aria-label="Calendar view">
              {(['year', 'month', 'week'] as const).map((type) => (
                <button key={type} onClick={() => setView(type)} className={view === type ? 'selected' : ''} aria-pressed={view === type}>
                  {type[0].toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {view === 'year' ? (
            <div className="year-grid">
              {yearMonths.map((date) => {
                const monthStart = startOfMonth(date)
                const monthEnd = endOfMonth(date)
                const dates = eachDayOfInterval({ start: monthStart, end: monthEnd })
                const offset = (monthStart.getDay() + 6) % 7
                const monthEventCount = uniqueEvents.filter((event) => event.date.startsWith(format(date, 'yyyy-MM'))).length

                return (
                  <button
                    className={isSameMonth(date, month) ? 'year-month current' : 'year-month'}
                    key={date.toISOString()}
                    onClick={() => selectYearMonth(date)}
                    aria-label={`${format(date, 'MMMM yyyy')}, ${monthEventCount} events. Select to open month view.`}
                  >
                    <span className="year-month-heading">
                      <strong>{format(date, 'MMM')}</strong>
                      <span>{monthEventCount} events</span>
                    </span>
                    <span className="year-month-days" aria-hidden="true">
                      {Array.from({ length: offset }, (_, index) => <i className="year-day-empty" key={`empty-${index}`} />)}
                      {dates.map((day) => {
                        const categories = getEventCategories(getEvents(day))
                        return (
                          <span className="year-day" key={day.toISOString()}>
                            {format(day, 'd')}
                            {categories.length > 0 && (
                              <span className="year-day-dots">
                                {categories.map((category) => <i className={eventClasses[category]} key={category} />)}
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : view === 'week' ? (
            <div className="week-scroll">
              <div className="week-timeline">
                <div className="week-header">
                  <div className="week-time-gutter" />
                  {weekDays.map((date) => (
                    <button
                      className={`week-day-heading ${isSameDay(date, selected) ? 'selected' : ''}`}
                      key={date.toISOString()}
                      onClick={() => setSelected(date)}
                    >
                      <span>{format(date, 'EEE')}</span>
                      <strong>{format(date, 'd')}</strong>
                    </button>
                  ))}
                </div>
                <div className="week-body">
                  <div className="week-time-axis" style={{ height: hourCount * hourHeight }}>
                    {Array.from({ length: hourCount }, (_, index) => (
                      <span style={{ top: index * hourHeight }} key={index}>{format(new Date(2000, 0, 1, firstWeekHour + index), 'HH:mm')}</span>
                    ))}
                  </div>
                  <div className="week-columns">
                    {weekDays.map((date) => (
                      <div className="week-day-column" key={date.toISOString()} style={{ height: hourCount * hourHeight }}>
                        {positionDayEvents(getEvents(date)).map(({ event, minute, lane, laneCount }) => {
                          const top = (minute - firstWeekHour * 60) * hourHeight / 60
                          const style: CSSProperties = {
                            top,
                            left: `calc(${lane * 100 / laneCount}% + 2px)`,
                            width: `calc(${100 / laneCount}% - 4px)`,
                          }
                          return (
                            <article
                              className={`week-event ${getEventClass(event)}`}
                              key={event.id}
                              style={style}
                              title={`${formatEventTime(event.time)} ${displayText(event.title)}`}
                              aria-label={`${formatEventTime(event.time)} ${displayText(event.title)}, ${displayText(event.location)}, ${categoryLabels[getEventCategory(event)]}`}
                            >
                              <strong>{displayText(event.title)}</strong>
                              <span>{formatEventTime(event.time)}</span>
                              {displayText(event.location) && (
                                <span className="week-event-location">
                                  <MapPin size={10} aria-hidden="true" />
                                  <span>{displayText(event.location)}</span>
                                </span>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="week-mobile-agenda">
                {weekDays.map((date) => {
                  const dateEvents = getEvents(date)
                  return (
                    <section className="week-agenda-day" key={date.toISOString()}>
                      <button
                        className={`week-agenda-date ${isSameDay(date, selected) ? 'selected' : ''}`}
                        onClick={() => setSelected(date)}
                        aria-label={`Select ${format(date, 'EEEE, MMMM d, yyyy')}`}
                      >
                        <span>{format(date, 'EEEE')}</span>
                        <strong>{format(date, 'd MMMM')}</strong>
                      </button>
                      {dateEvents.length > 0 ? (
                        <div className="week-agenda-events">
                          {dateEvents.map((event) => (
                            <article className={`week-agenda-event ${getEventClass(event)}`} key={event.id}>
                              <EventCardContent event={event} />
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="week-agenda-empty">No events</p>
                      )}
                    </section>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="month-grid">
              <div className="weekday-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="calendar-days">
                {monthDays.map((date) => {
                  const dateEvents = getEvents(date)
                  const eventSummary = dateEvents.map((event) => [
                    categoryLabels[getEventCategory(event)],
                    formatEventTime(event.time),
                    displayText(event.title),
                    displayText(event.opponent) && `vs ${displayText(event.opponent)}`,
                    displayText(event.location),
                    displayText(event.details),
                  ].filter(Boolean).join(', ')).join('. ')
                  return (
                    <button
                      key={date.toISOString()}
                      className={`calendar-day ${!isSameMonth(date, month) ? 'outside' : ''} ${isSameDay(date, selected) ? 'selected' : ''}`}
                      onClick={() => setSelected(date)}
                      aria-label={`${format(date, 'EEEE, MMMM d')}${dateEvents.length ? `, ${dateEvents.length} events: ${eventSummary}` : ', no events'}`}
                    >
                      <span className="calendar-date">{format(date, 'd')}</span>
                      <span className="day-event-list">
                        {dateEvents.map((event) => (
                          <span className={`day-event ${getEventClass(event)}`} key={event.id}>
                            <EventCardContent event={event} />
                          </span>
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="month-mobile-agenda">
                {monthDays.filter((date) => isSameMonth(date, month)).map((date) => {
                  const dateEvents = getEvents(date)
                  if (dateEvents.length === 0) return null

                  return (
                    <section className="month-agenda-day" key={date.toISOString()}>
                      <button
                        className={`month-agenda-date ${isSameDay(date, selected) ? 'selected' : ''}`}
                        onClick={() => setSelected(date)}
                        aria-label={`Select ${format(date, 'EEEE, MMMM d, yyyy')}`}
                      >
                        <span>{format(date, 'EEEE')}</span>
                        <strong>{format(date, 'd MMMM')}</strong>
                      </button>
                      <div className="month-agenda-events">
                        {dateEvents.map((event) => (
                          <article className={`month-agenda-event ${getEventClass(event)}`} key={event.id}>
                            <EventCardContent event={event} />
                          </article>
                        ))}
                      </div>
                    </section>
                  )
                })}
                {monthDays
                  .filter((date) => isSameMonth(date, month))
                  .every((date) => getEvents(date).length === 0) && (
                  <p className="month-agenda-empty">No events scheduled this month.</p>
                )}
              </div>
            </div>
          )}

          <button className="today-button" onClick={() => { setMonth(new Date()); setSelected(new Date()) }}>
            <CalendarDays size={15} /> Jump to today
          </button>
        </section>

      </div>
    </div>
  )
}
