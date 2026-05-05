import express from "express";
import {
  getHistoricalTS,
  getSymbolList,
} from "../controllers/marketDataHandler.js";
const router = express.Router();

router.get("/hist-ts/:ticker/latest", getHistoricalTS);
router.get("/list/latest", getSymbolList);

export default router;
