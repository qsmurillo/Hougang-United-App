import { useState, type FormEvent } from 'react'
import { Check, ChevronDown, Plus, Target, Trash2 } from 'lucide-react'
import type { GoalCategory, GoalReview, IndividualGoal } from '../types'

interface GoalsTabProps {
  goals: IndividualGoal[]
  canEdit: boolean
  onAdd: (goal: Omit<IndividualGoal, 'id'>) => Promise<void>
  onSaveReview: (goalId: string, review: Omit<GoalReview, 'id' | 'goal_id' | 'created_at'>) => Promise<void>
  onDelete: (goalId: string) => Promise<void>
}
const categories: GoalCategory[] = ['Communication', 'Decision-making', 'Execution', 'Fitness']
const categoryClass: Record<GoalCategory, string> = { Communication: 'cat-communication', 'Decision-making': 'cat-decision', Execution: 'cat-execution', Fitness: 'cat-fitness' }

export function GoalsTab({ goals, canEdit, onAdd, onSaveReview, onDelete }: GoalsTabProps) {
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState({ observed_value: 3, next_review_date: '', observation_text: '' })
  const [goalDraft, setGoalDraft] = useState({ title: '', description: '', category: 'Execution' as GoalCategory, start_value: 1, current_value: 1, target_value: 5 })
  const [error, setError] = useState('')

  async function saveReview(event: FormEvent) {
    event.preventDefault()
    if (!reviewId) return
    setSaving(true)
    try {
      await onSaveReview(reviewId, review)
      setReviewId(null)
      setReview({ observed_value: 3, next_review_date: '', observation_text: '' })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save your review.') }
    finally { setSaving(false) }
  }

  async function createGoal(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onAdd({ ...goalDraft, player_id: '' })
      setAdding(false)
      setGoalDraft({ title: '', description: '', category: 'Execution', start_value: 1, current_value: 1, target_value: 5 })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create your goal.') }
    finally { setSaving(false) }
  }

  return (
    <div className="tab-stack">
      <div className="section-heading"><div><p className="eyebrow">YOUR DEVELOPMENT PLAN</p><h2>Individual goals</h2><p className="muted">Small steps, clear focus, real progress.</p></div><div className="goals-summary"><Target size={17} /><span><strong>{goals.length}</strong> active goals</span></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="goal-grid">{goals.map((goal) => {
        const progress = goal.target_value === goal.start_value ? 100 : Math.max(0, Math.min(100, ((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100))
        return <article className="surface goal-card" key={goal.id}><div className="goal-card-header"><span className={`category-badge ${categoryClass[goal.category]}`}>{goal.category}</span>{canEdit && <button className="icon-button delete-goal" aria-label={`Delete ${goal.title}`} onClick={() => void onDelete(goal.id)}><Trash2 size={15} /></button>}</div><h3>{goal.title}</h3><p className="goal-description">{goal.description}</p><div className="goal-progress"><div className="progress-caption"><span>Progress</span><strong>{goal.current_value} <small>/ {goal.target_value}</small></strong></div><div className="goal-track"><span style={{ width: `${progress}%` }} /><i className="goal-marker start-marker" /><i className="goal-marker current-marker" style={{ left: `${progress}%` }} /><i className="goal-marker target-marker" /></div><div className="goal-values"><span>Start <strong>{goal.start_value}</strong></span><span>Current <strong>{goal.current_value}</strong></span><span>Goal <strong>{goal.target_value}</strong></span></div></div>
          <button className="review-button" onClick={() => { const isOpen = reviewId === goal.id; setReviewId(isOpen ? null : goal.id); setReview({ observed_value: goal.current_value, next_review_date: '', observation_text: '' }); setError('') }}>Review progress <ChevronDown size={15} className={reviewId === goal.id ? 'rotate' : ''} /></button>
          {reviewId === goal.id && <form className="review-panel" onSubmit={saveReview}><label>Observed value <select value={review.observed_value} onChange={(event) => setReview({ ...review, observed_value: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label><label>Next review date<input type="date" required value={review.next_review_date} onChange={(event) => setReview({ ...review, next_review_date: event.target.value })} /></label><label>Observation<textarea required rows={3} placeholder="What have you seen and in which situation or context?" value={review.observation_text} onChange={(event) => setReview({ ...review, observation_text: event.target.value })} /></label>{canEdit ? <button className="button button-primary small-button" disabled={saving}>{saving ? 'Saving…' : <><Check size={15} /> Save review</>}</button> : <p className="muted">Reviews are available to the player and coaching staff.</p>}</form>}
        </article>
      })}
      {adding && canEdit && <form className="surface goal-card new-goal-form" onSubmit={createGoal}><div className="goal-card-header"><span className="category-badge cat-execution">NEW OBJECTIVE</span><button type="button" className="icon-button" onClick={() => setAdding(false)}>×</button></div><h3>Create a goal</h3><label>Goal title<input required maxLength={100} value={goalDraft.title} onChange={(event) => setGoalDraft({ ...goalDraft, title: event.target.value })} placeholder="e.g. Improve first touch" /></label><label>Description<textarea rows={2} value={goalDraft.description} onChange={(event) => setGoalDraft({ ...goalDraft, description: event.target.value })} placeholder="How will you measure it?" /></label><label>Category<select value={goalDraft.category} onChange={(event) => setGoalDraft({ ...goalDraft, category: event.target.value as GoalCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><div className="value-row"><label>Start<input type="number" min="0" max="5" step=".5" value={goalDraft.start_value} onChange={(event) => setGoalDraft({ ...goalDraft, start_value: Number(event.target.value) })} /></label><label>Current<input type="number" min="0" max="5" step=".5" value={goalDraft.current_value} onChange={(event) => setGoalDraft({ ...goalDraft, current_value: Number(event.target.value) })} /></label><label>Goal<input type="number" min="0" max="5" step=".5" value={goalDraft.target_value} onChange={(event) => setGoalDraft({ ...goalDraft, target_value: Number(event.target.value) })} /></label></div><button className="button button-primary small-button" disabled={saving}>{saving ? 'Creating…' : 'Create goal'}</button></form>}
      {canEdit && !adding && <button className="add-goal-card" onClick={() => setAdding(true)}><span><Plus size={21} /></span><strong>Add new goal</strong><small>Set your next development focus</small></button>}
      </div>
    </div>
  )
}
