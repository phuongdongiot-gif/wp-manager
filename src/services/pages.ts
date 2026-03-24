import { api } from './api';
import { WPPage, SiteCredential } from '../types/wordpress';

export const getPages = async (targetConfig?: string | SiteCredential): Promise<WPPage[]> => {
  return await api.request<WPPage[]>('/wp-json/wp/v2/pages?_embed=true&per_page=20', {}, targetConfig);
};

export const createPage = async (title: string, content: string, status: 'publish' | 'draft', targetConfig?: string | SiteCredential): Promise<WPPage> => {
  return await api.request<WPPage>('/wp-json/wp/v2/pages', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      status
    })
  }, targetConfig);
};

export const updatePage = async (id: number, title: string, content: string, status: 'publish' | 'draft', targetConfig?: string | SiteCredential): Promise<WPPage> => {
  return await api.request<WPPage>(`/wp-json/wp/v2/pages/${id}`, {
    method: 'POST', // WP REST API allows POST for updates
    body: JSON.stringify({
      title,
      content,
      status
    })
  }, targetConfig);
};

export const deletePage = async (id: number, targetConfig?: string | SiteCredential): Promise<boolean> => {
  await api.request(`/wp-json/wp/v2/pages/${id}?force=true`, {
    method: 'DELETE'
  }, targetConfig);
  return true;
};
