import axiosInstance from './axiosInstance';

export const getProviders = () => axiosInstance.get('/providers');
export const createProvider = (data) => axiosInstance.post('/providers', data);
