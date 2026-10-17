# BuildSpace

A browser-based coding playground. Write HTML, CSS and JavaScript in a Monaco editor, see a live sandboxed preview, save projects to PostgreSQL, share them by public link, fork other people's work, and restore earlier versions.

Built as a full-stack portfolio project: React + TypeScript on the front, FastAPI + PostgreSQL on the back, with automated tests, CI and Docker.

![Editor](docs/screenshots/editor.png)

## Features

- **Accounts:** register, log in, log out, change username and password, delete account.
- **Dashboard:** create, rename, duplicate and delete projects, with search and sorting.
- **Editor:** Monaco with tabs, a file explorer (folders, rename, delete), unsaved-change tracking, resizable and collapsible panels.
- **Live preview:** runs in a sandboxed iframe, with device sizes, a console panel, and runtime error reporting.
- **Sharing:** public project pages at `/p/<slug>` with a read-only code viewer and live preview.
- **Gallery:** searchable list of public projects.
- **Fork:** copy any public project into your account, with attribution to the original.
- **Version history:** named snapshots, preview, restore (a safety snapshot is saved first, so a restore can be undone), delete.
- **Templates:** blank, portfolio, landing page, product card, calculator, to-do app, responsive dashboard.
- **Themes:** light and dark.

| Dashboard | Public page |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Public page](docs/screenshots/public.png) |

| Version history | Gallery |
| --- | --- |
| ![History](docs/screenshots/history.png) | ![Gallery](docs/screenshots/gallery.png) |

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Monaco Editor |
| Backend | Python 3.11, FastAPI, Pydantic, SQLAlchemy, Alembic |
| Database | PostgreSQL 17 |
| Auth | Argon2id password hashes, short-lived JWT access tokens, rotating refresh tokens in an HttpOnly cookie |
| Tests | pytest, Vitest, React Testing Library, Playwright |
| Delivery | GitHub Actions, Docker, docker-compose, nginx |

## Architecture

- The backend never runs user code. Previews are built in the browser from stored files.
- Every private operation checks ownership on the server. Another user's project returns 404, not 403, so its existence is not revealed.
- Access tokens live in memory only. The refresh token is an HttpOnly cookie, stored in the database as a SHA-256 hash and rotated on every use. Reusing an old token ends all of that user's sessions.

## Security

Implemented:

- Argon2id hashing, no plaintext secrets, secrets only in environment variables.
- Server-side validation of every file path (no `..`, no leading dots, depth, length) and size limits per file, per project and per request body.
- Rate limits: a default per-IP limit on every route, and stricter limits on login, register, password changes and forking.
- Security headers on API responses, strict CORS, request-size limits, redaction of tokens and passwords in logs.
- Preview sandbox: `sandbox="allow-scripts allow-forms"` without `allow-same-origin`, plus a Content-Security-Policy inside the preview document that blocks `fetch`, XHR, WebSockets, form submission and frames. Details and trade-offs are in [docs/sandbox-security.md](docs/sandbox-security.md).
- With `ENVIRONMENT=production` the API refuses to start on a weak `JWT_SECRET`, insecure cookies, or non-https CORS origins, and the `/docs` pages are disabled.
- Private projects are never reachable through public endpoints, and public responses expose the author's username only.

Known limitations (see below) are listed on purpose.

## Run it locally (Windows, PowerShell)

You need Git, Node.js 20.19+ or 22+, Python 3.11+, and PostgreSQL 17.

**1. Database.** In `psql` as the `postgres` user:

```sql
CREATE USER buildspace_user WITH PASSWORD 'choose-a-password';
CREATE DATABASE buildspace OWNER buildspace_user;
CREATE DATABASE buildspace_test OWNER buildspace_user;
```

**2. Backend.**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env: set DATABASE_URL (with your password) and JWT_SECRET
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. API docs are at http://localhost:8000/docs.

**3. Frontend** (second terminal).

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend.

## Tests

```powershell
# Backend (uses the buildspace_test database; it refuses to run on any other name)
cd backend; pytest -q

# Frontend
cd frontend; npm test; npm run lint; npm run build

# Browser smoke test (backend must be running on port 8000)
cd frontend; npm run e2e
```

Current counts: 125 backend tests and 51 frontend tests. The Playwright smoke test (sign up, create, edit, save, publish, unpublish, delete account) passes locally.

## CI

`.github/workflows/ci.yml` runs on every push: backend tests against a PostgreSQL service, frontend lint, tests and build, a Docker build with a full-stack check through nginx, and the browser smoke test. The first three pass. The browser test passes locally but currently fails on GitHub's runners; the cause has not been investigated yet.

## Docker and deployment

`docker-compose.yml` runs PostgreSQL, the API and an nginx site. See [docs/deployment.md](docs/deployment.md) for server steps, HTTPS and backups. The stack is verified by the CI Docker job, but it has not been deployed to a real server yet.

## Project layout
backend/ FastAPI app (api, core, models, schemas, services), Alembic migrations, tests
frontend/ React app (components, pages, contexts, services, utils), unit and e2e tests
docs/ Sandbox security notes, deployment guide
.github/ CI workflow

## Known limitations

- The deployed site's CSP allows inline scripts, because the preview iframe inherits it. Serving previews from a separate origin is the proper fix.
- Access tokens stay valid for up to 15 minutes after a password change or account deletion.
- No email verification, password reset, or email change.
- The API must run as a single replica, because migrations run on startup.
- Empty folders are not saved; only files are stored.
- Old versions can be previewed, but their code cannot be viewed.
- The AI chat panel is a placeholder.
- Panel sizes reset on reload.

## Roadmap

React and npm-based projects (needs an isolated build service), AI assistance through a backend proxy, collaboration, email flows, and a separate preview origin.