import axiosInstance from './axiosInstance';

export const getUsers = (role) =>
  axiosInstance.get('/users', { params: role ? { role } : {} });

export const getMe = () => axiosInstance.get('/users/me');
export const updateMe = (data) => axiosInstance.put('/users/me', data);
export const changePassword = (data) => axiosInstance.post('/users/me/change-password', data);
