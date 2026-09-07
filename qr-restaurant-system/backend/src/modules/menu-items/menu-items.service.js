const MenuItem = require("../../models/MenuItem");
const Category = require("../../models/Category");

/**
 * Menu Items Service
 * Business logic for admin menu item CRUD operations with tenant isolation
 *
 * SECURITY RULES:
 * 1. restaurantId ALWAYS from JWT context, NEVER from request body
 * 2. Verify categoryId belongs to same restaurant (prevent cross-tenant usage)
 * 3. All queries filtered by restaurantId (tenant isolation at DB level)
 * 4. Ownership verified before UPDATE/DELETE (403 if not owner)
 * 5. Soft delete pattern: set isActive: false instead of hard delete
 */

class MenuItemsService {
  /**
   * Create a new menu item
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {object} menuItemData - { name, categoryId, description, price, imageUrl, preparationTimeMinutes }
   * @returns {object} Created menu item
   */
  async createMenuItem(restaurantId, menuItemData) {
    try {
      // Validate required fields
      if (!menuItemData.name || !menuItemData.name.trim()) {
        const error = new Error("Menu item name is required");
        error.statusCode = 400;
        throw error;
      }

      if (!menuItemData.categoryId) {
        const error = new Error("Category ID is required");
        error.statusCode = 400;
        throw error;
      }

      if (menuItemData.price === undefined || menuItemData.price === null) {
        const error = new Error("Price is required");
        error.statusCode = 400;
        throw error;
      }

      // CRITICAL SECURITY: Verify categoryId belongs to same restaurant
      // Prevent Restaurant A from using Restaurant B's categories
      const category = await Category.findOne({
        _id: menuItemData.categoryId,
        restaurantId, // Must belong to this restaurant
      });

      if (!category) {
        const error = new Error(
          "Category not found or does not belong to your restaurant",
        );
        error.statusCode = 403;
        throw error;
      }

      // Create menu item with restaurantId from JWT
      const menuItem = await MenuItem.create({
        restaurantId, // From JWT (req.user.restaurantId)
        categoryId: menuItemData.categoryId,
        name: menuItemData.name.trim(),
        description: menuItemData.description || "",
        price: menuItemData.price,
        imageUrl: menuItemData.imageUrl || "",
        preparationTimeMinutes: menuItemData.preparationTimeMinutes || 15,
        isAvailable: true, // Default to available
        isActive: true, // Default to active
      });

      return menuItem.toObject();
    } catch (error) {
      // Ensure error has statusCode
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * Get all menu items for a restaurant
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {object} query - Optional query parameters { categoryId, isAvailable }
   * @returns {array} Menu items
   */
  async getMenuItems(restaurantId, query = {}) {
    try {
      // Build filter with restaurantId (MANDATORY - tenant isolation)
      const filter = { restaurantId, isActive: true }; // Exclude soft-deleted

      // Optional filter by category
      if (query.categoryId) {
        filter.categoryId = query.categoryId;
      }

      // Optional filter by availability
      if (query.isAvailable !== undefined) {
        filter.isAvailable =
          query.isAvailable === "true" || query.isAvailable === true;
      }

      // Query with restaurantId filter - returns only this restaurant's items
      const menuItems = await MenuItem.find(filter)
        .populate("categoryId", "name displayOrder") // Include category name
        .sort({ name: 1 })
        .lean(); // .lean() for read-only performance

      return menuItems;
    } catch (error) {
      error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Get single menu item by ID with ownership verification
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {string} menuItemId - Menu item ID
   * @returns {object} Menu item if found and belongs to restaurant
   */
  async getMenuItemById(restaurantId, menuItemId) {
    try {
      // Find by both ID and restaurantId (ownership verification in query)
      const menuItem = await MenuItem.findOne({
        _id: menuItemId,
        restaurantId, // CRITICAL: Only return if belongs to this restaurant
      }).populate("categoryId", "name");

      if (!menuItem) {
        const error = new Error("Menu item not found");
        error.statusCode = 404;
        throw error;
      }

      return menuItem.toObject();
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * Update menu item
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {string} menuItemId - Menu item ID to update
   * @param {object} updateData - Fields to update
   * @returns {object} Updated menu item
   */
  async updateMenuItem(restaurantId, menuItemId, updateData) {
    try {
      // Find menu item first for ownership verification
      const menuItem = await MenuItem.findById(menuItemId);

      if (!menuItem) {
        const error = new Error("Menu item not found");
        error.statusCode = 404;
        throw error;
      }

      // CRITICAL SECURITY: Verify menu item belongs to current restaurant
      if (menuItem.restaurantId.toString() !== restaurantId) {
        const error = new Error(
          "Forbidden: Menu item does not belong to your restaurant",
        );
        error.statusCode = 403;
        throw error;
      }

      // If updating categoryId, verify it belongs to same restaurant
      if (
        updateData.categoryId &&
        updateData.categoryId !== menuItem.categoryId.toString()
      ) {
        const category = await Category.findOne({
          _id: updateData.categoryId,
          restaurantId,
        });

        if (!category) {
          const error = new Error(
            "Category not found or does not belong to your restaurant",
          );
          error.statusCode = 403;
          throw error;
        }
      }

      // Prepare update fields (only allow certain fields)
      const updateFields = {};
      if (updateData.name !== undefined) {
        updateFields.name = updateData.name.trim();
      }
      if (updateData.categoryId !== undefined) {
        updateFields.categoryId = updateData.categoryId;
      }
      if (updateData.description !== undefined) {
        updateFields.description = updateData.description;
      }
      if (updateData.price !== undefined) {
        updateFields.price = updateData.price;
      }
      if (updateData.imageUrl !== undefined) {
        updateFields.imageUrl = updateData.imageUrl;
      }
      if (updateData.preparationTimeMinutes !== undefined) {
        updateFields.preparationTimeMinutes = updateData.preparationTimeMinutes;
      }
      // Note: isAvailable updated via separate method
      // Note: isActive updated via soft delete method

      // Perform update
      const updated = await MenuItem.findByIdAndUpdate(
        menuItemId,
        updateFields,
        { new: true },
      ).populate("categoryId", "name");

      return updated.toObject();
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * Update menu item availability
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {string} menuItemId - Menu item ID
   * @param {boolean} isAvailable - Availability status
   * @returns {object} Updated menu item
   */
  async updateAvailability(restaurantId, menuItemId, isAvailable) {
    try {
      // Find menu item first for ownership verification
      const menuItem = await MenuItem.findById(menuItemId);

      if (!menuItem) {
        const error = new Error("Menu item not found");
        error.statusCode = 404;
        throw error;
      }

      // CRITICAL SECURITY: Verify ownership
      if (menuItem.restaurantId.toString() !== restaurantId) {
        const error = new Error(
          "Forbidden: Menu item does not belong to your restaurant",
        );
        error.statusCode = 403;
        throw error;
      }

      // Update availability
      const updated = await MenuItem.findByIdAndUpdate(
        menuItemId,
        { isAvailable },
        { new: true },
      ).populate("categoryId", "name");

      return updated.toObject();
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * Delete menu item (soft delete - set isActive to false)
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {string} menuItemId - Menu item ID to delete
   * @returns {object} Deleted menu item
   */
  async deleteMenuItem(restaurantId, menuItemId) {
    try {
      // Find menu item
      const menuItem = await MenuItem.findById(menuItemId);

      if (!menuItem) {
        const error = new Error("Menu item not found");
        error.statusCode = 404;
        throw error;
      }

      // CRITICAL SECURITY: Verify menu item belongs to current restaurant
      if (menuItem.restaurantId.toString() !== restaurantId) {
        const error = new Error(
          "Forbidden: Cannot delete another restaurant's menu item",
        );
        error.statusCode = 403;
        throw error;
      }

      // Soft delete: set isActive to false instead of hard delete
      // This preserves audit trail and prevents orphaned references
      const deleted = await MenuItem.findByIdAndUpdate(
        menuItemId,
        { isActive: false },
        { new: true },
      );

      return deleted.toObject();
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }
}

module.exports = new MenuItemsService();
