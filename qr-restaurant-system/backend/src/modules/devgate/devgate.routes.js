const express = require("express");
const router = express.Router();
const devgateController = require("./devgate.controller");
const authenticate = require("../../middleware/auth");
const roleCheck = require("../../middleware/roleCheck");

// Super-admin only zone — all routes require valid devgate_admin role
router.use(authenticate, roleCheck("devgate_admin"));

// Platform analytics
router.get("/analytics", devgateController.getAnalytics);

// Platform audit logs
router.get("/audit-logs", devgateController.getAuditLogs);

// Restaurant directory & creation
router.get("/restaurants", devgateController.getRestaurants);
router.post("/restaurants", devgateController.createRestaurant);
router.get("/restaurants/:id", devgateController.getRestaurantById);

// Restaurant lifecycle actions
router.patch("/restaurants/:id/approve", devgateController.approve);
router.patch("/restaurants/:id/suspend", devgateController.suspend);
router.patch("/restaurants/:id/reactivate", devgateController.reactivate);
router.post("/restaurants/:id/reset-access", devgateController.resetAccess);

module.exports = router;
