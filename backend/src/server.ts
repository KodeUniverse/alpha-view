import express from "express";
import cors from "cors";
import { initDatabaseSchema } from "./database/init.js";
import { apiRouter } from "./routes/api/apiRouter.js";

const app = express();
const HOSTNAME = "0.0.0.0";
const PORT = 8080;

initDatabaseSchema();

app.use(cors());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRouter);

app.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}`);
});
