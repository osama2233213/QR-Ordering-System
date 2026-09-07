import axiosClient from "./axiosClient";

export const devgateApi = {
  // Directory & tenant creation
  getRestaurants: (params) => axiosClient.get("/devgate/restaurants", { params }),
  createRestaurant: (data) => axiosClient.post("/devgate/restaurants", data),
  getRestaurant: (id) => axiosClient.get(`/devgate/restaurants/${id}`),

  // Lifecycle actions
  approveRestaurant: (id) => axiosClient.patch(`/devgate/restaurants/${id}/approve`),
  suspendRestaurant: (id, reason) =>
    axiosClient.patch(`/devgate/restaurants/${id}/suspend`, { reason }),
  reactivateRestaurant: (id) =>
    axiosClient.patch(`/devgate/restaurants/${id}/reactivate`),
  resetAccess: (id, password) =>
    axiosClient.post(`/devgate/restaurants/${id}/reset-access`, { password }),

  // Platform insights & compliance
  getAnalytics: () => axiosClient.get("/devgate/analytics"),
  getAuditLogs: (params) => axiosClient.get("/devgate/audit-logs", { params }),
};
