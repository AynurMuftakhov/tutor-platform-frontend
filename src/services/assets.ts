import axios, { type AxiosError, type AxiosProgressEvent } from 'axios';
import api from './api';
import type { ImageAssetPage } from '../types/assets';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
const SUPPORTED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export function resolveUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  // Absolute or data URL
  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `${window.location.protocol}${trimmed}`;

  let path = trimmed;
  // Normalize common backend responses
  if (path.startsWith('uploads/')) path = `/lessons-service/${path}`;
  if (path.startsWith('/uploads/')) path = `/lessons-service${path}`;
  if (path.startsWith('lessons-service/')) path = `/${path}`;

  // If it's a lessons-service path, prefix API base to pass through proxy
  if (path.startsWith('/lessons-service/')) {
    const base = ((import.meta as any).env?.VITE_API_URL as string | undefined) || '/api';
    const baseClean = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${baseClean}${path}`;
  }

  // Ensure a leading slash for other relative paths
  return path.startsWith('/') ? path : `/${path}`;
}

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
    const data = response.data;
    return { ...data, url: resolveUrl(data.url) };
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

  const mapItems = (arr: any[]): any[] => arr.map((it) => ({ ...it, url: resolveUrl(it.url) }));

  if (Array.isArray(data)) {
    return { items: mapItems(data) };
  }

  if (data && typeof data === 'object') {
    const rawItems = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.content)
        ? data.content
        : Array.isArray(data.results)
          ? data.results
          : [];
    const items = mapItems(rawItems);
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
