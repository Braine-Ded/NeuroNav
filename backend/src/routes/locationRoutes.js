import express from "express";
import { createLocation, getLocations, getLocationById } from "../controllers/locationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { locationSchema } from "../validation/locationValidators.js";

const router = express.Router();
// router.use(authMiddleware);  // disabled for now since locations are not user-specific

router.get("/", getLocations);
router.get("/id/:id", getLocationById);
router.post("/", authMiddleware, validateRequest(locationSchema), createLocation);

export default router;