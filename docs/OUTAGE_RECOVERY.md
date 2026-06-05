# Outage recovery — World Cup Boys (live)

**Last updated:** 2026-06-05  
**Live URL:** https://worldcup.dosums.uk

Use this when the public site is down, deploy verify fails with **HTTP 530**, or the error body shows **`error code: 1033`**.

Normal releases do **not** require SSH — see [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md). This doc is for **incidents** and **agent/owner recovery**.

---

## How public traffic reaches the app

Oracle Cloud **blocks inbound** ports from the internet (including `:443`). The live site does **not** rely on the VM’s public IP accepting HTTPS directly.

```text
Browser → Cloudflare (DNS proxy) → Cloudflare Tunnel (cloudflared, outbound from VM)
                                              ↓
                                    Node :8787 (worldcup.service)
                                              ↑
                              optional nginx on VM (local reverse proxy)
```

| Component | Unit / script | If it fails |
|-------------|---------------|-------------|
| **Cloudflare Tunnel** | `cloudflared.service` | Public **530** + **1033** — most common outage |
| **App (API + SPA)** | `worldcup.service` | Tunnel up but 502/503 or bad health JSON |
| **Background jobs** | `worldcup-jobs.service` | Site up; locks/sync may stall |
| **nginx (optional)** | `nginx.service` | Usually **no public impact** when tunnel points to `:8787` |

**Do not assume** “530 = Node crashed”. During the 2026-06-05 outage, Node was healthy on `http://127.0.0.1:8787/api/health` while **`cloudflared` was down**.

---

## Fast recovery (try in this order)

### 1. Re-run deploy from GitHub (no SSH)

**Actions → Deploy main (production) → Run workflow** (branch **`main`**).

Each deploy runs `scripts/restart-production-services.sh`, which now:

1. Restarts `worldcup` + `worldcup-jobs`
2. Ensures nginx (`scripts/ensure-production-nginx.sh`)
3. Restarts Cloudflare Tunnel (`scripts/ensure-production-cloudflared.sh`)

Wait for **Verify live site** to return HTTP 200. Allow up to ~30 minutes if SSH is flaky (pull timer may still deploy).

### 2. One SSH command (owner / emergency)

From Windows PowerShell:

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237 "cd /home/ubuntu/World-Cup-Project && git pull origin main && bash scripts/restart-production-services.sh"
```

Then verify:

```powershell
curl https://worldcup.dosums.uk/api/health
```

Expected: `{"ok":true,"commit":"<sha-on-main>"}`

### 3. Diagnose on the VM

```bash
cd /home/ubuntu/World-Cup-Project
bash scripts/diagnose-live-routing.sh
```

| Local check | Healthy | Unhealthy → action |
|-------------|---------|-------------------|
| `curl -s http://127.0.0.1:8787/api/health` | `ok:true` | `bash scripts/restart-production-services.sh`; `journalctl -u worldcup -n 50` |
| `systemctl is-active cloudflared` | `active` | `sudo systemctl restart cloudflared`; `journalctl -u cloudflared -n 50` |
| `systemctl is-active worldcup` | `active` | Same as Node health row |
| Public URL from VM | 200 + matching commit | Tunnel or Cloudflare dashboard issue |

### 4. Tunnel-only restart (fastest when Node is healthy)

```bash
sudo systemctl restart cloudflared
curl -s https://worldcup.dosums.uk/api/health
```

---

## Interpreting Cloudflare errors

| Symptom | Likely cause | First fix |
|---------|--------------|-----------|
| **530** + **1033** in body | `cloudflared` not connected | Restart tunnel (above) |
| **530** / **502** / **503**, no 1033 | Origin unreachable via DNS A record path | `restart-production-services.sh` (nginx + Node) |
| Public 530, local `:8787` OK | Tunnel down (typical on this VM) | `sudo systemctl restart cloudflared` |
| Public 200 but old UI | Stale static root or CDN cache | `diagnose-live-routing.sh`; ensure nginx proxies to `:8787` |
| Public 200 but wrong `commit` | Deploy incomplete | Re-run **Deploy main** or `bash scripts/deploy-production.sh` on VM |

---

## GitHub Actions — reading a failed deploy

| Failed step | Meaning | What to do |
|-------------|---------|------------|
| **Test and build** | Code/test failure on `main` | Fix tests locally on `Debug`, merge, push |
| **Deploy over SSH** | Could not finish on VM | Check log for `npm ci`, migrate, or service errors; pull timer may still deploy in ~3 min |
| **Verify live site** | Public `/api/health` not OK for 30 min | Use **Fast recovery** above — often tunnel, not app code |

**Misleading success:** SSH log may show `DEPLOY_OK` and local health `ok:true` while verify still fails — that usually means **cloudflared** was down after Node restarted fine.

Look for these lines in the **Deploy over SSH** log:

```text
OK: local health {"ok":true,...}
cloudflared: active
DEPLOY_OK commit=...
```

If `cloudflared` is missing or inactive, fix tunnel before chasing app bugs.

---

## Workflow for agents implementing updates

### Before merging to `main`

1. Work on **`Debug`** only; push and wait for **CI Debug** green.
2. Run `npm test` locally when changing server, deploy, or auth code.
3. **Do not** change production-only scripts (`deploy-production.sh`, `restart-production-services.sh`, tunnel/nginx ensure) without understanding [DATA_PROTECTION.md](./DATA_PROTECTION.md).
4. Get **explicit user confirmation** before pushing to **`main`**.

### After pushing to `main`

1. Open **Actions → Deploy main (production)**.
2. Confirm **Verify live site** is green.
3. Run `curl https://worldcup.dosums.uk/api/health` and check `commit` matches the merge SHA.
4. If verify fails, follow **Fast recovery** — do not ask the owner to SSH until GitHub re-run or pull timer (~3 min) has been tried.

### What deploy must never break

- **`cloudflared.service`** — must stay enabled; deploy restarts it deliberately.
- **Prediction data** — migrate/backup guards in [DATA_PROTECTION.md](./DATA_PROTECTION.md).
- **Passwordless deploy sudoers** — see `deploy/sudoers/worldcup-deploy` (no env vars on `sudo apt-get`).

---

## Prevention (already in repo)

These run on every successful `deploy-production.sh`:

| Script | Purpose |
|--------|---------|
| `scripts/restart-production-services.sh` | Node units + nginx + cloudflared |
| `scripts/ensure-production-nginx.sh` | Install/configure nginx if missing |
| `scripts/ensure-production-cloudflared.sh` | Restart `cloudflared.service` |
| `scripts/verify-production-deploy.sh` | Fail deploy if Node, nginx, or tunnel checks fail |

Ensure on the VM (one-time, survives rebuilds if repeated):

```bash
bash scripts/ensure-poll-deploy-timer.sh   # pull deploy every 3 min
bash scripts/ensure-deploy-sudoers.sh      # GitHub Actions passwordless sudo
sudo systemctl enable cloudflared          # tunnel starts on reboot
sudo systemctl enable worldcup worldcup-jobs nginx
```

---

## Automated monitoring (no user input)

Two layers recover outages without manual SSH:

### 1. On-VM monitor (primary — ~4 min to recover)

`worldcup-monitor.timer` runs **`scripts/monitor-live-site.sh` every 2 minutes**:

1. `curl https://worldcup.dosums.uk/api/health`
2. After **2 consecutive failures**, run **`scripts/recover-live-connectivity.sh`** (restart `cloudflared` first; full service restart if needed)
3. **15-minute cooldown** between recovery attempts to avoid restart loops

Installed automatically on each deploy (`ensure-monitor-timer.sh`). One-time on existing VM:

```bash
cd /home/ubuntu/World-Cup-Project
git pull origin main
bash scripts/ensure-monitor-timer.sh
```

**Logs:** `journalctl -u worldcup-monitor.service -n 50` (after a failed check triggers recovery)

### 2. GitHub Actions monitor (backup — every 5 min)

Workflow **[monitor-production.yml](../.github/workflows/monitor-production.yml)**:

- Cron: every **5 minutes**
- If public health fails → SSH → `recover-live-connectivity.sh`
- Manual run: **Actions → Monitor production (auto-recover) → Run workflow**

Uses the same deploy secrets as **Deploy main**. Does not replace the VM timer (faster, works if GitHub SSH is blocked intermittently).

### Optional: external alerting

For email/Slack when automation fails, add a free **UptimeRobot** or **Better Stack** check on `https://worldcup.dosums.uk/api/health` (alert only — recovery is already automated on the VM).

---

## Related

- [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md) — day-to-day releases  
- [PRODUCTION.md](./PRODUCTION.md) — VM, `.env`, systemd  
- [DATA_PROTECTION.md](./DATA_PROTECTION.md) — never destroy predictions on deploy
