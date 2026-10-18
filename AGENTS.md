# AlphaView

Self-hosted financial dashboard for quants and aspiring statistical retail traders.

Live and historical charts (SMA, EMA, Bollinger Bands), a real-time per-ticker price
feed, persistent watchlists with intraday mini charts, company financials with
quantitative metrics (Sharpe, Sortino, volatility, max drawdown, VaR), and a market
news feed.

The audience is statistically literate. Explain the reasoning behind a change and
name the assumption it rests on. Numbers must be correct: never invent, approximate,
or round a metric to make output look tidy.

## Stack

| Layer    | Technology                                                                    |
| -------- | ----------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 7, Mantine v9, TanStack Query v5, lightweight-charts |
| Backend  | Python 3.13, FastAPI, SQLAlchemy Core (async), aiosqlite, SQLite                 |
| Data     | Alpaca Market Data API (prices, financials), Finnhub (news, financials)         |
| Deploy   | Docker Compose with live file sync                                             |

Deps are managed with `uv` on the backend and `npm` on the frontend.

## Layout

```
backend/    FastAPI app, providers, routers, schemas, tests
frontend/   React SPA
mockups/    design mockups
screenshots/ README assets
```

**Read `backend/AGENTS.md` or `frontend/AGENTS.md` before reasoning about backend or
frontend code.** They hold the constraints behind the live-feed fan-out, the test
monkeypatching, the live subscription effect deps, and the Docker mount boundary —
each a defect already hit. Don't infer the reasoning from the code.

## Workflow

Everything runs through Docker Compose. There are no bare-metal dev instructions.

```bash
cp .env.example .env   # then fill in API keys
make build             # build images
make start             # up --watch, both services hot-reload
make stop              # stop containers
make restart           # clean + build + start
make clean             # down
```

Prerequisite: Docker with the Compose plugin. Free API keys from Alpaca (required)
and Finnhub (news and financials).

The backend container runs `fastapi dev` with reload and listens on port 8080; the
frontend runs the Vite dev server on 5379. The frontend waits for the backend to
pass its healthcheck.

## Verification

Run the relevant check before reporting a change as done.

| Change                     | Command                        | Working dir |
| -------------------------- | ------------------------------ | ----------- |
| Backend                    | `uv run pytest`                | `backend/`   |
| Frontend                   | `npm run typecheck`            | `frontend/`  |

There is no frontend test runner and no lint script. `npm run typecheck` is the only
static gate on the frontend. There is no CI workflow, so these checks are the only
gate that exists.

## Cross-cutting contracts

- **Env vars are coupled.** `HOST_PORT` is read by the *backend* to build its CORS
  allow-origin, while `HOST_API_PORT` is read by *Vite at config time* to build the
  API base URL. Change one without the other and the frontend silently stops
  reaching the API. The backend reads env vars straight from `os.environ`; there is
  no pydantic-settings.
- **One upstream market data socket.** Alpaca's free tier permits a single market
  data connection per account, so the backend holds one shared connection and fans
  out to every connected browser. Any work touching the live feed must preserve
  that. See `backend/AGENTS.md`.
- **Zod owns the API contract on the frontend.** `frontend/src/types/*.ts` holds the
  schemas the frontend validates every response against, and backend Pydantic models
  in `app/schemas/` are the source shapes. A field rename on one side needs a
  matching change on the other, in the same commit.
- **Color is tokenized, not literal.** Both color schemes are defined by CSS custom
  properties in `frontend/src/index.css`. Any color a change needs must resolve to one
  of them, whether it lands in JSX, a `style` prop, or a canvas chart series — add the
  token under both schemes if it does not exist yet. `frontend/src/utils/colors.ts`
  resolves a token name to a concrete value. See `frontend/AGENTS.md`.
- **Secrets and artifacts are not source.** Never commit `.env`, `*.db`,
  `*.sqlite`, `dist/`, or `*.tsbuildinfo`. `.env.example` is the committed template.

## Known pre-existing issues

These are real and already in the tree. Work around them and mention them when
relevant; do not change them silently as part of an unrelated task.

- Backend `NewsCategory` omits `"crypto"`, while the frontend zod enum includes it.
  A `crypto` news request is rejected by the backend.
- A stale path comment in `frontend/src/api/client.ts` references
  `backend/src/providers/alpacaStream.ts`, which does not exist.
- Root `.gitignore` ignores `package-lock.json`, but `frontend/package-lock.json` is
  checked in.

## Git

Feature branches off `main`, PRs into `main`. Recent work has landed as
`feature/<name>` branches merged by PR, so follow that pattern.