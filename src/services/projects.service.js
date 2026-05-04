import { request } from './api.client.js';

export const projectsService = {
  async create(data) {
    return request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list() {
    return request('/projects');
  },

  async get(projectId) {
    return request(`/projects/${encodeURIComponent(projectId)}`);
  },

  async update(projectId, data) {
    return request(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async patch(projectId, data) {
    return request(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async remove(projectId) {
    return request(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
  },

  async getShare(projectId) {
    return request(`/projects/share/${encodeURIComponent(projectId)}`);
  },

  async clone(projectId) {
    return request(`/projects/clone/${encodeURIComponent(projectId)}`, {
      method: 'POST',
    });
  },
};
