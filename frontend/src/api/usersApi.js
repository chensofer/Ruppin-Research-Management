import axiosInstance from './axiosInstance';

export const getUsers = (role) =>
  axiosInstance.get('/users', { params: role ? { role } : {} });

export const getMe = () => axiosInstance.get('/users/me');
export const updateMe = (data) => axiosInstance.put('/users/me', data);
export const changePassword = (data) => axiosInstance.post('/users/me/change-password', data);
export const createAssistantUser = (data) => axiosInstance.post('/users/assistant', data);

export const getRoles = () => axiosInstance.get('/users/roles');
export const createUser = (data) => axiosInstance.post('/users', data);
export const updateUserRole = (userId, systemAuthorization) =>
  axiosInstance.put(`/users/${userId}/role`, { systemAuthorization });
export const deleteUser = (userId) => axiosInstance.delete(`/users/${userId}`);
