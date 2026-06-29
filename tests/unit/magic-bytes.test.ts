import { describe, it, expect } from 'vitest'
import { detectImageMime } from '@/lib/upload/magic-bytes'

describe('detectImageMime', () => {
  it('detects JPEG (FF D8 FF)', () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    expect(detectImageMime(buf)).toEqual({ mime: 'image/jpeg', ext: 'jpg' })
  })

  it('detects PNG (89 50 4E 47 0D 0A 1A 0A)', () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
    expect(detectImageMime(buf)).toEqual({ mime: 'image/png', ext: 'png' })
  })

  it('detects WebP (RIFF ???? WEBP)', () => {
    const buf = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
    ])
    expect(detectImageMime(buf)).toEqual({ mime: 'image/webp', ext: 'webp' })
  })

  it('rejects GIF (unsupported)', () => {
    const buf = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    expect(detectImageMime(buf)).toBeNull()
  })

  it('rejects empty buffer', () => {
    expect(detectImageMime(new Uint8Array([]))).toBeNull()
  })

  it('rejects too-short buffer', () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8]))).toBeNull()
  })

  it('rejects PDF', () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x00, 0x00, 0x00])
    expect(detectImageMime(buf)).toBeNull()
  })

  it('rejects RIFF without WEBP signature', () => {
    const buf = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
    ])
    expect(detectImageMime(buf)).toBeNull()
  })
})
