import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export const LazadaIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.35 15.65c-1.39 1.39-3.41 2.08-5.74 1.83l-3.23-3.23c-.78-.78-2.05-.78-2.83 0l-1.41 1.41c-1.12-1.12-2.12-2.45-2.73-3.92l4.87-4.87c.78-.78.78-2.05 0-2.83L3.19 3.95c1.47-.61 2.8-.28 3.92.83l1.41-1.41c.78-.78 2.05-.78 2.83 0l3.23 3.23c.25 2.33-.44 4.35-1.83 5.74zM16 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LazadaSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { lazadaConfig, setLazadaConfig } = useAuth();
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [region, setRegion] = useState('vn');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAppKey(lazadaConfig?.appKey || '');
      setAppSecret(lazadaConfig?.appSecret || '');
      setAccessToken(lazadaConfig?.accessToken || '');
      setRegion(lazadaConfig?.region || 'vn');
    }
  }, [isOpen, lazadaConfig]);

  if (!isOpen) return null;

  const saveSettings = async () => {
    if (!appKey.trim() && !appSecret.trim() && !accessToken.trim()) {
      await setLazadaConfig(null);
      toast.success('Đã ngắt kết nối Lazada.');
      onClose();
      return;
    }

    if (!appKey.trim() || !appSecret.trim() || !accessToken.trim()) {
      toast.error('Vui lòng điền đầy đủ App Key, App Secret và Access Token.');
      return;
    }

    setIsSaving(true);
    try {
      await setLazadaConfig({
        appKey: appKey.trim(),
        appSecret: appSecret.trim(),
        accessToken: accessToken.trim(),
        region: region
      });
      toast.success('Đã lưu cấu hình kết nối Lazada thành công.');
      onClose();
    } catch (e: any) {
      toast.error(`Lỗi lưu cấu hình: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#FAF9F6] dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-none w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col">
        {/* Animated Top Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#0F146D]"></div>

        <div className="flex justify-between items-center p-8 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center space-x-4">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-none">
                <LazadaIcon className="w-8 h-8 text-[#0F146D]" />
             </div>
             <div>
               <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-widest uppercase">Cấu hình Lazada</h3>
               <p className="text-xs tracking-[0.1em] uppercase text-gray-400 mt-2">Open Platform Integration</p>
             </div>
          </div>
          <button onClick={onClose} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-transparent hover:decoration-gray-500">
            Trở lại
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-[#0F146D]/20 p-4 rounded-none mb-6">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              Bạn cần có tài khoản Developer trên <a href="https://open.lazada.com/" target="_blank" rel="noreferrer" className="text-[#0F146D] hover:underline font-bold">Lazada Open Platform</a>.
              Hãy điền các thông tin của App để bắt đầu đồng bộ Sản phẩm. Để trống tất cả để ngắt kết nối.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">App Key</label>
            <input 
              type="text" 
              value={appKey}
              onChange={e => setAppKey(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#0F146D] outline-none text-sm transition-colors"
              placeholder="Ví dụ: 123456"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">App Secret</label>
            <input 
              type="password" 
              value={appSecret}
              onChange={e => setAppSecret(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#0F146D] outline-none text-sm transition-colors"
              placeholder="App Secret Key"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Access Token</label>
            <input 
              type="text" 
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#0F146D] outline-none text-sm transition-colors"
              placeholder="Seller Access Token"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Quốc Gia (Region)</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#0F146D] outline-none text-sm transition-colors uppercase tracking-widest font-bold max-w-[200px]"
            >
              <option value="vn">Việt Nam (VN)</option>
              <option value="sg">Singapore (SG)</option>
              <option value="my">Malaysia (MY)</option>
              <option value="th">Thailand (TH)</option>
              <option value="ph">Philippines (PH)</option>
              <option value="id">Indonesia (ID)</option>
            </select>
          </div>
        </div>

        <div className="p-8 border-t border-gray-200 dark:border-white/5 bg-white dark:bg-transparent flex justify-between items-center bg-gray-50 dark:bg-transparent">
          <p className="text-xs text-gray-400 italic">Dữ liệu API được lưu an toàn trong máy tính.</p>
          <button 
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center px-10 py-4 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-xs hover:bg-[#0F146D] dark:hover:bg-[#0F146D] hover:text-white dark:hover:text-white transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
            Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};
