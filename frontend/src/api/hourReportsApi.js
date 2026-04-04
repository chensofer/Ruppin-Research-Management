import axiosInstance from './axiosInstance';

export const getHourReports = (userId, projectId, month, year) =>
  axiosInstance.get('/hour-reports', { params: { userId, projectId, month, year } });

export const createHourReport = (data) =>
  axiosInstance.post('/hour-reports', data);

export const deleteHourReport = (id, userId) =>
  axiosInstance.delete(`/hour-reports/${id}`, { params: { userId } });

export const getMonthlyApproval = (userId, projectId, month, year) =>
  axiosInstance.get('/hour-reports/monthly', { params: { userId, projectId, month, year } });

export const submitMonthlyApproval = (data) =>
  axiosInstance.post('/hour-reports/monthly', data);

export const decideMonthlyApproval = (id, data) =>
  axiosInstance.put(`/hour-reports/monthly/${id}/decision`, data);

export const getPendingHourApprovals = (researcherId) =>
  axiosInstance.get('/hour-reports/monthly/pending', { params: { researcherId } });

export const getAssistantProjects = (userId) =>
  axiosInstance.get('/hour-reports/my-projects', { params: { userId } });
