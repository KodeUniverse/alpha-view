from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.database import watchlist
from app.database.base import metadata

AlphaDatabase = create_async_engine(
    "sqlite+aiosqlite:///alphaview.db"
)

async def init_database_schema():
    async with AlphaDatabase.begin() as conn:
        await conn.run_sync(metadata.create_all)

async def get_session():
    async with AsyncSession(AlphaDatabase) as session:
        yield session
