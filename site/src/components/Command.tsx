import { useState } from 'react'

/** A shell command with a copy button. */
export default function Command({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {}
  }
  return (
    <button className="cmd" onClick={copy} aria-label={`Copy ${cmd}`}>
      <span className="cmd-prompt">$</span>
      <code>{cmd}</code>
      <span className="cmd-copy">{copied ? 'copied' : 'copy'}</span>
    </button>
  )
}
