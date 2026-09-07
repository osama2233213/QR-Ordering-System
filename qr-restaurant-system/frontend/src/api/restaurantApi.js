import axiosClient from './axiosClient';

export const restaurantApi = {
  getProfile: () => axiosClient.get('/restaurant/profile'),
  updateProfile: (data) => axiosClient.put('/restaurant/profile', data),
  getDashboardSummary: () => axiosClient.get('/restaurant/analytics/summary'),
  getSalesAnalytics: (params) => axiosClient.get('/restaurant/analytics/sales', { params }),
};
