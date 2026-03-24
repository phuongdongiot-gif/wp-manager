import { fetch } from '@tauri-apps/plugin-http';
import { useStore } from './store';
import { SiteCredential } from '../types/wordpress';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  private async getTargetSite(targetConfig?: string | SiteCredential): Promise<SiteCredential> {
    if (typeof targetConfig === 'object') {
      return targetConfig; // Direct credential provided
    }

    const store = useStore();
    const targetId = targetConfig || await store.getActiveSiteId();
    if (!targetId) throw new Error('No site targeted or active');
    
    const sites = await store.getSites();
    const site = sites.find(s => s.id === targetId);
    if (!site) throw new Error('Targeted site not found in storage');
    
    return site;
  }

  private async getHeaders(site: SiteCredential): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (site.username && site.password) {
      const cleanUser = site.username.trim();
      const cleanPass = site.password.trim();
      const credentials = btoa(`${cleanUser}:${cleanPass}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, targetConfig?: string | SiteCredential): Promise<T> {
    const targetSite = await this.getTargetSite(targetConfig);
    const headers = await this.getHeaders(targetSite);
    
    const response = await fetch(`${targetSite.url}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.message || `API Error: ${response.status}`, response.status, errorData);
    }

    return response.json();
  }

  async uploadMedia(file: File, targetConfig?: string | SiteCredential): Promise<any> {
    const targetSite = await this.getTargetSite(targetConfig);
    const headers = await this.getHeaders(targetSite) as Record<string, string>;
    
    // For FormData, we must NOT set Content-Type manually so the fetch API can set the multipart boundary
    if (headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    const formData = new FormData();
    formData.append('file', file);
    // Alternatively wordpess also accepts Content-Disposition filename in raw body, but FormData is usually fine.

    const response = await fetch(`${targetSite.url}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.message || `Media Upload Error: ${response.status}`, response.status, errorData);
    }

    return response.json();
  }
}

export const api = new ApiService();
