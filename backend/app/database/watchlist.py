from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    MetaData,
    Table,
    Text,
    UniqueConstraint,
)

metadata = MetaData()

watch_list = Table(
    "WatchList",
    metadata,
    Column("Id", Integer, primary_key=True, autoincrement=True),
    Column("ListName", Text, nullable=False, unique=True),
)

watch_list_item = Table(
    "WatchListItem",
    metadata,
    Column("Id", Integer, primary_key=True, autoincrement=True),
    Column(
        "ListId",
        Integer,
        ForeignKey("WatchList.Id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("Ticker", Text, nullable=False),
    Column("Name", Text),
    Column("SortId", Integer, nullable=False),

    UniqueConstraint("ListId", "SortId"),
    UniqueConstraint("ListId", "Ticker"),
)
