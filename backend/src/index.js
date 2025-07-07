import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Import database connection
import connectDB from "./config/db.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";

// Import middleware
import { handleMulterError } from "./config/multer.js";

// Load environment variables
dotenv.config();

// Get current directory (ES6 modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Vite default port
    credentials: true,
  })
);

app.use(morgan("dev")); // Logging
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded bodies

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Novanector API Server is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      uploads: "/uploads",
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);

// Handle multer errors
app.use(handleMulterError);

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔄 Shutting down server gracefully...");
  await mongoose.connection.close();
  console.log("✅ Database connection closed");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🌟 Server listening on port ${PORT}`);
  console.log(`🔗 Server URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/auth`);
});
