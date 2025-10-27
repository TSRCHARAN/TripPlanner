import express from "express";
//import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
// import serverless from "serverless-http";
dotenv.config();
import { planTripAuto, planTripWithTransport, getTransportOptions } from "./controllers/tripController.js";

const app = express();
app.use(express.json());
app.use(cors());

//app.use(morgan("dev"));

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.post("/api/plan-trip-auto", planTripAuto);
app.post("/api/plan-trip-with-transport", planTripWithTransport);
app.post("/api/get-transport-options", getTransportOptions);

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: err.message });
});

app.get("/", (req, res) => {
  res.send("Sai Ram!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

// export const handler = serverless(app);