// The only network code in Wildjury: a thin client for Otari's OpenAI-compatible gateway.
export const VERSION = '0.1.0'
export const DEFAULT_BASE = 'https://api.otari.ai/api/v1'

export class OtariError extends Error {
  constructor(status, code, message, retryAfter = null) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

function errorFrom(status, data, text, headers) {
  const raw = data?.error ?? data?.detail ?? data
  const code = (typeof raw === 'object' && (raw?.code || raw?.type)) || `http_${status}`
  const message =
    (typeof raw === 'string' && raw) ||
    (typeof raw === 'object' && raw?.message) ||
    text.slice(0, 300) ||
    `HTTP ${status}`
  return new OtariError(status, code, message, headers.get('retry-after'))
}

export function createClient({ key = process.env.OTARI_API_KEY, base = process.env.OTARI_BASE_URL || DEFAULT_BASE, timeoutMs = 180_000 } = {}) {
  if (!key) throw new OtariError(0, 'no_key', 'Set OTARI_API_KEY. Create a key at otari.ai → API keys.')
  const root = base.replace(/\/+$/, '')

  async function call(path, { method = 'GET', body, session } = {}) {
    const headers = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // Otari names the trace's harness after the first product token.
      'User-Agent': `wildjury/${VERSION}`,
    }
    // One id per juror groups each juror's requests into its own trace on Otari's Traces page.
    if (session) headers['Otari-Conversation-Id'] = session
    let res
    try {
      res = await fetch(root + path, { method, headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) })
    } catch (e) {
      throw new OtariError(0, e.name === 'TimeoutError' ? 'timeout' : 'network', e.name === 'TimeoutError' ? 'timed out' : e.message)
    }
    const text = await res.text()
    let data = null
    try {
      data = JSON.parse(text)
    } catch {}
    if (!res.ok) throw errorFrom(res.status, data, text, res.headers)
    if (!data) throw new OtariError(res.status, 'bad_json', 'gateway returned a non-JSON body')
    return data
  }

  return {
    models: async () => (await call('/models')).data ?? [],
    chat: (body, session) => call('/chat/completions', { method: 'POST', body, session }),
  }
}
