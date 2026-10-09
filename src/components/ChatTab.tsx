import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, Paperclip, MoreHorizontal, Phone, Video } from 'lucide-react'
import { format } from 'date-fns'
import { initials } from '../lib/format'
import type { ChatMessage, Profile } from '../types'

interface ChatTabProps {
  messages: ChatMessage[]
  profile: Profile | null
  viewerId: string
  canSend: boolean
  onSend: (message: string) => Promise<void>
}

export function ChatTab({ messages, profile, viewerId, canSend, onSend }: ChatTabProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messageArea = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const area = messageArea.current
    if (area) area.scrollTop = area.scrollHeight
  }, [messages])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sending || !canSend) return
    setSending(true)
    try { await onSend(text); setDraft(''); setError('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to send your message.') }
    finally { setSending(false) }
  }

  return (
    <div className="chat-page"><div className="chat-background">
      <section className="chat-window surface">
        <header className="chat-header"><div className="coach-avatar">HC<span /></div><div className="coach-info"><strong>Coaching team</strong><span><i /> Usually replies within a day</span></div><div className="chat-actions"><button className="icon-button" aria-label="Call coaching team"><Phone size={17} /></button><button className="icon-button" aria-label="Video call coaching team"><Video size={17} /></button><button className="icon-button" aria-label="More chat options"><MoreHorizontal size={19} /></button></div></header>
        <div className="chat-message-area" ref={messageArea}><div className="chat-day"><span>TODAY</span></div>
          {messages.map((message) => { const sent = message.sender_id === viewerId; return <div className={sent ? 'message-row sent' : 'message-row received'} key={message.id}>{!sent && <div className="message-avatar">{initials('Hougang Coach')}</div>}<div className="message-bubble-wrap">{!sent && <span className="sender-name">Coach</span>}<div className="message-bubble">{message.message}<time>{format(new Date(message.created_at), 'h:mm a')}</time></div></div></div> })}
          {messages.length === 0 && <div className="chat-empty"><div className="coach-avatar">HC</div><strong>Start a conversation</strong><p>Send a message to your coaching team.</p></div>}
        </div>
        {error && <p className="form-error chat-error" role="alert">{error}</p>}<form className="chat-compose" onSubmit={(event) => void submit(event)}><button type="button" className="compose-attach" aria-label="Attach file" title="File attachments are not enabled"><Paperclip size={19} /></button><input aria-label="Message" placeholder={canSend ? `Message ${profile?.full_name ?? 'your coach'}…` : 'Select a player to view their messages'} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!canSend} /><button className="send-button" disabled={!draft.trim() || sending || !canSend} aria-label="Send message">{sending ? '…' : <Send size={17} />}</button></form>
      </section>
      <div className="chat-privacy">🔒 Your conversation is private and only visible to you and your coaching team.</div>
    </div></div>
  )
}
