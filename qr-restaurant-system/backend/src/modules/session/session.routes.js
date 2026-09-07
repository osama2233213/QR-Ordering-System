const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const sessionController = require("./session.controller");
const guestAuth = require("../../middleware/guestAuth");
const { validateResult } = require("../../utils/validators");

// Public: Initialize a new guest session
router.post(
  "/init",
  body("restaurantId").isMongoId().withMessage("Invalid restaurant ID format"),
  body("tableId").isMongoId().withMessage("Invalid table ID format"),
  validateResult,
  sessionController.initSession,
);

// Protected by guestAuth: Switch table for the active session
router.post(
  "/switch-table",
  guestAuth,
  body("newTableId").isMongoId().withMessage("Invalid new table ID format"),
  validateResult,
  sessionController.switchTable,
);

// Protected by guestAuth: Get current session status
router.get("/status", guestAuth, sessionController.getSessionStatus);

module.exports = router;
