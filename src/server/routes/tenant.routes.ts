import express from "express";
import { getTenantData } from "../controllers/tenant.controller";

const router = express.Router();

router.get("/data", getTenantData);

export default router;
