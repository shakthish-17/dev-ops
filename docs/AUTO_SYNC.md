# Opt-in VS Code to Render workflow

This project has a deliberately **opt-in** save watcher. It is disabled by default and never publishes until you explicitly start the publishing task. Its intended flow is:

```text
VS Code save -> 8-second debounce -> lint + tests -> safe Git commit -> push main
  -> GitHub Actions validation -> existing Render service deploy -> live website
```

The Render Blueprint uses `autoDeployTrigger: checksPass`. Render therefore waits for the GitHub checks on `main` to pass before deploying. The Jenkins deploy-hook parameter defaults to `false` to prevent a second deployment of the same commit.

## Use it safely

1. In VS Code, run **Tasks: Run Task** → **Auto-sync: validate current workspace**. This makes no Git changes.
2. Commit or stash existing changes in watched source paths. Unrelated pre-existing changes are fingerprinted, preserved, and never staged; changing one while the watcher runs blocks that publish cycle.
3. Use **Auto-sync: start (validate only)** while developing. Saves under `frontend/`, `backend/`, `database/`, and `test/` trigger validation after an 8-second quiet period. It never stages, commits, or pushes.
4. When you intentionally want save-to-production automation, run **Auto-sync: start publishing (explicit opt-in)**. This is the only task that enables commits and pushes.
5. Run **Auto-sync: stop** to stop the watcher. Its process ID and event state are stored in ignored `.auto-sync/`.

The debounce is configurable outside VS Code:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/auto-sync.ps1 -Publish -DebounceSeconds 15
```

## Safety controls

- Only `frontend/`, `backend/`, `database/`, `test/`, `package.json`, `package-lock.json`, `Dockerfile`, and `eslint.config.js` may be committed by the watcher.
- It requires watched source paths and the Git index to be clean at startup. Unrelated dirty paths are fingerprinted and never staged. It runs `npm run check` and stops that cycle on any failure.
- Before pushing, it fetches `origin/main` and refuses when the remote is ahead. It uses ordinary `git push origin main`; it never force-pushes, pulls, rebases, or resolves conflicts.
- Any changed path outside the allow-list—including `.env`, credentials, logs, Terraform state, reports, or generated files—blocks publishing. `.gitignore` also excludes those files and watcher state.
- Saving several files produces one cycle after the debounce interval. Files created by Git commits are outside the watched allow-list, avoiding feedback loops.
- The watcher validates and reports errors but remains running so that a corrected save can retry. No failed validation creates a commit.

## One-time hosted configuration

Keep the existing service, URL, MongoDB connection string, and Render environment variables. Do not create another service. In the existing service's **Settings** page, verify:

- Repository: `https://github.com/shakthish-17/dev-ops`
- Branch: `main`
- Auto-Deploy: **After CI Checks Pass**

The equivalent Blueprint configuration is committed in `render.yaml` as `autoDeployTrigger: checksPass`. The GitHub Actions workflow already runs lint, tests, dependency audit, and Terraform validation on every push to `main`.

Jenkins remains available as an additional CI pipeline, but `DEPLOY_TO_RENDER` defaults to `false`. If you deliberately use the Jenkins deploy hook instead, turn Render Auto-Deploy off before enabling that parameter; never enable both deployment paths simultaneously.

## Troubleshooting

- **Watcher will not start:** run `git status`; commit, stash, or discard staged changes and existing changes in watched source paths, then start again. Verify `.tools/git/cmd/git.exe` exists.
- **Validation fails:** run `npm run check` in the terminal and fix the reported lint/test failures. Nothing has been published.
- **Remote is ahead:** stop the watcher, pull or rebase manually, verify the result, return to a clean `main`, then start it again.
- **GitHub Actions fails:** open the failed `Quality checks` run, fix the reported check, and push a new validated commit. Render will not deploy the failed commit.
- **GitHub Actions passes but Render does not deploy:** verify the existing Render service is linked to `shakthish-17/dev-ops`, branch `main`, and Auto-Deploy is **After CI Checks Pass**.
- **Render stays unhealthy:** inspect the existing Render service's deploy logs and MongoDB network/connection configuration; confirm `MONGODB_URI` remains set. The deployed health endpoint is `/api/health`.
- **Stop fails:** use the VS Code stop task. If VS Code was closed abruptly, the next start removes a stale PID file automatically.

## Production verification procedure

Because publishing is opt-in, perform this only when you explicitly approve the production change:

1. Start **Auto-sync: start publishing (explicit opt-in)** on a clean `main` tree.
2. Make a harmless visible homepage-text change in `frontend/index.html` and save.
3. Confirm the watcher reports validation and a normal push, GitHub Actions passes, and the existing Render service deploys that commit.
4. Hard-refresh `https://campusflow-student-registry.onrender.com` and confirm the text. Optionally verify `https://campusflow-student-registry.onrender.com/api/health` reports `UP`.
5. Keep or revert the text change in a separate validated commit as appropriate.
