import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { facebookApi } from '../services/facebook';
import { Loader2, Send, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { FacebookIcon } from './FacebookSettingsModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMessage?: string;
  defaultLink?: string;
  defaultImage?: string;
}

export const FacebookPosterModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  defaultMessage = '', 
  defaultLink = '', 
  defaultImage = '' 
}) => {
  const { fbPage } = useAuth();
  
  const [message, setMessage] = useState(defaultMessage);
  const [link, setLink] = useState(defaultLink);
  const [imageUrl, setImageUrl] = useState(defaultImage);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMessage(defaultMessage);
      setLink(defaultLink);
      setImageUrl(defaultImage);
    }
  }, [isOpen, defaultMessage, defaultLink, defaultImage]);

  if (!isOpen) return null;

  if (!fbPage) {
     return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-[#0A0A0A] border border-red-200 dark:border-red-900/30 p-8 max-w-md w-full flex flex-col items-center text-center">
             <FacebookIcon className="w-12 h-12 text-gray-400 mb-4" />
             <h3 className="text-xl font-serif text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Chưa Cập Nhật Fanpage</h3>
             <p className="text-sm text-gray-500 mb-8 leading-relaxed">Vui lòng vào "Cấu hình Facebook" để kết nối với Fanpage của bạn trước khi thử xuất bản nội dung.</p>
             <button onClick={onClose} className="w-full py-4 border border-gray-200 dark:border-white/10 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Trở Lại</button>
           </div>
        </div>
     );
  }

  const handlePublish = async () => {
    if (!message.trim() && !link.trim() && !imageUrl.trim()) {
      toast.error('Vui lòng nhập nội dung, link hoặc hình ảnh chia sẻ.');
      return;
    }

    setIsPublishing(true);
    try {
       const postId = await facebookApi.publishPost(
         fbPage.id,
         fbPage.access_token,
         message.trim(),
         link.trim() || undefined,
         imageUrl.trim() || undefined
       );
       toast.success(`Đã xuất bản bài viết lên Facebook thành công! (ID: ${postId})`);
       onClose();
    } catch (error: any) {
       toast.error(error.message);
    } finally {
       setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4">
      <div className="bg-[#FAF9F6] dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-none w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
        
        {/* Animated Top Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#1877F2]"></div>

        {/* Left Form Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-white/5 bg-white dark:bg-transparent min-h-full">
           <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-serif text-[#1877F2] tracking-widest uppercase">Phân Phối Facebook</h3>
                <p className="text-[10px] tracking-[0.1em] uppercase text-gray-400 mt-2 block w-full truncate max-w-[250px]">
                  Target: <strong>{fbPage.name}</strong>
                </p>
              </div>
              <button disabled={isPublishing} onClick={onClose} className="text-xs uppercase text-gray-400 hover:text-gray-900 dark:hover:text-white">Trở lại</button>
           </div>

           <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Nội dung bài viết (Caption)</label>
                <textarea 
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full p-4 border border-gray-200 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] outline-none text-sm resize-none"
                  placeholder="Hôm nay hãy cùng điểm qua..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Đính kèm Liên Kết (URL)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#1877F2] outline-none text-sm"
                    placeholder="https://google.com (Tuỳ chọn)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Đính kèm Hình Ảnh Bìa (URL)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white focus:border-[#1877F2] outline-none text-sm"
                    placeholder="https://.../image.jpg (Tuỳ chọn)"
                  />
                </div>
                {imageUrl && <p className="text-[10px] text-[#1877F2] mt-2 italic">*Hệ thống sẽ ép bài viết dạng "Photo Post" vì có ảnh đính kèm.</p>}
              </div>
           </div>

           <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-transparent">
              <button 
                onClick={handlePublish}
                disabled={isPublishing}
                className="w-full flex items-center justify-center px-10 py-5 bg-[#1877F2] text-white font-bold uppercase tracking-widest text-xs hover:bg-[#166FE5] transition-colors disabled:opacity-50"
              >
                {isPublishing ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Send className="w-5 h-5 mr-3" />}
                {isPublishing ? 'Đang Xử Lý Gửi...' : 'Xuất Bản Nhanh (Publish Now)'}
              </button>
           </div>
        </div>

        {/* Right Preview Panel */}
        <div className="hidden md:flex flex-col w-[350px] lg:w-[400px] bg-gray-100 dark:bg-[#111] border-l border-gray-200 dark:border-white/10 p-8 pt-12 items-center justify-start overflow-y-auto">
           <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8 self-start w-full text-center border-b border-gray-300 dark:border-white/10 pb-4">Live Preview (Desktop)</h4>
           
           <div className="w-full bg-white dark:bg-[#242526] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden text-left mb-8">
             <div className="p-4 flex items-center space-x-3">
               <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center font-bold text-[#1877F2] border border-blue-200 dark:border-blue-900/60">
                 {fbPage.name.charAt(0).toUpperCase()}
               </div>
               <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-[#E4E6EB]">{fbPage.name}</div>
                  <div className="text-xs text-gray-500 dark:text-[#B0B3B8]">Just now · 🌍</div>
               </div>
             </div>
             
             {message && (
               <div className="px-4 pb-3 text-[15px] whitespace-pre-wrap text-gray-900 dark:text-[#E4E6EB] font-sans">
                 {message}
               </div>
             )}

             {imageUrl ? (
               <div className="w-full border-y border-gray-100 dark:border-[#3E4042]">
                 <img src={imageUrl} alt="preview" className="w-full h-auto object-cover max-h-[400px]" onError={e => (e.currentTarget.style.display = 'none')} />
               </div>
             ) : link ? (
               <div className="mx-4 mb-4 border border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-[#3A3B3C] hover:cursor-pointer">
                  <div className="p-3">
                    <div className="text-xs uppercase text-gray-500 dark:text-[#B0B3B8] truncate">{new URL(link.startsWith('http') ? link : `https://${link}`).hostname}</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-[#E4E6EB] mt-1 truncate">Attached External Link</div>
                  </div>
               </div>
             ) : null}

             <div className="px-4 py-3 flex justify-between border-t border-gray-200 dark:border-[#3E4042] text-gray-500 dark:text-[#B0B3B8] font-bold text-[13px]">
                <div className="flex items-center space-x-2 py-1 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"><span className="text-lg mb-1">👍</span> Like</div>
                <div className="flex items-center space-x-2 py-1 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"><span className="text-lg mb-1">💬</span> Comment</div>
                <div className="flex items-center space-x-2 py-1 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"><span className="text-lg mb-1">↗️</span> Share</div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};
