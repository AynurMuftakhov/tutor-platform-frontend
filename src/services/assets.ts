import axios, { type AxiosError, type AxiosProgressEvent } from 'axios';
import api from './api';
import type { ImageAssetPage } from '../types/assets';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
const SUPPORTED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export function validateImageFile(file: File): string | undefined {
  const extension = file.name?.split('.').pop()?.toLowerCase();
  const typeOk = SUPPORTED_TYPES.has(file.type) || (extension ? SUPPORTED_EXTENSIONS.has(extension) : false);
  if (!typeOk) {
    return 'Unsupported image type';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File too large (max 10 MB)';
  }
  return undefined;
}

export interface UploadImageParams {
  file: File;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

export interface UploadImageResponse {
  url: string;
  alt?: string;
  caption?: string;
}

export async function uploadImageAsset({ file, onUploadProgress }: UploadImageParams): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<UploadImageResponse>('lessons-service/api/uploads/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const err = error as AxiosError;
      const status = err.response?.status;
      if (status === 413) {
        throw new Error('File too large (max 10 MB)');
      }
      if (status === 400) {
        throw new Error('Unsupported image type');
      }
    }
    throw new Error('Upload failed. Try again.');
  }
}

export async function fetchImageAssets(params: { offset: number; limit: number }): Promise<ImageAssetPage> {
  const response = await api.get('lessons-service/api/assets/images', { params });
  const data = response.data;

  if (Array.isArray(data)) {
    return { items: data };
  }

  if (data && typeof data === 'object') {
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.content)
        ? data.content
        : Array.isArray(data.results)
          ? data.results
          : [];
    const total = typeof data.total === 'number'
      ? data.total
      : typeof data.totalElements === 'number'
        ? data.totalElements
        : typeof data.count === 'number'
          ? data.count
          : undefined;
    return { items, total };
  }

  return { items: [] };
}
