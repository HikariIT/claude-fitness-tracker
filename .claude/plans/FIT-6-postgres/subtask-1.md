# 1. Postgres service in compose files and env files
**Decisions:** D2, D3

Goal: start a healthy PostgreSQL 17 container next to the `web` service, in dev and prod, using default credentials. No app code in this subtask.

Steps:
1. Create `.env.example` (committed; `.gitignore` already has `.env*` + `!.env.example`) (D3):
   ```dotenv
   # Copy to .env.local (dev, host) and .env.production (prod, compose).
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=fitness_tracker
   # Host-side URL (npm scripts run on your machine). Inside compose the host is "db".
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/fitness_tracker
   ```
2. Create the git-ignored local files (they do not exist yet; do not commit them):
   - `.env.local`: exact copy of `.env.example`.
   - `.env.production`: same, but `DATABASE_URL=postgres://postgres:postgres@db:5432/fitness_tracker` (the prod `web` container reaches Postgres by service name).
3. `docker-compose.dev.yml` (D2). Final content:
   ```yaml
   services:
     web:
       image: node:24-slim
       working_dir: /app
       command: sh -c "npm install && npm run dev"
       ports:
         - "3000:3000"
       environment:
         # Overrides .env.local (localhost) because inside compose the DB host is "db".
         DATABASE_URL: postgres://postgres:postgres@db:5432/fitness_tracker
       volumes:
         - .:/app
         - node_modules:/app/node_modules
       depends_on:
         db:
           condition: service_healthy
     db:
       image: postgres:17
       env_file:
         - .env.local
       ports:
         - "5432:5432"
       volumes:
         - pgdata_dev:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
         interval: 5s
         timeout: 5s
         retries: 10
   volumes:
     node_modules:
     pgdata_dev:
   ```
4. `docker-compose.yml` (prod) (D2): keep `web` as is, add `depends_on: db: condition: service_healthy` to it, and add a `db` service identical to the dev one except: `env_file: - .env.production`, **no `ports`**, volume `pgdata:/var/lib/postgresql/data`. Add a top-level `volumes: pgdata:`. Also add `restart: unless-stopped` to `db`.
5. Do not touch `Dockerfile` or `.dockerignore` (env files are read by compose at runtime, not baked into the image).
6. In `README.md`, replace the "Getting Started" section body with short setup steps: `cp .env.example .env.local` (and `.env.production` with host `db` for prod), then `docker compose -f docker-compose.dev.yml up` for dev. Keep the rest of the README.

**Files:**
- Create: `.env.example`: documented default credentials and `DATABASE_URL`
- Create (git-ignored, not committed): `.env.local`, `.env.production`
- Modify: `docker-compose.dev.yml`: `db` service, port 5432, healthcheck, `web` depends_on + `DATABASE_URL` override
- Modify: `docker-compose.yml`: `db` service without published port, `web` depends_on
- Modify: `README.md`: "Getting Started" setup steps

**Read:** `docker-compose.yml`, `docker-compose.dev.yml`, `.gitignore`, `README.md`

**Verify:** `docker compose -f docker-compose.yml config -q; if ($?) { docker compose -f docker-compose.dev.yml up -d --wait db }`
