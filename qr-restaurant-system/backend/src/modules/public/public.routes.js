const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const publicController = require('./public.controller');
const { validateResult } = require('../../utils/validators');

// Public customer routes (No JWT required, validated via URL params)
router.get(
  '/r/:restaurantId/t/:tableId',
  param('restaurantId').isMongoId().withMessage('Invalid restaurant ID format'),
  param('tableId').isMongoId().withMessage('Invalid table ID format'),
  validateResult,
  publicController.verifyTableAndGetRestaurant
);

router.get(
  '/r/:restaurantId/menu',
  param('restaurantId').isMongoId().withMessage('Invalid restaurant ID format'),
  validateResult,
  publicController.getPublicMenu
);

// Public helper for development demo table launcher
router.get('/demo-tables', publicController.getDemoTables);

module.exports = router;
