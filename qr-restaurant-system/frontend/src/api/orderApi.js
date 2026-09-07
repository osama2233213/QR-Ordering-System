import axiosClient from './axiosClient';

export const orderApi = {
  placeOrder: (orderData) => axiosClient.post('/orders/place', orderData),
  trackOrder: (orderId) => axiosClient.get(`/orders/track/${orderId}`),
  getRestaurantOrders: (params) => axiosClient.get('/orders', { params }),
  updateOrderStatus: (orderId, status) => axiosClient.patch(`/orders/${orderId}/status`, { status }),
};
