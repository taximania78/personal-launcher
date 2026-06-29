import { env } from './env'

export type TodoAction = 'created' | 'updated' | 'toggled' | 'deleted'

export type TodoPayload = {
  id: number
  text: string
  done: boolean
  is_focus: boolean
  position: number
}

export function pushTodoSync(action: TodoAction, todo: TodoPayload): void {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), 1000)
  fetch(env.N8N_TODO_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Token': env.N8N_TODO_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({ action, todo }),
    signal: ctrl.signal,
  }).catch(err => {
    console.warn('[n8n] todo sync push failed:', (err as Error).message)
  })
}
