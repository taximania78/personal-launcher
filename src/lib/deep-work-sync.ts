export type DeepWorkSyncDetail = { day: string; checked: boolean; source: 'banner' | 'grid' }

export const DEEP_WORK_SYNC_EVENT = 'deep-work-sync'

export function emitDeepWorkSync(detail: DeepWorkSyncDetail): void {
  window.dispatchEvent(new CustomEvent<DeepWorkSyncDetail>(DEEP_WORK_SYNC_EVENT, { detail }))
}

export function onDeepWorkSync(handler: (detail: DeepWorkSyncDetail) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<DeepWorkSyncDetail>).detail)
  window.addEventListener(DEEP_WORK_SYNC_EVENT, listener)
  return () => window.removeEventListener(DEEP_WORK_SYNC_EVENT, listener)
}
