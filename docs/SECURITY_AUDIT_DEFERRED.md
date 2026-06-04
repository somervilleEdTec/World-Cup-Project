# Security audit — items requiring owner input

> Generated 2026-06-04. Fixes that did not change normal usability were applied in the same PR. Items below need a product or UX decision before implementation.

## Locking and game dynamics

| Item | Impact | Notes |
|------|--------|-------|
| **Per-group fixture kickoff not enforced on save** | Game fairness | Documented in [LOCKING.md](./LOCKING.md): users can still edit a group match after that match’s kickoff until the **first tournament** kickoff or an official result exists. Enforcing per-fixture kickoff would change when picks lock. |
| **Player password length** | Security vs ease | Up to 30 characters after first login; organiser sets initial passwords via **Admin → Players**. |

## UI and client-side

| Item | Impact | Notes |
|------|--------|-------|
| ~~Admin nav for non-admins~~ | — | **Resolved:** Admin link and routes only when `/api/auth/me` reports `isAdmin`. |
| **No server-side max on score inputs in UI** | Consistency | API now caps at 20; UI `clampScore` has no upper bound. Adding `max={20}` on inputs is a small UX tweak. |
| **Sessions in localStorage** | XSS / device theft | Bearer tokens persist 90 days; logout does not revoke server sessions. HttpOnly cookies or refresh tokens would change auth flow. |

## Infrastructure (not app-only fixes)

| Item | Impact | Notes |
|------|--------|-------|
| **Open CORS** | Cross-origin abuse | `cors()` with defaults; tighten for production origin only. |
| **No rate limiting** | Brute force login | Add middleware or reverse-proxy limits (nginx snippet in `deploy/nginx/`). |
| **Public leaderboard** | Privacy | `GET /api/leaderboard` is unauthenticated; confirm intentional. |
| **PWA / mobile hardening** | Mobile users | Deferred in [TODO.md](./TODO.md): installable PWA, optional cert pinning, etc. |

## Optional enhancements (P3)

- Playwright E2E for mobile viewports  
- Production CORS / HTTPS headers  
- OAuth instead of name + password  
