export interface WPUser {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: {
    [key: string]: string;
  };
  meta: any[];
}

export interface SiteCredential {
  id: string; // url as ID or a uuid
  url: string;
  username: string;
  password?: string; // App password
  siteName?: string; // From the WP API
}

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private';
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;
  template: string;
  format: string;
  meta: any[];
  categories: number[];
  tags: number[];
}

export interface WPPage extends Omit<WPPost, 'categories' | 'tags' | 'format' | 'sticky'> {
  parent: number;
  menu_order: number;
}
