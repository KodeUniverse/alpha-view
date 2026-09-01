from datetime import datetime
from typing import Literal

from pydantic import BaseModel

type NewsCategory = Literal["general", "forex", "merger", "technology", "business", "top news"] 

class NewsArticle(BaseModel):
    id: int
    headline: str
    datetime: datetime
    url: str
    source: str
    category: NewsCategory | None 
    image: str | None
    summary: str | None

