import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import planRoutes from "./src/routes/planroute.js";
import Db from "./src/config/db.js";
import  {ProtectMiddleware}  from "./src/middleware/protectMiddleware.js";
dotenv.config();

const app = express();


app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization","x-api-key",],
  })
);

app.use(express.json());

Db();

app.use("/",ProtectMiddleware);
app.use("/plans", planRoutes);



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});