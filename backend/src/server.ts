import express from "express";
import cors from "cors";
import { initDatabaseSchema } from "./database/init.js";
const app = express();
const HOSTNAME = "0.0.0.0";
const PORT = 8080;

initDatabaseSchema();

app.use(cors());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}`);
});
