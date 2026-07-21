import express from "express";
import { requireRoles, requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import {
  listSuppliers, createSupplier, updateSupplier,
  listPurchaseOrders, createPurchaseOrder, cancelPurchaseOrder,
  receiveGoods, listGoodsReceipts, listPayables, paySupplier,
} from "../controllers/purchasing.controller.js";

const router = express.Router();
const buyer = requireRoles("OWNER", "ADMIN", "MANAGER");

router.get("/suppliers", buyer, listSuppliers);
router.post("/suppliers", buyer, createSupplier);
router.patch("/suppliers/:id", buyer, updateSupplier);

router.get("/orders", buyer, listPurchaseOrders);
router.post("/orders", buyer, createPurchaseOrder);
router.post("/orders/:id/cancel", buyer, cancelPurchaseOrder);

router.get("/receipts", buyer, listGoodsReceipts);
router.post("/receipts", buyer, receiveGoods);

router.get("/payables", buyer, listPayables);
router.post("/payments", buyer, paySupplier);

export default router;
