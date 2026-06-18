import express from "express";
import { createPlan,getALLPlans,getPlanByPlanId} from "../controllers/Plan.js";

const router = express.Router();


router.post("/create", createPlan);
router.get("/getAllPlans", getALLPlans);
router.get("/:PlandId", getPlanByPlanId);
// router.put("/update/:planId", updatePlan);
// router.delete("/:planId", deletePlan);



export default router;