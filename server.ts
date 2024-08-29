import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./src/api/index";

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 5003;

// Additional local development settings
if (process.env.NODE_ENV === "development") {
  // Here you can add middleware or settings that are only used in the development environment
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[DEV] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Database connection status check
app.get("/api/debug/db-status", (req: Request, res: Response) => {
  res.json({
    connectionState: mongoose.connection.readyState,
    dbName: mongoose.connection.name,
    host: mongoose.connection.host
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(
    `Server is running on http://localhost:${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
});

export default server;
