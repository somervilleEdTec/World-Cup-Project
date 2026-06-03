# Prompt for post-deploy agent — World Cup Boys

Copy everything below the line into a new Cursor agent session.

---

## Your role

**Final preparation** before the owner invites ~10 friends. The site is **already deployed** and shows the **login/register** screen.

**Live URL:** https://worldcup.dosums.uk  
**Stack:** Oracle Always Free VM (`/opt/world-cup-boys`) + Cloudflare Tunnel `worldcup_boys` + domain **dosums.uk**

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Production branch:** `main`

## Mandatory first step — read in order

1. **[docs/POST_DEPLOY_HANDOVER.md](./POST_DEPLOY_HANDOVER.md)** — remaining checklist  
2. **[docs/GO_LIVE.md](./GO_LIVE.md)** — two-user smoke test (§5)  
3. **[docs/DEPLOY_ORACLE_CLOUDFLARE.md](./DEPLOY_ORACLE_CLOUDFLARE.md)** — SSH, systemd, 502 fixes  
4. **[docs/HANDOVER.md](./HANDOVER.md)** — API and architecture  
5. **[docs/FINAL_PLAN.md](./FINAL_PLAN.md)** — rules (**do not change** without owner)

## Already done (do not redo)

- Oracle VM, Ubuntu 22.04, app cloned to `/opt/world-cup-boys`
- Tunnel route `worldcup.dosums.uk` → `localhost:8787`
- Owner can open site and see app login (not Cloudflare Access email gate)

## Your tasks

- [ ] Verify `worldcup-server`, `worldcup-jobs`, `cloudflared` active; `curl http://127.0.0.1:8787/` → 200  
- [ ] Confirm `.env` has **uncommented** `FOOTBALL_DATA_TOKEN`  
- [ ] Promote owner to admin if not done; Admin → **72/72** mappings; full football-data sync  
- [ ] Complete **GO_LIVE** §5 smoke test (two users)  
- [ ] Backup `data.db`; document join password for owner to share  
- [ ] Log issues in [UI_HANDOVER.md](./UI_HANDOVER.md) §6  

## Non-negotiables

- No test seeds on production (`seed:ko-environment`, `seed:before-final`)  
- Do not commit `.env` or tokens  
- Do not change [FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval  

## SSH (owner machine)

Owner connects with their Oracle private key — you may not have SSH access; provide commands for owner to run.

---

*End of post-deploy agent prompt.*
