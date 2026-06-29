/**
 * Personal display config. Real values live in `.env.local` (untracked); the
 * public repo ships with neutral defaults so nothing personal is committed.
 * Set `NEXT_PUBLIC_USER_NAME` / `NEXT_PUBLIC_WEATHER_LOCATION` to personalize.
 */
export const siteConfig = {
  /** Header greeting: "Bonjour {userName}". Empty → just "Bonjour". */
  userName: process.env.NEXT_PUBLIC_USER_NAME?.trim() ?? '',
  /** Fallback label for the weather chip before any data is available. */
  weatherLocation: process.env.NEXT_PUBLIC_WEATHER_LOCATION?.trim() || 'Météo',
} as const
