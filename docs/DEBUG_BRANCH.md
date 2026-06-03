# Debug branch rules

**Last updated:** 2026-06-03

The **`Debug`** branch is for development on **your PC only**. It must **never** update the live website.

---

## Enforced rules

| Rule | How it is enforced |
|------|----------------------|
| No live deploy from Debug | GitHub Actions **deploy-main.yml** triggers only on **`main`** |
| No deploy script on Debug | `scripts/deploy-production.sh` exits if current branch is not `main` |
| No production SSH from Debug pushes | No workflow runs when you `git push origin Debug` |
| Test locally | Use `npm test`, `npm run build`, `.\scripts\Test-LocalSite.ps1` on Windows |

---

## Your daily workflow (PC)

```powershell
git checkout Debug
git pull origin Debug
# edit…
npm test
npm run build
.\scripts\Test-LocalSite.ps1 -Mode Serve    # http://localhost:8787
git push origin Debug                       # does NOT touch live site
```

Optional seeds (Debug only):

```powershell
$env:ALLOW_KO_SEED = "1"
npm run seed:complete-teams
```

---

## When ready for the live site

```bash
git checkout main
git pull origin main
git merge Debug
npm test && npm run build
git push origin main
```

That push to **`main`** runs **Deploy main (production)** in GitHub Actions and updates the live server (after [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md) secrets are configured).

**Never** run `deploy-production.sh` on the server while checked out on `Debug`.

---

## Related

- [BRANCHING.md](./BRANCHING.md) — two-branch workflow  
- [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md) — live deploy setup (`main` only)
