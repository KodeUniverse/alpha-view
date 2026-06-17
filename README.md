# AlphaView

**A self-hosted financial dashboard for real-time market data, news aggregation, and portfolio tracking.**

Built as a multi-service application using React, Node.js, TypeScript, Python, and PostgreSQL, orchestrated with Docker Compose.

> 📸 _[need to add screenshot/GIF]_

---

## Features

- Real-time and historical market data via the [Alpaca Market Data API](https://alpaca.markets/)
- Financial news aggregation and analysis
- Persistent storage with PostgreSQL
- Redis for pub/sub messaging, caching
- Automated data scraping and background market data seeding

---

## Architecture

AlphaView is composed of six Docker services:

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                      │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │ Frontend │───▶│ Backend  │───▶│   PostgreSQL DB   │  │
│  │ React/TS │    │ Node/TS  │    └───────────────────┘  │
│  └──────────┘    └────┬─────┘                           │
│                       │         ┌───────────────────┐   │
│                       └────────▶│      Redis        │   │
│                                 └───────────────────┘   │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │   Scraper    │  │   Market Data Seeder (Python)    │ │
│  │   (TS)       │  │   Alpaca API → PostgreSQL        │ │
│  └──────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

| Service             | Tech              | Role                                               |
|---------------------|-------------------|----------------------------------------------------|
| `frontend`          | React, TypeScript | UI dashboard                                       |
| `backend`           | Node.js, TypeScript | REST API, business logic                         |
| `scraping`          | TypeScript        | News and data scraper                              |
| `market-data-seed`  | Python            | Downloads and seeds market data from Yahoo Finance |
| `postgres`          | PostgreSQL 16     | Primary data store                                 |
| `redis`             | Redis             | Caching layer                                      |

Services use health checks to ensure correct startup order.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- An [Alpaca Markets](https://alpaca.markets/) account (free tier works) for API keys

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/KodeUniverse/alpha-view.git
cd alpha-view
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
# Host ports — the ports exposed on your machine
HOST_PORT=3000          # Frontend
HOST_API_PORT=3001      # Backend API

# PostgreSQL
POSTGRES_DB=alpha_view
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password

# Alpaca Market Data API
# Get your keys at https://alpaca.markets/ → API Keys
ALPACA_API_KEY=your_api_key
ALPACA_API_SECRET=your_api_secret
```

### 3. Build and start

```bash
make build   # Build all images
make start   # Start all services
```

Then open `http://localhost:3000` in your browser.

---

## Available Commands

| Command        | Description                                           |
|----------------|-------------------------------------------------------|
| `make build`   | Build all Docker images                               |
| `make start`   | Start all services with live file sync                |
| `make stop`    | Stop all running services                             |
| `make restart` | Full teardown, rebuild, and restart                   |
| `make clean`   | Stop and remove all containers                        |
| `make connect_db` | Open a `psql` shell into the running database      |
| `make delete_db`  | Remove the postgres data volume (destructive)      |
