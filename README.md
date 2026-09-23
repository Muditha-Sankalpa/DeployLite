# DeployLite

A mini CI/CD platform: push to GitHub, DeployLite clones the repo, runs tests, builds a Docker image, and deploys it — showing live status the whole way through.

```
Developer pushes code to GitHub
              |
        GitHub Webhook
              |
         DeployLite API
              |
      +---- Build Queue ----+
      |                     |
 Test Runner          Docker Builder
      |                     |
 Test Results          Docker Image
      +----------+----------+
                 |
              Deploy
                 |
        Deployment URL
```

## Stack

- **API + Worker**: Node.js, TypeScript, Express
- **Queue**: BullMQ (Redis)
- **Database**: PostgreSQL + Prisma
- **Builds/Deploys**: Docker Engine API (dockerode)
- **Frontend**: React + TypeScript (Vite)

## Project layout

```
apps/
  api/    Express API + BullMQ worker + Prisma schema
  web/    React dashboard
docker-compose.yml   Postgres + Redis for local dev
```

## Local setup

1. Start Docker Desktop, then bring up Postgres/Redis:
   ```bash
   npm run docker:up
   ```
2. Copy env vars and adjust if needed:
   ```bash
   cp .env.example apps/api/.env
   ```
3. Install dependencies (from repo root):
   ```bash
   npm install
   ```
4. Run the database migration:
   ```bash
   npm run prisma:migrate -w apps/api
   ```
5. Start the API, worker, and frontend (three terminals):
   ```bash
   npm run dev:api
   npm run dev:worker
   npm run dev:web
   ```
6. Register a repo:
   ```bash
   curl -X POST http://localhost:4000/repos -H "Content-Type: application/json" -d "{\"owner\":\"octocat\",\"name\":\"hello-world\"}"
   ```
7. Trigger a build without a real GitHub webhook (useful before wiring up ngrok/smee.io):
   ```bash
   npm run simulate:push -w apps/api -- octocat hello-world
   ```
8. Open the dashboard at http://localhost:5173 to watch the build/deploy progress and view logs.

## Real GitHub webhooks (via smee.io)

GitHub needs a public URL to deliver webhooks to, so during local dev we forward them from a [smee.io](https://smee.io) channel to `localhost`.

1. Get a channel: visit https://smee.io/new, copy the URL it gives you (`https://smee.io/<channel-id>`).
2. Set it as `SMEE_URL` in `apps/api/.env`.
3. Run the forwarder:
   ```bash
   npm run smee -w apps/api
   ```
4. In the target GitHub repo's Settings → Webhooks → Add webhook:
   - Payload URL: your smee channel URL (`https://smee.io/<channel-id>`)
   - Content type: `application/json`
   - Secret: same value as `GITHUB_WEBHOOK_SECRET`
   - Events: just the `push` event
5. Register the repo with DeployLite (`POST /repos`) using the same owner/name as the GitHub repo, then push a commit — the build should appear on the dashboard within a couple seconds.

In production, point the webhook directly at your deployed API instead of smee.io.

## Status

Phase 0 (core loop: webhook -> queue -> clone -> test -> Docker build -> deploy -> dashboard) is implemented. See project notes for the phased roadmap (log streaming, auth, retries/rollback, PR previews).
