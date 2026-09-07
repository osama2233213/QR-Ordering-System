const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./modules/auth/auth.routes");
const restaurantRoutes = require("./modules/restaurant/restaurant.routes");
const categoryRoutes = require("./modules/categories/category.routes");
const menuRoutes = require("./modules/menu/menu.routes");
const menuItemRoutes = require("./modules/menu-items/menu-items.routes");
const tableRoutes = require("./modules/table/table.routes");
const publicRoutes = require("./modules/public/public.routes");
const orderRoutes = require("./modules/order/order.routes");
const sessionRoutes = require("./modules/session/session.routes");
const devgateRoutes = require("./modules/devgate/devgate.routes");

const app = express();

// Core Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// API Routes Mounting
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/devgate", devgateRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
