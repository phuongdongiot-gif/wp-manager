import { SiteCredential, WCProduct, WCCategory } from '../types/wordpress';
import { fetch } from '@tauri-apps/plugin-http';

export const getProducts = async (site: SiteCredential, page: number = 1, perPage: number = 20): Promise<WCProduct[]> => {
  const credentials = btoa(`${site.username}:${site.password}`);
  const response = await fetch(`${site.url}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&order=desc&orderby=date`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Plugin_WooCommerce_Not_Found: Website này chưa được cài đặt WooCommerce hoặc REST API bị tắt. Vui lòng kiểm tra lại hệ thống của bạn.');
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to fetch products');
  }

  return await response.json() as WCProduct[];
};

export const createProduct = async (site: SiteCredential, data: Partial<WCProduct>): Promise<WCProduct> => {
  const credentials = btoa(`${site.username}:${site.password}`);
  const response = await fetch(`${site.url}/wp-json/wc/v3/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Plugin_WooCommerce_Not_Found: Website này chưa được cài đặt WooCommerce hoặc REST API bị tắt. Vui lòng kiểm tra lại hệ thống của bạn.');
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to create product');
  }

  return await response.json() as WCProduct;
};

export const updateProduct = async (site: SiteCredential, id: number, data: Partial<WCProduct>): Promise<WCProduct> => {
  const credentials = btoa(`${site.username}:${site.password}`);
  const response = await fetch(`${site.url}/wp-json/wc/v3/products/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Plugin_WooCommerce_Not_Found: Website này chưa được cài đặt WooCommerce hoặc REST API bị tắt. Vui lòng kiểm tra lại hệ thống của bạn.');
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to update product');
  }

  return await response.json() as WCProduct;
};

export const deleteProduct = async (site: SiteCredential, id: number): Promise<boolean> => {
  const credentials = btoa(`${site.username}:${site.password}`);
  const response = await fetch(`${site.url}/wp-json/wc/v3/products/${id}?force=true`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Plugin_WooCommerce_Not_Found: Website này chưa được cài đặt WooCommerce hoặc REST API bị tắt. Vui lòng kiểm tra lại hệ thống của bạn.');
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to delete product');
  }

  return true;
};

export const getCategories = async (site: SiteCredential): Promise<WCCategory[]> => {
  const credentials = btoa(`${site.username}:${site.password}`);
  const response = await fetch(`${site.url}/wp-json/wc/v3/products/categories?per_page=100`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Plugin_WooCommerce_Not_Found: Website này chưa được cài đặt WooCommerce hoặc REST API bị tắt. Vui lòng kiểm tra lại hệ thống của bạn.');
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to fetch categories');
  }

  return await response.json() as WCCategory[];
};
