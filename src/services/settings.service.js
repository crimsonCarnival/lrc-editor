import { request } from './api.client.js';

export const settingsService = {
  async get() {
    return request('/settings');
  },

  async save(data) {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async patch(data) {
    return request('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async reset() {
    return request('/settings', { method: 'DELETE' });
  },
};
