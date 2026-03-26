import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
  const { sites, activeSiteId, removeSite, updateSite } = useAuth();
  
  const activeSite = sites.find(s => s.id === activeSiteId);
  const [gaInput, setGaInput] = useState('');

  useEffect(() => {
    if (activeSite) {
      setGaInput(activeSite.gaPropertyId || '');
    }
  }, [activeSite]);

  const handleSaveGa = async () => {
    if (!activeSite) return;
    await updateSite(activeSite.id, { gaPropertyId: gaInput.trim() });
    toast.success('Đã lưu cấu hình GA4 Property ID.');
  };

  if (!activeSite) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-serif text-gray-900 dark:text-white mb-6 uppercase tracking-wider">Chưa chọn Website nào</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md text-sm font-semibold leading-relaxed">Vui lòng chọn một website từ danh mục bên trái hoặc thiết lập mới quản trị viên.</p>
        <Link to="/login" className="px-8 py-4 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-primary transition-all duration-500 font-bold uppercase tracking-wider text-xs flex items-center">
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
          <a href={activeSite.url} target="_blank" rel="noreferrer" className="text-xs tracking-wider uppercase text-gray-500 dark:text-gray-400 hover:text-primary transition-colors mt-3 inline-block">
            {activeSite.url}
          </a>
        </div>
        <button 
          onClick={() => {
            if(confirm(`Bạn có chắc chắn muốn ngắt kết nối với website ${activeSite.url} không?`)) {
              removeSite(activeSite.id);
            }
          }}
          className="flex items-center px-4 py-2 text-xs uppercase tracking-wider font-bold text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} /> Hủy kết nối
        </button>
      </header>

      <div className="mb-12 bg-[#FAF9F6] dark:bg-transparent p-8 rounded-none border border-gray-200 dark:border-white/10 flex items-end space-x-4">
         <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Google Analytics 4 Property ID (Dùng cho Báo Cáo)</label>
            <input 
              type="text" 
              value={gaInput}
              onChange={e => setGaInput(e.target.value)}
              className="w-full bg-transparent border-b border-gray-300 dark:border-white/20 text-gray-900 dark:text-white px-0 py-2 focus:border-primary outline-none text-sm transition-colors"
              placeholder="VD: 312345678"
            />
         </div>
         <button onClick={handleSaveGa} className="px-6 py-2 border border-gray-300 dark:border-white/20 text-xs font-bold tracking-widest uppercase hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            Lưu
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link to="/posts" className="bg-white dark:bg-transparent p-10 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary transition-colors duration-500 group block relative">
          <h3 className="text-xl font-serif uppercase tracking-wider text-gray-900 dark:text-white mb-4 group-hover:text-primary transition-colors">Bài Viết</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold leading-relaxed">Khởi tạo, chỉnh sửa và xuất bản các phân đoạn tin tức kiến thức chuẩn SEO tới mạng lưới website.</p>
          <div className="absolute right-8 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-primary">→</div>
        </Link>
        <Link to="/pages" className="bg-white dark:bg-transparent p-10 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary transition-colors duration-500 group block relative">
          <h3 className="text-xl font-serif uppercase tracking-wider text-gray-900 dark:text-white mb-4 group-hover:text-primary transition-colors">Tĩnh Thành</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold leading-relaxed">Thiết lập và cơ cấu các khu vực trang nội dung lõi như Về chúng tôi, Liên hệ, hay Chính sách.</p>
          <div className="absolute right-8 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-primary">→</div>
        </Link>
      </div>
    </div>
  );
};
