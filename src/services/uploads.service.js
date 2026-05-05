import { request } from './api.client.js';

export const uploadsService = {
  async getSignature({ fileName, fileSize }) {
    return request('/uploads/signature', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileSize }),
    });
  },

  /**
   * Upload a file to Cloudinary using a server-signed request.
   * Returns { secure_url, public_id, duration }.
   */
  async uploadToCloudinary(file) {
    // 1. Get signature from our server
    const { signature, timestamp, cloudName, apiKey, folder, resourceType } =
      await this.getSignature({ fileName: file.name, fileSize: file.size });

    // 2. Upload directly to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);
    // NOTE: resource_type is a URL path param, not a form field

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      duration: data.duration || null,
    };
  },

  // ── Media library ──

  async listMedia({ limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return request(`/uploads/media?${params.toString()}`);
  },

  async saveMedia(data) {
    return request('/uploads/media', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMedia(id) {
    return request(`/uploads/media/${encodeURIComponent(id)}`);
  },

  async deleteMedia(id) {
    return request(`/uploads/media/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async updateMedia(id, data) {
    return request(`/uploads/media/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // ── Avatar & Cover ──

  async getAvatarSignature() {
    return request('/uploads/avatar-signature', { method: 'POST' });
  },

  async uploadAvatar(file) {
    const result = await this.uploadImage(file, this.getAvatarSignature.bind(this));
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  },

  /**
   * Upload an image to Cloudinary (for avatars).
   * Returns { secure_url, public_id }.
   */
  async uploadImage(file, signatureGetter) {
    const { signature, timestamp, cloudName, apiKey, folder, resourceType } =
      await signatureGetter();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  },
};
