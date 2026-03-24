import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../services/store';
import { SiteCredential } from '../types/wordpress';

interface AuthState {
  sites: SiteCredential[];
  activeSiteId: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  addSite: (url: string, user: string, pass: string, siteName?: string) => Promise<boolean>;
  switchSite: (id: string) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
  getActiveSite: () => SiteCredential | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    sites: [],
    activeSiteId: null,
    isLoading: true
  });
  const store = useStore();

  useEffect(() => {
    // Load sites and active site on boot
    const initAuth = async () => {
      const sites = await store.getSites();
      const activeSiteId = await store.getActiveSiteId();
      
      setState({ 
        sites, 
        activeSiteId: sites.some(s => s.id === activeSiteId) ? activeSiteId : (sites.length > 0 ? sites[0].id : null), 
        isLoading: false 
      });
      
      // Auto-fix active site if the previous one was deleted or not found
      if (sites.length > 0 && (!activeSiteId || !sites.some(s => s.id === activeSiteId))) {
        await store.setActiveSiteId(sites[0].id);
      }
    };
    
    initAuth();
  }, [store]);

  const addSite = async (url: string, user: string, pass: string, siteName?: string) => {
    const cleanUrl = url.replace(/\/$/, '');
    const id = btoa(cleanUrl + user); // unique enough ID
    const newSite: SiteCredential = { id, url: cleanUrl, username: user, password: pass, siteName };
    
    await store.addSite(newSite);
    
    // Auto switch to it
    await store.setActiveSiteId(id);
    
    // Refresh state
    const sites = await store.getSites();
    setState({ ...state, sites, activeSiteId: id });
    return true;
  };

  const switchSite = async (id: string) => {
    await store.setActiveSiteId(id);
    setState({ ...state, activeSiteId: id });
  };

  const removeSite = async (id: string) => {
    await store.removeSite(id);
    const sites = await store.getSites();
    const activeSiteId = await store.getActiveSiteId();
    setState({ ...state, sites, activeSiteId });
  };

  const getActiveSite = () => {
    return state.sites.find(s => s.id === state.activeSiteId);
  };

  return (
    <AuthContext.Provider value={{ ...state, addSite, switchSite, removeSite, getActiveSite }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
