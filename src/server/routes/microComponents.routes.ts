import express from "express";
import { requireJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import { adjustMicroComponentStock, consumeMicroComponent, createMicroComponent, listMicroComponents, updateMicroComponent } from "../controllers/microComponents.controller.js";

const router=express.Router();
router.use(requireJwt,requireTenantScope);
router.get("/",listMicroComponents);
router.post("/",createMicroComponent);
router.patch("/:id",updateMicroComponent);
router.post("/:id/stock",adjustMicroComponentStock);
router.post("/:id/consume",consumeMicroComponent);
export default router;
