import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB, disconnectDB } from "./config/db.js";

// import routes
import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();
connectDB();



const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (file://, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    return callback(null, true); // or whitelist specific origins
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/auth", authRoutes);
app.use("/locations", locationRoutes);
app.use("/reports", reportRoutes);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
});

// Handling some common errors
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    server.close(async () => {
        await disconnectDB();
        process.exit(1);
    });
});

process.on("uncaughtException", async (err) => {
    console.error("Uncaught Exception:", err);
    await disconnectDB();
    process.exit(1);
});

process.on("SIGTERM", async (err) => {
    console.log("SIGTERM recieved, shutting down gracefully");
    server.close(async () => {
        await disconnectDB();
        process.exit(0);
    });
});