# Deploy on Oracle Cloud + Cloudflare (dosums.uk)

**$0 stack:** Oracle Always Free VM + Cloudflare Tunnel + domain on Cloudflare.  
**Production URL (this deployment):** https://worldcup.dosums.uk

See [POST_DEPLOY_HANDOVER.md](./POST_DEPLOY_HANDOVER.md) for what is already done and what remains before inviting friends.

---

## Architecture

```text
Friends → https://worldcup.dosums.uk (Cloudflare DNS + TLS)
       → cloudflared tunnel (worldcup_boys)
       → http://127.0.0.1:8787 (npm run server + dist/)
       → SQLite data.db
Background: npm run jobs (locks + football-data.org sync)
```

### Cloudflare Pages (testing only)

Keep **https://world-cup-project.pages.dev** for frontend/deploy experiments. **Do not** give this URL to friends for the tournament.

| | Production | Testing |
|---|------------|---------|
| **URL** | https://worldcup.dosums.uk | https://world-cup-project.pages.dev |
| **Serves** | Full app via tunnel + VM | Static SPA from GitHub `main` builds |
| **API** | Same host (`localhost:8787` on VM) | Must set Pages `VITE_API_BASE_URL=https://worldcup.dosums.uk` and redeploy |

Production does not depend on Pages when the tunnel serves the built SPA from `/opt/world-cup-boys/dist`.

---

## 1. Oracle VM (Always Free)

| Setting | Value used |
|---------|------------|
| Region | UK South (London) |
| AD | **AD-3** (required for E2.1.Micro in London) |
| Image | **Ubuntu 22.04** |
| Shape | **VM.Standard.E2.1.Micro** (Always Free-eligible) |
| VCN | **VCN wizard** — “VCN with internet connectivity” |
| Subnet | **public subnet-…** (not private) |
| Public IPv4 | **Yes** (for SSH) |
| SSH | Generate key pair — **download private key once** |

Open **ingress TCP 22** on the VCN security list for SSH.

---

## 2. SSH from Windows

```powershell
icacls C:\Users\tomso\Desktop\ssh-key-2026-06-02.key /inheritance:r
icacls C:\Users\tomso\Desktop\ssh-key-2026-06-02.key /grant:r "$($env:USERNAME):(R)"
ssh -i C:\Users\tomso\Desktop\ssh-key-2026-06-02.key ubuntu@PUBLIC_IP
```

---

## 3. Server bootstrap

### Swap (1 GB RAM — recommended before `npm install`)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Build tools

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 git curl ca-certificates sqlite3
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Clone app

```bash
sudo mkdir -p /opt/world-cup-boys
sudo chown ubuntu:ubuntu /opt/world-cup-boys
git clone https://github.com/somervilleEdTec/World-Cup-Project.git /opt/world-cup-boys
cd /opt/world-cup-boys
git checkout main
```

### `.env` (required — no leading `#`)

```bash
cp .env.example .env
nano .env
```

```env
NODE_ENV=production
FOOTBALL_DATA_TOKEN=your_football_data_org_token
JOIN_PASSWORD=your_shared_signup_password
VITE_API_BASE_URL=https://worldcup.dosums.uk
PORT=8787
```

**Production server exits without `FOOTBALL_DATA_TOKEN`** → 502 from Cloudflare if missing.

### Install and build

```bash
cd /opt/world-cup-boys
export JOBS=1
npm install --no-audit --no-fund
npm run db:purge
npm run migrate
npm run build
```

Or after `.env` is set: `sudo bash scripts/setup-oracle-ubuntu.sh` (installs Node, cloudflared, systemd).

---

## 4. systemd

```bash
# See POST_DEPLOY_HANDOVER or setup-oracle-ubuntu.sh for unit files
sudo systemctl enable worldcup-jobs worldcup-server
sudo systemctl start worldcup-jobs worldcup-server
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/
```

---

## 5. Cloudflare Tunnel

1. **Zero Trust** → **Networks** → **Tunnels** → create **`worldcup_boys`**
2. **Add a connector** → Ubuntu → **amd64** → run on VM:

```bash
sudo cloudflared service install TOKEN_FROM_DASHBOARD
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

3. **Published application routes** (not CIDR / private hostname routes):

| Field | Value |
|--------|--------|
| Subdomain | `worldcup` |
| Domain | `dosums.uk` |
| Type | HTTP |
| URL | `localhost:8787` |

4. **Disable Cloudflare Access** on this hostname if you see “Send login code” — use app login only.  
   **Access** → **Applications** → delete or **Allow Everyone** policy.

---

## 6. Admin

```bash
sudo sqlite3 /opt/world-cup-boys/data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```

---

## 7. Updates (pull new `main`)

```bash
cd /opt/world-cup-boys
git pull origin main
npm install
npm run build
sudo systemctl restart worldcup-jobs worldcup-server
```

---

## Troubleshooting

| Log | Command |
|-----|---------|
| App | `sudo journalctl -u worldcup-server -n 50 --no-pager` |
| Jobs | `sudo journalctl -u worldcup-jobs -n 30 --no-pager` |
| Tunnel | `sudo journalctl -u cloudflared -n 40 --no-pager` |

| Error | Fix |
|-------|-----|
| `FOOTBALL_DATA_TOKEN is required` | Set token in `.env`, restart server |
| `Unable to reach origin localhost:8787` | App down — fix server first |
| `not found: make` | `sudo apt install -y build-essential` |
| Public IPv4 greyed out | Use VCN wizard public subnet; or assign public IP on VNIC after create |

---

See also [DEPLOY.md](./DEPLOY.md) (generic), [GO_LIVE.md](./GO_LIVE.md), [LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md).
