# Deployment to Hostinger (Phase 6 & 7)

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

## Critical Notes
- **Traefik**: Automatically routes /webhook, /voice, /audio, /health to your app
- **Container Restart**: `restart: unless-stopped` keeps app alive through crashes/reboots
- **Empty Audio Folder**: Must exist on server or the app crashes on first TTS call
- **Google Sheets Share**: Service account MUST be Editor on the sheet
- **Cal.com Slots**: Ensure 3-4 open slots on test day or booking fails
