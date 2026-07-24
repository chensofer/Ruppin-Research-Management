import axiosInstance from './axiosInstance';

export const getMyNotifications    = () => axiosInstance.get('/notifications');
export const markNotificationRead  = (id) => axiosInstance.post(`/notifications/${id}/read`);
export const markAllRead           = () => axiosInstance.post('/notifications/read-all');
export const deleteNotification    = (id) => axiosInstance.delete(`/notifications/${id}`);
export const deleteAllNotifications = ()  => axiosInstance.delete('/notifications');
