# Deploying BuildSpace

BuildSpace runs as three containers (PostgreSQL, API, nginx site) from `docker-compose.yml`.
This guide targets one Linux server with Docker. It has not been tested on a real host yet, so
treat it as a checklist and fix anything that differs.

## Before you start

- A server with Docker and the Docker Compose plugin, and a domain name pointing at it.
- Only ports 80 and 443 open to the internet. Do not open 8080, 8000 or 5432.

## 1. Get the code and configure it

    git clone https://github.com/Anishsingh83/BuildSpace.git
    cd BuildSpace
    cp .env.example .env

Edit `.env`:

- `POSTGRES_PASSWORD`: 24+ characters, letters and numbers only.
- `JWT_SECRET`: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`
- `SITE_URL`: `https://your-domain.example`
- Leave `ENVIRONMENT=production` and `COOKIE_SECURE=true`.

Protect the file: `chmod 600 .env`. Never commit it.

With `ENVIRONMENT=production` the API refuses to start on a weak secret, insecure cookies, or a
non-https `SITE_URL`, and the `/docs` pages are disabled.

## 2. Start

    docker compose up -d --build
    docker compose ps
    docker compose logs api

The API applies database migrations on every start. Run exactly one API replica.

The site listens on `127.0.0.1:8080` only. Put an HTTPS proxy in front of it.

## 3. HTTPS with Caddy (automatic certificates)

Install Caddy on the host, then use this `Caddyfile`:

    your-domain.example {
        reverse_proxy 127.0.0.1:8080
    }

Caddy obtains and renews certificates by itself. nginx trusts its `X-Forwarded-For` header because
the connection comes from a private or loopback address.

## 4. Verify

- `https://your-domain.example` loads, sign-up and login work.
- Browser dev tools, Application tab: `refresh_token` is `HttpOnly` and `Secure`.
- Response headers on the home page include `Content-Security-Policy` and `Strict-Transport-Security`.
- `https://your-domain.example/docs` is not found.
- After HTTPS works for a few days, raise `max-age` in `frontend/security-headers.conf`.

## Updating

    git pull
    docker compose up -d --build

## Backups

    docker compose exec db pg_dump -U buildspace_user buildspace | gzip > buildspace-$(date +%F).sql.gz

Keep copies off the server, and practise a restore once.

## Using a managed PostgreSQL instead

Remove the `db` service and its `depends_on` entry, and set the API's `DATABASE_URL` to the
provider's connection string (with `?sslmode=require` if the provider needs it). Managed databases
include backups, which is the main reason to prefer one.

## Rotating secrets

Changing `JWT_SECRET` signs everyone out. Changing `POSTGRES_PASSWORD` also requires
`ALTER USER buildspace_user PASSWORD '...'` inside the database.

## Known limitation

Preview iframes use `srcdoc`, which inherits the page's Content-Security-Policy. The site policy
therefore allows `'unsafe-inline'` scripts, which weakens its defence against injected scripts. The
app has no raw-HTML rendering, but the proper fix is to serve previews from a separate origin.