import { useState, type FormEvent } from 'react'
import { ExternalLink } from 'lucide-react'
import { checkKey, YouTubeError } from '../data/youtube'
import { actions } from '../store'
import { useSync } from '../data/sync'

/** Walks the listener through getting a free YouTube Data API key, then checks it before saving. */
export function YouTubeSetup({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact)
  const signInAvailable = useSync().configured
  const [key, setKey] = useState('')
  const [state, setState] = useState<{ kind: 'idle' | 'checking' | 'error'; msg?: string }>({ kind: 'idle' })

  const connect = async (raw: string) => {
    const k = raw.trim()
    if (!k) return
    setState({ kind: 'checking' })
    try {
      await checkKey(k)
      actions.set('key', k)
    } catch (err) {
      setState({ kind: 'error', msg: err instanceof YouTubeError ? err.message : "Couldn't check the key. Try again." })
    }
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    connect(key)
  }
  // Keys look like "AIza" + 35 characters: when one is pasted, connect straight away.
  const looksLikeKey = (v: string) => /^AIza[0-9A-Za-z_-]{35}$/.test(v.trim())

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
      <h2 className="yt-setup-title">Connect YouTube once to get every song</h2>
      <p>
        Aether finds songs through YouTube, which asks for a free key. It takes about two minutes with your Google account, and you only do it once.
      </p>
      <ol className="yt-steps">
        <li>
          <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">
            Open this YouTube page <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
          </a>{' '}
          and press <strong>Enable</strong>. If Google asks you to agree to terms or create a project, say yes; any project name works.
        </li>
        <li>
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
            Open this keys page <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
          </a>
          , press <strong>Create credentials</strong>, choose <strong>API key</strong>, and copy the key it shows.
        </li>
        <li>Paste it here. Aether connects as soon as you paste.</li>
      </ol>
      <form className="new-form" onSubmit={save}>
        <input
          value={key}
          onChange={(e) => {
            setKey(e.target.value)
            if (state.kind === 'error') setState({ kind: 'idle' })
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData('text')
            if (looksLikeKey(v)) {
              e.preventDefault()
              setKey(v.trim())
              connect(v)
            }
          }}
          placeholder="Paste your key here"
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
      <p className="yt-fine">
        A free key covers about 100 searches a day; playing songs doesn't use it.{signInAvailable ? ' Signed in, your key follows you to every device.' : ''}
      </p>
    </div>
  )
}
