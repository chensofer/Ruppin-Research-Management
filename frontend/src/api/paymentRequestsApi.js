import axiosInstance from './axiosInstance';

export const getPaymentRequestsByProject = (projectId) =>
  axiosInstance.get(`/projects/${projectId}/payment-requests`);

export const createPaymentRequest = (projectId, data) =>
  axiosInstance.post(`/projects/${projectId}/payment-requests`, data);

export const updatePaymentRequestStatus = (id, data) =>
  axiosInstance.put(`/payment-requests/${id}/status`, data);

export const getPendingPaymentRequests = () =>
  axiosInstance.get('/payment-requests/pending');

export const uploadQuotationFile = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance.post(`/payment-requests/${id}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
