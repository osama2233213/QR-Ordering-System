const Category = require("../../models/Category");

/**
 * Category Service
 * Business logic for category CRUD operations with tenant isolation
 */

class CategoryService {
  /**
   * Create a new category
   * @param {string} restaurantId - Restaurant ID from JWT context (never from frontend)
   * @param {object} categoryData - { name, description, displayOrder }
   * @returns {object} Created category
   */
  async createCategory(restaurantId, categoryData) {
    try {
      // Validate required fields
      if (!categoryData.name || !categoryData.name.trim()) {
        const error = new Error("Category name is required");
        error.statusCode = 400;
        throw error;
      }

      // Create category with restaurantId from JWT context
      // CRITICAL: restaurantId comes from authenticated JWT, never from request body
      const category = await Category.create({
        restaurantId, // From JWT (req.user.restaurantId)
        name: categoryData.name.trim(),
        description: categoryData.description || "",
        displayOrder: categoryData.displayOrder || 0,
        isActive: true,
      });

      return category.toObject();
    } catch (error) {
      // Handle MongoDB duplicate key error (unique constraint violation)
      if (error.code === 11000) {
        const err = new Error(
          "Category name already exists for this restaurant",
        );
        err.statusCode = 409;
        throw err;
      }

      // Ensure error has statusCode for error handler
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * Get all categories for a restaurant
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {object} query - Optional query parameters { isActive }
   * @returns {array} Categories for the restaurant
   */
  async getCategoriesByRestaurant(restaurantId, query = {}) {
    try {
      // Build filter with restaurantId (MANDATORY - tenant isolation)
      const filter = { restaurantId };

      // Optional filter by active status
      if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true" || query.isActive === true;
      }

      // Query with restaurantId filter - returns only this restaurant's categories
      // .lean() for read-only performance optimization
      const categories = await Category.find(filter)
        .sort({ displayOrder: 1 })
        .lean();

      return categories;
    } catch (error) {
      error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Get single category by ID with ownership verification
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {string} categoryId - Category ID
   * @returns {object} Category if found and belongs to restaurant
   */
  async getCategoryById(restaurantId, categoryId) {
    try {
      // Find by both ID and restaurantId (ownership verification in query)
      const category = await Category.findOne({
        _id: categoryId,
        restaurantId, // CRITICAL: Only return if belongs to this restaurant
      });

      if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
      }

      return category.toObject();
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * Update category
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {string} categoryId - Category ID to update
   * @param {object} updateData - Fields to update
   * @returns {object} Updated category
   */
  async updateCategory(restaurantId, categoryId, updateData) {
    try {
      // Find category first for ownership verification
      const category = await Category.findById(categoryId);

      if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
      }

      // CRITICAL SECURITY: Verify category belongs to current restaurant
      if (category.restaurantId.toString() !== restaurantId) {
        const error = new Error(
          "Forbidden: Category does not belong to your restaurant",
        );
        error.statusCode = 403;
        throw error;
      }

      // Check for duplicate name if updating name
      if (updateData.name && updateData.name.trim() !== category.name) {
        const existing = await Category.findOne({
          restaurantId,
          name: updateData.name.trim(),
          _id: { $ne: categoryId }, // Exclude current category
        });

        if (existing) {
          const error = new Error("Category name already exists");
          error.statusCode = 409;
          throw error;
        }
      }

      // Prepare update fields (only allow certain fields)
      const updateFields = {};
      if (updateData.name !== undefined) {
        updateFields.name = updateData.name.trim();
      }
      if (updateData.description !== undefined) {
        updateFields.description = updateData.description;
      }
      if (updateData.displayOrder !== undefined) {
        updateFields.displayOrder = updateData.displayOrder;
      }
      if (updateData.isActive !== undefined) {
        updateFields.isActive = updateData.isActive;
      }

      // Perform update
      const updated = await Category.findByIdAndUpdate(
        categoryId,
        updateFields,
        { new: true }, // Return updated document
      );

      return updated.toObject();
    } catch (error) {
      // Handle duplicate key error
      if (error.code === 11000) {
        const err = new Error("Category name already exists");
        err.statusCode = 409;
        throw err;
      }

      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * Delete category (soft delete - set isActive to false)
   * @param {string} restaurantId - Restaurant ID from JWT context
   * @param {string} categoryId - Category ID to delete
   * @returns {object} Deleted category
   */
  async deleteCategory(restaurantId, categoryId) {
    try {
      // Find category
      const category = await Category.findById(categoryId);

      if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
      }

      // CRITICAL SECURITY: Verify category belongs to current restaurant
      if (category.restaurantId.toString() !== restaurantId) {
        const error = new Error(
          "Forbidden: Cannot delete another restaurant's category",
        );
        error.statusCode = 403;
        throw error;
      }

      // Soft delete: set isActive to false instead of hard delete
      // This preserves audit trail and prevents orphaned MenuItems
      const deleted = await Category.findByIdAndUpdate(
        categoryId,
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

module.exports = new CategoryService();
