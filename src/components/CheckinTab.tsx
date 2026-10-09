import { useState } from 'react'
import { Check, CheckCircle2, Droplets, Leaf, Moon, Sparkles } from 'lucide-react'
import type { Checkin } from '../types'

const moods = [
  { value: 1, emoji: '😫', label: 'Very low' },
  { value: 2, emoji: '🙁', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😀', label: 'Great' },
]

interface CheckinTabProps {
  existing: Checkin | undefined
  onSubmit: (checkin: Omit<Checkin, 'player_id'>) => Promise<void>
  canEdit: boolean
  submitted: boolean
}

export function CheckinTab({ existing, onSubmit, canEdit, submitted }: CheckinTabProps) {
  const [sleep, setSleep] = useState(existing?.sleep_hours ?? 8)
  const [mood, setMood] = useState(existing?.emotional_fatigue_1to5 ?? 4)
  const [nutrition, setNutrition] = useState(existing?.nutrition_ok ?? true)
  const [hydration, setHydration] = useState(existing?.hydration_ok ?? true)
  const [rpe, setRpe] = useState(existing?.session_rpe_0to10 ?? 5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  async function handleSubmit() {
    setSaving(true)
    try {
      await onSubmit({ date: today, sleep_hours: sleep, emotional_fatigue_1to5: mood, nutrition_ok: nutrition, hydration_ok: hydration, session_rpe_0to10: rpe })
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
        <div className="form-section sleep-section">
          <div className="field-title"><span><Moon size={17} /> Sleep duration</span><strong>{sleep} <small>hours</small></strong></div>
          <input aria-label="Sleep duration" type="range" min="3" max="10" step="0.5" value={sleep} onChange={(event) => setSleep(Number(event.target.value))} disabled={!canEdit} className="range-input" />
          <div className="range-labels"><span>3 hours</span><span>10+ hours</span></div>
          <div className="sleep-quick">{[5, 6, 7, 8, 9, 10].map((hour) => <button key={hour} className={sleep === hour ? 'quick-value active' : 'quick-value'} onClick={() => setSleep(hour)} disabled={!canEdit}>{hour}<small>h</small></button>)}</div>
        </div>
        <div className="form-section">
          <div className="field-title"><span>Emotional &amp; fatigue state</span><span className="subtle">How do you feel today?</span></div>
          <div className="mood-picker">{moods.map((item) => <button key={item.value} onClick={() => setMood(item.value)} disabled={!canEdit} className={mood === item.value ? 'mood-option active' : 'mood-option'}><span>{item.emoji}</span><small>{item.label}</small></button>)}</div>
        </div>
        <div className="form-section">
          <div className="field-title"><span>Daily habits</span><span className="subtle">Have you kept up?</span></div>
          <div className="habit-row">
            <button className={nutrition ? 'habit-toggle selected' : 'habit-toggle'} onClick={() => setNutrition(!nutrition)} disabled={!canEdit}><span className="habit-icon"><Leaf size={19} /></span><span><strong>🥗 Nutrition</strong><small>Eating well</small></span><span className="toggle-check">{nutrition && <Check size={13} />}</span></button>
            <button className={hydration ? 'habit-toggle selected' : 'habit-toggle'} onClick={() => setHydration(!hydration)} disabled={!canEdit}><span className="habit-icon water"><Droplets size={19} /></span><span><strong>💧 Hydration</strong><small>Drinking enough</small></span><span className="toggle-check">{hydration && <Check size={13} />}</span></button>
          </div>
        </div>
        <div className="form-section rpe-section">
          <div className="field-title"><span>Session effort <small className="info-tag">RPE</small></span><strong>{rpe}<small> / 10</small></strong></div>
          <input aria-label="Session RPE" type="range" min="0" max="10" value={rpe} onChange={(event) => setRpe(Number(event.target.value))} disabled={!canEdit} className="range-input orange-range" />
          <div className="range-labels"><span>Rest / very easy</span><span>Maximum effort</span></div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {canEdit && <button className="button button-primary submit-checkin" onClick={() => void handleSubmit()} disabled={saving}>{submitted ? <><CheckCircle2 size={18} /> Check-in saved</> : <>{saving ? 'Saving…' : 'Submit check-in'} <span>→</span></>}</button>}
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
