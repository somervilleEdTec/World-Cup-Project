# Post-deploy handover — final prep before inviting friends

**Status (2026-06-03):** Production site is **live at the login screen**.  
**Public URL:** https://worldcup.dosums.uk  
**Next agent role:** Finish [GO_LIVE.md](./GO_LIVE.md) checks, confirm admin/sync/ops, then owner shares link + join password.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Production branch:** `main`  
**Prompt for next session:** [AGENT_PROMPT_POST_DEPLOY.md](./AGENT_PROMPT_POST_DEPLOY.md)

---

## What was completed (deployment session)

| Item | Detail |
|------|--------|
| **Hosting** | Oracle Cloud Always Free — `VM.Standard.E2.1.Micro`, Ubuntu 22.04, UK-LONDON-1 **AD-3** |
| **App path** | `/opt/world-cup-boys` on instance `worldcup-boys` |
| **DNS / HTTPS** | Cloudflare zone **dosums.uk** — tunnel **`worldcup_boys`** |
| **Published route** | `worldcup.dosums.uk` → `http://localhost:8787` |
| **Processes** | `systemd`: `worldcup-server`, `worldcup-jobs`, `cloudflared` |
| **Database** | SQLite `data.db` (no `DATABASE_URL`) |
| **Pages (testing)** | https://world-cup-project.pages.dev — **keep** for UI/deploy tests; not for friend invites |
| **UI** | Owner reached **Log in / Register** at https://worldcup.dosums.uk |

**Runbook used:** [DEPLOY_ORACLE_CLOUDFLARE.md](./DEPLOY_ORACLE_CLOUDFLARE.md)

### Production vs testing URLs (owner decision)

| URL | Role |
|-----|------|
| **https://worldcup.dosums.uk** | **Production** — share with friends |
| **https://world-cup-project.pages.dev** | **Testing** — Cloudflare Pages (GitHub → `main` deploys) |

For Pages to talk to the live API, set **Pages → Settings → Environment variables** (Production):

- `VITE_API_BASE_URL` = `https://worldcup.dosums.uk`
- `NODE_VERSION` = `20`

Then **Retry deployment**. Without that, Pages may load but login/API will fail.

---

## Start here (next agent) — read in order

1. **This file** — remaining checklist  
2. [GO_LIVE.md](./GO_LIVE.md) — §5 two-user smoke test (mandatory)  
3. [DEPLOY_ORACLE_CLOUDFLARE.md](./DEPLOY_ORACLE_CLOUDFLARE.md) — SSH, systemd, tunnel troubleshooting  
4. [HANDOVER.md](./HANDOVER.md) — API and architecture  
5. [FINAL_PLAN.md](./FINAL_PLAN.md) — rules (**do not change** without owner)

---

## Remaining before sharing with friends

### Owner / agent on server (SSH)

```bash
ssh -i /path/to/ssh-key.key ubuntu@PUBLIC_IP
```

Find public IP in Oracle console if it changed.

| # | Task | How to verify |
|---|------|----------------|
| 1 | **Services running** | `sudo systemctl status worldcup-server worldcup-jobs cloudflared --no-pager` → all **active** |
| 2 | **App responds** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/` → **200** |
| 3 | **`.env` complete** | `FOOTBALL_DATA_TOKEN`, `JOIN_PASSWORD`, `NODE_ENV=production`, `VITE_API_BASE_URL=https://worldcup.dosums.uk` (no `#` on token line) |
| 4 | **Owner is admin** | After owner registers: `sudo sqlite3 /opt/world-cup-boys/data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'OwnerName';"` |
| 5 | **Mapping diagnostics** | Admin UI → **72/72** group mappings |
| 6 | **Full football-data sync** | Admin → run once; check server log for kickoffs + results |
| 7 | **GO_LIVE smoke test** | Two test accounts — [GO_LIVE.md](./GO_LIVE.md) §5 |
| 8 | **No Cloudflare Access gate** | Site must show **app** login, not Cloudflare email OTP — delete/bypass Access app if it returns |
| 9 | **Backup** | `sudo cp /opt/world-cup-boys/data.db /opt/world-cup-boys/data.db.backup-$(date +%F)` |
| 10 | **Optional: update code** | `cd /opt/world-cup-boys && git pull origin main && npm install && npm run build && sudo systemctl restart worldcup-server worldcup-jobs` |

### Owner shares with ~10 friends

- **URL:** https://worldcup.dosums.uk only (not `world-cup-project.pages.dev`)  
- **Join password:** value of `JOIN_PASSWORD` in server `.env` (not their personal login password)  
- Short instructions: Register → Tournament Results → Group Stage → save picks before first kickoff  

---

## Non-negotiables (unchanged)

- **Do not commit** `.env`, `data.db`, or tokens to git.  
- **Do not run** `seed:ko-environment` or `seed:before-final` on production.  
- **Do not change** [FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval.  
- **Do not** re-enable Cloudflare Access email login on `worldcup.dosums.uk` unless owner explicitly wants two logins.

---

## Common production issues (quick fix)

| Symptom | Cause | Fix |
|---------|--------|-----|
| **502 Bad gateway** | App not on :8787 | Fix `.env` token; `sudo systemctl restart worldcup-server`; `curl localhost:8787` |
| **Cloudflare Access email** | Zero Trust policy | Access → Applications → remove/bypass **World Cup Boys** |
| **Server crash loop** | `FOOTBALL_DATA_TOKEN` missing in `.env` | Uncomment/set token; restart `worldcup-server` |
| **`npm install` fails** | No `make` / low RAM | `sudo apt install -y build-essential`; add 2G swap (see DEPLOY_ORACLE_CLOUDFLARE) |
| **Tunnel INACTIVE** | No connector on VM | `sudo cloudflared service install …` from Zero Trust → Tunnels |

---

## Security follow-ups (owner)

- [ ] **Revoke** any GitHub PAT or tunnel token that was pasted in chat; create new ones if needed  
- [ ] Restrict SSH security list to owner IP when stable (port 22)  
- [ ] Keep Oracle VM and Cloudflare on **free** tiers; avoid paid shapes  

---

## Documentation index (launch)

| Doc | When |
|-----|------|
| [POST_DEPLOY_HANDOVER.md](./POST_DEPLOY_HANDOVER.md) | **This file** — site up, pre-invite |
| [AGENT_PROMPT_POST_DEPLOY.md](./AGENT_PROMPT_POST_DEPLOY.md) | Copy-paste next agent prompt |
| [DEPLOY_ORACLE_CLOUDFLARE.md](./DEPLOY_ORACLE_CLOUDFLARE.md) | Oracle + Cloudflare tunnel ops |
| [GO_LIVE.md](./GO_LIVE.md) | Smoke tests |
| [LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) | Full launch playbook (greenfield deploy) |
| [UI_HANDOVER.md](./UI_HANDOVER.md) | Log UI bugs §6 |

---

*Handoff after successful login screen at worldcup.dosums.uk — complete GO_LIVE before friend invites.*
