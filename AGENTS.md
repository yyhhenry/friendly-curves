# AGENTS.md

Browser-based asymmetric encryption tool ("非对称加密小工具"). Encrypts/decrypts short text using Curve25519 + AES-256-GCM entirely in-browser — no backend, no accounts, no installation.

## Commands

- `bun run dev` — start Vite dev server with HMR
- `bun run build` — typecheck (`tsc -b`) then production build to `dist/`
- `bun run lint` — ESLint
- `bun run format` — Prettier (no semicolons, double quotes, LF line endings, Tailwind class sorting)
- `bun run typecheck` — typecheck only (`tsc --noEmit`)
- `bun run preview` — serve production build locally

No test framework is configured.

## Architecture

Single-page React 19 app built with Vite 7 + Tailwind CSS 4. No routing — the UI is two tabs in one component.

Key files:

- **`src/App.tsx`** — monolithic UI containing `SendTab` (encrypt for recipient), `ReceiveTab` (generate keypair, decrypt), and `CopyButton`. All application state lives here.
- **`src/lib/crypto.ts`** — all cryptographic operations: x25519 keypair generation via `@noble/curves`, ECDH + HKDF key derivation, AES-256-GCM encrypt/decrypt via Web Crypto API. Ciphertext format is base64 of `ephemeralPub(32) + iv(12) + ciphertext`.
- **`src/lib/utils.ts`** — single `cn()` helper (clsx + tailwind-merge).
- **`src/components/ui/`** — standard shadcn/ui components (generated, not hand-written). Use `components.json` for shadcn configuration (base-nova style, lucide icons).
- **`src/components/theme-provider.tsx`** — dark/light/system theme context.

Private key persisted to `localStorage` under `"friendly-curves-private-key"`.

## Code Style

- Prettier enforced: no semicolons, double quotes, 2-space indent, `es5` trailing commas, `lf` line endings.
- `@/` path alias maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).
- shadcn/ui components added via `bunx --bun shadcn@latest add <component>`.
