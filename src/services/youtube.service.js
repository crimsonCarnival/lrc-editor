import { request } from './api.client';

export const youtube = {
  search: async (query) => {
    return request(`/youtube/search?q=${encodeURIComponent(query)}`);
  },
};
