export type Role = 'admin' | 'official' | 'player'
export type Squad = 'SPL1' | 'SPL2'
export type EventType = 'match' | 'training' | 'meeting' | (string & {})
export type GoalCategory = 'Communication' | 'Decision-making' | 'Execution' | 'Fitness'

export interface Profile {
  id: string
  full_name: string
  role: Role
  team_id: string
  squad_number: number | null
  position: string | null
  birth_date: string | null
  nationality: string | null
  photo_url: string | null
  teams?: { name: Squad } | null
}

export interface Checkin {
  id?: string
  player_id: string
  date: string
  sleep_hours: number
  emotional_fatigue_1to5: number
  nutrition_ok: boolean
  hydration_ok: boolean
  session_rpe_0to10: number
  submitted_at?: string
}

export interface GpsMetricProfile {
  id: string
  full_name: string
  avatar_url: string | null
}

export interface GpsMetric {
  id?: string
  player_id: string
  session_id?: string | null
  date: string
  event_type?: string | null
  total_distance: number
  dist_per_min: number
  max_speed: number
  hsr_distance: number
  hml_distance?: number | null
  sprint_count: number
  accelerations?: number | null
  decelerations?: number | null
  profiles?: GpsMetricProfile | GpsMetricProfile[] | null
}

export interface ActivityStat {
  id: string
  player_id: string
  season: string
  minutes_played: number
  started_matches: number
  sub_matches: number
  training_attendance_pct: number
  total_goals: number
  total_assists: number
}

export interface CalendarEvent {
  id: string
  team_id: string
  title: string
  event_type: EventType
  date: string
  time: string
  location: string
  details: string | null
  opponent: string | null
}

export interface GoalReview {
  id: string
  goal_id: string
  observed_value: number
  next_review_date: string
  observation_text: string
  created_at: string
}

export interface IndividualGoal {
  id: string
  player_id: string
  title: string
  description: string
  category: GoalCategory
  start_value: number
  current_value: number
  target_value: number
  goal_reviews?: GoalReview[]
}
