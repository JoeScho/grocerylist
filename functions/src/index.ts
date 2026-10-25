import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { extractRecipe } from './extract.js'

setGlobalOptions({ region: 'europe-west2', maxInstances: 3 })

const MAX_BYTES = 4 * 1024 * 1024
const MAX_REDIRECTS = 5
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

function isPrivate(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v.startsWith('::ffff:')) return isPrivate(v.slice(7))
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

// Stops the function being used to reach internal Google Cloud endpoints.
async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new HttpsError('invalid-argument', 'Only web links are supported.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new HttpsError('invalid-argument', 'That address is not allowed.')
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (addrs.length === 0) throw new HttpsError('not-found', 'Could not find that website.')
  if (addrs.some(a => isPrivate(a.address))) throw new HttpsError('invalid-argument', 'That address is not allowed.')
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

async function fetchPage(start: string): Promise<{ html: string; url: string }> {
  let url = new URL(start)
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublic(url)
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-GB,en;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url)
      continue
    }
    if (!res.ok) throw new HttpsError('unavailable', `The website replied with an error (${res.status}).`)
    return { html: await readCapped(res), url: url.toString() }
  }
  throw new HttpsError('unavailable', 'Too many redirects.')
}

export const importRecipe = onCall({ timeoutSeconds: 30, memory: '256MiB' }, async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.')
  const raw = typeof req.data?.url === 'string' ? req.data.url.trim() : ''
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new HttpsError('invalid-argument', 'That does not look like a link.')
  }
  if (/(^|\.)instagram\.com$/.test(url.hostname)) {
    throw new HttpsError('failed-precondition', 'Instagram blocks reading posts. Paste the caption text instead.')
  }
  try {
    const page = await fetchPage(url.toString())
    return extractRecipe(page.html, page.url)
  } catch (err) {
    if (err instanceof HttpsError) throw err
    throw new HttpsError('unavailable', 'Could not load that page.')
  }
})
