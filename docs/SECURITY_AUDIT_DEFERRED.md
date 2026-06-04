# Security audit — items requiring owner input

> Generated 2026-06-04. Fixes that did not change normal usability were applied in the same PR. Items below need a product or UX decision before implementation.

## Locking and game dynamics

| Item | Impact | Notes |
|------|--------|-------|
| **Per-group fixture kickoff not enforced on save** | Game fairness | Documented in [LOCKING.md](./LOCKING.md): users can still edit a group match after that match’s kickoff until the **first tournament** kickoff or an official result exists. Enforcing per-fixture kickoff would change when picks lock. |
| **Default join password** | Access control | `JOIN_PASSWORD` falls back to `MadSlags1` if unset. Production must set a strong env value; changing the default in code would lock out anyone using the documented default. |
| **1–6 character passwords** | Security vs ease | Appropriate for a friends pool; stronger rules would frustrate mobile users. |

## UI and client-side

| Item | Impact | Notes |
|------|--------|-------|
| **Admin page visible to all logged-in users** | UX / perceived security | `/admin` is reachable in the nav for any user; API returns 403. Hiding the route unless `is_admin` requires a server flag on login response (already sent) and UI change. |
| **`wcb_is_admin` in localStorage** | Mobile tampering | A user can set the flag in dev tools to see the Admin link; they cannot perform admin actions. Removing client-only gating needs UI work only. |
| **No server-side max on score inputs in UI** | Consistency | API now caps at 20; UI `clampScore` has no upper bound. Adding `max={20}` on inputs is a small UX tweak. |
| **Sessions in localStorage** | XSS / device theft | Bearer tokens persist 30 days; logout does not revoke server sessions. HttpOnly cookies or refresh tokens would change auth flow. |

## Infrastructure (not app-only fixes)

| Item | Impact | Notes |
|------|--------|-------|
| **Open CORS** | Cross-origin abuse | `cors()` with defaults; tighten for production origin only. |
| **No rate limiting** | Brute force join/login | Add middleware or reverse-proxy limits. |
| **Public leaderboard** | Privacy | `GET /api/leaderboard` is unauthenticated; confirm intentional. |
| **PWA / mobile hardening** | Mobile users | Deferred in [TODO.md](./TODO.md): installable PWA, optional cert pinning, etc. |

## Optional enhancements (P3)

- Playwright E2E for mobile viewports  
- Production CORS / HTTPS headers  
- OAuth instead of name + password  
