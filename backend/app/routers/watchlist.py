import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.database.watchlist import watch_list, watch_list_item

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------- Response models ----------

class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    Id: int
    ListName: str


class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    Id: int
    ListId: int
    Ticker: str
    Name: str | None
    SortId: int


# ---------- Watchlists ----------

@router.get("/watchlists", response_model=list[WatchlistResponse])
async def list_watchlists(session: AsyncSession = Depends(get_session)):
    stmt = select(watch_list)
    result = await session.execute(stmt)
    return result.mappings().all()


class CreateWatchlistRequest(BaseModel):
    list_name: str


@router.post("/watchlists", status_code=201, response_model=WatchlistResponse)
async def create_watchlist(
    req: CreateWatchlistRequest, session: AsyncSession = Depends(get_session)
):
    list_name = req.list_name.strip()
    if not list_name:
        raise HTTPException(400, "Watchlist name cannot be empty.")

    stmt = insert(watch_list).values(ListName=list_name).returning(watch_list)

    try:
        result = await session.execute(stmt)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            409, "Watchlist name already exists. Watchlists must have unique names."
        )

    return result.mappings().one()


# ---------- Watchlist items ----------

@router.get("/watchlists/{list_id}/items", response_model=list[WatchlistItemResponse])
async def get_watchlist(
    list_id: int,
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(watch_list_item)
        .where(watch_list_item.c.ListId == list_id)
        .order_by(watch_list_item.c.SortId)
    )
    result = await session.execute(stmt)
    return result.mappings().all()


class WatchListItemCreate(BaseModel):
    ticker: str
    name: str | None = None
    sort_id: int | None = None  # if omitted, appended to the end of the list


@router.post(
    "/watchlists/{list_id}/items", status_code=201, response_model=WatchlistItemResponse
)
async def add_to_watchlist(
    list_id: int,
    item: WatchListItemCreate,
    session: AsyncSession = Depends(get_session),
):
    list_exists = await session.execute(
        select(watch_list.c.Id).where(watch_list.c.Id == list_id)
    )
    if list_exists.scalar() is None:
        raise HTTPException(404, f"Watchlist {list_id} not found.")

    sort_id = item.sort_id
    if sort_id is None:
        max_sort_result = await session.execute(
            select(func.max(watch_list_item.c.SortId)).where(
                watch_list_item.c.ListId == list_id
            )
        )
        current_max = max_sort_result.scalar()
        sort_id = 0 if current_max is None else current_max + 1

    stmt = (
        insert(watch_list_item)
        .values(
            ListId=list_id,
            Ticker=item.ticker,
            Name=item.name,
            SortId=sort_id,
        )
        .returning(watch_list_item)
    )

    try:
        result = await session.execute(stmt)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        logger.exception(
            "Failed to add ticker %s to watchlist %s", item.ticker, list_id
        )
        raise HTTPException(
            409, f"'{item.ticker}' may already be in watchlist {list_id}."
        )

    logger.info("Added ticker %s to watchlist %s", item.ticker, list_id)
    return result.mappings().one()


@router.delete("/watchlists/{list_id}/items/{ticker}", status_code=204)
async def delete_from_watchlist(
    list_id: int,
    ticker: str,
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        delete(watch_list_item)
        .where(
            watch_list_item.c.ListId == list_id,
            watch_list_item.c.Ticker == ticker,
        )
        .returning(watch_list_item.c.Id)
    )
    result = await session.execute(stmt)
    deleted = result.first()

    if deleted is None:
        await session.rollback()
        raise HTTPException(
            404, f"No item with ticker '{ticker}' found in list_id {list_id}."
        )

    await session.commit()
    logger.info("Deleted ticker %s from list id %s", ticker, list_id)

@router.delete("/watchlists/{list_id}")
async def delete_watchlist(list_id: int, session: AsyncSession = Depends(get_session)):

    stmt = delete(watch_list).where(watch_list.c.Id == list_id).returning(watch_list.c.Id)
    result = await session.execute(stmt)
    deleted = result.first()

    if deleted is None:
        await session.rollback()
        raise HTTPException(404, f"No watchlist with id {list_id} found.")
    
    await session.commit()
    logger.info("Deleted watchlist with id %s", list_id)

