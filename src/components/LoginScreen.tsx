import { useState, type FormEvent } from 'react'
import { Activity, ArrowRight, LockKeyhole } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>
  onDemo: () => void
  error: string
  loading: boolean
}

export function LoginScreen({ onLogin, onDemo, error, loading }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    await onLogin(email, password)
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark large"><Activity size={28} strokeWidth={2.5} /></div>
        <p className="eyebrow">HOUGANG UNITED FOOTBALL CLUB</p>
        <h1>Performance<br /><span>starts together.</span></h1>
        <p className="login-copy">Your squad, your progress, one place. Sign in to access the club performance hub.</p>
        <form onSubmit={submit} className="login-form">
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@club.com" required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in securely'} <ArrowRight size={17} />
          </button>
        </form>
        {!isSupabaseConfigured && (
          <div className="demo-notice">
            <div className="demo-notice-icon"><LockKeyhole size={16} /></div>
            <div><strong>Preview mode</strong><p>Connect Supabase to enable secure account sign-in.</p></div>
            <button className="button button-outline" onClick={onDemo}>Explore demo</button>
          </div>
        )}
        <div className="login-footer">SPL1 <span>·</span> SPL2 <span>·</span> Built for better football</div>
      </section>
      <aside className="login-aside">
        <div className="aside-pattern" />
        <div className="aside-content">
          <div className="aside-kicker"><span /> YOUR GAME. YOUR GROWTH.</div>
          <h2>Small details.<br />Big performances.</h2>
          <p>Wellbeing, training load, and personal development — connected for every player.</p>
          <div className="aside-stats"><div><strong>02</strong><span>Squads</span></div><div><strong>360°</strong><span>Player view</span></div><div><strong>01</strong><span>Club family</span></div></div>
        </div>
        <div className="aside-bottom">HOUGANG UNITED <span>EST. 1981</span></div>
      </aside>
    </main>
  )
}
