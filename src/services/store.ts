import { load, Store } from '@tauri-apps/plugin-store';
import { SiteCredential } from '../types/wordpress';

let storePromise: Promise<Store> | null = null;

async function getStore() {
  if (!storePromise) {
    storePromise = load('auth-store.json', { autoSave: false, defaults: {} });
  }
  return storePromise;
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
  }
});
