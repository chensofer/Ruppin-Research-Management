import axiosInstance from './axiosInstance';

export const getUsers = (role) =>
  axiosInstance.get('/users', { params: role ? { role } : {} });
