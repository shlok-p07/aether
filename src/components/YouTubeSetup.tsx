import { useState, type FormEvent } from 'react'
import { ExternalLink } from 'lucide-react'
import { checkKey, YouTubeError } from '../data/youtube'
import { actions } from '../store'

/** Walks the listener through getting a free YouTube Data API key, then checks it before saving. */
export function YouTubeSetup({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact)
  const [key, setKey] = useState('')
  const [state, setState] = useState<{ kind: 'idle' | 'checking' | 'error'; msg?: string }>({ kind: 'idle' })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const k = key.trim()
    if (!k) return
    setState({ kind: 'checking' })
    try {
      await checkKey(k)
      actions.set('key', k)
    } catch (err) {
      setState({ kind: 'error', msg: err instanceof YouTubeError ? err.message : "Couldn't check the key. Try again." })
    }
  }

  if (!open) {
    return (
      <div className="yt-setup is-compact">
        <p>Connect YouTube to search and play official songs from any artist.</p>
        <button className="pill pill-accent" onClick={() => setOpen(true)}>
          Connect YouTube
        </button>
      </div>
    )
  }

  return (
    <div className="yt-setup">
      <h2 className="yt-setup-title">Connect YouTube to get every song</h2>
      <p>
        Aether plays official songs from YouTube. To search them it needs a free YouTube API key. Getting one takes about two minutes, and it
        stays only in this browser.
      </p>
      <ol className="yt-steps">
        <li>
          Open{' '}
          <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">
            YouTube Data API v3 <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
          </a>{' '}
          in Google Cloud (create a free project if asked), then press <strong>Enable</strong>.
        </li>
        <li>
          Go to{' '}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
            Credentials <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
          </a>
          , choose <strong>Create credentials → API key</strong>, and copy it.
        </li>
        <li>Paste it below.</li>
      </ol>
      <form className="new-form" onSubmit={save}>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your API key"
          aria-label="YouTube API key"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="pill pill-accent" type="submit" disabled={state.kind === 'checking' || !key.trim()}>
          {state.kind === 'checking' ? 'Checking…' : 'Connect'}
        </button>
      </form>
      {state.kind === 'error' && (
        <p className="yt-error" role="alert">
          {state.msg}
        </p>
      )}
      <p className="yt-fine">A free key covers about 100 searches a day. Home, trending, artist pages and playback barely use it.</p>
    </div>
  )
}
