import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import dns from "dns";
import https from "https";
import { promisify } from "util";
import userRoutes from "../routes/userRoutes.js";
import { errorHandler } from "../middleware/errorHandler.js";

dotenv.config();

// 啟用 Mongoose 調試模式
mongoose.set("debug", true);

const app = express();
const PORT = process.env.PORT || 5001;

// CORS 設置
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
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

async function connectToDatabase(retries = 5) {
  if (!MONGODB_URI) {
    throw new Error("MongoDB URI is not defined");
  }

  for (let i = 0; i < retries; i++) {
    try {
      console.log(
        `Attempting to connect to MongoDB... (Attempt ${i + 1} of ${retries})`
      );
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 75000,
        connectTimeoutMS: 50000
      });
      console.log(`Connected to MongoDB successfully`);
      console.log(`Database Name: ${mongoose.connection.name}`);
      console.log(`Database Host: ${mongoose.connection.host}`);
      return;
    } catch (error) {
      console.error(`Database connection failed (Attempt ${i + 1}):`, error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        if (error.stack) {
          console.error("Error stack:", error.stack);
        }
      }
      if (i === retries - 1) throw error;
      console.log(`Retrying in 5 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
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
  const mongoUri = MONGODB_URI;
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

// 更新的 DNS 檢查路由
const resolveSrv = promisify(dns.resolveSrv);
const resolve = promisify(dns.resolve);

app.get("/api/debug/dns", async (req: Request, res: Response) => {
  if (!MONGODB_URI) {
    return res.status(500).json({ error: "MongoDB URI is not defined" });
  }

  try {
    const url = new URL(MONGODB_URI);
    const mongoHost = url.hostname;

    let result: any = { mongoHost };

    try {
      // 嘗試 SRV 記錄解析
      const srvRecords = await resolveSrv(`_mongodb._tcp.${mongoHost}`);
      result.srvRecords = srvRecords;
    } catch (srvError) {
      result.srvError = (srvError as Error).message;
    }

    try {
      // 嘗試 A 記錄解析
      const addresses = await resolve(mongoHost);
      result.addresses = addresses;
    } catch (aError) {
      result.aError = (aError as Error).message;
    }

    if (!result.srvRecords && !result.addresses) {
      res.status(500).json({
        error: "Failed to resolve both SRV and A records",
        details: result
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to parse MongoDB URI" });
  }
});

// 網絡連接檢查路由
app.get("/api/debug/network", (req: Request, res: Response) => {
  const testUrl = "https://www.mongodb.com";

  https
    .get(testUrl, (response) => {
      res.json({
        status: "success",
        statusCode: response.statusCode,
        headers: response.headers
      });
    })
    .on("error", (error) => {
      res.status(500).json({
        status: "error",
        message: error.message
      });
    });
});

// 數據庫連接測試路由
app.get("/api/debug/db-connect", async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1) {
      res.json({
        status: "Already connected",
        dbName: mongoose.connection.name
      });
    } else {
      await connectToDatabase();
      res.json({
        status: "Connected successfully",
        dbName: mongoose.connection.name
      });
    }
  } catch (error) {
    console.error("Database connection test failed:", error);
    if (error instanceof Error) {
      res.status(500).json({
        status: "Connection failed",
        error: error.message,
        stack: error.stack
      });
    } else {
      res.status(500).json({
        status: "Connection failed",
        error: "An unknown error occurred"
      });
    }
  }
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
    if (MONGODB_URI) {
      console.log(
        "Effective MongoDB URI:",
        MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@")
      );
    } else {
      console.error("MongoDB URI is not defined");
    }

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
    // 不要立即退出，給一些時間讓日誌被發送
    setTimeout(() => {
      console.error("Server start-up failed. Exiting process.");
      process.exit(1);
    }, 1000);
  }
}

// 檢查是否直接運行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
