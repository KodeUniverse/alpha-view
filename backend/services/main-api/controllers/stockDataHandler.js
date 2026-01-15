import { alphaDB } from "@alpha-view/utils";

export const getHistoricalTS = async (req, res) => {
  const ticker = req.params.ticker;

  if (ticker == "null") res.sendStatus(400);

  const data = await alphaDB.query(
    `
    SELECT 
        Date,
        OpenPrice,
        LowPrice,
        HighPrice,
        ClosePrice,
        Volume
    FROM
        Ticker t JOIN HistoricalTS ts 
        ON t.SymbolId = ts.SymbolId
    WHERE t.Symbol = $1`,
    [ticker],
  );

  res.status(200).send(data.rows);
};
