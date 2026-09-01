import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/watchlist")
def get_watchlist():
    pass 

@router.post("/watchlist")
def add_to_watchlist():
    pass 

@router.delete("/watchlist")
def delete_from_watchlist():
    pass
