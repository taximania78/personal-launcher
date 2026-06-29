import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_READ: z.url(),
  N8N_TODO_WEBHOOK_URL: z.url(),
  N8N_TODO_WEBHOOK_TOKEN: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  UPLOAD_DIR: z.string().min(1).default('/app/data/uploads'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
  throw new Error(`Invalid environment:\n${issues}`)
}

export const env = parsed.data

export const STALE_THRESHOLDS = {
  meteo:         60 * 60,
  calendar:      30 * 60,
  applications:  60 * 60,
  services:      15 * 60,
  signals:       2 * 60 * 60,
} as const
