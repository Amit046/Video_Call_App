import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { createServer } from "node:http";
import { connectToSocket } from "./controllers/socketManager.js";

dotenv.config();

const app = express();
const server = createServer(app);
connectToSocket(server);

app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "🎥 Apna Video Call Server is running!" });
});

const start = async () => {
  try {
    // MongoDB is now OPTIONAL - only connect if MONGO_URI is provided
    if (process.env.MONGO_URI) {
      const connectionDb = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MONGO CONNECTED: ${connectionDb.connection.host}`);
    } else {
      console.log(`⚠️  MongoDB not configured (not required for video calls)`);
    }

    server.listen(app.get("port"), () => {
      console.log(`✅ SERVER RUNNING ON PORT ${app.get("port")}`);
      console.log(`🎥 Video calling ready!`);
    });
  } catch (error) {
    console.error("⚠️  Warning: ", error.message);
    console.log("📡 Server starting without database...");

    // Start server even if DB connection fails
    server.listen(app.get("port"), () => {
      console.log(`✅ SERVER RUNNING ON PORT ${app.get("port")}`);
      console.log(`🎥 Video calling ready (without database)!`);
    });
  }
};

start();
