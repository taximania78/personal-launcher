import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Defense-in-depth CSP (no-nonce variant, per Next.js CSP guide).
// 'unsafe-inline' is required because the App Router injects inline bootstrap
// scripts and the UI uses inline style attributes; 'unsafe-eval' is dev-only
// (React uses eval for error overlays). The main XSS vector (javascript: in
// user-set href/whoogle_url) is blocked at the input by isSafeHref(); this CSP
// is the second layer: default-src 'self' blocks fetch()-to-attacker
// exfiltration and frame-ancestors 'none' blocks clickjacking.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
