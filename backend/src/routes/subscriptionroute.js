import express from "express";
import { subscription} from "../controllers/subscription.js";

const router = express.Router();

router.post("/subscription",subscription );



export default router;