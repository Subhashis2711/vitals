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

### Run a production migration

1. Review the new SQL in `packages/db/drizzle/` and make a Supabase database
   backup before applying it.
2. From a secure machine, set `DATABASE_URL` in the root `.env` to the hosted
   Supabase connection string. Do not commit this file.
3. Apply the migrations once:

   ```bash
   npm run db:migrate
   ```

4. Verify the application can read and write the changed data. Never run
   `supabase db reset` against production.

### Deploy Cloud Run

These commands build both images with Cloud Build, deploy the API first, then
deploy the web app. `NEXT_PUBLIC_*` values are embedded at web build time, so
use the production Supabase URL and anon key rather than local values.

```bash
export PROJECT_ID=oscas-dev-second-brain
export REGION=asia-south1
export REPOSITORY=vitals
export TAG=$(git rev-parse --short HEAD)
export API_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/vitals-api:$TAG"
export WEB_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/vitals-web:$TAG"
export NEXT_PUBLIC_API_URL=https://vitals-api-kww4rwnlqa-el.a.run.app
export NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PRODUCTION_ANON_KEY

gcloud builds submit \
  --project "$PROJECT_ID" \
  --config cloudbuild.yaml \
  --substitutions "_API_IMAGE=$API_IMAGE,_WEB_IMAGE=$WEB_IMAGE,_NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL,_NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,_NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  .

gcloud run deploy vitals-api \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$API_IMAGE"

gcloud run deploy vitals-web \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$WEB_IMAGE"
```

Cloud Run retains the existing API service configuration, including its secret
environment variables and `WEB_ORIGIN`, when deploying a new image. If either
service configuration changes, update it deliberately with `gcloud run
services update` and then verify Google OAuth redirect URLs and the API CORS
allowlist. Finish by checking `/health`, signing in, and creating data in a
non-production workspace.

## What's intentionally not built yet

- Vector/semantic search (schema has a placeholder `embedding` column on notes)
- Browser extension, YouTube ingestion, or AI template generation — `packages/ai` is scaffolded so these can be added later
- Deployment/hosting config (in progress)
