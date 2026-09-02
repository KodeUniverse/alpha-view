FROM python:3.13-slim

# Install uv (package manager) and curl (for healthcheck)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (separate layer for caching)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy app source
COPY backend/app ./app

EXPOSE 8080
# --host 0.0.0.0 required so the port is reachable outside the container
# --reload picks up file changes synced by docker compose watch
CMD ["uv", "run", "fastapi", "dev", "app/main.py", "--port", "8080", "--host", "0.0.0.0"]
