import { alphaDB } from "@alpha-view/utils";
import { Request, Response } from "express";
import { OHLCVData, Ticker } from "@shared/types";

const getHistoricalTS = async (
  req: Request<Ticker>,
  res: Response<OHLCVData[] | string>,
) => {
  const ticker = req.params.symbol;
  if (!ticker) {
    res.status(400).send("Symbol is undefined or null.");
    return;
  }

  const data = await alphaDB.query(
    `
    SELECT 
        Timestamp as "time",
        Open,
        Low,
        High,
        Close,
        Volume
    FROM
        Ticker t JOIN HistoricalTS ts 
        ON t.SymbolId = ts.SymbolId
    WHERE t.Symbol = $1`,
    [ticker],
  );
  const ts = data.rows;
  if (ts.length === 0) res.status(404).send("Time series not found for ticker");
  else {
    res.status(200).send(ts);
  }
};

const getSymbolList = async (
  req: Request,
  res: Response<Ticker[] | string>,
) => {
  const data = await alphaDB.query("SELECT DISTINCT Symbol FROM Ticker");

  const symbols = data.rows;

  if (symbols.length === 0) {
    res.status(404).send("Symbol list not found");
  } else {
    res.status(200).send(symbols);
  }
};

export { getHistoricalTS, getSymbolList };
