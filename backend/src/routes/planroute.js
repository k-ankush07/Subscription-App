import express from "express";
import { createPlan,getALLPlans,getPlanById} from "../controllers/Plan.js";

const router = express.Router();


router.post("/create", createPlan);
router.get("/getAllPlans", getALLPlans);
router.get("/:PlandId", getPlanById);
// router.put("/update/:planId", updatePlan);
// router.delete("/:planId", deletePlan);



export default router;