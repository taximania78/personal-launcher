import {
  icons, type LucideIcon,
  Server, Container, Cloud, Route, Workflow, BarChart3, ShieldCheck,
  LineChart, GitBranch, KeyRound, Home, FolderOpen,
} from 'lucide-react'

// Aliases map a name to a specific icon. Two jobs:
//  1. Homelab service names (proxmox, n8n, vault…) → a sensible icon.
//  2. Deprecated Lucide names that the DB seeds (BarChart3, LineChart, Home)
//     still exist as named exports but are NOT keys in the `icons` registry
//     (renamed to ChartColumn/ChartLine/House), so the registry fallback alone
//     would miss them.
// Keys are normalized (lowercase, alphanumerics only) via norm(), so a
// hyphenated alias ("shield-lock") and a bare word ("shield") both resolve.
// Anything NOT listed here falls through to the full Lucide registry, so any
// valid Lucide icon name (e.g. "Calendar", "Rss", "Tv") works without edits.
export const ALIASES: Record<string, LucideIcon> = {
  server: Server,
  proxmox: Server,
  container: Container,
  docker: Container,
  portainer: Container,
  cloud: Cloud,
  nextcloud: Cloud,
  route: Route,
  traefik: Route,
  workflow: Workflow,
  share: Workflow,
  n8n: Workflow,
  barchart3: BarChart3,
  chartdots: BarChart3,
  chartbar: BarChart3,
  chart: BarChart3,
  umami: BarChart3,
  shieldcheck: ShieldCheck,
  shield: ShieldCheck,
  authelia: ShieldCheck,
  linechart: LineChart,
  grafana: LineChart,
  gitbranch: GitBranch,
  git: GitBranch,
  gitea: GitBranch,
  keyround: KeyRound,
  key: KeyRound,
  vault: KeyRound,
  vaultwarden: KeyRound,
  home: Home,
  ha: Home,
  homeassistant: Home,
  folder: FolderOpen,
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// "line-chart" / "bar-chart-3" / "Calendar" -> "LineChart" / "BarChart3" / "Calendar"
const toPascal = (s: string) =>
  s
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')

export function TileIcon({ icon, size = 22 }: { icon: string, size?: number }) {
  // 1. Homelab alias / seeded name → 2. any icon in the Lucide registry.
  const LucideComp = ALIASES[norm(icon)] ?? icons[toPascal(icon) as keyof typeof icons]
  if (LucideComp) {
    return <LucideComp size={size} aria-hidden />
  }
  // Fallback: render the raw string (e.g. an emoji) as text.
  return <span aria-hidden style={{ fontSize: size }}>{icon}</span>
}
