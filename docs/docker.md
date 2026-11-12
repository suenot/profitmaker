# Run with Docker

One image holds the server and the built client. On start it applies the
database migrations, then serves the terminal on port 3001 and Socket.IO on
3002.

## Compose file

Save this as `docker-compose.yml` next to a clone of the repo:

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: profitmaker
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: profitmaker
    volumes:
      - pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U profitmaker"]
      interval: 5s
      retries: 10
    restart: unless-stopped

  profitmaker:
    build: ./profitmaker
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://profitmaker:${POSTGRES_PASSWORD}@db:5432/profitmaker
      API_TOKEN: ${API_TOKEN}
      ALLOWED_ORIGINS: http://localhost:3001
    ports:
      - "3001:3001"   # terminal and REST API
      - "3002:3002"   # Socket.IO (live data)
    restart: unless-stopped

volumes:
  pgdata:
```

And a `.env` beside it:

```bash
POSTGRES_PASSWORD=change-me
API_TOKEN=paste-the-output-of-openssl-rand-hex-32
```

## Start it

```bash
git clone https://github.com/suenot/profitmaker.git
docker compose up -d --build
docker compose logs -f profitmaker
```

Open `http://localhost:3001`. The yellow banner asks for the access token:
click **Enter token** and paste your `API_TOKEN`.

## On a server with a domain

Put a reverse proxy (Caddy, nginx, Traefik) in front and route both ports
under one host:

- `/socket.io` to port 3002
- everything else to port 3001

Then set `ALLOWED_ORIGINS=https://your-domain` and stop publishing the ports
to the outside. The client works out the socket address from the page
address: with no port in the URL it uses the same host, so the `/socket.io`
route is what makes live data work.

`docker-compose.prod.yml` in the repo is the compose we use for
terminal.marketmaker.cc. It expects our Traefik network and hostnames, so treat
it as an example, not as something to run as is.

## Updating

```bash
cd profitmaker && git pull && cd ..
docker compose up -d --build
```

Migrations run on every start. If one fails, the container stops instead of
serving a half-migrated database.

## Modules in Docker

Installed modules live in `/app/packages/server/.modules` inside the
container. Mount a named volume there if you install modules from the Module
Store, or they go away when the container is rebuilt:

```yaml
    volumes:
      - modules:/app/packages/server/.modules
```

and add `modules:` under the top-level `volumes:`. The image creates that
folder for its `bun` user, so a new named volume gets the right owner. If you
point `MODULES_DIR` somewhere else, make sure that user can write there.
