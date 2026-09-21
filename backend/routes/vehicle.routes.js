// Vehicle routes
import express from "express";
import { getVehicleById, getVehicles, getVehicleLocationSuggestions } from "../controllers/vehicle.controller.js";
import { validateObjectIdParam } from "../middleware/validate.middleware.js";

const router = express.Router();

router.get("/", getVehicles);
router.get("/locations", getVehicleLocationSuggestions);
router.get("/:id", validateObjectIdParam("id"), getVehicleById);

export default router;
