import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../services/store';
import { SiteCredential } from '../types/wordpress';

interface AuthState {
  sites: SiteCredential[];
  activeSiteId: string | null;
  isLoading: boolean;
  fbToken: string | null;
  fbPage: { id: string, name: string, access_token: string } | null;
  googleServiceAccount: string | null;
  autoIndexOnPublish: boolean;
}

interface AuthContextType extends AuthState {
  addSite: (url: string, user: string, pass: string, siteName?: string) => Promise<boolean>;
  switchSite: (id: string) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
  getActiveSite: () => SiteCredential | undefined;
  setFbToken: (token: string | null) => Promise<void>;
  setFbPage: (page: { id: string, name: string, access_token: string } | null) => Promise<void>;
  setGoogleServiceAccount: (json: string | null) => Promise<void>;
  setAutoIndexOnPublish: (val: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    sites: [],
    activeSiteId: null,
    isLoading: true,
    fbToken: null,
    fbPage: null,
    googleServiceAccount: null,
    autoIndexOnPublish: false
  });
  const store = useStore();

  useEffect(() => {
    // Load sites and active site on boot
    const initAuth = async () => {
      const sites = await store.getSites();
      const activeSiteId = await store.getActiveSiteId();
      const fbToken = await store.getFacebookToken();
      const fbPage = await store.getFacebookPage();
      const googleServiceAccount = await store.getGoogleServiceAccount();
      const autoIndexOnPublish = await store.getAutoIndexOnPublish();
      
      setState({ 
        sites, 
        activeSiteId: sites.some(s => s.id === activeSiteId) ? activeSiteId : (sites.length > 0 ? sites[0].id : null), 
        isLoading: false,
        fbToken,
        fbPage,
        googleServiceAccount,
        autoIndexOnPublish
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

  const handleSetFbToken = async (token: string | null) => {
    await store.setFacebookToken(token);
    setState(prev => ({ ...prev, fbToken: token }));
  };

  const handleSetFbPage = async (page: { id: string, name: string, access_token: string } | null) => {
    await store.setFacebookPage(page);
    setState(prev => ({ ...prev, fbPage: page }));
  };

  const handleSetGoogleServiceAccount = async (json: string | null) => {
    await store.setGoogleServiceAccount(json);
    setState(prev => ({ ...prev, googleServiceAccount: json }));
  };

  const handleSetAutoIndexOnPublish = async (val: boolean) => {
    await store.setAutoIndexOnPublish(val);
    setState(prev => ({ ...prev, autoIndexOnPublish: val }));
  };

  return (
    <AuthContext.Provider value={{ 
      ...state, 
      addSite, 
      switchSite, 
      removeSite, 
      getActiveSite,
      setFbToken: handleSetFbToken,
      setFbPage: handleSetFbPage,
      setGoogleServiceAccount: handleSetGoogleServiceAccount,
      setAutoIndexOnPublish: handleSetAutoIndexOnPublish
    }}>
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
