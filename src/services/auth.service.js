import { request } from './api.client.js';

export const authService = {
  async register({ username, email, password }) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  async login({ identifier, password }) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  async refresh(refreshToken) {
    return request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  async me() {
    return request('/auth/me');
  },

  async updateProfile(data) {
    return request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async submitAppeal(appealText) {
    return request('/auth/appeal', {
      method: 'POST',
      body: JSON.stringify({ appealText }),
    });
  },

  async clearUnbanMessage() {
    return request('/auth/clear-unban-message', {
      method: 'POST',
    });
  },
};
