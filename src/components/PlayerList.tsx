import { initials } from '../lib/format'
import { Pencil, Trash2 } from 'lucide-react'
import type { Profile } from '../types'

interface PlayerListProps {
  players: Profile[]
  selectedPlayerId: string | undefined
  viewMode: 'table' | 'grid'
  canManagePlayers: boolean
  onSelectPlayer: (player: Profile) => void
  onEditPlayer: (player: Profile) => void
  onDeletePlayer: (player: Profile) => void
}

function PlayerAvatar({ player }: { player: Profile }) {
  return (
    <span className="roster-avatar">
      {player.photo_url ? <img className="object-cover object-top" src={player.photo_url} alt="" /> : initials(player.full_name)}
    </span>
  )
}

function PlayerActions({ player, onEditPlayer, onDeletePlayer }: Pick<PlayerListProps, 'onEditPlayer' | 'onDeletePlayer'> & { player: Profile }) {
  return (
    <span className="player-row-actions">
      <button type="button" aria-label={`Edit ${player.full_name}`} onClick={(event) => { event.stopPropagation(); onEditPlayer(player) }}>
        <Pencil size={13} /> <span>Edit Player</span>
      </button>
      <button type="button" className="delete-player-action" aria-label={`Delete ${player.full_name}`} onClick={(event) => { event.stopPropagation(); onDeletePlayer(player) }}>
        <Trash2 size={13} /> <span>Delete Player</span>
      </button>
    </span>
  )
}

export function PlayerList({ players, selectedPlayerId, viewMode, canManagePlayers, onSelectPlayer, onEditPlayer, onDeletePlayer }: PlayerListProps) {
  if (players.length === 0) return <div className="roster-empty">No players found.</div>

  if (viewMode === 'table') {
    return (
      <div className="roster-table-scroll">
        <table className="roster-table">
          <thead>
            <tr>
              <th scope="col" className="number-column">No.</th>
              <th scope="col">Player</th>
              <th scope="col" className="position-column">Position</th>
              {canManagePlayers && <th scope="col" className="actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const selected = player.id === selectedPlayerId
              return (
                <tr key={player.id} className={selected ? 'selected' : ''}>
                  <td className="number-column">{player.squad_number ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="table-player-button"
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => onSelectPlayer(player)}
                    >
                      <PlayerAvatar player={player} />
                      <span className="table-player-name">{player.full_name}</span>
                    </button>
                  </td>
                  <td className="position-column"><span className="position-label">{player.position ?? 'Player'}</span></td>
                  {canManagePlayers && <td className="actions-column"><PlayerActions player={player} onEditPlayer={onEditPlayer} onDeletePlayer={onDeletePlayer} /></td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2 roster-grid">
      {players.map((player) => {
        const selected = player.id === selectedPlayerId
        return (
          <div key={player.id} className={`roster-card ${selected ? 'selected' : ''}`}>
            <button
              type="button"
              className="roster-card-select"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelectPlayer(player)}
            >
              <PlayerAvatar player={player} />
              <span className="roster-card-copy">
                <strong>{player.full_name}</strong>
                <small>{player.position ?? 'Player'}</small>
              </span>
              <span className="roster-card-number">#{player.squad_number ?? '—'}</span>
            </button>
            {canManagePlayers && <PlayerActions player={player} onEditPlayer={onEditPlayer} onDeletePlayer={onDeletePlayer} />}
          </div>
        )
      })}
    </div>
  )
}
