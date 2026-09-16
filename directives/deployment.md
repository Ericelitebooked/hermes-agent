# Deployment to Hostinger (Phase 6 & 7)

> **Lesson learned (2026-09-15):** the path in Phase 6 Step 3 below
> (`/docker/lead-app/app`) does NOT match the actual running deployment on
> this VPS — `cd` into it silently fails, and `git pull` / `docker compose
> restart` then ran against whatever was in the current directory instead
> (in one incident, this accidentally restarted the unrelated n8n/traefik
> stack in `~` — harmless, but not what was intended, and it masked that
> the real app was never updated). **Always verify the real container and
> working directory before pulling/restarting — see "Finding the Real App
> Directory" below — do not assume the path in this doc is current.**

## Prerequisites
- All API keys obtained and stored in local `.env`
- GitHub repository created (private)
- Code pushed to GitHub main branch
- Hermes agent container deployed to Hostinger

## Phase 5: Push Code to GitHub

1. Create `.gitignore` - ensures `.env` never reaches GitHub
2. Initialize git: `git init && git add . && git status` (verify .env NOT listed)
3. Commit: `git commit -m "Initial lead agent"`
4. Push: `git push -u origin main`

## Phase 6: Deploy to Server

### Step 1: Connect to Host Terminal
- Hostinger → VPS → Browser terminal
- Type `exit` once to reach the host (you want `root@srv1728628`, not `root@55a1...`)
- Verify: `docker ps` should list containers

### Step 2: Find Hermes Network
```bash
docker network ls | grep lead-agent-video
# Output: lead-agent-video_default = <YOUR_HERMES_NETWORK>
```

### Step 3: Clone Code from GitHub
```bash
mkdir -p /docker/lead-app && cd /docker/lead-app
git clone <YOUR_GITHUB_REPO_URL> app
mkdir -p app/src/audio  # Critical: empty folders don't come from Git
```

### Step 4: Create `.env` on Server
```bash
nano app/.env
# Paste same contents from your local .env
# Save: Ctrl+O → Enter
# Exit: Ctrl+X
# Verify: grep -o '^[A-Z_]*=' app/.env  (shows var names only, not secrets)
```

### Step 5: Create `docker-compose.yml`
```bash
nano docker-compose.yml
# Paste the file from repo
# Replace:
#   <YOUR_AGENT_DOMAIN> = e.g. lead-agent-video.srv1728628.hstgr.cloud (NO https://)
#   <YOUR_HERMES_NETWORK> = from Step 2, e.g. lead-agent-video_default
# Save and exit
```

### Step 6: Start Container
```bash
docker compose up -d
# First run: downloads node:22 (~30s), installs deps, starts app
```

### Step 7: Verify it's Running
```bash
docker compose logs --tail 10
# Look for: "running on port 3000"

curl -s https://<YOUR_AGENT_DOMAIN>/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Phase 7: Connect Typeform Webhook

1. Go to typeform.com → Your form → Connect → Webhooks → Add Webhook
2. URL: `https://<YOUR_AGENT_DOMAIN>/webhook/typeform`
3. Toggle ON
4. Test by submitting form

## Finding the Real App Directory (do this first, every time)

Don't trust the path in Phase 6 Step 3 — confirm it live before pulling/restarting:

```bash
docker ps
```

Look for the container named **`lead-agent-lead-agent-1`** (image
`lead-agent-lead-agent`) — this is the actual Hermes lead-qualifier app.

**Do not confuse it with `hermes-agent-qg9w-hermes-agent-1`** (image
`ghcr.io/hostinger/hvps-hermes-agent:latest`) — that's Hostinger's own
built-in VPS management agent, unrelated to this project despite the
similar name. Leave it alone.

Then get its real working directory:

```bash
docker inspect lead-agent-lead-agent-1 --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}'
```

`cd` into whatever that command prints, then run `git pull` and
`docker compose restart` from there — not from the Phase 6 Step 3 path.

**Confirmed working directory (2026-09-15): `/docker/lead-agent`**

**Critical: the live container was built from `docker-compose.prod.yml`, NOT the
default `docker-compose.yml`.** The `docker-compose.yml` file that sits in
`/docker/lead-agent` is a stale, never-filled-in template (placeholders like
`<YOUR_HERMES_NETWORK>` were never replaced, and it has an invalid nested
`networks.default.external/name` schema that fails validation on any bare
`docker compose` command). Confirmed via
`docker inspect lead-agent-lead-agent-1 --format '{{json .Config.Labels}}'`
→ `com.docker.compose.project.config_files: /docker/lead-agent/docker-compose.prod.yml`.

**Always pass `-f docker-compose.prod.yml` explicitly** — a bare
`docker compose restart` / `docker compose logs` will silently try to
validate the broken default file and fail before touching the real service.

So the actual, confirmed-working redeploy commands are:

```bash
cd /docker/lead-agent
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs lead-agent --tail 20
curl -s https://lead-agent.srv948101.hstgr.cloud/health
```

Live config confirmed on the running container (2026-09-15):
- Network: `root_web` (external)
- Service key: `lead-agent`
- Traefik: `rule=Host(\`lead-agent.srv948101.hstgr.cloud\`)`, `entrypoints=websecure`, `certresolver=myresolver`, port `3000`
- `.env` present at `/docker/lead-agent/.env`

## Critical Notes
- **Traefik**: Automatically routes /webhook, /voice, /audio, /health to your app
- **Container Restart**: `restart: unless-stopped` keeps app alive through crashes/reboots
- **Empty Audio Folder**: Must exist on server or the app crashes on first TTS call
- **Google Sheets Share**: Service account MUST be Editor on the sheet
- **Cal.com Slots**: Ensure 3-4 open slots on test day or booking fails
