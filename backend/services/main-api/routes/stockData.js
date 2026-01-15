import express from "express";
import { getHistoricalTS } from "../controllers/stockDataHandler.js";
const router = express.Router();

router.get("/hist-ts/:ticker/latest", getHistoricalTS);

export default router;
