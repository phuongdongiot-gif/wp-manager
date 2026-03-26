import { load, Store } from '@tauri-apps/plugin-store';
import { SiteCredential } from '../types/wordpress';

let storePromise: Promise<Store> | null = null;

async function getStore() {
  if (!storePromise) {
    storePromise = load('auth-store.json', { autoSave: false, defaults: {} });
  }
  return storePromise;
}

export interface ShopeeConfig {
  partnerId: string;
  partnerKey: string;
  shopId: string;
}

export interface LazadaConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  region: string;
}

export const useStore = () => ({
  async getSites(): Promise<SiteCredential[]> {
    const store = await getStore();
    return (await store.get<SiteCredential[]>('wp_sites')) || [];
  },
  async setSites(sites: SiteCredential[]): Promise<void> {
    const store = await getStore();
    await store.set('wp_sites', sites);
    await store.save();
  },
  async getActiveSiteId(): Promise<string | null> {
    const store = await getStore();
    return (await store.get<string>('active_site_id')) || null;
  },
  async setActiveSiteId(id: string | null): Promise<void> {
    const store = await getStore();
    if (id === null) {
      await store.delete('active_site_id');
    } else {
      await store.set('active_site_id', id);
    }
    await store.save();
  },
  async addSite(site: SiteCredential): Promise<void> {
    const sites = await this.getSites();
    const existingIndex = sites.findIndex(s => s.id === site.id);
    if (existingIndex >= 0) {
      sites[existingIndex] = site;
    } else {
      sites.push(site);
    }
    await this.setSites(sites);
  },
  async removeSite(id: string): Promise<void> {
    const sites = await this.getSites();
    await this.setSites(sites.filter(s => s.id !== id));
    const active = await this.getActiveSiteId();
    if (active === id) {
      await this.setActiveSiteId(null);
    }
  },
  async clear(): Promise<void> {
    const store = await getStore();
    await store.clear();
    await store.save();
  },
  async getFacebookToken(): Promise<string | null> {
    const store = await getStore();
    return (await store.get<string>('fb_access_token')) || null;
  },
  async setFacebookToken(token: string | null): Promise<void> {
    const store = await getStore();
    if (token) await store.set('fb_access_token', token);
    else await store.delete('fb_access_token');
    await store.save();
  },
  async getFacebookPage(): Promise<{id: string, name: string, access_token: string} | null> {
    const store = await getStore();
    return (await store.get<{id: string, name: string, access_token: string}>('fb_active_page')) || null;
  },
  async setFacebookPage(page: {id: string, name: string, access_token: string} | null): Promise<void> {
    const store = await getStore();
    if (page) await store.set('fb_active_page', page);
    else await store.delete('fb_active_page');
    await store.save();
  },
  async getGoogleServiceAccount(): Promise<string | null> {
    const store = await getStore();
    return (await store.get<string>('google_service_account')) || null;
  },
  async setGoogleServiceAccount(json: string | null): Promise<void> {
    const store = await getStore();
    if (json) await store.set('google_service_account', json);
    else await store.delete('google_service_account');
    await store.save();
  },
  async getAutoIndexOnPublish(): Promise<boolean> {
    const store = await getStore();
    return (await store.get<boolean>('auto_index_on_publish')) ?? false;
  },
  async setAutoIndexOnPublish(val: boolean): Promise<void> {
    const store = await getStore();
    await store.set('auto_index_on_publish', val);
    await store.save();
  },
  async getShopeeConfig(): Promise<ShopeeConfig | null> {
    const store = await getStore();
    return (await store.get<ShopeeConfig>('shopee_config')) || null;
  },
  async setShopeeConfig(config: ShopeeConfig | null): Promise<void> {
    const store = await getStore();
    if (config) await store.set('shopee_config', config);
    else await store.delete('shopee_config');
    await store.save();
  },
  async getLazadaConfig(): Promise<LazadaConfig | null> {
    const store = await getStore();
    return (await store.get<LazadaConfig>('lazada_config')) || null;
  },
  async setLazadaConfig(config: LazadaConfig | null): Promise<void> {
    const store = await getStore();
    if (config) await store.set('lazada_config', config);
    else await store.delete('lazada_config');
    await store.save();
  }
});
