import express from "express";
import { getUserReports, getLocationReports, addReport, removeReport, updateReport, validateReport, getReportValidations } from "../controllers/reportController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { reportSchema } from "../validation/reportValidators.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/location/:locationId", getLocationReports);

router.get("/", getUserReports);
router.get("/validate/:id", getReportValidations);
router.post("/validate/:id", validateReport);
router.post("/", validateRequest(reportSchema), addReport);
router.put("/:id", updateReport);
router.delete("/:id", removeReport);

export default router;  