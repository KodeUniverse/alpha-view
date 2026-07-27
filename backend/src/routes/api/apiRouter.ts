import { Router, Request, Response } from "express";
import { barsController } from "../../controllers/api/bars.js";
import { newsController } from "../../controllers/api/news.js";
import { symbolsController } from "../../controllers/api/symbols.js";
import { financialsController } from "../../controllers/api/financials.js";

const apiRouter = Router();

apiRouter.get("/", (_req: Request, res: Response) => {
  res.status(200).send(apiRouter.stack);
});

apiRouter.get("/bars", barsController);
apiRouter.get("/news", newsController);
apiRouter.get("/symbols", symbolsController);
apiRouter.get("/financials/:ticker", financialsController);

export { apiRouter };
