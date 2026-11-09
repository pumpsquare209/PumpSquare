import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import publicRoutes from "./routes/public.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Parse allowed origins from FRONTEND_ORIGINS (comma-separated) or fall back to FRONTEND_ORIGIN
function getAllowedOrigins() {
  const origins = new Set();
  if (env.FRONTEND_ORIGINS) {
    for (const o of env.FRONTEND_ORIGINS.split(",")) {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  // Always include the primary FRONTEND_ORIGIN
  origins.add(env.FRONTEND_ORIGIN);
  return Array.from(origins);
}

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, health checks, curl)
    if (!origin) return callback(null, true);
    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.some((allowed) => allowed.replace(/\/$/, "") === normalizedOrigin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Base64 uploads inflate payloads by ~33%, so allow headroom over the 10 MB file cap.
const bodyLimit = "16mb";
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(cookieParser());

app.use(generalRateLimiter);

app.use("/api", healthRoutes);
app.use("/api", chatRoutes);
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

function startServer() {
  const port = env.PORT;
  const server = app.listen(port, () => {
    console.log(`🚀 Pumpsquare API running on port ${port}`);
    console.log(`📍 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}`);
    console.log(`🤖 Sarvam Model: ${env.SARVAM_MODEL}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${port} is already in use.`);
      console.error(`   Another process is listening on port ${port}.`);
      console.error(`   Stop the other process or change PORT in .env.`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
    // Force close after 10 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return server;
}

const server = startServer();

export default app;