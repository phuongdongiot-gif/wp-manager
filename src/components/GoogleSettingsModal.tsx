import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { googleIndexingApi } from '../services/google-indexing';

export const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
    <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
    <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 11.36l3.98-3.09z"/>
    <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { googleServiceAccount, autoIndexOnPublish, setGoogleServiceAccount, setAutoIndexOnPublish } = useAuth();
  
  const [jsonInput, setJsonInput] = useState('');
  const [autoIndex, setAutoIndex] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setJsonInput(googleServiceAccount || '');
      setAutoIndex(autoIndexOnPublish);
    }
  }, [isOpen, googleServiceAccount, autoIndexOnPublish]);

  if (!isOpen) return null;

  const saveSettings = async () => {
    if (!jsonInput.trim()) {
      await setGoogleServiceAccount(null);
      await setAutoIndexOnPublish(false);
      toast.success('Đã ngắt kết nối Google Indexing.');
      onClose();
      return;
    }

    setIsVerifying(true);
    try {
      // Validate string parses to JSON and has private_key
      const parsed = JSON.parse(jsonInput);
      if (!parsed.private_key || !parsed.client_email) {
          throw new Error('Dữ liệu JSON không hợp lệ. Vui lòng copy chính xác toàn bộ nội dung file The Service Account JSON.');
      }
      
      // Attempt generation of JWT Access token
      await googleIndexingApi.getAccessToken(jsonInput);
      
      await setGoogleServiceAccount(jsonInput.trim());
      await setAutoIndexOnPublish(autoIndex);
      toast.success('Đã kết nối thành công với Google Indexing API!');
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4">
      <div className="bg-[#FAF9F6] dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-none w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col">
        {/* Animated Top Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#4285F4]"></div>

        <div className="flex justify-between items-center p-8 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center space-x-4">
             <div className="p-3 bg-white dark:bg-gray-800 rounded-none shadow-sm">
                <GoogleIcon className="w-8 h-8" />
             </div>
             <div>
               <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-widest uppercase">Cấu hình Google</h3>
               <p className="text-xs tracking-[0.1em] uppercase text-gray-400 mt-2">Indexing API Integration</p>
             </div>
          </div>
          <button onClick={onClose} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-transparent hover:decoration-gray-500">
            Trở lại
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Service Account JSON (Khoá Dịch Vụ)</label>
            <textarea 
              rows={8}
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              className="w-full p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-gray-300 focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4] outline-none text-[10px] font-mono transition-colors"
              placeholder='{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----...",\n  "client_email": "..."\n}'
            />
            <p className="text-[10px] text-gray-400 mt-3 font-mono">Tạo Service Account trên Google Cloud Console, tạo khoá định dạng JSON, uỷ quyền Owner trong webmaster tools và dán toàn bộ nội dung file vào đây.</p>
          </div>

          <div className="border border-gray-200 dark:border-white/10 p-6 bg-white dark:bg-[#050505]">
            <label className="flex items-center space-x-4 cursor-pointer">
              <input 
                 type="checkbox" 
                 checked={autoIndex} 
                 onChange={e => setAutoIndex(e.target.checked)} 
                 className="w-5 h-5 text-[#4285F4] focus:ring-[#4285F4] dark:bg-transparent"
              />
              <div>
                 <div className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white mb-1">Tự động Index bài viết</div>
                 <div className="text-[11px] text-gray-500">Khi được bật, hệ thống sẽ gọi Google Indexing ngay khi bạn Đăng bài hoặc Thu thập bài viết thành công. Tính năng này giúp các từ khóa SEO lên hạng cực kỳ nhanh.</div>
              </div>
            </label>
          </div>
        </div>

        <div className="p-8 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-transparent flex justify-between items-center">
          <p className="text-xs text-gray-400 italic">Private Key JSON được mã hoá và lưu trực tiếp trên máy của bạn.</p>
          <button 
            disabled={isVerifying}
            onClick={saveSettings}
            className="flex items-center px-10 py-4 bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50"
          >
            {isVerifying ? 'Đang Xác Thực...' : <><Save className="w-4 h-4 mr-2" /> Lưu Cấu Hình</>}
          </button>
        </div>
      </div>
    </div>
  );
};
