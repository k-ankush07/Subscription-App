import dotenv from "dotenv";
import express from "express";
dotenv.config();
import planRoutes from "./src/routes/planroute.js";
import Db from "./src/config/db.js"
import cors from 'cors'
const app = express();

app.use(express.json());
app.use(cors())
Db()

const PORT = process.env.PORT || 5000;

app.use("/plans", planRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:5000");
});