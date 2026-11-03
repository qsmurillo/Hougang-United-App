import { useState, type FormEvent } from 'react'
import { Check, ChevronDown, Film, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import type { GoalCategory, GoalReview, IndividualGoal } from '../types'

interface GoalsTabProps {
  goals: IndividualGoal[]
  canEdit: boolean
  onAdd: (goal: Omit<IndividualGoal, 'id'>) => Promise<void>
  onSaveReview: (goalId: string, review: Omit<GoalReview, 'id' | 'goal_id' | 'created_at'>) => Promise<void>
  onUpdateVideo: (goalId: string, videoUrl: string | null) => Promise<void>
  onDelete: (goalId: string) => Promise<void>
}

const categories: GoalCategory[] = ['Communication', 'Decision-making', 'Execution', 'Fitness']
const categoryClass: Record<GoalCategory, string> = { Communication: 'cat-communication', 'Decision-making': 'cat-decision', Execution: 'cat-execution', Fitness: 'cat-fitness' }
const initialGoalDraft = { title: '', description: '', category: 'Execution' as GoalCategory, start_value: 1, current_value: 1, target_value: 5, video_url: '' }
const initialReview = { observed_value: 3, next_review_date: '', observation_text: '' }

function getYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? null
    if (!['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) return null
    if (url.pathname === '/watch') return url.searchParams.get('v')
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function formatReviewDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function GoalsTab({ goals, canEdit, onAdd, onSaveReview, onUpdateVideo, onDelete }: GoalsTabProps) {
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoDraft, setVideoDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState(initialReview)
  const [goalDraft, setGoalDraft] = useState(initialGoalDraft)
  const [error, setError] = useState('')

  async function saveReview(event: FormEvent) {
    event.preventDefault()
    if (!reviewId) return
    setSaving(true)
    setError('')
    try {
      await onSaveReview(reviewId, review)
      setReviewId(null)
      setReview(initialReview)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your review.')
    } finally {
      setSaving(false)
    }
  }

  async function createGoal(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onAdd({ ...goalDraft, video_url: goalDraft.video_url.trim() || null, player_id: '' })
      setAdding(false)
      setGoalDraft(initialGoalDraft)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create your goal.')
    } finally {
      setSaving(false)
    }
  }

  async function saveVideo(goalId: string) {
    const value = videoDraft.trim()
    if (value && !getYouTubeVideoId(value)) {
      setError('Enter a valid YouTube video URL.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onUpdateVideo(goalId, value || null)
      setVideoId(null)
      setVideoDraft('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the video link.')
    } finally {
      setSaving(false)
    }
  }

  async function removeVideo(goalId: string) {
    setSaving(true)
    setError('')
    try {
      await onUpdateVideo(goalId, null)
      setVideoId(null)
      setVideoDraft('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove the video link.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tab-stack">
      <div className="section-heading">
        <div><p className="eyebrow">YOUR DEVELOPMENT PLAN</p><p className="muted">Small steps, clear focus, real progress.</p></div>
        <div className="goals-summary"><Target size={17} /><span><strong>{goals.length}</strong> active goals</span></div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="goal-grid">
        {goals.map((goal) => {
          const range = goal.target_value - goal.start_value
          const currentPosition = range === 0 ? 100 : clampPercent(((goal.current_value - goal.start_value) / range) * 100)
          const overallProgress = clampPercent((goal.current_value / 5) * 100)
          const videoKey = videoId === goal.id
          const videoUrl = goal.video_url ?? ''
          const videoKeyId = getYouTubeVideoId(videoUrl)
          const reviews = [...(goal.goal_reviews ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

          return (
            <article className="surface goal-card" key={goal.id}>
              <div className="goal-card-header">
                <span className={`category-badge ${categoryClass[goal.category]}`}>{goal.category}</span>
                {canEdit && <button className="icon-button delete-goal" aria-label={`Delete ${goal.title}`} onClick={() => void onDelete(goal.id)}><Trash2 size={15} /></button>}
              </div>
              <h3>{goal.title}</h3>
              <p className="goal-description">{goal.description}</p>

              <section className="goal-progress" aria-label={`Goal progress: ${goal.current_value} of ${goal.target_value}`}>
                <div className="progress-caption"><span>Development progress</span><strong>{goal.current_value} <small>/ {goal.target_value}</small></strong></div>
                <div className="goal-track" role="img" aria-label={`Start ${goal.start_value}, current ${goal.current_value}, goal ${goal.target_value}`}>
                  <span style={{ width: `${currentPosition}%` }} />
                  <i className="goal-marker start-marker" />
                  <i className="goal-marker current-marker" style={{ left: `${currentPosition}%` }} />
                  <i className="goal-marker target-marker" />
                </div>
                <div className="goal-values">
                  <span>START <strong>{goal.start_value}</strong></span>
                  <span>CURRENT <strong>{goal.current_value}</strong></span>
                  <span>GOAL <strong>{goal.target_value}</strong></span>
                </div>
                <p className="goal-metadata">UNIT: {goal.current_value} / 5 <span aria-hidden="true">·</span> PROGRESS {Math.round(overallProgress)}%</p>
              </section>

              <section className="goal-reviews" aria-label="Review history">
                <div className="goal-subsection-heading"><span>Review log</span><span>{reviews.length} {reviews.length === 1 ? 'entry' : 'entries'}</span></div>
                {reviews.length > 0 ? (
                  <ul className="goal-review-list">
                    {reviews.map((item) => (
                      <li key={item.id}>
                        <time dateTime={item.created_at}>{formatReviewDate(item.created_at)}</time>
                        <strong>{item.observed_value}</strong>
                        <p>{item.observation_text || 'No observation recorded.'}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="goal-empty-history">No reviews logged yet.</p>}
              </section>

              <section className="goal-video-section" aria-label="Video analysis">
                {videoKey ? (
                  <div className="goal-video-editor">
                    <label>YOUTUBE VIDEO URL<input type="url" value={videoDraft} onChange={(event) => setVideoDraft(event.target.value)} placeholder="https://youtu.be/..." /></label>
                    <div className="goal-video-actions">
                      <button type="button" className="goal-text-button" onClick={() => { setVideoId(null); setVideoDraft(''); setError('') }}>CANCEL</button>
                      <button type="button" className="button button-primary small-button" disabled={saving} onClick={() => void saveVideo(goal.id)}>{saving ? 'Saving…' : 'SAVE LINK'}</button>
                    </div>
                  </div>
                ) : videoKeyId ? (
                  <>
                    <div className="goal-video-frame"><iframe src={`https://www.youtube.com/embed/${encodeURIComponent(videoKeyId)}`} title={`Video analysis for ${goal.title}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
                    {canEdit && <div className="goal-video-actions"><button type="button" className="goal-text-button" onClick={() => { setVideoId(goal.id); setVideoDraft(videoUrl); setError('') }}><Pencil size={13} /> EDIT VIDEO</button><button type="button" className="goal-text-button goal-remove-video" disabled={saving} onClick={() => void removeVideo(goal.id)}><X size={14} /> REMOVE</button></div>}
                  </>
                ) : (
                  <div className="goal-video-empty">
                    {videoUrl && <p className="goal-video-error">This saved video link is not a valid YouTube URL.</p>}
                    {canEdit && <button type="button" className="goal-text-button" onClick={() => { setVideoId(goal.id); setVideoDraft(videoUrl); setError('') }}><Film size={15} /> ADD VIDEO ANALYSIS LINK</button>}
                  </div>
                )}
              </section>

              <button className="review-button" onClick={() => {
                const isOpen = reviewId === goal.id
                setReviewId(isOpen ? null : goal.id)
                setReview({ ...initialReview, observed_value: goal.current_value })
                setError('')
              }}>
                LOG REVIEW <span aria-hidden="true">-&gt;</span><ChevronDown size={15} className={reviewId === goal.id ? 'rotate' : ''} />
              </button>
              {reviewId === goal.id && (
                <form className="review-panel" onSubmit={(event) => void saveReview(event)}>
                  <label>SCORE (/5)<select value={review.observed_value} onChange={(event) => setReview({ ...review, observed_value: Number(event.target.value) })}>{[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
                  <label>NEXT REVIEW<input type="date" required value={review.next_review_date} onChange={(event) => setReview({ ...review, next_review_date: event.target.value })} /></label>
                  <label>NOTES<textarea required rows={3} placeholder="What was observed and in what context" value={review.observation_text} onChange={(event) => setReview({ ...review, observation_text: event.target.value })} /></label>
                  {canEdit ? <div className="goal-form-actions"><button type="button" className="goal-text-button" onClick={() => { setReviewId(null); setError('') }}>CANCEL</button><button className="button button-primary small-button" disabled={saving}>{saving ? 'Saving…' : <><Check size={15} /> SAVE</>}</button></div> : <p className="muted">Reviews are available to the player and coaching staff.</p>}
                </form>
              )}
            </article>
          )
        })}
        {adding && canEdit && (
          <form className="surface goal-card new-goal-form" onSubmit={(event) => void createGoal(event)}>
            <div className="goal-card-header"><span className="category-badge cat-execution">NEW OBJECTIVE</span><button type="button" className="icon-button" aria-label="Cancel creating goal" onClick={() => { setAdding(false); setError('') }}>×</button></div>
            <h3>Create a goal</h3>
            <label>Goal title<input required maxLength={100} value={goalDraft.title} onChange={(event) => setGoalDraft({ ...goalDraft, title: event.target.value })} placeholder="e.g. Improve first touch" /></label>
            <label>Description<textarea rows={2} value={goalDraft.description} onChange={(event) => setGoalDraft({ ...goalDraft, description: event.target.value })} placeholder="How will you measure it?" /></label>
            <label>Category<select value={goalDraft.category} onChange={(event) => setGoalDraft({ ...goalDraft, category: event.target.value as GoalCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <div className="value-row"><label>Start<input type="number" min="0" max="5" step=".5" value={goalDraft.start_value} onChange={(event) => setGoalDraft({ ...goalDraft, start_value: Number(event.target.value) })} /></label><label>Current<input type="number" min="0" max="5" step=".5" value={goalDraft.current_value} onChange={(event) => setGoalDraft({ ...goalDraft, current_value: Number(event.target.value) })} /></label><label>Goal<input type="number" min="0" max="5" step=".5" value={goalDraft.target_value} onChange={(event) => setGoalDraft({ ...goalDraft, target_value: Number(event.target.value) })} /></label></div>
            <label>VIDEO ANALYSIS URL<input type="url" value={goalDraft.video_url} onChange={(event) => setGoalDraft({ ...goalDraft, video_url: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." /></label>
            <button className="button button-primary small-button" disabled={saving}>{saving ? 'Creating…' : 'Create goal'}</button>
          </form>
        )}
        {canEdit && !adding && <button className="add-goal-card" onClick={() => { setAdding(true); setError('') }}><span><Plus size={21} /></span><strong>Add new goal</strong><small>Set your next development focus</small></button>}
      </div>
    </div>
  )
}
