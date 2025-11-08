import express from "express";
import { placePhoto } from "../controllers/photoController.js";
import { verifyAuth } from "../middlewares/auth.js";

const photoRoutes = express.Router();

photoRoutes.post("/placePhoto", verifyAuth, placePhoto);

export default photoRoutes;
    