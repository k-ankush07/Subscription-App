import express from "express";
import { createPlan,getALLPlans,getPlanByPlanId,updatePlan ,deletePlan,getPlanByShopifyGroupId } from "../controllers/Plan.js";

const router = express.Router();


router.post("/create", createPlan);
router.get("/getAllPlans", getALLPlans);
// planRoutes.js    
router.get('/by-shopify-group/:shopifyGroupId', getPlanByShopifyGroupId);
router.get("/:planId", getPlanByPlanId);
router.put("/update/:planId", updatePlan);
router.delete("/:planId", deletePlan);



export default router;