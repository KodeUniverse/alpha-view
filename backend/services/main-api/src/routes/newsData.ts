import express from "express";
import { getLatestNews } from "../controllers/newsDataHandler.js";

const router = express.Router();

router.get("/source/:source/latest", getLatestNews);

export default router;
