import axiosInstance from './axiosInstance';

export const getPaymentRequestsByProject = (projectId) =>
  axiosInstance.get(`/projects/${projectId}/payment-requests`);

export const createPaymentRequest = (projectId, data) =>
  axiosInstance.post(`/projects/${projectId}/payment-requests`, data);

export const updatePaymentRequestStatus = (id, data) =>
  axiosInstance.put(`/payment-requests/${id}/status`, data);
