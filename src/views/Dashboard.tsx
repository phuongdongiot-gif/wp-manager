import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { sites, activeSiteId, removeSite } = useAuth();
  
  const activeSite = sites.find(s => s.id === activeSiteId);

  if (!activeSite) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-serif text-gray-900 dark:text-white mb-6 uppercase tracking-[0.1em]">Chưa chọn Website nào</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md text-sm font-light leading-relaxed">Vui lòng chọn một website từ danh mục bên trái hoặc thiết lập mới quản trị viên.</p>
        <Link to="/login" className="px-8 py-4 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-primary transition-all duration-500 font-semibold uppercase tracking-[0.2em] text-xs flex items-center">
          <Plus className="w-4 h-4 mr-3" strokeWidth={1.5} /> Thêm Website
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="flex justify-between items-end mb-12 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-4xl font-serif text-gray-900 dark:text-white tracking-[0.05em] uppercase">{activeSite.siteName && activeSite.siteName !== activeSite.username && activeSite.siteName !== 'New Site' ? activeSite.siteName : activeSite.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</h2>
          <a href={activeSite.url} target="_blank" rel="noreferrer" className="text-xs tracking-[0.1em] uppercase text-gray-500 dark:text-gray-400 hover:text-primary transition-colors mt-3 inline-block">
            {activeSite.url}
          </a>
        </div>
        <button 
          onClick={() => {
            if(confirm(`Bạn có chắc chắn muốn ngắt kết nối với website ${activeSite.url} không?`)) {
              removeSite(activeSite.id);
            }
          }}
          className="flex items-center px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-medium text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} /> Hủy kết nối
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link to="/posts" className="bg-white dark:bg-transparent p-10 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary transition-colors duration-500 group block relative">
          <h3 className="text-xl font-serif uppercase tracking-[0.15em] text-gray-900 dark:text-white mb-4 group-hover:text-primary transition-colors">Bài Viết</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-light leading-relaxed">Khởi tạo, chỉnh sửa và xuất bản các phân đoạn tin tức kiến thức chuẩn SEO tới mạng lưới website.</p>
          <div className="absolute right-8 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-primary">→</div>
        </Link>
        <Link to="/pages" className="bg-white dark:bg-transparent p-10 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary transition-colors duration-500 group block relative">
          <h3 className="text-xl font-serif uppercase tracking-[0.15em] text-gray-900 dark:text-white mb-4 group-hover:text-primary transition-colors">Tĩnh Thành</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-light leading-relaxed">Thiết lập và cơ cấu các khu vực trang nội dung lõi như Về chúng tôi, Liên hệ, hay Chính sách.</p>
          <div className="absolute right-8 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-primary">→</div>
        </Link>
      </div>
    </div>
  );
};
