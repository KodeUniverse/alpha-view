import express from "express";
import { get_latest_news } from "../controllers/marketNewsHandler.js";

const router = express.Router();

router.get("/latest", get_latest_news);

export default router;
