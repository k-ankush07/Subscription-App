import express from "express";
import { createPlan } from "../controllers/Plan.js";

const router = express.Router();

// router.get("/", plans);
router.post("/create", createPlan);


export default router;