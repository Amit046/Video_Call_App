import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { createServer } from "node:http";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

dotenv.config(); // ✅ VERY IMPORTANT

const app = express();
const server = createServer(app);
connectToSocket(server);

app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MONGO CONNECTED: ${connectionDb.connection.host}`);

    server.listen(app.get("port"), () => {
      console.log(`✅ SERVER RUNNING ON ${app.get("port")}`);
    });
  } catch (error) {
    console.error("❌ DB CONNECTION FAILED");
    console.error(error.message);
  }
};

start();
