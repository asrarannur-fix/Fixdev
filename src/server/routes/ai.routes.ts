import express from "express";
import {
  aiDiagnose,
  aiChat,
  aiAnalyzeSales,
} from "../controllers/ai.controller";

const router = express.Router();

router.post("/diagnose", aiDiagnose);
router.post("/chat", aiChat);
router.post("/analyze-sales", aiAnalyzeSales);

export default router;
