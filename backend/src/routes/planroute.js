import express from "express";
import { createPlan,getALLPlans,getPlanByPlanId } from "../controllers/Plan.js";

const router = express.Router();

// router.get("/", plans);
router.post("/create", createPlan);
router.get("/getAllPlans", getALLPlans);
router.get("/:planId", getPlanByPlanId);


export default router;