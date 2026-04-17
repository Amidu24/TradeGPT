@AGENTS.md

# TradeGPT

AI-powered binary options trading assistant built on the Deriv platform. Users chat in natural language (or voice) to check prices, query their account, and execute trades. Built as a hackathon demo — defaults to the user's **demo account** for safety.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router), React 19, TypeScript 5 strict |
| Styling | Tailwind CSS v4, custom keyframes in `app/globals.css` |
| AI | Anthropic Claude (`claude-4-5-sonnet`) via raw `fetch` — **not** the SDK client |
| Trading API | Deriv API V2 — WebSocket over `ws` (server) and native `WebSocket` (browser) |
| Markdown | `react-markdown` v10 for rendering Claude replies |
| Persistence | `httpOnly` cookies (auth) + `localStorage` (gamification only) — no database |

## Project layout

```
app/
  page.tsx                  Auth gate — renders LoginPage or TradingApp server-side
  layout.tsx                HTML shell, Geist font, metadata
  globals.css               Tailwind import + all keyframe animations
  api/
    auth/login/route.ts     OAuth2 PKCE — redirect to Deriv
    auth/callback/route.ts  OAuth2 code exchange, cookie set
    auth/logout/route.ts    Clear cookies, redirect to /
    chat/route.ts           Main chat: parse intent → dispatch Deriv call → format reply
    dashboard/route.ts      Balance, portfolio, equity curve (polled every 15 s)

components/
  TradingApp.tsx            Top-level authenticated shell, game state coordinator
  ChatInterface.tsx         Chat UI with voice input and markdown rendering
  Sidebar.tsx               Quick actions, daily quests, power cards
  MarketTicker.tsx          Live scrolling price bar (persistent browser WebSocket)
  PnLDashboard.tsx          Right panel: stats, equity curve, open positions, history
  AchievementToast.tsx      Slide-in achievement notification
  TradeResultEffect.tsx     Full-screen win/loss animation overlay

lib/
  ai.ts                     Claude intent parser, trade suggestion generator, formatters
  derivV2Client.ts          Server-side Deriv V2 WebSocket wrappers (callPublic / callAuth)
  derivV2Auth.ts            Deriv V2 REST helpers: OTP URL, accounts list
  derivV2Symbols.ts         V1↔V2 symbol map, isSyntheticV2() helper
  gameState.ts              XP/levels, achievements, quests, power cards (localStorage hook)
  deriv.ts                  Legacy V1 client — not used in current routes, do not delete
```

## Environment variables

`.env.example` is incomplete. All four variables below are required:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com
DERIV_V2_APP_ID=<your Deriv OAuth app/client ID>
DERIV_V2_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

Register a Deriv OAuth2 application at the Deriv Developer Hub to get `DERIV_V2_APP_ID`.

## Running locally

```bash
npm install
# create .env.local with the four variables above
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

## Auth flow

OAuth2 PKCE across three route handlers:

1. `/api/auth/login` — generates `codeVerifier`, derives SHA-256 `codeChallenge`, encodes the verifier **inside the `state` param** (not a cookie) so it survives the Deriv redirect. Sends `scope=trade` only.
2. `/api/auth/callback` — decodes `state` to recover verifier, exchanges code for token, calls `getAccounts()`, selects the demo account (falls back to first account), sets three `httpOnly` cookies: `deriv_access_token`, `deriv_account_id`, `deriv_account_type`.
3. `/api/auth/logout` — deletes all three cookies, redirects to `/`.

The auth gate lives entirely in `app/page.tsx` (server component reads cookies — no client redirect).

## AI integration (`lib/ai.ts`)

All Claude calls use raw `fetch` against `${ANTHROPIC_BASE_URL}/v1/messages`. The model is hardcoded to `claude-4-5-sonnet`. The SDK package is installed but the client wrapper is not used here.

**`parseIntentWithClaude(message)`** — called on every `/api/chat` POST. Returns a `TradeIntent` JSON object. Falls back to the local regex parser (`parseIntentLocally`) if Claude is unreachable. The `_via` field (`"claude"` | `"local"`) signals which path ran.

**`generateTradeSuggestion(symbol, price, history)`** — called when a price query returns ≥10 ticks. Returns 2-3 sentences of market commentary. Falls back to rule-based strings.

**`formatResponse(action, data)`** — pure function, no Claude call. Converts raw Deriv API response objects into Markdown strings for the chat UI.

**Never remove the local fallbacks.** The app must work without Claude.

## Deriv WebSocket clients

Two distinct tiers — do not mix them:

| | `lib/derivV2Client.ts` | `components/MarketTicker.tsx` |
|---|---|---|
| Runtime | Server (Node.js `ws` package) | Browser (native `WebSocket`) |
| Used by | All API routes | Live price ticker only |
| Auth | `callAuth` / `callAuthMulti` — fetches a fresh OTP URL first | Unauthenticated public subscription |

`callAuthMulti` opens one connection and sends multiple requests on it (shares one OTP). Use it when an API route needs several authenticated calls — it avoids creating a new connection per call.

## Gamification layer (`lib/gameState.ts`)

Entirely client-side. All state lives in `localStorage` under `tradegpt_game_v1`. Nothing is persisted server-side.

Cross-component wiring: `PnLDashboard` fires `window.dispatchEvent(new CustomEvent("tradeSettled", { detail }))` when it detects a newly settled trade. `TradingApp` listens for this event to update XP/quests and trigger `TradeResultEffect`.

## Key conventions

- All components under `components/` are `"use client"`. Server components live only in `app/`.
- `ChatInterface` is loaded with `dynamic(() => import(...), { ssr: false })` — browser Speech API must not run on the server.
- TypeScript path alias `@/*` maps to the repo root.
- Symbol versioning: `lib/derivV2Symbols.ts` maps V1 symbols (`R_100`) to V2 (`1HZ100V`). Use `isSyntheticV2()` to choose default trade durations (synthetics → minutes, real forex → days).
- Two-step trade flow: `propose_trade` action shows a proposal with cost/payout; user types `"confirm"` to trigger `buy_trade`.
