import axiosInstance from './axiosInstance';

export const getProjects = () => axiosInstance.get('/projects');
export const getProject = (id) => axiosInstance.get(`/projects/${id}`);
export const getProjectDetail = (id) => axiosInstance.get(`/projects/${id}/detail`);
export const createProject = (data) => axiosInstance.post('/projects', data);
export const createFullProject = (data) => axiosInstance.post('/projects/full', data);
export const updateProject = (id, data) => axiosInstance.put(`/projects/${id}`, data);
export const deleteProject   = (id) => axiosInstance.delete(`/projects/${id}`);
export const archiveProject  = (id) => axiosInstance.post(`/projects/${id}/archive`);
export const restoreProject  = (id) => axiosInstance.post(`/projects/${id}/restore`);
export const getArchivedProjects = () => axiosInstance.get('/projects/archived');

// Folders
export const getProjectFolders = (projectId) =>
  axiosInstance.get(`/projects/${projectId}/folders`);
export const createProjectFolder = (projectId, folderName) =>
  axiosInstance.post(`/projects/${projectId}/folders`, { folderName });

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

// Budget categories
export const getBudgetCategories = (projectId) => axiosInstance.get(`/projects/${projectId}/budget-categories`);
export const updateBudgetCategories = (projectId, categories) =>
  axiosInstance.put(`/projects/${projectId}/budget-categories`, { categories });

// Future commitments
export const getCommitments = (projectId) => axiosInstance.get(`/projects/${projectId}/commitments`);
export const addCommitment = (projectId, data) => axiosInstance.post(`/projects/${projectId}/commitments`, data);
export const updateCommitment = (projectId, commitmentId, data) =>
  axiosInstance.put(`/projects/${projectId}/commitments/${commitmentId}`, data);
export const deleteCommitment = (projectId, commitmentId) =>
  axiosInstance.delete(`/projects/${projectId}/commitments/${commitmentId}`);
export const uploadCommitmentFile = (projectId, commitmentId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return axiosInstance.post(`/projects/${projectId}/commitments/${commitmentId}/files`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Budget transfer
export const getAllProjects = () => axiosInstance.get('/projects/all');
export const transferBudget = (sourceId, data) =>
  axiosInstance.post(`/projects/${sourceId}/transfer-budget`, data);

// Smart component (Python ML) insights - risk score + clustering per project
export const getMlInsights = () => axiosInstance.get('/projects/ml-insights');

// Budget transfer request email — sends email to giver PI when requester doesn't own the giver project
export const requestBudgetTransfer = (giverProjectId, receiverProjectId, amount) =>
  axiosInstance.post('/projects/budget-transfer-request', { giverProjectId, receiverProjectId, amount });
