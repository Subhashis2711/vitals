# Vitals

A personal life-tracking app: notes, todos, projects, goals, habits, journal, learning, health, and money, all in one place. Google sign-in via Supabase Auth, with each person's data kept private.

## Stack

- **Monorepo**: npm workspaces
- **Backend**: Node.js + TypeScript + Fastify (`apps/api`)
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS v4 (`apps/web`)
- **Database**: Drizzle ORM against Postgres (`drizzle-orm/pg-core`) — either a local Supabase CLI stack or a hosted Supabase project, both via the same `DATABASE_URL`. See [Database](#database) below.
- **Auth**: Supabase Auth (Google OAuth). Every table is scoped by `user_id`; RLS is enabled on every table as defense-in-depth, but the real enforcement is application-level — see [Auth](#auth).
- **AI**: Gemini API (`@google/genai`), called only from `apps/api` via `packages/ai` — never from the frontend.

## Repo structure

```
vitals/
  apps/
    web/          # Next.js frontend
    api/          # Fastify backend
  packages/
    db/           # Drizzle schema, migrations, DB client, repositories
    ai/           # Gemini API client, prompt templates, pipeline logic
    shared/       # Shared TypeScript types + Zod schemas + global ID helpers
```

Workspace packages (`@vitals/shared`, `@vitals/db`, `@vitals/ai`) ship TypeScript source directly (no build step needed for dev) — `apps/api` runs them through `tsx`, and `apps/web` transpiles `@vitals/shared` via Next's `transpilePackages`.

## Database

`packages/db/src/schema.ts` is written once, in `drizzle-orm/pg-core`. `packages/db/src/client.ts` always connects to Postgres via `DATABASE_URL` — for local dev that's a local Supabase CLI stack (`supabase start`), for production a hosted Supabase project's connection string. Same code either way, no driver branching.

`apps/api` and `apps/web` never talk to Drizzle directly — they go through the repository functions in `packages/db/src/repositories/`, every one of which is scoped to the authenticated user's id.

The `notes.embedding` column is a `jsonb` placeholder for a future embedding vector — semantic search is not implemented yet.

## Auth

Google sign-in via Supabase Auth, using `@supabase/ssr` on the frontend (`apps/web/src/lib/supabase/`, `apps/web/src/middleware.ts`). The Fastify API verifies each request's bearer token against Supabase (`apps/api/src/plugins/auth.ts`) and every repository query is filtered by that user's id — see the `user_id` foreign key into `auth.users` on every table in `schema.ts`.

## Setup

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) for local dev (`supabase start` spins up a local Postgres + Auth stack in Docker)
- A Google Cloud OAuth Client (Web application) with `http://127.0.0.1:54321/auth/v1/callback` as an authorized redirect URI — configured under `[auth.external.google]` in `supabase/config.toml`
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier available; only needed for `/notes/capture` and `/markdown/from-text` — everything else works without one)

### 1. Install dependencies

```bash
npm install
```

### 2. Start local Supabase

```bash
supabase start
```

This prints your local `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` — you'll need them in the next step. (If another project's local Supabase stack is already running, stop it first — `supabase stop` in that project's directory — since the default ports collide.)

### 3. Configure environment variables

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in `GEMINI_API_KEY`, `DATABASE_URL` (`postgresql://postgres:postgres@127.0.0.1:54322/postgres` for local Supabase), `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, and — in `apps/web/.env.local` — `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, all from the `supabase start` output above. Also set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` so `supabase start` can enable the Google provider.

### 4. Run migrations

```bash
npm run db:migrate
```

To discard local test data and rebuild the local Supabase database from every
checked-in migration, use this instead:

```bash
supabase db reset
```

`supabase db reset` is for local development only. It deletes the local
database before replaying the migrations.

### 5. Run the app

```bash
npm run dev
```

Starts both the API (http://localhost:4000) and the web app (http://localhost:3000). Open http://localhost:3000 and sign in with Google.

## Production migrations and deployment

Production runs on Cloud Run in Google Cloud project `oscas-dev-second-brain`,
region `asia-south1`. The services are `vitals-api` and `vitals-web`; images
are stored in the `vitals` Artifact Registry repository. Supabase remains the
hosted database and authentication provider.

Prerequisites for anyone running these steps: the `gcloud` CLI installed and
authenticated (`gcloud auth login`) against an account with access to the
`oscas-dev-second-brain` project, and Docker installed locally (only needed to
inspect/pull images when troubleshooting — the build itself runs on Cloud
Build, not your machine).

### Step 1 — Run a production migration (only if `packages/db/drizzle/` changed)

Skip this step entirely if your change didn't add a new file under
`packages/db/drizzle/`.

1. Review the new SQL in `packages/db/drizzle/` and make a Supabase database
   backup before applying it (Supabase dashboard → Database → Backups, or
   `pg_dump`).
2. From a secure machine, create (or reuse) a root-level `.env.production`
   with `DATABASE_URL` set to the hosted Supabase connection string
   (Supabase dashboard → Project Settings → Database → Connection string).
   Keep this in a separate file from your local `.env` — don't overwrite
   `.env` itself, and never commit `.env.production` (it's gitignored).
3. Apply the migrations once, pointing `dotenv` at that file explicitly
   rather than using `npm run db:migrate` (which is hardcoded to `-e .env`,
   your local dev file):

   ```bash
   npx dotenv -e .env.production -- npm run migrate -w packages/db
   ```

4. Verify the application can read and write the changed data. Never run
   `supabase db reset` against production — that command drops and replays
   the entire database and is local-development-only.

### Step 2 — Gather the production config values

You need exactly three values, all safe to handle in a terminal (none of them
are the Supabase *service role* key — never put that one in a client build):

| Value | Where to find it |
|---|---|
| `NEXT_PUBLIC_API_URL` | `gcloud run services describe vitals-api --region asia-south1 --format="value(status.url)"` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API Keys → the `anon` / `publishable` key (safe to embed in a browser bundle by design — this is *not* the service role key) |

**These three go into the build command below as literal values, not left as
placeholders.** Every `NEXT_PUBLIC_*` variable is compiled directly into the
Next.js JavaScript bundle at `docker build` time (see `apps/web/Dockerfile`)
— Cloud Run's own env var settings have no effect on them, and a wrong or
placeholder value here won't fail the build, it'll just make every Supabase
Auth call in production fail at runtime with `AuthApiError: Invalid API key`,
which shows up as users bouncing back to `/login` right after a successful
Google sign-in.

### Step 3 — Build both images with Cloud Build

Building via `gcloud builds submit` (Google's build infra) rather than a
local `docker build` sidesteps a real failure mode: an image built locally on
an Apple Silicon (arm64) Mac without `--platform linux/amd64` won't boot on
Cloud Run's x86_64 runtime ("exec format error" in the Cloud Run logs).

```bash
export PROJECT_ID=oscas-dev-second-brain
export REGION=asia-south1
export REPOSITORY=vitals
export TAG=$(git rev-parse --short HEAD)
export API_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/vitals-api:$TAG"
export WEB_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/vitals-web:$TAG"

# Paste the three real values from Step 2 here — do not leave placeholders.
export NEXT_PUBLIC_API_URL=https://vitals-api-kww4rwnlqa-el.a.run.app
export NEXT_PUBLIC_SUPABASE_URL=https://ethrvscxpdpsabrprtql.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste the real anon key here>

gcloud builds submit \
  --project "$PROJECT_ID" \
  --config cloudbuild.yaml \
  --substitutions "_API_IMAGE=$API_IMAGE,_WEB_IMAGE=$WEB_IMAGE,_NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL,_NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,_NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  .
```

This can take a few minutes; `gcloud builds submit` streams logs and blocks
until both images finish (or fail). If your terminal or shell session has a
short command timeout, check on it separately instead of assuming it failed:

```bash
gcloud builds list --project "$PROJECT_ID" --limit 3
```

Before deploying, it's worth confirming the web image actually got real
values and not empty/placeholder ones — check the *length* of each baked-in
var rather than printing the anon key outright:

```bash
docker pull "$WEB_IMAGE"
docker inspect "$WEB_IMAGE" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep NEXT_PUBLIC
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` should be well over 100 characters (a JWT or
an `sb_publishable_...` key) — anything short (like the 24-character literal
string `YOUR_PRODUCTION_ANON_KEY`) means Step 2's value never made it into
the build command.

### Step 4 — Deploy both services

```bash
gcloud run deploy vitals-api \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$API_IMAGE"

gcloud run deploy vitals-web \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$WEB_IMAGE"
```

Cloud Run retains each service's existing configuration, including secret
environment variables and `WEB_ORIGIN`, when deploying a new image to it. If
either service's configuration needs to change, update it deliberately with
`gcloud run services update` and then re-verify the Google OAuth redirect
URLs and the API's CORS allowlist.

If only one of the two images actually changed (e.g. a fix that only touches
`apps/web`), it's fine to build and deploy just that one image — skip the
other Dockerfile's build step and the matching `gcloud run deploy` call.

### Step 5 — Verify

1. `curl -s -o /dev/null -w '%{http_code}\n' https://vitals-api-.../health` → expect `200`.
2. Open the web app, sign in with Google, and confirm you land in the app
   (not bounced back to `/login`).
3. Create a throwaway piece of data (e.g. a todo) to confirm the full
   frontend → API → database path works, then delete it.
4. Check for runtime errors in either service's logs:

   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="vitals-web"' --limit 20 --freshness=10m
   ```

## What's intentionally not built yet

- Vector/semantic search (schema has a placeholder `embedding` column on notes)
- Browser extension, YouTube ingestion, or AI template generation — `packages/ai` is scaffolded so these can be added later
- Deployment/hosting config (in progress)
