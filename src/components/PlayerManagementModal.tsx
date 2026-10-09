import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Profile, Squad } from '../types'

export interface PlayerDraft {
  full_name: string
  squad_number: number
  position: string
  squad: Squad
  birth_date: string | null
  nationality: string | null
  photo_url: string | null
}

interface PlayerManagementModalProps {
  mode: 'create' | 'edit' | 'delete'
  player?: Profile
  defaultSquad: Squad
  onClose: () => void
  onSave: (draft: PlayerDraft) => Promise<void>
  onDelete: (player: Profile) => Promise<void>
}

function PlayerManagementModal({ mode, player, defaultSquad, onClose, onSave, onDelete }: PlayerManagementModalProps) {
  const [fullName, setFullName] = useState(player?.full_name ?? '')
  const [squadNumber, setSquadNumber] = useState(player?.squad_number?.toString() ?? '')
  const [position, setPosition] = useState(player?.position ?? '')
  const [squad, setSquad] = useState<Squad>(player?.teams?.name ?? defaultSquad)
  const [birthDate, setBirthDate] = useState(player?.birth_date ?? '')
  const [nationality, setNationality] = useState(player?.nationality ?? '')
  const [photoUrl, setPhotoUrl] = useState(player?.photo_url ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!fullName.trim() || !position.trim()) {
      setError('Enter a full name and position.')
      return
    }
    const number = Number(squadNumber)
    if (!Number.isInteger(number) || number < 1 || number > 99) {
      setError('Squad number must be between 1 and 99.')
      return
    }
    setSubmitting(true)
    try {
      await onSave({
        full_name: fullName.trim(),
        squad_number: number,
        position: position.trim(),
        squad,
        birth_date: birthDate || null,
        nationality: nationality.trim() || null,
        photo_url: photoUrl.trim() || null,
      })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The player could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!player) return
    setError('')
    setSubmitting(true)
    try {
      await onDelete(player)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The player could not be deleted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="player-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose() }}>
      <section className="player-modal" role="dialog" aria-modal="true" aria-labelledby="player-modal-title">
        <header className="player-modal-header">
          <div>
            <span className="eyebrow">SQUAD MANAGEMENT</span>
            <h2 id="player-modal-title">{mode === 'create' ? 'Add New Player' : mode === 'edit' ? 'Edit Player' : 'Delete Player'}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" disabled={submitting} onClick={onClose}><X size={18} /></button>
        </header>
        {mode === 'delete' ? (
          <div className="player-delete-content">
            <p>Are you sure you want to remove this player?</p>
            <strong>{player?.full_name}</strong>
            {error && <p className="player-form-error" role="alert">{error}</p>}
            <footer className="player-modal-actions">
              <button type="button" className="player-button secondary" disabled={submitting} onClick={onClose}>Cancel</button>
              <button type="button" className="player-button danger" disabled={submitting} onClick={() => void confirmDelete()}>{submitting ? 'Deleting…' : 'Delete Player'}</button>
            </footer>
          </div>
        ) : (
          <form className="player-form" onSubmit={(event) => void submitForm(event)}>
            <label className="player-form-field player-form-wide">
              <span>Full Name</span>
              <input autoFocus required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
            <label className="player-form-field">
              <span>Squad Number</span>
              <input required type="number" min="1" max="99" step="1" value={squadNumber} onChange={(event) => setSquadNumber(event.target.value)} />
            </label>
            <label className="player-form-field">
              <span>Position</span>
              <input required maxLength={80} value={position} onChange={(event) => setPosition(event.target.value)} />
            </label>
            <label className="player-form-field">
              <span>Team / Squad</span>
              <select value={squad} onChange={(event) => setSquad(event.target.value as Squad)}>
                <option value="SPL1">SPL1</option>
                <option value="SPL2">SPL2</option>
              </select>
            </label>
            <label className="player-form-field">
              <span>Date of Birth</span>
              <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </label>
            <label className="player-form-field">
              <span>Nationality</span>
              <input maxLength={80} value={nationality} onChange={(event) => setNationality(event.target.value)} />
            </label>
            <label className="player-form-field player-form-wide">
              <span>Photo URL</span>
              <input type="url" maxLength={2048} placeholder="https://…" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} />
            </label>
            {error && <p className="player-form-error player-form-wide" role="alert">{error}</p>}
            <footer className="player-modal-actions player-form-wide">
              <button type="button" className="player-button secondary" disabled={submitting} onClick={onClose}>Cancel</button>
              <button type="submit" className="player-button primary" disabled={submitting}>{submitting ? 'Saving…' : mode === 'create' ? 'Add Player' : 'Save Changes'}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
  )
}

export default PlayerManagementModal
