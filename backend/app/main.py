import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_database_schema
from app.providers import alpaca
from app.routers import bars, financials, news, symbols, watchlist


@asynccontextmanager
async def lifespan(app: FastAPI):
    # runs before API startup
    await init_database_schema()
    await alpaca.probe_credentials()
    yield
    # shutdown/clean up code. runs after API shutdown

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://localhost:{os.environ.get('HOST_PORT', '5379')}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return app.routes
    
@app.get("/health")
async def health_check():
    return "Healthy!"

app.include_router(bars.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(watchlist.router, prefix="/api")
app.include_router(symbols.router, prefix="/api")
app.include_router(financials.router, prefix="/api")
