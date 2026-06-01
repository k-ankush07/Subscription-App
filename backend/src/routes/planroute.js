import express from "express";
import { plans, createPlan } from "../controllers/Plan.js";

const router = express.Router();

// router.get("/", plans);
router.post("/create", createPlan);

export default router;