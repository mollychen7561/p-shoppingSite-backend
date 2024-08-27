import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import { errorHandler } from "./middleware/errorHandler";

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();

// Determine the MongoDB URI to use based on the environment
// This allows for different URIs in development and production
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.CLOUD_MONGODB_URI ||
  process.env.LOCAL_MONGODB_URI;

// Database connection function
async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MongoDB URI is not defined");
  }

  try {
    // Attempt to connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB successfully`);

    // Log the name of the connected database
    const dbName = mongoose.connection.name;
    console.log(`Connected to database: ${dbName}`);

    // List all collections in the database
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );
  } catch (error) {
    console.error("Database connection failed:", error);
    // In Vercel's serverless environment, we throw the error instead of exiting the process
    throw error;
  }
}

// CORS middleware setup
// This allows the API to be called from different origins
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
// This logs every incoming request
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database connection middleware
// This ensures a database connection is established before processing any request
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectToDatabase();
    } catch (error) {
      return res.status(500).json({ message: "Unable to connect to database" });
    }
  }
  next();
});

// User routes
app.use("/api/users", userRoutes);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error handler caught:", err);
  res
    .status(500)
    .json({ message: "Internal server error", error: err.message });
});

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use(errorHandler);

// Server startup
const PORT = process.env.PORT || 5002;
const server = app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
});

// Export the Express app
// This is crucial for Vercel deployment
export default app;
