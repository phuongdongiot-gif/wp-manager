import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validateCredentials } from '../services/auth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const LoginView: React.FC = () => {
  const { addSite, sites } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url || !username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      // Validate credentials against WordPress directly first
      const result = await validateCredentials(url, username, password);

      // Save them as a new site
      await addSite(url, username, password, result.siteName || result.user.name || 'New Site');

      toast.success('Successfully added site!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to authenticate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] dark:bg-[#050505] p-4 relative selection:bg-primary/30">
      {sites.length > 0 && (
        <Link to="/" className="absolute top-8 left-8 flex items-center text-xs uppercase tracking-[0.1em] text-gray-500 hover:text-primary transition-colors z-10">
          <ArrowLeft className="w-4 h-4 mr-3" strokeWidth={1.5} /> Bảng thống kê
        </Link>
      )}

      <div className="w-full max-w-lg bg-white dark:bg-[#0A0A0A] rounded-none p-12 border border-gray-200 dark:border-white/5 shadow-2xl z-10 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif text-gray-900 dark:text-white mb-4 tracking-[0.1em] uppercase">
            Thêm Website
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-[0.15em] font-medium leading-relaxed">
            Kết nối quản trị viên qua<br/>Application Passwords
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input
              type="url"
              className="w-full px-0 pt-5 pb-2 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white text-base focus:border-primary outline-none transition-colors peer"
              placeholder=" "
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <label className="absolute left-0 top-5 text-gray-400 dark:text-gray-500 text-sm peer-focus:text-xs peer-focus:-translate-y-6 peer-focus:text-primary peer-valid:text-xs peer-valid:-translate-y-6 transition-all duration-300 pointer-events-none uppercase tracking-[0.1em]">
              Đường dẫn Website (URL)
            </label>
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-500 group-focus-within:w-full"></div>
          </div>

          <div className="relative group">
            <input
              type="text"
              className="w-full px-0 pt-5 pb-2 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white text-base focus:border-primary outline-none transition-colors peer"
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label className="absolute left-0 top-5 text-gray-400 dark:text-gray-500 text-sm peer-focus:text-xs peer-focus:-translate-y-6 peer-focus:text-primary peer-valid:text-xs peer-valid:-translate-y-6 transition-all duration-300 pointer-events-none uppercase tracking-[0.1em]">
              Tài khoản quản trị
            </label>
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-500 group-focus-within:w-full"></div>
          </div>

          <div className="relative group">
            <input
              type="password"
              className="w-full px-0 pt-5 pb-2 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white text-base focus:border-primary outline-none transition-colors peer"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="absolute left-0 top-5 text-gray-400 dark:text-gray-500 text-sm peer-focus:text-xs peer-focus:-translate-y-6 peer-focus:text-primary peer-valid:text-xs peer-valid:-translate-y-6 transition-all duration-300 pointer-events-none uppercase tracking-[0.1em]">
              Mật khẩu ứng dụng
            </label>
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-500 group-focus-within:w-full"></div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center px-4 py-4 mt-8 bg-primary hover:bg-gray-900 dark:hover:bg-white text-white dark:hover:text-black font-semibold uppercase tracking-[0.2em] text-xs rounded-none transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                Đang kết nối...
              </>
            ) : (
              'Xác Nhận Kết Nối'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
