import axiosClient from './axiosClient';

export const tableApi = {
  getTables: (params) => axiosClient.get('/tables', { params }),
  getTableById: (id) => axiosClient.get(`/tables/${id}`),
  createTable: (tableData) => axiosClient.post('/tables', tableData),
  updateTable: (id, data) => axiosClient.put(`/tables/${id}`, data),
  updateTableStatus: (id, status) => axiosClient.patch(`/tables/${id}/status`, { status }),
  deleteTable: (id) => axiosClient.delete(`/tables/${id}`),
  verifyTable: (restaurantId, tableId) => axiosClient.get(`/public/r/${restaurantId}/t/${tableId}`),
};
