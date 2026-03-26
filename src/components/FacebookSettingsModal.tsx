import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { facebookApi, FacebookPage } from '../services/facebook';
import { Loader2, Save, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/>
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FacebookSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { fbToken, fbPage, setFbToken, setFbPage } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setTokenInput(fbToken || '');
      setSelectedPageId(fbPage?.id || '');
      if (fbToken) fetchPages(fbToken);
    }
  }, [isOpen, fbToken, fbPage]);

  if (!isOpen) return null;

  const fetchPages = async (token: string) => {
    try {
       // First, verify what kind of token this is (User vs Page)
       const me = await facebookApi.verifyToken(token);
       
       // Try fetching accounts to see if it's a User token
       try {
          const pages = await facebookApi.getUserPages(token);
          if (pages.length > 0) {
             setAvailablePages(pages);
             if (!selectedPageId && pages.length === 1) setSelectedPageId(pages[0].id);
             return;
          }
       } catch (e) {
          // It might be a direct Page token
          console.warn('Cannot fetch user accounts, assuming Page token');
       }

       // Fallback to treat the token as a direct Page Token
       setAvailablePages([{
         id: me.id,
         name: me.name,
         access_token: token
       }]);

    } catch (error: any) {
       toast.error(`Lỗi xác thực: ${error.message}`);
    }
  };

  const verifyAndLoadPages = async () => {
    if (!tokenInput.trim()) {
      toast.error('Vui lòng nhập Access Token hợp lệ.');
      return;
    }
    setIsVerifying(true);
    await fetchPages(tokenInput.trim());
    setIsVerifying(false);
    toast.success('Đã tải danh sách Fanpage. Vui lòng chọn Page để lưu lại.');
  };

  const saveSettings = async () => {
    if (!tokenInput.trim()) {
      // Clear token
      await setFbToken(null);
      await setFbPage(null);
      toast.success('Đã ngắt kết nối Facebook.');
      onClose();
      return;
    }

    const page = availablePages.find(p => p.id === selectedPageId);
    if (!page) {
      toast.error('Vui lòng chọn một Fanpage để làm mặc định.');
      return;
    }

    await setFbToken(tokenInput.trim());
    await setFbPage(page);
    toast.success(`Đã kết nối Fanpage: ${page.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4">
      <div className="bg-[#FAF9F6] dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-none w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col">
        {/* Animated Top Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#1877F2]"></div>

        <div className="flex justify-between items-center p-8 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center space-x-4">
             <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-none">
                <FacebookIcon className="w-8 h-8 text-[#1877F2]" />
             </div>
             <div>
               <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-widest uppercase">Cấu hình Facebook</h3>
               <p className="text-xs tracking-[0.1em] uppercase text-gray-400 mt-2">Graph API Integration</p>
             </div>
          </div>
          <button onClick={onClose} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-transparent hover:decoration-gray-500">
            Trở lại
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Facebook Access Token</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="password" 
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                className="flex-1 px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] outline-none text-sm transition-colors"
                placeholder="Nhập User Token hoặc Page Access Token..."
              />
              <button 
                onClick={verifyAndLoadPages}
                disabled={isVerifying || !tokenInput.trim()}
                className="px-6 py-4 bg-[#1877F2] text-white font-bold uppercase tracking-wider text-xs whitespace-nowrap hover:bg-[#166FE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                Tải Pages
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 font-mono">Cách lấy token: Sử dụng Graph API Explorer để lấy Long-Lived Page Access Token.</p>
          </div>

          {availablePages.length > 0 && (
             <div className="animate-fade-in border-t border-gray-200 dark:border-white/10 pt-8">
               <label className="block text-xs font-bold uppercase tracking-widest text-[#1877F2] mb-4">Chọn Fanpage Mặc Định</label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[200px] overflow-y-auto pr-2">
                 {availablePages.map(page => (
                   <label key={page.id} className={`flex items-center space-x-4 p-4 border cursor-pointer transition-all duration-300 ${selectedPageId === page.id ? 'border-[#1877F2] bg-blue-50 dark:bg-[#1877F2]/10 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/5 text-gray-500 hover:border-gray-400 bg-white dark:bg-[#050505]'}`}>
                     <input 
                       type="radio" 
                       name="fb_page" 
                       value={page.id} 
                       checked={selectedPageId === page.id} 
                       onChange={() => setSelectedPageId(page.id)} 
                       className="text-[#1877F2] focus:ring-[#1877F2] dark:bg-transparent"
                     />
                     <div>
                       <div className="text-sm font-bold truncate">{page.name}</div>
                       <div className="text-[10px] uppercase tracking-wider opacity-60">ID: {page.id}</div>
                     </div>
                   </label>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-200 dark:border-white/5 bg-white dark:bg-transparent flex justify-between items-center bg-gray-50 dark:bg-transparent">
          <p className="text-xs text-gray-400 italic">Dữ liệu Token được lưu an toàn trong máy tính.</p>
          <button 
            onClick={saveSettings}
            className="flex items-center px-10 py-4 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-xs hover:opacity-80 transition-opacity"
          >
            <Save className="w-4 h-4 mr-2" /> Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};
