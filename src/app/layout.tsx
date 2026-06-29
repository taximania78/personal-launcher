import './globals.css'
import type { Metadata } from 'next'
import { Geist, Instrument_Serif } from 'next/font/google'
import { getAppAppearance } from '@/lib/queries/appearance'

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  title: 'Homepage',
  description: 'Personal launcher + cockpit',
}

// Le fond et le contenu dépendent de la DB : on rend à chaque requête.
// Sans ça, `next build` (DB absente) fige un HTML sans background ni tuiles.
export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let bgUrl: string | null = null
  let dimPct = 35
  try {
    const appearance = await Promise.race([
      getAppAppearance(),
      new Promise<null>((r) => setTimeout(() => r(null), 500)),
    ])
    if (appearance?.background_image_path) {
      bgUrl = `/api/bg/current?v=${appearance.updated_at.getTime()}`
      dimPct = appearance.background_dim_pct
    }
  } catch { /* fallback to solid */ }

  const styleVars: React.CSSProperties = {
    ['--bg-url' as string]: bgUrl ? `url(${bgUrl})` : 'none',
    ['--bg-dim' as string]: (dimPct / 100).toString(),
  }

  return (
    <html
      lang="fr"
      className={`${geist.variable} ${instrumentSerif.variable}`}
      data-has-bg={bgUrl ? 'true' : 'false'}
      style={styleVars}
    >
      <body>
        <div className="max-w-5xl mx-auto px-4 py-4 relative">{children}</div>
      </body>
    </html>
  )
}
