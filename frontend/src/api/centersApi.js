import axiosInstance from './axiosInstance';

export const getCenters = () => axiosInstance.get('/centers');
