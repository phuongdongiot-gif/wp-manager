import { api } from './api';
import { WPPost, SiteCredential } from '../types/wordpress';

export const getPosts = async (siteId?: string): Promise<WPPost[]> => {
  return await api.request<WPPost[]>('/wp-json/wp/v2/posts?_embed=true&per_page=20', {}, siteId);
};

export const createPost = async (
  title: string, 
  content: string, 
  status: 'publish' | 'draft', 
  featured_media?: number,
  meta?: Record<string, string>,
  categories?: number[],
  targetConfig?: string | SiteCredential
): Promise<WPPost> => {
  const payload: any = {
    title,
    content,
    status,
    ...(featured_media ? { featured_media } : {}),
    ...(meta ? { meta } : {}),
    ...(categories && categories.length > 0 ? { categories } : {})
  };

  try {
    return await api.request<WPPost>('/wp-json/wp/v2/posts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, targetConfig);
  } catch (error: any) {
    if (error.status === 400 && meta) {
      console.warn('RankMath API missing, retrying without meta...');
      delete payload.meta;
      return await api.request<WPPost>('/wp-json/wp/v2/posts', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, targetConfig);
    }
    throw error;
  }
};

export const updatePost = async (
  id: number,
  title: string, 
  content: string, 
  status: 'publish' | 'draft', 
  featured_media?: number,
  meta?: Record<string, string>,
  categories?: number[],
  targetConfig?: string | SiteCredential
): Promise<WPPost> => {
  const payload: any = {
    title,
    content,
    status,
    ...(featured_media ? { featured_media } : {}),
    ...(meta ? { meta } : {}),
    ...(categories && categories.length > 0 ? { categories } : {})
  };

  try {
    return await api.request<WPPost>(`/wp-json/wp/v2/posts/${id}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, targetConfig);
  } catch (error: any) {
    if (error.status === 400 && meta) {
      console.warn('RankMath API missing, retrying without meta...');
      delete payload.meta;
      return await api.request<WPPost>(`/wp-json/wp/v2/posts/${id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }, targetConfig);
    }
    throw error;
  }
};

export const deletePost = async (id: number, siteId?: string): Promise<boolean> => {
  await api.request(`/wp-json/wp/v2/posts/${id}`, {
    method: 'DELETE'
  }, siteId);
  return true;
};

export const createCategory = async (name: string, targetConfig?: string | SiteCredential): Promise<{id: number, name: string}> => {
  const payload = { name };
  return await api.request<{id: number, name: string}>('/wp-json/wp/v2/categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, targetConfig);
};
