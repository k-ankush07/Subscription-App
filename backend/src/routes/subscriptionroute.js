import express from "express";
import { subscription,getSubscription} from "../controllers/subscription.js";

const router = express.Router();

router.post("/subscription",subscription );
router.get("/:subscriptionId",getSubscription );



export default router;