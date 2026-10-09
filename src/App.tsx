import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Bell, CalendarDays, CheckCircle2, ChevronDown, LayoutGrid, LogOut, Menu, MessageCircle, Plus, Search, ShieldCheck, Table2, Target, Users, X } from 'lucide-react'
import { ChatTab } from './components/ChatTab'
import { CalendarTab } from './components/CalendarTab'
import { CheckinTab } from './components/CheckinTab'
import { GoalsTab } from './components/GoalsTab'
import { LoginScreen } from './components/LoginScreen'
import { PlayerList } from './components/PlayerList'
import PlayerManagementModal, { type PlayerDraft } from './components/PlayerManagementModal'
import { calculateAge, initials } from './lib/format'
import { mockActivity, mockCheckins, mockEvents, mockGoals, mockGps, mockMessages, mockProfiles, mockTeams, teamIdForSquad } from './lib/mockData'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { ActivityStat, CalendarEvent, ChatMessage, Checkin, GoalReview, GpsMetric, IndividualGoal, Profile, Role, Squad } from './types'

const ActivityTab = lazy(() => import('./components/PerformanceTabs').then((module) => ({ default: module.ActivityTab })))
const GpsTab = lazy(() => import('./components/PerformanceTabs').then((module) => ({ default: module.GpsTab })))

type TabId = 'checkin' | 'activity' | 'calendar' | 'goals' | 'chat'
type Notice = { type: 'success' | 'error'; text: string } | null

const tabs: { id: TabId; label: string; number: string; icon: typeof Activity }[] = [
  { id: 'checkin', number: '01', label: 'Daily check-in', icon: CheckCircle2 },
  { id: 'activity', number: '02', label: 'Activity', icon: Activity },
  { id: 'calendar', number: '03', label: 'Calendar', icon: CalendarDays },
  { id: 'goals', number: '04', label: 'Individual goals', icon: Target },
  { id: 'chat', number: '05', label: 'Coach chat', icon: MessageCircle },
]
const nationalityFlags: Record<string, string> = { Singapore: '🇸🇬', Malaysia: '🇲🇾', Japan: '🇯🇵' }

function App() {
  const [userId, setUserId] = useState<string | null>(null)
  const [selfProfile, setSelfProfile] = useState<Profile | null>(null)
  const [demo, setDemo] = useState(false)
  const [demoRole, setDemoRole] = useState<Role>('admin')
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [loadError, setLoadError] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [metrics, setMetrics] = useState<GpsMetric[]>([])
  const [activities, setActivities] = useState<ActivityStat[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [goals, setGoals] = useState<IndividualGoal[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [squad, setSquad] = useState<Squad>('SPL1')
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState<TabId>('checkin')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [playerModal, setPlayerModal] = useState<{ mode: 'create' | 'edit' | 'delete'; player?: Profile } | null>(null)

  const role: Role = demo ? demoRole : selfProfile?.role ?? 'player'
  const viewerId = demo ? (role === 'player' ? selectedId : 'demo-admin') : userId ?? ''
  const canSeeSquad = role !== 'player'
  const isStaff = role === 'admin' || role === 'official'
  const selectedPlayer = useMemo(() => {
    if (role === 'player') return profiles.find((profile) => profile.id === (demo ? selectedId : userId)) ?? selfProfile
    return profiles.find((profile) => profile.id === selectedId) ?? profiles[0] ?? null
  }, [demo, profiles, role, selectedId, selfProfile, userId])
  const squadProfiles = useMemo(() => profiles.filter((profile) => profile.teams?.name === squad || profile.team_id === teamIdForSquad(squad)), [profiles, squad])
  const shownProfiles = useMemo(() => squadProfiles.filter((profile) => profile.full_name.toLowerCase().includes(search.toLowerCase())), [squadProfiles, search])
  const squadIds = useMemo(() => new Set(squadProfiles.map((profile) => profile.id)), [squadProfiles])
  const squadMetrics = useMemo(() => metrics.filter((metric) => squadIds.has(metric.player_id)), [metrics, squadIds])
  const selectedCheckin = checkins.find((checkin) => checkin.player_id === selectedPlayer?.id && checkin.date === new Date().toISOString().slice(0, 10))
  const playerGoals = goals.filter((goal) => goal.player_id === selectedPlayer?.id)
  const playerMessages = messages.filter((message) => message.player_id === selectedPlayer?.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const selectedStat = activities.find((activity) => activity.player_id === selectedPlayer?.id)

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 4500)
  }, [])

  const loadData = useCallback(async (profile: Profile, authenticatedUserId: string, asDemo = false) => {
    setLoadingData(true)
    setLoadError('')
    try {
      if (asDemo) {
        setProfiles(mockProfiles)
        setMetrics(mockGps)
        setActivities(mockActivity)
        setEvents(mockEvents)
        setGoals(mockGoals)
        setCheckins(mockCheckins)
        setMessages(mockMessages)
        setSelectedId(mockProfiles[0].id)
        return
      }
      if (!supabase) throw new Error('Supabase is not configured.')
      const profileQuery = supabase.from('profiles').select('id, full_name, role, team_id, squad_number, position, birth_date, nationality, photo_url, teams(name)')
      const idsOrSelf = profile.role === 'player' ? [authenticatedUserId] : undefined
      const [profileResult, gpsResult, activityResult, eventResult, goalResult, checkinResult, messageResult] = await Promise.all([
        idsOrSelf ? profileQuery.eq('id', authenticatedUserId) : profileQuery.eq('role', 'player'),
        supabase.from('gps_metrics').select('*'),
        supabase.from('activity_stats').select('*'),
        profile.role === 'player' ? supabase.from('calendar_events').select('*').eq('team_id', profile.team_id) : supabase.from('calendar_events').select('*'),
        supabase.from('individual_goals').select('*, goal_reviews(*)'),
        supabase.from('daily_checkins').select('*'),
        supabase.from('chat_messages').select('*'),
      ])
      const failed = [profileResult, gpsResult, activityResult, eventResult, goalResult, checkinResult, messageResult].find((result) => result.error)
      if (failed?.error) throw failed.error
      const loadedProfiles = (profileResult.data ?? []) as unknown as Profile[]
      setProfiles(loadedProfiles)
      setMetrics((gpsResult.data ?? []) as GpsMetric[])
      setActivities((activityResult.data ?? []) as ActivityStat[])
      setEvents((eventResult.data ?? []) as CalendarEvent[])
      setGoals((goalResult.data ?? []) as unknown as IndividualGoal[])
      setCheckins((checkinResult.data ?? []) as Checkin[])
      setMessages((messageResult.data ?? []) as ChatMessage[])
      setSquad((profile.teams?.name ?? 'SPL1') as Squad)
      setSelectedId(profile.role === 'player' ? authenticatedUserId : loadedProfiles[0]?.id ?? '')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to load club data.'
      setLoadError(message)
      throw caught
    } finally {
      setLoadingData(false)
    }
  }, [])

  const refreshPlayerProfiles = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, role, team_id, squad_number, position, birth_date, nationality, photo_url, teams(name)')
      .eq('role', 'player')
    if (error) throw error
    const refreshed = (data ?? []) as unknown as Profile[]
    setProfiles(refreshed)
    return refreshed
  }, [])

  async function savePlayer(draft: PlayerDraft, existingPlayer?: Profile) {
    if (role !== 'admin') throw new Error('Only admins can manage player profiles.')
    const profileFields = {
      full_name: draft.full_name,
      squad_number: draft.squad_number,
      position: draft.position,
      birth_date: draft.birth_date,
      nationality: draft.nationality,
      photo_url: draft.photo_url,
    }
    let savedId: string
    if (demo) {
      const teamId = teamIdForSquad(draft.squad)
      savedId = existingPlayer?.id ?? `player-${Date.now()}`
      const updated: Profile = {
        ...(existingPlayer ?? { id: savedId, role: 'player' as const }),
        ...profileFields,
        team_id: teamId,
        teams: { name: draft.squad },
      }
      setProfiles((previous) => existingPlayer
        ? previous.map((profile) => profile.id === existingPlayer.id ? updated : profile)
        : [...previous, updated])
    } else {
      if (!supabase) throw new Error('Supabase is not configured.')
      const { data: matchingTeams, error: teamError } = await supabase.from('teams').select('id, name').eq('name', draft.squad)
      if (teamError) throw new Error(`The ${draft.squad} squad could not be loaded: ${teamError.message}`)
      const teams = matchingTeams ?? []
      const team = teams.find((candidate) => candidate.id === existingPlayer?.team_id) ?? (teams.length === 1 ? teams[0] : null)
      if (!team) {
        const message = teams.length === 0
          ? `No team was found for ${draft.squad}. Check the teams table and try again.`
          : `More than one team was found for ${draft.squad}. Keep the player's current team or resolve the duplicate teams before saving.`
        throw new Error(message)
      }
      const record = { ...profileFields, role: 'player', team_id: team.id }
      if (existingPlayer) {
        const { error } = await supabase.from('profiles').update(record).eq('id', existingPlayer.id).select('id').single()
        if (error) throw new Error(`Player could not be updated: ${error.message}`)
        savedId = existingPlayer.id
      } else {
        const { data, error } = await supabase.from('profiles').insert({ ...record, id: crypto.randomUUID() }).select('id').single()
        if (error) throw new Error(`Player could not be created: ${error.message}`)
        savedId = data.id
      }
      try {
        await refreshPlayerProfiles()
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Unknown refresh error'
        throw new Error(`Player was saved, but the roster could not be refreshed: ${message}`)
      }
    }
    setSquad(draft.squad)
    setSelectedId(savedId)
    notify('success', existingPlayer ? 'Player details updated.' : 'New player added.')
  }

  async function deletePlayer(player: Profile) {
    if (role !== 'admin') throw new Error('Only admins can manage player profiles.')
    if (demo) {
      setProfiles((previous) => previous.filter((profile) => profile.id !== player.id))
      const remaining = profiles.filter((profile) => profile.id !== player.id && (profile.teams?.name === squad || profile.team_id === teamIdForSquad(squad)))
      if (selectedId === player.id) setSelectedId(remaining[0]?.id ?? '')
    } else {
      if (!supabase) throw new Error('Supabase is not configured.')
      const { error } = await supabase.from('profiles').delete().eq('id', player.id).select('id').single()
      if (error) throw new Error(`Player could not be deleted: ${error.message}`)
      try {
        const refreshed = await refreshPlayerProfiles()
        const remaining = refreshed.filter((profile) => profile.teams?.name === squad || profile.team_id === teamIdForSquad(squad))
        if (selectedId === player.id) setSelectedId(remaining[0]?.id ?? '')
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Unknown refresh error'
        throw new Error(`Player was deleted, but the roster could not be refreshed: ${message}`)
      }
    }
    notify('success', 'Player removed from the squad.')
  }

  const acceptSession = useCallback(async (id: string) => {
    if (!supabase) return
    setUserId(id)
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, team_id, squad_number, position, birth_date, nationality, photo_url, teams(name)').eq('id', id).single()
    if (error) {
      setLoginError(`Your account profile could not be loaded: ${error.message}`)
      await supabase.auth.signOut()
      setUserId(null)
      return
    }
    const profile = data as unknown as Profile
    setSelfProfile(profile)
    try { await loadData(profile, id) }
    catch { setLoginError('Your account signed in, but club data could not be loaded. Check your database schema and row-level security policies.') }
  }, [loadData])

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setLoginError(error.message)
      if (mounted && data.session) void acceptSession(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session) void acceptSession(session.user.id)
      else { setUserId(null); setSelfProfile(null); setProfiles([]) }
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [acceptSession])

  async function login(email: string, password: string) {
    if (!supabase) { setLoginError('Configure Supabase to sign in with a real account.'); return }
    setLoadingLogin(true)
    setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setLoginError(error.message)
    } catch (caught) {
      setLoginError(caught instanceof Error ? caught.message : 'Unable to sign in. Please try again.')
    } finally {
      setLoadingLogin(false)
    }
  }

  async function enterDemo() {
    setDemo(true)
    setDemoRole('admin')
    setSelfProfile({ id: 'demo-admin', full_name: 'Club Administrator', role: 'admin', team_id: mockTeams.SPL1, squad_number: null, position: 'Club staff', birth_date: null, nationality: 'Singapore', photo_url: null, teams: { name: 'SPL1' } })
    setSelectedId(mockProfiles[0].id)
    await loadData({ id: 'demo-admin', full_name: 'Club Administrator', role: 'admin', team_id: mockTeams.SPL1, squad_number: null, position: null, birth_date: null, nationality: null, photo_url: null }, 'demo-admin', true)
  }

  async function logout() {
    if (demo) {
      setDemo(false); setSelfProfile(null); setUserId(null); setProfiles([]); setMenuOpen(false)
      return
    }
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) notify('error', `Unable to sign out: ${error.message}`)
    else { setMenuOpen(false); setSelfProfile(null); setProfiles([]) }
  }

  async function submitCheckin(payload: Omit<Checkin, 'player_id'>) {
    if (!selectedPlayer) throw new Error('Select a player before submitting a check-in.')
    const record: Checkin = { ...payload, player_id: selectedPlayer.id, submitted_at: new Date().toISOString() }
    if (demo) setCheckins((previous) => [...previous.filter((item) => item.player_id !== record.player_id || item.date !== record.date), record])
    else if (supabase) {
      const { data, error } = await supabase.from('daily_checkins').upsert(record, { onConflict: 'player_id,date' }).select().single()
      if (error) { notify('error', `Check-in could not be saved: ${error.message}`); throw error }
      setCheckins((previous) => [...previous.filter((item) => item.player_id !== record.player_id || item.date !== record.date), data as Checkin])
    }
    notify('success', 'Your daily check-in has been saved.')
  }

  async function addGoal(draft: Omit<IndividualGoal, 'id'>) {
    if (!selectedPlayer) throw new Error('Select a player before adding a goal.')
    const record = { ...draft, player_id: selectedPlayer.id }
    if (demo) setGoals((previous) => [...previous, { ...record, id: `goal-${Date.now()}` }])
    else if (supabase) {
      const { data, error } = await supabase.from('individual_goals').insert(record).select('*').single()
      if (error) { notify('error', `Goal could not be created: ${error.message}`); throw error }
      setGoals((previous) => [...previous, data as IndividualGoal])
    }
    notify('success', 'Your new development goal is ready.')
  }

  async function saveReview(goalId: string, review: Omit<GoalReview, 'id' | 'goal_id' | 'created_at'>) {
    const goal = goals.find((item) => item.id === goalId)
    if (!goal) throw new Error('The goal could not be found.')
    if (demo) {
      setGoals((previous) => previous.map((item) => item.id === goalId ? { ...item, current_value: review.observed_value, goal_reviews: [{ ...review, goal_id: goalId, id: `review-${Date.now()}`, created_at: new Date().toISOString() }, ...(item.goal_reviews ?? [])] } : item))
    } else if (supabase) {
      const { data, error } = await supabase.from('goal_reviews').insert({ ...review, goal_id: goalId }).select().single()
      if (error) { notify('error', `Review could not be saved: ${error.message}`); throw error }
      const { error: goalError } = await supabase.from('individual_goals').update({ current_value: review.observed_value }).eq('id', goalId)
      if (goalError) { notify('error', `Review saved, but goal progress could not be updated: ${goalError.message}`); throw goalError }
      setGoals((previous) => previous.map((item) => item.id === goalId ? { ...item, current_value: review.observed_value, goal_reviews: [data as GoalReview, ...(item.goal_reviews ?? [])] } : item))
    }
    notify('success', 'Goal review saved.')
  }

  async function deleteGoal(goalId: string) {
    if (!window.confirm('Delete this development goal and its reviews?')) return
    if (demo) setGoals((previous) => previous.filter((goal) => goal.id !== goalId))
    else if (supabase) {
      const { error } = await supabase.from('individual_goals').delete().eq('id', goalId)
      if (error) { notify('error', `Goal could not be deleted: ${error.message}`); return }
      setGoals((previous) => previous.filter((goal) => goal.id !== goalId))
    }
    notify('success', 'Goal deleted.')
  }

  async function sendMessage(text: string) {
    if (!selectedPlayer) throw new Error('Select a player to send a message.')
    const record: ChatMessage = { id: `message-${Date.now()}`, player_id: selectedPlayer.id, sender_id: viewerId, message: text, created_at: new Date().toISOString() }
    if (demo) setMessages((previous) => [...previous, record])
    else if (supabase) {
      const { data, error } = await supabase.from('chat_messages').insert({ player_id: selectedPlayer.id, sender_id: viewerId, message: text }).select().single()
      if (error) { notify('error', `Message could not be sent: ${error.message}`); throw error }
      setMessages((previous) => [...previous, data as ChatMessage])
    }
  }

  if (!demo && !selfProfile) return <LoginScreen onLogin={login} onDemo={() => void enterDemo()} error={loginError} loading={loadingLogin} />

  const navName = selectedPlayer?.full_name ?? selfProfile?.full_name ?? 'Your squad'
  const activeTab = tabs.find((item) => item.id === tab)
  const setSquadView = (next: Squad) => {
    setSquad(next)
    const nextPlayer = profiles.find((profile) => profile.teams?.name === next || profile.team_id === teamIdForSquad(next))
    if (nextPlayer && role !== 'player') setSelectedId(nextPlayer.id)
  }
  const changeDemoRole = (next: Role) => {
    setDemoRole(next)
    setSelectedId(mockProfiles[0].id)
    setSquad('SPL1')
    if (next === 'player') setSelfProfile(mockProfiles[0])
    else setSelfProfile({ id: 'demo-admin', full_name: 'Club Administrator', role: next, team_id: mockTeams.SPL1, squad_number: null, position: 'Club staff', birth_date: null, nationality: 'Singapore', photo_url: null, teams: { name: 'SPL1' } })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu-button icon-button" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}>{mobileNav ? <X size={19} /> : <Menu size={19} />}</button><div className="brand-mark"><Activity size={21} strokeWidth={2.5} /></div><div className="brand-name"><strong>HOUGANG <span>UNITED</span></strong><small>PERFORMANCE HUB</small></div></div>
        <div className="header-controls"><div className="header-squad-switcher" aria-label="Select squad">{(['SPL1', 'SPL2'] as Squad[]).map((item) => <button key={item} disabled={!canSeeSquad && (selectedPlayer?.teams?.name ?? 'SPL1') !== item} onClick={() => setSquadView(item)} className={squad === item ? 'active' : ''}>{item}</button>)}</div><div className="header-view-toggle" role="group" aria-label="Player list view"><button type="button" aria-label="Cards/grid view" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}><LayoutGrid size={14} /></button><button type="button" aria-label="Table view" aria-pressed={viewMode === 'table'} onClick={() => setViewMode('table')} className={viewMode === 'table' ? 'active' : ''}><Table2 size={14} /></button></div></div>
        <div className="topbar-right"><div className="today-label"><span /> CLUB PERFORMANCE · SEASON 25/26</div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="top-divider" /><div className="user-chip"><div className="user-avatar">{initials(selfProfile?.full_name ?? 'HU')}</div><div className="user-chip-copy"><strong>{selfProfile?.full_name}</strong><small><span className="role-dot" />{role === 'admin' ? 'Administrator' : role === 'official' ? 'Team official' : 'Player account'}</small></div><button className="icon-button user-menu-trigger" aria-label="Account menu" onClick={() => setMenuOpen(!menuOpen)}><ChevronDown size={15} /></button>{menuOpen && <div className="user-menu"><div className="menu-heading">Signed in as <strong>{selfProfile?.full_name}</strong></div>{demo && <div className="demo-role-controls"><small>Preview role</small>{(['admin', 'official', 'player'] as Role[]).map((item) => <button key={item} className={role === item ? 'active' : ''} onClick={() => changeDemoRole(item)}>{item}</button>)}</div>}<button onClick={() => void logout()}><LogOut size={15} /> Sign out</button></div>}</div></div>
      </header>
      {demo && <div className="demo-banner"><ShieldCheck size={15} /> DEMO PREVIEW <span>Sample data only · Changes are stored in memory and reset on refresh.</span>{isSupabaseConfigured && <button onClick={() => { setDemo(false); setSelfProfile(null) }}>Exit demo</button>}</div>}
      <div className="app-body">
        <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}><div className="sidebar-squad-label">YOUR WORKSPACE</div><div className="sidebar-section-label">SQUAD OVERVIEW <span>{(canSeeSquad ? shownProfiles.length : selectedPlayer ? 1 : 0).toString().padStart(2, '0')}</span></div>{canSeeSquad && <div className="roster-search"><Search size={15} /><input aria-label="Search players" placeholder="Find a player" value={search} onChange={(event) => setSearch(event.target.value)} /></div>}<div className="roster-heading"><span>PLAYERS</span>{role === 'admin' && <button type="button" className="add-player-button" onClick={() => setPlayerModal({ mode: 'create' })}><Plus size={13} /> Add New Player</button>}</div>
          <PlayerList
            players={canSeeSquad ? shownProfiles : selectedPlayer ? [selectedPlayer] : []}
            selectedPlayerId={selectedPlayer?.id}
            viewMode={viewMode}
            canManagePlayers={role === 'admin'}
            onSelectPlayer={(profile) => { setSelectedId(profile.id); setTab('checkin'); setMobileNav(false) }}
            onEditPlayer={(player) => setPlayerModal({ mode: 'edit', player })}
            onDeletePlayer={(player) => setPlayerModal({ mode: 'delete', player })}
          />
          <div className="sidebar-bottom"><div className="club-card"><div className="club-card-top"><Users size={16} /><span>ONE CLUB. TWO SQUADS.</span></div><p>Better every day,<br />together.</p><span className="club-card-season">EST. 1981 · SINGAPORE</span><ArrowUpRight className="club-arrow" size={17} /></div><div className="sidebar-foot"><span>© 2025 HOUGANG UNITED</span><span>MADE FOR THE GAME <b>●</b></span></div></div>
        </aside>
        <main className="main-content">
          {loadError && <div className="load-error" role="alert"><strong>Data could not be loaded.</strong> {loadError} <button onClick={() => selfProfile && void loadData(selfProfile, viewerId).catch(() => undefined)}>Retry</button></div>}
          {loadingData && <div className="loading-bar"><span /></div>}
          <div className="main-inner">
            <div className="breadcrumb"><span>PERFORMANCE HUB</span><span>/</span><strong>{squad} SQUAD</strong><span>/</span><span>{activeTab?.label.toUpperCase()}</span></div>
            <section className="profile-banner"><div className="profile-photo">{selectedPlayer?.photo_url ? <img src={selectedPlayer.photo_url} alt={`${selectedPlayer.full_name} profile`} /> : <span>{initials(selectedPlayer?.full_name ?? '?')}</span>}<i /></div><div className="profile-main"><div className="profile-meta"><span className="squad-badge">{selectedPlayer?.teams?.name ?? squad}</span><span className="profile-member">{role === 'player' ? 'PLAYER PROFILE' : 'SELECTED PLAYER'}</span></div><h1>{selectedPlayer?.full_name ?? 'Select a player'}</h1><div className="profile-details"><span className="shirt-number">#{selectedPlayer?.squad_number ?? '—'}</span><span>{selectedPlayer?.position ?? 'Position not set'}</span><i />{selectedPlayer?.birth_date && <span>{calculateAge(selectedPlayer.birth_date)} years old</span>}{selectedPlayer?.nationality && <span className="nationality-badge">{nationalityFlags[selectedPlayer.nationality] ?? '🌐'} <b>{selectedPlayer.nationality}</b></span>}</div></div><div className="profile-banner-side"><div className="profile-status"><span /> ACTIVE SQUAD</div><div className="profile-season">{selectedPlayer?.teams?.name ?? squad}<small>2025 / 26</small></div></div></section>
            <nav className="tab-navigation" aria-label="Main navigation">{tabs.map(({ id, number, label, icon: Icon }) => <button key={id} className={tab === id ? 'tab-button active' : 'tab-button'} onClick={() => { setTab(id); setMobileNav(false) }}><Icon size={17} /><span className="tab-number">{number}</span><span>{label}</span>{tab === id && <i />}</button>)}</nav>
            <div className="main-toolbar"><div><h2>{activeTab?.label}</h2><p>{tab === 'checkin' ? 'Wellbeing first. Performance follows.' : tab === 'activity' ? 'The work behind every match-day moment.' : tab === 'calendar' ? 'Plan ahead and be ready for every session.' : tab === 'goals' ? 'Focus on what moves you forward.' : 'A direct line to your coaching team.'}</p></div><div className="toolbar-right"><span className="live-tag"><i /> LIVE SQUAD DATA</span><div className="toolbar-divider" /><div className="toolbar-player"><span>VIEWING</span><strong>{navName.split(' ')[0]} <ChevronDown size={13} /></strong></div></div></div>
            <Suspense fallback={<div className="loading-panel">Loading performance data…</div>}><div className="tab-content" key={tab}>
              {tab === 'checkin' && <><CheckinTab key={selectedPlayer?.id} existing={selectedCheckin} onSubmit={submitCheckin} canEdit={role === 'player' || role === 'admin'} submitted={Boolean(selectedCheckin)} />{isStaff && <div className="coach-dashboard"><div className="coach-dashboard-heading"><div><span className="coach-label"><Activity size={14} /> COACH DASHBOARD</span><h2>GPS &amp; training load</h2></div><button className="text-link" onClick={() => setTab('activity')}>Full activity <ArrowUpRight size={15} /></button></div><GpsTab metrics={squadMetrics} profiles={squadProfiles} selectedPlayer={selectedPlayer} canCompare={isStaff} /></div>}</>}
              {tab === 'activity' && <><ActivityTab stat={selectedStat} metrics={metrics} checkins={checkins} selectedPlayer={selectedPlayer} />{isStaff && <section className="staff-gps-section"><GpsTab metrics={squadMetrics} profiles={squadProfiles} selectedPlayer={selectedPlayer} canCompare /></section>}</>}
              {tab === 'calendar' && <CalendarTab events={events.filter((event) => event.team_id === teamIdForSquad(squad))} />}
              {tab === 'goals' && <GoalsTab key={selectedPlayer?.id} goals={playerGoals} canEdit={role === 'player' || role === 'admin'} onAdd={addGoal} onSaveReview={saveReview} onDelete={deleteGoal} />}
              {tab === 'chat' && <ChatTab key={selectedPlayer?.id} messages={playerMessages} profile={selectedPlayer} viewerId={viewerId} canSend={Boolean(selectedPlayer) && (role === 'player' || role === 'admin')} onSend={sendMessage} />}
            </div></Suspense>
            <footer className="main-footer"><span>HOUGANG UNITED <b>·</b> PERFORMANCE HUB</span><span>PLAYER DEVELOPMENT, TOGETHER <span className="footer-star">✳</span></span></footer>
          </div>
        </main>
      </div>
      {playerModal && <PlayerManagementModal
        key={`${playerModal.mode}-${playerModal.player?.id ?? 'new'}`}
        mode={playerModal.mode}
        player={playerModal.player}
        defaultSquad={squad}
        onClose={() => setPlayerModal(null)}
        onSave={(draft) => savePlayer(draft, playerModal.mode === 'edit' ? playerModal.player : undefined)}
        onDelete={deletePlayer}
      />}
      {notice && <div className={`toast ${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}{notice.text}<button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
    </div>
  )
}

export default App
