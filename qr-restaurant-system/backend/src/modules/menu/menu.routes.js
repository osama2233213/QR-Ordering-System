const express = require('express');
const router = express.Router();
const menuController = require('./menu.controller');
const authenticate = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');

router.use(authenticate, tenantContext);

router.get('/categories', menuController.getCategories);
router.get('/items', menuController.getMenuItems);

module.exports = router;
