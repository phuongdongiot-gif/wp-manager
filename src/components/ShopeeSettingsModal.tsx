import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export const ShopeeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.015 1.5c-1.348 0-2.486.994-2.618 2.336L8.913 8H2.493L1.042 21.056C.936 22.01 1.688 22.5 2.65 22.5h18.68c.962 0 1.714-.49 1.608-1.444L21.488 8h-6.42l-.484-4.164C14.453 2.494 13.315 1.5 11.967 1.5zm0 1.954c.484 0 .911.366.97.848l.386 3.298H10.61l.386-3.298c.06-.482.486-.848.97-.848zm-5.49 6.5h10.931l1.096 10.592H4.428L5.524 9.954z"/>
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShopeeSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { shopeeConfig, setShopeeConfig } = useAuth();
  const [partnerId, setPartnerId] = useState('');
  const [partnerKey, setPartnerKey] = useState('');
  const [shopId, setShopId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPartnerId(shopeeConfig?.partnerId || '');
      setPartnerKey(shopeeConfig?.partnerKey || '');
      setShopId(shopeeConfig?.shopId || '');
    }
  }, [isOpen, shopeeConfig]);

  if (!isOpen) return null;

  const saveSettings = async () => {
    if (!partnerId.trim() && !partnerKey.trim() && !shopId.trim()) {
      // Clear config
      await setShopeeConfig(null);
      toast.success('Đã ngắt kết nối Shopee.');
      onClose();
      return;
    }

    if (!partnerId.trim() || !partnerKey.trim() || !shopId.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin Partner ID, Partner Key và Shop ID.');
      return;
    }

    setIsSaving(true);
    try {
      await setShopeeConfig({
        partnerId: partnerId.trim(),
        partnerKey: partnerKey.trim(),
        shopId: shopId.trim()
      });
      toast.success('Đã lưu cấu hình kết nối Shopee thành công.');
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
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#EE4D2D]"></div>

        <div className="flex justify-between items-center p-8 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center space-x-4">
             <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-none">
                <ShopeeIcon className="w-8 h-8 text-[#EE4D2D]" />
             </div>
             <div>
               <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-widest uppercase">Cấu hình Shopee</h3>
               <p className="text-xs tracking-[0.1em] uppercase text-gray-400 mt-2">Open Platform Integration</p>
             </div>
          </div>
          <button onClick={onClose} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-transparent hover:decoration-gray-500">
            Trở lại
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">
          <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-[#EE4D2D]/20 p-4 rounded-none mb-6">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              Bạn cần có tài khoản Developer trên <a href="https://open.shopee.com/" target="_blank" rel="noreferrer" className="text-[#EE4D2D] hover:underline font-bold">Shopee Open Platform</a>.
              Hãy điền các thông tin của App và Shop để bắt đầu đồng bộ Sản phẩm. Để trống tất cả để ngắt kết nối.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Partner ID</label>
            <input 
              type="text" 
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#EE4D2D] outline-none text-sm transition-colors"
              placeholder="Ví dụ: 847291"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Partner Key</label>
            <input 
              type="password" 
              value={partnerKey}
              onChange={e => setPartnerKey(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#EE4D2D] outline-none text-sm transition-colors"
              placeholder="Partner API Key (Secret)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Shop ID</label>
            <input 
              type="text" 
              value={shopId}
              onChange={e => setShopId(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#EE4D2D] outline-none text-sm transition-colors"
              placeholder="Mã số Shop kinh doanh"
            />
          </div>
        </div>

        <div className="p-8 border-t border-gray-200 dark:border-white/5 bg-white dark:bg-transparent flex justify-between items-center bg-gray-50 dark:bg-transparent">
          <p className="text-xs text-gray-400 italic">Dữ liệu API được lưu an toàn trong máy tính.</p>
          <button 
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center px-10 py-4 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-xs hover:bg-[#EE4D2D] dark:hover:bg-[#EE4D2D] hover:text-white dark:hover:text-white transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
            Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};
