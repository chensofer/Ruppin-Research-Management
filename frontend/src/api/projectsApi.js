import axiosInstance from './axiosInstance';

export const getProjects = () => axiosInstance.get('/projects');
export const getProject = (id) => axiosInstance.get(`/projects/${id}`);
export const getProjectDetail = (id) => axiosInstance.get(`/projects/${id}/detail`);
export const createProject = (data) => axiosInstance.post('/projects', data);
export const createFullProject = (data) => axiosInstance.post('/projects/full', data);
export const updateProject = (id, data) => axiosInstance.put(`/projects/${id}`, data);
export const deleteProject = (id) => axiosInstance.delete(`/projects/${id}`);

// Files
export const uploadProjectFile = (projectId, formData) =>
  axiosInstance.post(`/projects/${projectId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getProjectFiles = (projectId) => axiosInstance.get(`/projects/${projectId}/files`);
export const deleteProjectFile = (projectId, fileId) =>
  axiosInstance.delete(`/projects/${projectId}/files/${fileId}`);

// Team
export const getProjectTeam = (projectId) => axiosInstance.get(`/projects/${projectId}/team`);
export const addTeamMember = (projectId, data) => axiosInstance.post(`/projects/${projectId}/team`, data);
export const removeTeamMember = (projectId, userId) =>
  axiosInstance.delete(`/projects/${projectId}/team/${userId}`);

// Assistants
export const getProjectAssistants = (projectId) => axiosInstance.get(`/projects/${projectId}/assistants`);
export const addAssistant = (projectId, data) => axiosInstance.post(`/projects/${projectId}/assistants`, data);
export const createAndAddAssistant = (projectId, data) => axiosInstance.post(`/projects/${projectId}/assistants/new`, data);
export const removeAssistant = (projectId, userId) =>
  axiosInstance.delete(`/projects/${projectId}/assistants/${userId}`);
export const updateAssistant = (projectId, userId, data) =>
  axiosInstance.put(`/projects/${projectId}/assistants/${userId}`, data);
export const getAssistantTracking = (projectId, userId) =>
  axiosInstance.get(`/projects/${projectId}/assistants/${userId}/tracking`);

// Future commitments
export const getCommitments = (projectId) => axiosInstance.get(`/projects/${projectId}/commitments`);
export const addCommitment = (projectId, data) => axiosInstance.post(`/projects/${projectId}/commitments`, data);
export const deleteCommitment = (projectId, commitmentId) =>
  axiosInstance.delete(`/projects/${projectId}/commitments/${commitmentId}`);
