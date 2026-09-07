const express = require('express');
const router = express.Router();
const restaurantController = require('./restaurant.controller');
const authenticate = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');
const roleCheck = require('../../middleware/roleCheck');

router.use(authenticate, tenantContext);

router.get('/profile', roleCheck('restaurant_admin'), restaurantController.getProfile);
router.put('/profile', roleCheck('restaurant_admin'), restaurantController.updateProfile);

router.get(
  '/analytics/summary',
  roleCheck('restaurant_admin', 'kitchen_staff'),
  restaurantController.getDashboardSummary
);

router.get(
  '/analytics/sales',
  roleCheck('restaurant_admin'),
  restaurantController.getSalesAnalytics
);

module.exports = router;
