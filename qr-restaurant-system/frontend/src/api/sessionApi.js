import axiosClient from './axiosClient';

export const sessionApi = {
  initSession: (data) => axiosClient.post('/session/init', data),
  switchTable: (data) => axiosClient.post('/session/switch-table', data),
  getSessionStatus: () => axiosClient.get('/session/status'),
};
