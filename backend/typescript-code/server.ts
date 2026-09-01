import express from "express";
import cors from "cors";
import { initDatabaseSchema } from "./database/init.js";
import { apiRouter } from "./routes/api/apiRouter.js";
import { attachLiveFeedSocket } from "./routes/ws/liveFeedSocket.js";

const app = express();
const HOSTNAME = "0.0.0.0";
const PORT = 8080;

await initDatabaseSchema();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRouter);

const server = app.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}`);
});

attachLiveFeedSocket(server);
