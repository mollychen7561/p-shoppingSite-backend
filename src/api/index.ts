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

mongoose.set("debug", true);

const app = express();
const PORT = process.env.PORT || 5001;

// 優化的數據庫連接邏輯
let cachedDb: mongoose.Connection | null = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.CLOUD_MONGODB_URI ||
    process.env.LOCAL_MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("MongoDB URI is not defined");
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    cachedDb = conn.connection;
    console.log(`Connected to MongoDB: ${cachedDb.name}`);
    return cachedDb;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

// CORS 設置
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://p-shopping-site-frontend.vercel.app",
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());

// 中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 性能監控中間件
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
});

// 確保數據庫連接
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

// 路由
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the root of my API");
});

app.get("/api", (req: Request, res: Response) => {
  res.send("Welcome to my API");
});

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

app.use("/api/users", userRoutes);

app.get("/api/debug/env", (req: Request, res: Response) => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.CLOUD_MONGODB_URI ||
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

const resolveSrv = promisify(dns.resolveSrv);
const resolve = promisify(dns.resolve);

app.get("/api/debug/dns", async (req: Request, res: Response) => {
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.CLOUD_MONGODB_URI ||
    process.env.LOCAL_MONGODB_URI;
  if (!MONGODB_URI) {
    return res.status(500).json({ error: "MongoDB URI is not defined" });
  }

  try {
    const url = new URL(MONGODB_URI);
    const mongoHost = url.hostname;

    let result: any = { mongoHost };

    try {
      const srvRecords = await resolveSrv(`_mongodb._tcp.${mongoHost}`);
      result.srvRecords = srvRecords;
    } catch (srvError) {
      result.srvError = (srvError as Error).message;
    }

    try {
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

// 404 處理
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// 錯誤處理
app.use(errorHandler);

// 啟動服務器（僅在直接運行此文件時）
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
