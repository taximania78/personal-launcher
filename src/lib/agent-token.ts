import { randomBytes, createHash } from 'node:crypto'

export function generateToken(): string {
  return 'plt_' + randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenPrefix(token: string): string {
  return token.slice(0, 10)
}
