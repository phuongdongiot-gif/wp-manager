import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Plus, Check, FileText, LayoutTemplate, Home } from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sites, activeSiteId, switchSite } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Bảng thống kê', icon: Home, path: '/' },
    { name: 'Bài viết', icon: FileText, path: '/posts' },
    { name: 'Trang', icon: LayoutTemplate, path: '/pages' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-[280px] bg-[#FAFAFA] dark:bg-[#0A0A0A] border-r border-gray-200 dark:border-white/5 flex flex-col h-auto md:h-screen sticky top-0">
        <div className="p-8 border-b border-gray-200 dark:border-white/5 flex items-center justify-center">
          <h1 className="text-2xl font-serif font-bold tracking-wider uppercase text-gray-900 dark:text-white flex items-center">
            WP<span className="text-primary ml-2 font-semibold">Manager</span>
          </h1>
        </div>
        
        {/* Navigation */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center w-full px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all duration-500 border-l-[3px] ${
                  isActive
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20'
                }`}
              >
                <Icon className={`w-4 h-4 mr-4 transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`} strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Site Selector */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 relative">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 px-1">
            Website Của Bạn
          </div>
          
          {sites.map(site => (
            <div 
              key={site.id}
              onClick={() => switchSite(site.id)}
              className={`p-4 rounded-none cursor-pointer flex items-center justify-between group transition-all duration-500 border ${
                activeSiteId === site.id 
                  ? 'bg-primary/5 border-primary/30 text-primary' 
                  : 'bg-white dark:bg-transparent border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-primary/50 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex flex-col truncate pr-2">
                <span className="font-bold text-sm truncate tracking-wide">{site.siteName && site.siteName !== site.username && site.siteName !== 'New Site' ? site.siteName : site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                <span className="text-xs uppercase tracking-widest opacity-60 truncate mt-1 flex gap-1.5">
                  <span>{site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  <span className="opacity-50">•</span>
                  <span>{site.username}</span>
                </span>
              </div>
              {activeSiteId === site.id && (
                <Check className="w-4 h-4 flex-shrink-0 text-primary" strokeWidth={2} />
              )}
            </div>
          ))}

          <Link 
            to="/login"
            className="w-full mt-8 flex items-center justify-center p-4 rounded-none border border-dashed border-gray-300 dark:border-white/20 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 dark:hover:text-primary transition-all duration-500"
          >
            <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Thêm Website
          </Link>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-white/5 bg-[#F5F5F5] dark:bg-[#080808]">
          <button className="flex items-center text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-500 w-full p-3 rounded-none hover:bg-gray-200 dark:hover:bg-white/5">
            <Settings className="w-4 h-4 mr-3" strokeWidth={1.5} /> Cài đặt
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
