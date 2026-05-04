import { alphaDB } from "@alpha-view/utils";

const getHistoricalTS = async (req, res) => {
  const ticker = req.params.ticker;

  if (ticker == "null") res.sendStatus(400);

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
  if (Object.keys(ts).length === 0)
    res.status(404).send("Time series not found for ticker");
  else {
    res.status(200).send(ts);
  }
};

const getSymbolList = async (req, res) => {
  const data = await alphaDB.query("SELECT DISTINCT Symbol FROM Ticker");

  const symbols = data.rows;

  if (Object.keys(symbols).length === 0) {
    res.status(404).send("Symbol list not found");
  } else {
    res.status(200).send(symbols);
  }
};

export { getHistoricalTS, getSymbolList };
