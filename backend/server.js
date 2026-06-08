import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import planRoutes from "./src/routes/planroute.js";
import Db from "./src/config/db.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

Db();


app.use("/plans", planRoutes);



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});