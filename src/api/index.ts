import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "../routes/userRoutes.js";
import { errorHandler } from "../middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 設置
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日誌中間件
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 數據庫連接
const MONGODB_URI =
  process.env.CLOUD_MONGODB_URI ||
  process.env.MONGODB_URI ||
  process.env.LOCAL_MONGODB_URI;

async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MongoDB URI is not defined");
  }
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000
    });
    console.log(`Connected to MongoDB successfully`);
    console.log(`Database Name: ${mongoose.connection.name}`);
    console.log(`Database Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
    }
    console.error(
      "MongoDB URI used:",
      MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@")
    );
    throw error;
  }
}

// 根路由
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the root of my API");
});

app.get("/api", (req: Request, res: Response) => {
  res.send("Welcome to my API");
});

// 更新的狀態路由
app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    databaseConnection:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    databaseName: mongoose.connection.name,
    databaseHost: mongoose.connection.host,
    nodeVersion: process.version,
    mongooseVersion: mongoose.version
  });
});

// 新增的數據庫診斷路由
app.get("/api/debug/dbstatus", async (req: Request, res: Response) => {
  try {
    const status = mongoose.connection.readyState;
    const statusMap: { [key: number]: string } = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };
    res.json({
      status: statusMap[status],
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      mongoVersion: mongoose.version,
      nodeVersion: process.version
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
});

// 用戶路由
app.use("/api/users", userRoutes);

// 新增的測試用戶路由
app.get("/api/users/test", (req: Request, res: Response) => {
  res.json({
    message: "This is a test endpoint for the users route",
    data: {
      userId: "test123",
      username: "testuser",
      email: "test@example.com"
    }
  });
});

// 增強的環境變量調試路由
app.get("/api/debug/env", (req: Request, res: Response) => {
  const mongoUri =
    process.env.CLOUD_MONGODB_URI ||
    process.env.MONGODB_URI ||
    process.env.LOCAL_MONGODB_URI;
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI ? "Set" : "Not Set",
    CLOUD_MONGODB_URI: process.env.CLOUD_MONGODB_URI ? "Set" : "Not Set",
    LOCAL_MONGODB_URI: process.env.LOCAL_MONGODB_URI ? "Set" : "Not Set",
    EFFECTIVE_MONGODB_URI: mongoUri
      ? mongoUri.replace(/\/\/.*@/, "//<credentials>@")
      : "Not Set",
    PORT: process.env.PORT,
    CORS_ORIGIN: process.env.CORS_ORIGIN
  });
});

// 404 處理
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// 錯誤處理
app.use(errorHandler);

// 連接數據庫並啟動服務器
async function startServer() {
  try {
    console.log("Starting server...");
    console.log("Node.js version:", process.version);
    console.log("Mongoose version:", mongoose.version);
    console.log("Environment:", process.env.NODE_ENV);

    await connectToDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    // 給一些時間讓日誌被發送
    setTimeout(() => process.exit(1), 1000);
  }
}

// 檢查是否直接運行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
