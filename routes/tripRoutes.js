import express from "express";
import { planTripAuto, planTripWithTransport, getTransportOptions, getNearestHub } from "../controllers/tripController.js";

const router = express.Router();

router.post("/planTripAuto", planTripAuto);
router.post("/plan-trip-with-transport", planTripWithTransport);
router.post("/get-transport-options", getTransportOptions);
router.post("/get-nearest-hub", getNearestHub);

export default router;
