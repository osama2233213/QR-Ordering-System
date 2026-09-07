const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const orderController = require('./order.controller');
const guestAuth = require('../../middleware/guestAuth');
const authenticate = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');
const roleCheck = require('../../middleware/roleCheck');
const { validateResult } = require('../../utils/validators');

// ==========================================
// Customer / Guest Routes (Session Protected)
// ==========================================

// Place an order for the active guest session
router.post(
  '/place',
  guestAuth,
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.menuItemId')
    .isMongoId()
    .withMessage('Each item must have a valid menuItemId'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item quantity must be an integer >= 1'),
  validateResult,
  orderController.placeOrder
);

// Track order status for the active guest session
router.get(
  '/track/:orderId',
  guestAuth,
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  validateResult,
  orderController.getOrderForGuest
);

// ==========================================
// Staff / Admin Routes (JWT Protected)
// ==========================================

// List orders for the authenticated restaurant
router.get(
  '/',
  authenticate,
  tenantContext,
  roleCheck('restaurant_admin', 'kitchen_staff'),
  orderController.getRestaurantOrders
);

// Update order status (kitchen/staff flow)
router.patch(
  '/:orderId/status',
  authenticate,
  tenantContext,
  roleCheck('restaurant_admin', 'kitchen_staff'),
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('status')
    .isIn(['Placed', 'Received', 'Preparing', 'Ready', 'Served', 'Cancelled'])
    .withMessage('Invalid status value'),
  validateResult,
  orderController.updateStatus
);

module.exports = router;
