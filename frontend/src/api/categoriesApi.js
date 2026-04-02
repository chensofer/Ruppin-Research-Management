import axiosInstance from './axiosInstance';

export const getCategories = () => axiosInstance.get('/categories');
export const createCategory = (data) => axiosInstance.post('/categories', data);
