import { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, MapPin, Clock3, CalendarDays } from 'lucide-react'
import type { CalendarEvent } from '../types'

interface CalendarTabProps { events: CalendarEvent[] }
const eventClass: Record<string, string> = { match: 'match-event', training: 'training-event', meeting: 'meeting-event' }

export function CalendarTab({ events }: CalendarTabProps) {
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'year'>('month')
  const days = useMemo(() => {
    if (view === 'week') return eachDayOfInterval({ start: startOfWeek(selected, { weekStartsOn: 1 }), end: endOfWeek(selected, { weekStartsOn: 1 }) })
    if (view === 'year') return Array.from({ length: 12 }, (_, index) => new Date(month.getFullYear(), index, 1))
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) })
  }, [month, selected, view])
  const dayEvents = events.filter((event) => isSameDay(new Date(`${event.date}T00:00:00`), selected)).sort((a, b) => a.time.localeCompare(b.time))
  const getEvents = (date: Date) => events.filter((event) => isSameDay(new Date(`${event.date}T00:00:00`), date))
  const heading = view === 'year' ? String(month.getFullYear()) : format(view === 'week' ? selected : month, 'MMMM yyyy')

  return (
    <div className="tab-stack">
      <div className="section-heading"><div><p className="eyebrow">SQUAD SCHEDULE</p><h2>Calendar</h2><p className="muted">Stay ready. See what’s coming up for your squad.</p></div><div className="calendar-legend"><span><i className="legend-square match-dot" /> Matches</span><span><i className="legend-square training-dot" /> Training</span><span><i className="legend-square meeting-dot" /> Meetings</span></div></div>
      <div className="calendar-layout">
        <section className="surface calendar-card">
          <div className="calendar-toolbar"><div className="calendar-month"><h3>{heading}</h3><button className="icon-button" aria-label="Previous period" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Next period" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} /></button></div><div className="segmented-control">{(['month', 'week', 'year'] as const).map((type) => <button key={type} onClick={() => setView(type)} className={view === type ? 'selected' : ''}>{type[0].toUpperCase() + type.slice(1)}</button>)}</div></div>
          {view === 'year' ? <div className="year-grid">{days.map((date) => <button className={isSameMonth(date, month) ? 'year-month current' : 'year-month'} key={date.toISOString()} onClick={() => { setMonth(date); setView('month') }}><strong>{format(date, 'MMM')}</strong><span>{events.filter((event) => new Date(`${event.date}T00:00:00`).getMonth() === date.getMonth()).length} events</span></button>)}</div> :
          <div className="month-grid"><div className="weekday-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{days.map((date) => <button key={date.toISOString()} className={`calendar-day ${!isSameMonth(date, month) && view === 'month' ? 'outside' : ''} ${isSameDay(date, selected) ? 'selected' : ''}`} onClick={() => setSelected(date)}><span className="calendar-date">{format(date, 'd')}</span><span className="day-event-dots">{getEvents(date).slice(0, 3).map((event) => <i className={eventClass[event.event_type]} key={event.id} />)}</span>{getEvents(date).slice(0, 2).map((event) => <span className={`day-event ${eventClass[event.event_type]}`} key={event.id}>{event.title}</span>)}</button>)}</div></div>}
          <button className="today-button" onClick={() => { setMonth(new Date()); setSelected(new Date()) }}><CalendarDays size={15} /> Jump to today</button>
        </section>
        <aside className="surface day-detail"><div className="detail-date"><div><p className="eyebrow">SELECTED DAY</p><h3>{format(selected, 'EEEE')}</h3><strong>{format(selected, 'd MMMM yyyy')}</strong></div><span className="detail-day">{format(selected, 'dd')}</span></div><div className="detail-event-list">{dayEvents.length ? dayEvents.map((event) => <article className={`detail-event ${eventClass[event.event_type]}`} key={event.id}><div className="event-time"><Clock3 size={14} />{event.time.slice(0, 5)}</div><h4>{event.title}</h4><p><MapPin size={14} />{event.location}</p>{event.opponent && <div className="opponent">vs. {event.opponent}</div>}{event.details && <p className="event-details">{event.details}</p>}</article>) : <div className="empty-day"><span>◷</span><strong>A clear day</strong><p>There are no events scheduled.</p></div>}</div></aside>
      </div>
    </div>
  )
}
