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
  return await api.request<WPPost>('/wp-json/wp/v2/posts', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      status,
      ...(featured_media ? { featured_media } : {}),
      ...(meta ? { meta } : {}),
      ...(categories && categories.length > 0 ? { categories } : {})
    })
  }, targetConfig);
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
  return await api.request<WPPost>(`/wp-json/wp/v2/posts/${id}`, {
    method: 'POST', // WP REST API handles POST for updating
    body: JSON.stringify({
      title,
      content,
      status,
      ...(featured_media ? { featured_media } : {}),
      ...(meta ? { meta } : {}),
      ...(categories && categories.length > 0 ? { categories } : {})
    })
  }, targetConfig);
};

export const deletePost = async (id: number, siteId?: string): Promise<boolean> => {
  await api.request(`/wp-json/wp/v2/posts/${id}`, {
    method: 'DELETE'
  }, siteId);
  return true;
};
