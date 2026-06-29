/**
 * Safe-href validation for user-controlled URL fields (tile `href`,
 * `whoogle_url`). These values flow into an anchor `href` and into
 * `window.location.href`, so a `javascript:` / `data:` / `vbscript:` scheme
 * would execute script in the app origin (stored XSS).
 *
 * Policy: allow only http(s) absolute URLs, scheme-less relative paths
 * (`/foo`, `#`), and the empty string (means "unset"). Reject anything that
 * carries a non-http(s) scheme.
 *
 * Bypass note: browsers strip leading/embedded control chars and whitespace
 * before parsing the scheme, so `java\tscript:` and `\njavascript:` are live
 * XSS vectors. We strip the same chars (\x00-\x20) before scheme detection to
 * match that behavior.
 */
export function isSafeHref(value: string): boolean {
  const stripped = value.replace(/[\x00-\x20]/g, '')
  const m = stripped.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/)
  if (!m) return true // no scheme → relative path / fragment / empty: same-origin safe
  const scheme = m[1].toLowerCase()
  return scheme === 'http' || scheme === 'https'
}

export const SAFE_HREF_MESSAGE = 'must be an http(s) URL or a relative path'
