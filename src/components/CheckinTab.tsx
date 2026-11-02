import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Droplets, Leaf, Moon, Sparkles } from 'lucide-react'
import { localDateKey } from '../lib/format'
import type { Checkin, CheckinSubmission } from '../types'

const moods = [
  { value: 1, emoji: '😫', label: 'Very low' },
  { value: 2, emoji: '🙁', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😁', label: 'Great' },
]

const sleepShortcuts = [
  { label: '<3h', value: 2.5 },
  { label: '4h', value: 4 },
  { label: '5h', value: 5 },
  { label: '6h', value: 6 },
  { label: '7h', value: 7 },
  { label: '8h', value: 8 },
  { label: '9h', value: 9 },
  { label: '10h', value: 10 },
  { label: '>10h', value: 10.5 },
]

const rpeDescriptions: Record<number, { color: string; label: string; description: string }> = {
  0: { color: '#94a3b8', label: 'Rest / No Effort', description: 'No physical exertion.' },
  1: { color: '#3B82F6', label: 'Very Light Activity', description: 'Hardly any exertion, but more than sleeping, watching TV, etc.' },
  2: { color: '#06B6D4', label: 'Light Activity', description: 'Feels like you can maintain for hours. Easy to breathe and carry a conversation.' },
  3: { color: '#06B6D4', label: 'Light Activity', description: 'Feels like you can maintain for hours. Easy to breathe and carry a conversation.' },
  4: { color: '#22C55E', label: 'Moderate Activity', description: 'Breathing heavily, can hold a short conversation. Still somewhat comfortable, but becoming noticeably more challenging.' },
  5: { color: '#22C55E', label: 'Moderate Activity', description: 'Breathing heavily, can hold a short conversation. Still somewhat comfortable, but becoming noticeably more challenging.' },
  6: { color: '#22C55E', label: 'Moderate Activity', description: 'Breathing heavily, can hold a short conversation. Still somewhat comfortable, but becoming noticeably more challenging.' },
  7: { color: '#EAB308', label: 'Vigorous Activity', description: 'Borderline uncomfortable. Short of breath, can speak a sentence.' },
  8: { color: '#EAB308', label: 'Vigorous Activity', description: 'Borderline uncomfortable. Short of breath, can speak a sentence.' },
  9: { color: '#F97316', label: 'Very Hard Activity', description: 'Very difficult to maintain exercise intensity. Can barely breathe and speak only a few words.' },
  10: { color: '#EF4444', label: 'Max Effort Activity', description: 'Feels almost impossible to keep going. Completely out of breath, unable to talk. Cannot maintain for more than a very short time.' },
}

interface CheckinTabProps {
  existing: Checkin | undefined
  history: Checkin[]
  onSubmit: (checkin: CheckinSubmission) => Promise<void>
  canEdit: boolean
}

export function CheckinTab({ existing, history, onSubmit, canEdit }: CheckinTabProps) {
  const today = localDateKey()
  const [stage, setStage] = useState<'pre' | 'post'>('pre')
  const [sleep, setSleep] = useState(existing?.sleep_hours ?? 8)
  const [mood, setMood] = useState(existing?.emotional_fatigue_1to5 ?? 4)
  const [nutrition, setNutrition] = useState(existing?.nutrition_ok ?? false)
  const [hydration, setHydration] = useState(existing?.hydratation_ok ?? false)
  const [rpe, setRpe] = useState(existing?.session_rpe_0to10 ?? 5)
  const [historyDate, setHistoryDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setSleep(existing?.sleep_hours ?? 8)
    setMood(existing?.emotional_fatigue_1to5 ?? 4)
    setNutrition(existing?.nutrition_ok ?? false)
    setHydration(existing?.hydratation_ok ?? false)
    setRpe(existing?.session_rpe_0to10 ?? 5)
  }, [existing])
  const preComplete = existing?.sleep_hours != null
    || existing?.emotional_fatigue_1to5 != null
    || existing?.nutrition_ok != null
    || existing?.hydratation_ok != null
  const postComplete = existing?.session_rpe_0to10 != null
  const rpeInfo = rpeDescriptions[rpe]
  const historyDates = useMemo(
    () => [...new Set(history.map((checkin) => checkin.date))].sort((a, b) => b.localeCompare(a)),
    [history],
  )
  const selectedHistory = history.find((checkin) => checkin.date === historyDate)
  const selectedMood = moods.find((item) => item.value === selectedHistory?.emotional_fatigue_1to5)

  async function handleSubmit(submission: CheckinSubmission) {
    setSaving(true)
    try {
      await onSubmit(submission)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your check-in.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content-grid checkin-layout">
      <section className="surface checkin-card">
        <div className="section-heading">
          <div><p className="eyebrow">WELLBEING · {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h2>How are you feeling?</h2><p className="muted">A quick daily check-in helps us keep you performing at your best.</p></div>
          <div className="heading-icon orange-icon"><Sparkles size={20} /></div>
        </div>
        {!canEdit && <div className="inline-note">Players can submit and update their own daily check-in.</div>}
        <nav className="checkin-stage-tabs" aria-label="Check-in stage">
          <button type="button" className={stage === 'pre' ? 'active' : ''} onClick={() => setStage('pre')}>Pre-Training Check-in</button>
          <button type="button" className={stage === 'post' ? 'active' : ''} onClick={() => setStage('post')}>Post-Training RPE</button>
        </nav>
        {stage === 'pre' ? (
          <div className="checkin-stage-content">
            {preComplete && <div className="checkin-complete-banner"><strong>✓ Pre-Training check-in completado para hoy</strong><div className="checkin-summary-grid"><span>Sleep <b>{existing?.sleep_hours ?? '—'}{existing?.sleep_hours != null ? 'h' : ''}</b></span><span>Mood <b>{existing?.emotional_fatigue_1to5 != null ? `${moods[existing.emotional_fatigue_1to5 - 1]?.emoji} ${moods[existing.emotional_fatigue_1to5 - 1]?.label}` : '—'}</b></span><span>Nutrition <b>{existing?.nutrition_ok == null ? '—' : existing.nutrition_ok ? 'Yes' : 'No'}</b></span><span>Hydration <b>{existing?.hydratation_ok == null ? '—' : existing.hydratation_ok ? 'Yes' : 'No'}</b></span></div></div>}
            <div className="form-section sleep-section">
              <div className="field-title"><span><Moon size={17} /> Sleep duration</span><strong>{sleep === 2.5 ? '<3' : sleep === 10.5 ? '>10' : sleep} <small>hours</small></strong></div>
              <input aria-label="Sleep duration" type="range" min="2.5" max="10.5" step="0.5" value={sleep} onChange={(event) => setSleep(Number(event.target.value))} disabled={!canEdit || preComplete} className="range-input" />
              <div className="range-labels"><span>&lt;3 hours</span><span>&gt;10 hours</span></div>
              <div className="sleep-quick">{sleepShortcuts.map(({ label, value }) => <button type="button" key={label} aria-pressed={sleep === value} className={sleep === value ? 'quick-value active' : 'quick-value'} onClick={() => setSleep(value)} disabled={!canEdit || preComplete}>{label}</button>)}</div>
            </div>
            <div className="form-section">
              <div className="field-title"><span>Emotional &amp; fatigue state</span><span className="subtle">How do you feel today?</span></div>
              <div className="mood-picker">{moods.map((item) => <button type="button" key={item.value} aria-pressed={mood === item.value} onClick={() => setMood(item.value)} disabled={!canEdit || preComplete} className={mood === item.value ? 'mood-option active' : 'mood-option'}><span>{item.emoji}</span><small>{item.label}</small></button>)}</div>
            </div>
            <div className="form-section">
              <div className="field-title"><span>Daily habits</span><span className="subtle">Have you kept up?</span></div>
              <div className="habit-row">
                <button type="button" aria-pressed={nutrition} className={nutrition ? 'habit-toggle selected' : 'habit-toggle'} onClick={() => setNutrition(!nutrition)} disabled={!canEdit || preComplete}><span className="habit-icon"><Leaf size={19} /></span><span><strong>Nutrition</strong><small className="text-xs text-slate-500">Eat a meal containing protein and carbohydrates at least 1 hour before training.</small></span><span className="toggle-check">{nutrition && <Check size={13} />}</span></button>
                <button type="button" aria-pressed={hydration} className={hydration ? 'habit-toggle selected' : 'habit-toggle'} onClick={() => setHydration(!hydration)} disabled={!canEdit || preComplete}><span className="habit-icon water"><Droplets size={19} /></span><span><strong>Hydration</strong><small className="text-xs text-slate-500">Drink at least 1 L of fluids before training.</small></span><span className="toggle-check">{hydration && <Check size={13} />}</span></button>
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {canEdit && !preComplete && <button type="button" className="button button-primary submit-checkin" onClick={() => void handleSubmit({ sleep_hours: sleep, emotional_fatigue_1to5: mood, nutrition_ok: nutrition, hydratation_ok: hydration, date: today })} disabled={saving}>{saving ? 'Saving…' : 'Submit Pre-Training Check-in →'}</button>}
          </div>
        ) : (
          <div className="checkin-stage-content">
            {postComplete && <div className="checkin-complete-banner"><strong>✓ Post-Training RPE completado para hoy</strong><p>RPE {existing?.session_rpe_0to10} · {rpeDescriptions[existing?.session_rpe_0to10 ?? 0].label} — {rpeDescriptions[existing?.session_rpe_0to10 ?? 0].description}</p></div>}
            <div className="form-section rpe-section">
              <div className="field-title"><span>Session effort <small className="info-tag">RPE</small></span><strong style={{ color: rpeInfo.color }}>{rpe}<small> / 10</small></strong></div>
              <input aria-label="Session RPE" type="range" min="0" max="10" step="1" value={rpe} onChange={(event) => setRpe(Number(event.target.value))} disabled={!canEdit || postComplete} className="range-input rpe-range" style={{ color: rpeInfo.color, background: `linear-gradient(to right, ${rpeInfo.color} ${rpe * 10}%, #e2e8f0 ${rpe * 10}%)`, accentColor: rpeInfo.color }} />
              <div className="range-labels"><span>0 · Rest</span><span>10 · Maximum effort</span></div>
              <p className="rpe-description" style={{ color: rpeInfo.color }}><strong>{rpeInfo.label}</strong> — {rpeInfo.description}</p>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {canEdit && !postComplete && <button type="button" className="button button-primary submit-checkin" onClick={() => void handleSubmit({ session_rpe_0to10: rpe, date: today })} disabled={saving}>{saving ? 'Saving…' : 'Submit Post-Training RPE →'}</button>}
          </div>
        )}
        <section className="checkin-history">
          <div className="checkin-history-heading"><div><h3>Check-in history</h3><p>Compare pre-training wellbeing and post-training effort for a selected day.</p></div><label htmlFor="checkin-history-date">Date<select id="checkin-history-date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)}><option value={today}>Today</option>{historyDates.filter((date) => date !== today).map((date) => <option key={date} value={date}>{new Date(`${date}T00:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</option>)}</select></label></div>
          {selectedHistory ? <div className="checkin-history-grid"><article><h4>Pre-Training</h4><p>Sleep <strong>{selectedHistory.sleep_hours == null ? '—' : `${selectedHistory.sleep_hours}h`}</strong></p><p>Mood <strong>{selectedMood ? `${selectedMood.emoji} ${selectedMood.label}` : '—'}</strong></p><p>Nutrition <strong>{selectedHistory.nutrition_ok == null ? '—' : selectedHistory.nutrition_ok ? 'Yes' : 'No'}</strong></p><p>Hydration <strong>{selectedHistory.hydratation_ok == null ? '—' : selectedHistory.hydratation_ok ? 'Yes' : 'No'}</strong></p></article><article><h4>Post-Training</h4><p>Session RPE <strong>{selectedHistory.session_rpe_0to10 ?? '—'}{selectedHistory.session_rpe_0to10 != null ? ` · ${rpeDescriptions[selectedHistory.session_rpe_0to10].label}` : ''}</strong></p></article></div> : <p className="checkin-history-empty">No check-in data recorded for this date.</p>}
        </section>
      </section>
      <aside className="checkin-aside">
        <div className="surface wellbeing-card">
          <div className="mini-eyebrow"><span className="status-dot" /> YOUR DAILY RESET</div>
          <div className="wellbeing-illustration"><div className="sun-glow" /><div className="wellbeing-sun">☀</div><span className="wellbeing-cloud">☁</span></div>
          <h3>Consistency is a<br /><span>superpower.</span></h3>
          <p>Today’s check-in helps your coaching team understand how you’re feeling — on and off the pitch.</p>
          <div className="wellbeing-points"><div><CheckCircle2 size={16} /> Takes less than a minute</div><div><CheckCircle2 size={16} /> Your wellbeing comes first</div><div><CheckCircle2 size={16} /> Shared with your team</div></div>
        </div>
        <div className="tip-card"><div className="tip-mark">“</div><div><strong>Recovery starts tonight</strong><p>A good sleep routine supports focus, energy, and your next performance.</p></div></div>
      </aside>
    </div>
  )
}
