import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.database.watchlist import watch_list, watch_list_item

logger = logging.getLogger(__name__)
router = APIRouter()


class WatchListItemCreate(BaseModel):
    list_name: str
    ticker: str
    name: str | None = None
    sort_id: int | None = None  # if omitted, appended to the end of the list


async def _get_list_id(session: AsyncSession, list_name: str) -> int:
    """Look up a WatchList's Id by name, or raise 404."""
    result = await session.execute(
        select(watch_list.c.Id).where(watch_list.c.ListName == list_name)
    )
    list_id = result.scalar_one_or_none()
    if list_id is None:
        raise HTTPException(404, f"No watchlist found named '{list_name}'.")
    return list_id


@router.get("/watchlist")
async def get_watchlist(
    list_name: str,
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(watch_list_item)
        .join(watch_list, watch_list.c.Id == watch_list_item.c.ListId)
        .where(watch_list.c.ListName == list_name)
        .order_by(watch_list_item.c.SortId)
    )
    result = await session.execute(stmt)
    return result.mappings().all()


@router.post("/watchlist", status_code=201)
async def add_to_watchlist(
    item: WatchListItemCreate,
    session: AsyncSession = Depends(get_session),
):
    list_id = await _get_list_id(session, item.list_name)

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
            "Failed to add ticker %s to list '%s'", item.ticker, item.list_name
        )
        raise HTTPException(
            409, f"'{item.ticker}' may already be in list '{item.list_name}'."
        )

    logger.info("Added ticker %s to list '%s'", item.ticker, item.list_name)
    return result.mappings().one()


@router.delete("/watchlist", status_code=204)
async def delete_from_watchlist(
    list_name: str,
    ticker: str,
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        delete(watch_list_item)
        .where(
            watch_list_item.c.Id.in_(
                select(watch_list_item.c.Id)
                .join(watch_list, watch_list.c.Id == watch_list_item.c.ListId)
                .where(
                    watch_list.c.ListName == list_name,
                    watch_list_item.c.Ticker == ticker,
                )
            )
        )
        .returning(watch_list_item.c.Id)
    )
    result = await session.execute(stmt)
    deleted = result.first()

    if deleted is None:
        await session.rollback()
        raise HTTPException(
            404, f"No item with ticker '{ticker}' found in list '{list_name}'."
        )

    await session.commit()
    logger.info("Deleted ticker %s from list '%s'", ticker, list_name)
