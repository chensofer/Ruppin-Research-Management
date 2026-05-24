import axiosInstance from './axiosInstance';

export const getAuditLogs = (projectId) =>
  axiosInstance.get(`/projects/${projectId}/audit-logs`);
