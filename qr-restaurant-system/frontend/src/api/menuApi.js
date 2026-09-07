import axiosClient from './axiosClient';

export const menuApi = {
  // Public customer menu
  getPublicMenu: (restaurantId) => axiosClient.get(`/public/r/${restaurantId}/menu`),

  // Category Management (Admin)
  getCategories: (params) => axiosClient.get('/categories', { params }),
  createCategory: (data) => axiosClient.post('/categories', data),
  updateCategory: (id, data) => axiosClient.put(`/categories/${id}`, data),
  deleteCategory: (id) => axiosClient.delete(`/categories/${id}`),

  // Menu Item Management (Admin)
  getMenuItems: (params) => axiosClient.get('/menu-items', { params }),
  getMenuItemById: (id) => axiosClient.get(`/menu-items/${id}`),
  createMenuItem: (data) => axiosClient.post('/menu-items', data),
  updateMenuItem: (id, data) => axiosClient.put(`/menu-items/${id}`, data),
  updateAvailability: (id, isAvailable) => axiosClient.patch(`/menu-items/${id}/availability`, { isAvailable }),
  deleteMenuItem: (id) => axiosClient.delete(`/menu-items/${id}`),
};
