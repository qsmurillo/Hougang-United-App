import type { ActivityStat, CalendarEvent, ChatMessage, Checkin, GpsMetric, IndividualGoal, Profile, Squad } from '../types'

const names = [
  'Ethan Tan','Lucas Lim','Noah Lee','Ryan Wong','Kai Chen','Aiden Ng','Dylan Koh','Jasper Goh','Liam Teo','Mason Chua',
  'Caleb Ong','Isaac Ho','Elliot Yeo','Jayden Low','Aaron Sim','Zachary Tay','Daniel Foo','Nathaniel Quek','Marcus Lau','Theo Chan',
  'Oliver Seah','Benjamin Yap','Gabriel Toh','Joshua Wee','Adrian Poh','Samuel Ang','Leonard Tan','Reuben Lim','Harrison Lee','Dominic Wong',
  'Matteo Chen','Rafael Ng','Cameron Koh','Felix Goh','Julian Teo','Xavier Chua','Kieran Ong','Evan Ho','Darius Yeo','Shawn Low',
  'Isaiah Sim','Nicholas Tay','Joel Foo','Tobias Quek','Aaron Lau',
]
const positions = ['Goalkeeper','Defender','Defender','Defender','Midfielder','Midfielder','Midfielder','Forward','Forward']
const birthDates = ['1998-03-14','2000-07-22','1997-11-03','2001-02-18','1999-06-09','2002-09-30']

export const mockTeams = { SPL1: 'team-spl1', SPL2: 'team-spl2' }

export const mockProfiles: Profile[] = names.map((full_name, index) => ({
  id: `player-${index + 1}`,
  full_name,
  role: 'player',
  team_id: index < 23 ? mockTeams.SPL1 : mockTeams.SPL2,
  squad_number: (index % 23) + 1,
  position: positions[index % positions.length],
  birth_date: birthDates[index % birthDates.length],
  nationality: index % 7 === 0 ? 'Japan' : index % 4 === 0 ? 'Malaysia' : 'Singapore',
  photo_url: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(full_name)}&backgroundColor=1e3a8a`,
  teams: { name: index < 23 ? 'SPL1' : 'SPL2' },
}))

export const mockGps: GpsMetric[] = mockProfiles.flatMap((profile, index) =>
  Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 3 }, (_, dayIndex) => {
      const sessionIndex = weekIndex * 3 + dayIndex
      return {
        player_id: profile.id,
        session_id: `session-${sessionIndex}`,
        date: new Date(Date.now() - ((5 - weekIndex) * 7 + (2 - dayIndex) * 2) * 86400000).toISOString().slice(0, 10),
        event_type: (index + sessionIndex) % 5 === 0 ? 'match' as const : 'training' as const,
        total_distance: 6400 + ((index * 173 + sessionIndex * 211) % 5100),
        dist_per_min: 82 + ((index * 7 + sessionIndex * 3) % 31),
        max_speed: 27 + ((index * 13 + sessionIndex * 5) % 92) / 10,
        hsr_distance: 280 + ((index * 41 + sessionIndex * 29) % 710),
        hml_distance: 510 + ((index * 53 + sessionIndex * 37) % 1120),
        sprint_count: 8 + ((index + sessionIndex * 2) % 24),
        accelerations: 22 + ((index * 5 + sessionIndex * 3) % 45),
        decelerations: 22 + ((index * 6 + sessionIndex * 4) % 45),
      }
    }),
  ).flat(),
)

export const mockCheckins: Checkin[] = mockGps.map((metric, index) => ({
  player_id: metric.player_id,
  date: metric.date,
  sleep_hours: 6 + (index % 5) * 0.5,
  emotional_fatigue_1to5: 2 + (index % 4),
  nutrition_ok: index % 6 !== 0,
  hydration_ok: index % 7 !== 0,
  session_rpe_0to10: 4 + (index % 6),
}))

export const mockActivity: ActivityStat[] = mockProfiles.map((profile, index) => ({
  id: `activity-${index}`,
  player_id: profile.id,
  season: '2025/26',
  minutes_played: 360 + ((index * 37) % 1100),
  started_matches: 4 + (index % 14),
  sub_matches: index % 8,
  training_attendance_pct: 72 + ((index * 3) % 27),
  total_goals: index % 9,
  total_assists: (index * 2) % 7,
}))

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
export const mockEvents: CalendarEvent[] = [
  { id: 'event-1', team_id: mockTeams.SPL1, title: 'First team training', event_type: 'training', date: day(1), time: '09:00', location: 'Hougang Stadium', details: 'Technical activation and possession.', opponent: null },
  { id: 'event-2', team_id: mockTeams.SPL1, title: 'Match day', event_type: 'match', date: day(3), time: '19:45', location: 'Hougang Stadium', details: 'Singapore Premier League fixture.', opponent: 'Lion City Sailors' },
  { id: 'event-3', team_id: mockTeams.SPL1, title: 'Video review', event_type: 'meeting', date: day(5), time: '10:30', location: 'Analysis Room', details: 'Review match clips and key moments.', opponent: null },
  { id: 'event-4', team_id: mockTeams.SPL2, title: 'Development training', event_type: 'training', date: day(1), time: '17:30', location: 'Hougang Stadium', details: 'Small-sided games and finishing.', opponent: null },
  { id: 'event-5', team_id: mockTeams.SPL2, title: 'League fixture', event_type: 'match', date: day(4), time: '16:00', location: 'Away Ground', details: 'SPL2 league fixture.', opponent: 'Young Lions' },
  { id: 'event-6', team_id: mockTeams.SPL2, title: 'Squad meeting', event_type: 'meeting', date: day(6), time: '18:00', location: 'Meeting Room', details: 'Weekly squad check-in.', opponent: null },
]

export const mockGoals: IndividualGoal[] = mockProfiles.filter((_, index) => [0, 1, 23, 24].includes(index)).flatMap((profile) => [
  { id: `${profile.id}-goal-1`, player_id: profile.id, title: 'Scan before receiving', description: 'Check both shoulders before the first touch.', category: 'Decision-making', start_value: 2, current_value: 3, target_value: 4 },
  { id: `${profile.id}-goal-2`, player_id: profile.id, title: 'Communicate early', description: 'Give clear information in defensive transitions.', category: 'Communication', start_value: 2, current_value: 3, target_value: 4 },
  { id: `${profile.id}-goal-3`, player_id: profile.id, title: 'Repeated sprint capacity', description: 'Improve repeated high-intensity effort.', category: 'Fitness', start_value: 1, current_value: 2, target_value: 4 },
])

export const mockMessages: ChatMessage[] = [
  { id: 'message-1', player_id: 'player-1', sender_id: 'coach', message: 'Great work at training today, Ethan. Keep building on that first touch.', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'message-2', player_id: 'player-1', sender_id: 'player-1', message: 'Thanks coach! I will keep working on scanning before I receive.', created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'message-3', player_id: 'player-1', sender_id: 'coach', message: 'Perfect. Let us check in after the match on Saturday.', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
]

export function teamIdForSquad(squad: Squad): string {
  return mockTeams[squad]
}
