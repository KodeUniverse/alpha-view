from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import init_database_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    # runs before API startup
    await init_database_schema()
    yield
    # shutdown/clean up code. runs after API shutdown

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def root():
    return app.routes
    
@app.get("/health")
async def health_check():
    return "Healthy!"

