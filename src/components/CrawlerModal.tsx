import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crawler, CrawledData } from '../services/crawler';
import { api } from '../services/api';
import { createPost } from '../services/posts';
import { createProduct } from '../services/woocommerce';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { googleIndexingApi } from '../services/google-indexing';
import { Loader2, Link as LinkIcon, Globe, ChevronRight, Play, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface CrawlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'post' | 'product';
}

type Step = 'input' | 'review' | 'pushing';

export const CrawlerModal: React.FC<CrawlerModalProps> = ({ isOpen, onClose, defaultType = 'post' }) => {
  const { sites, activeSiteId, autoIndexOnPublish, googleServiceAccount } = useAuth();
  const [step, setStep] = useState<Step>('input');
  const [targetSiteIds, setTargetSiteIds] = useState<string[]>([]);
  const [crawlMode, setCrawlMode] = useState<'direct' | 'sitemap'>('direct');
  const [urlInput, setUrlInput] = useState('');
  const [globalTargetLink, setGlobalTargetLink] = useState('');
  const [targetType, setTargetType] = useState<'post' | 'product'>(defaultType);
  
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  
  // Review Step State
  const [crawledItems, setCrawledItems] = useState<CrawledData[]>([]);
  const [reviewEditorMode, setReviewEditorMode] = useState<'visual' | 'code'>('visual');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ total: number; current: number }>({ total: 0, current: 0 });

  useEffect(() => {
    if (isOpen) {
      if (activeSiteId) setTargetSiteIds([activeSiteId]);
      setTargetType(defaultType);
      setStep('input');
      setCrawledItems([]);
      setSitemapUrls([]);
      setSelectedUrls([]);
      setUrlInput('');
      setGlobalTargetLink('');
    }
  }, [isOpen, activeSiteId, defaultType]);

  if (!isOpen) return null;

  const handleFetchSitemap = async () => {
    if (!urlInput.trim()) {
       toast.error('Vui lòng nhập đường dẫn Sitemap.');
       return;
    }
    setIsLoading(true);
    try {
      const urls = await crawler.fetchSitemapUrls(urlInput.trim());
      setSitemapUrls(urls);
      setSelectedUrls(urls.slice(0, 10)); // default select first 10
      toast.success(`Tìm thấy ${urls.length} đường dẫn.`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSiteTarget = (id: string) => {
    setTargetSiteIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
  };

  const toggleUrlSelection = (url: string) => {
    setSelectedUrls(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  };

  const startExtraction = async () => {
    const targetUrls = crawlMode === 'direct' ? [urlInput.trim()] : selectedUrls;
    if (targetUrls.length === 0 || !targetUrls[0]) {
       toast.error('Vui lòng cung cấp ít nhất một Đường dẫn hợp lệ.');
       return;
    }

    setIsProcessing(true);
    setProgress({ total: targetUrls.length, current: 0 });
    setCrawledItems([]);

    const items: CrawledData[] = [];
    let errorCount = 0;

    for (let i = 0; i < targetUrls.length; i++) {
       const curl = targetUrls[i];
       try {
         const data = await crawler.crawlPage(curl, globalTargetLink);
         if (!data.title) data.title = `Crawled Entry ${new Date().getTime()}`;
         items.push(data);
       } catch (err: any) {
         console.error(`Lỗi bóc tách ${curl}:`, err);
         errorCount++;
       } finally {
         setProgress(prev => ({ ...prev, current: prev.current + 1 }));
       }
    }

    setIsProcessing(false);
    setCrawledItems(items);
    
    if (items.length > 0) {
      if (errorCount > 0) toast.info(`Đã lọc được ${items.length} bài. Lỗi: ${errorCount}.`);
      setStep('review');
    } else {
      toast.error('Không trích xuất được nội dung nào!');
    }
  };

  const handleUpdateItem = (index: number, field: keyof CrawledData, value: string) => {
    const newItems = [...crawledItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setCrawledItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...crawledItems];
    newItems.splice(index, 1);
    setCrawledItems(newItems);
    if (newItems.length === 0) setStep('input');
  };

  const processPushToWP = async () => {
    if (targetSiteIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một Site đích.');
      return;
    }

    setStep('pushing');
    setIsProcessing(true);
    setProgress({ total: crawledItems.length, current: 0 });

    const selectedSites = sites.filter(s => targetSiteIds.includes(s.id));
    let successCount = 0;

    for (let i = 0; i < crawledItems.length; i++) {
       const data = crawledItems[i];
       try {
         // Process Featured Image
         let imgFile: File | null = null;
         if (data.image) {
            try {
              const imgResp = await tauriFetch(data.image, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
              });
              if (imgResp.ok) {
                const blob = await imgResp.blob();
                let fileName = data.image.split('?')[0].split('/').pop() || 'featured.jpg';
                if (!fileName.includes('.')) fileName += '.jpg';
                imgFile = new File([blob], fileName, { type: blob.type });
              }
            } catch (imgError) {}
         }

         // Push to Selected Sites
         for (const site of selectedSites) {
            
            let siteMappedContent = data.content;

            // Deep Content Image Upload
            const contentImages = data.contentImages || [];
            if (contentImages.length > 0) {
               // Upload each image dynamically to avoid hotlinking
               // To avoid spamming, one by one is safer
               for (const cImgUrl of contentImages) {
                 try {
                   const cImgResp = await tauriFetch(cImgUrl, {
                     headers: {
                       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                       'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                     }
                   });
                   if (cImgResp.ok) {
                     const cBlob = await cImgResp.blob();
                     let fName = cImgUrl.split('?')[0].split('/').pop() || 'content_image.jpg';
                     if (!fName.includes('.')) fName += '.jpg';
                     const cFile = new File([cBlob], fName, { type: cBlob.type });
                     const uploadedMedia = await api.uploadMedia(cFile, site);
                     const siteMediaUrl = uploadedMedia.source_url || uploadedMedia.guid?.rendered;
                     if (siteMediaUrl) {
                       // Replace all occurrences of original URL with locally hosted WP URL
                       // Handle both raw and HTML encoded formats safely
                       const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                       const encodedImgUrl = cImgUrl.replace(/&/g, '&amp;');
                       
                       siteMappedContent = siteMappedContent.replace(new RegExp(escapeRegExp(cImgUrl), 'g'), siteMediaUrl);
                       if (cImgUrl !== encodedImgUrl) {
                          siteMappedContent = siteMappedContent.replace(new RegExp(escapeRegExp(encodedImgUrl), 'g'), siteMediaUrl);
                       }
                     }
                   }
                 } catch (e) {
                   console.warn('Lỗi xử lý content image', e);
                 }
               }
            }

            // Featured Image Upload
            let mediaId: number | undefined = undefined;
            if (imgFile) {
               try {
                 const mediaData = await api.uploadMedia(imgFile, site);
                 mediaId = mediaData.id;
               } catch (me) {}
            }

            // Map SEO Metadata
            const meta: Record<string, string> = {};
            if (data.seoKeywords) meta['rank_math_focus_keyword'] = data.seoKeywords;
            if (data.seoTitle) meta['rank_math_title'] = data.seoTitle;
            if (data.seoDescription) meta['rank_math_description'] = data.seoDescription;

            if (targetType === 'post') {
               const p = await createPost(
                 data.title, 
                 siteMappedContent, 
                 'publish', 
                 mediaId, 
                 Object.keys(meta).length > 0 ? meta : undefined, 
                 undefined, 
                 site
               );
               if (autoIndexOnPublish && googleServiceAccount && p.link) {
                 googleIndexingApi.publishUrl(p.link, googleServiceAccount).catch(e => console.error("Index API Error: ", e));
               }
            } else {
               const payload: any = {
                 name: data.title,
                 description: siteMappedContent,
                 status: 'publish',
               };
               if (data.price) payload.regular_price = data.price;
               if (mediaId && imgFile) payload.images = [{ id: mediaId }];
               if (Object.keys(meta).length > 0) {
                 payload.meta_data = Object.keys(meta).map(k => ({ key: k, value: meta[k] }));
               }
               const prod = await createProduct(site, payload);
               if (autoIndexOnPublish && googleServiceAccount && prod.permalink) {
                 googleIndexingApi.publishUrl(prod.permalink, googleServiceAccount).catch(e => console.error("Index API Error: ", e));
               }
            }
         }
         successCount++;
       } catch (err: any) {
         console.error(`Lỗi xuất bản ${data.title}:`, err);
       } finally {
         setProgress(prev => ({ ...prev, current: prev.current + 1 }));
       }
    }

    setIsProcessing(false);
    toast.success(`Hoàn tất! Đã xuất bản thành công ${successCount} nội dung.`);
    onClose();
  };


  const renderInputStep = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-[#FAF9F6] dark:bg-transparent p-6 rounded-none border border-gray-200 dark:border-white/10">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6 flex items-center">
           <Globe className="w-4 h-4 mr-3" strokeWidth={1.5} /> Phân Phối Mục Tiêu (Target Sites)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {sites.map(site => (
             <label key={site.id} className={`flex items-center space-x-4 p-4 rounded-none border cursor-pointer transition-all duration-300 ${targetSiteIds.includes(site.id) ? 'border-primary bg-primary/5 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/5 text-gray-500 hover:border-gray-400'}`}>
               <input type="checkbox" className="rounded-none w-4 h-4 text-primary focus:ring-primary border-gray-300 dark:bg-transparent" checked={targetSiteIds.includes(site.id)} onChange={() => toggleSiteTarget(site.id)} />
               <span className="text-xs font-bold tracking-wide truncate">{site.siteName && site.siteName !== site.username && site.siteName !== 'New Site' ? site.siteName : site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
             </label>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Phương Thức Quét</label>
          <div className="flex space-x-4">
             <button onClick={() => setCrawlMode('direct')} className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold border rounded-none transition-colors ${crawlMode === 'direct' ? 'bg-primary border-primary text-black' : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400'}`}>Liên Kết Trực Tiếp</button>
             <button onClick={() => setCrawlMode('sitemap')} className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold border rounded-none transition-colors ${crawlMode === 'sitemap' ? 'bg-primary border-primary text-black' : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400'}`}>Bản Đồ Website (Sitemap)</button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Loại Tài Sản (Asset Type)</label>
          <div className="flex space-x-4">
             <button onClick={() => setTargetType('post')} className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold border rounded-none transition-colors ${targetType === 'post' ? 'bg-black dark:bg-white text-white dark:text-black border-transparent' : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400'}`}>Bài Viết (Post)</button>
             <button onClick={() => setTargetType('product')} className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold border rounded-none transition-colors ${targetType === 'product' ? 'bg-black dark:bg-white text-white dark:text-black border-transparent' : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400'}`}>Sản Phẩm (Product)</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
         <div className="relative flex items-center">
           <LinkIcon className="absolute left-4 w-5 h-5 text-gray-400" strokeWidth={1.5} />
           <input 
             type="text" 
             value={urlInput}
             onChange={e => setUrlInput(e.target.value)}
             className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#050505] text-gray-900 dark:text-white rounded-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-sm"
             placeholder={crawlMode === 'direct' ? 'https://example.com/bao-chi/bai-viet-1' : 'https://example.com/sitemap.xml'}
           />
           {crawlMode === 'sitemap' && (
              <button 
                onClick={handleFetchSitemap} 
                disabled={isLoading} 
                className="absolute right-2 px-4 py-2 bg-primary text-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors disabled:opacity-50 flex items-center"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                Trích Xuất URLs
              </button>
           )}
         </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/10">
         <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Chuyển hướng toàn bộ Link (Tuỳ chọn)</label>
         <input 
           type="text" 
           value={globalTargetLink}
           onChange={e => setGlobalTargetLink(e.target.value)}
           className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#050505] text-gray-900 dark:text-white rounded-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-sm"
           placeholder="Nhập URL (ví dụ: https://domaincuatoi.com/san-pham) hoặc gõ '#' để tự động xoá toàn bộ Links..."
         />
      </div>

      {crawlMode === 'sitemap' && sitemapUrls.length > 0 && (
        <div className="border border-gray-200 dark:border-white/10 rounded-none overflow-hidden flex flex-col max-h-[300px]">
           <div className="bg-[#FAF9F6] dark:bg-[#050505] p-4 flex justify-between items-center border-b border-gray-200 dark:border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Đã chọn ({selectedUrls.length}/{sitemapUrls.length})</span>
              <div className="space-x-4">
                 <button onClick={() => setSelectedUrls(sitemapUrls)} className="text-xs uppercase font-bold text-primary hover:text-primary/70">Chọn Tất Cả</button>
                 <button onClick={() => setSelectedUrls([])} className="text-xs uppercase font-bold text-gray-400 hover:text-red-400">Bỏ Chọn</button>
              </div>
           </div>
           <div className="overflow-y-auto p-4 space-y-2 bg-white dark:bg-transparent">
             {sitemapUrls.map(url => (
                <label key={url} className="flex items-center space-x-3 cursor-pointer group hover:bg-gray-50 dark:hover:bg-white/5 p-2 transition-colors">
                   <input type="checkbox" checked={selectedUrls.includes(url)} onChange={() => toggleUrlSelection(url)} className="text-primary focus:ring-primary rounded-none border-gray-300 dark:bg-transparent" />
                   <span className="text-sm truncate text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">{url}</span>
                </label>
             ))}
           </div>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
       <div className="text-xs font-bold uppercase tracking-widest text-gray-500 flex justify-between items-end border-b border-gray-100 dark:border-white/10 pb-4">
          <div className="flex items-center gap-4">
             <span>Kiểm duyệt ({crawledItems.length} Mẫu) Tính Năng Deep Image Đang Bật</span>
             <div className="flex border border-gray-200 dark:border-white/10 rounded-none overflow-hidden xl:ml-4">
                 <button type="button" onClick={() => setReviewEditorMode('visual')} className={`px-3 py-1 text-[9px] uppercase font-bold tracking-widest transition-colors ${reviewEditorMode === 'visual' ? 'bg-primary text-black' : 'bg-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white border-r border-gray-200 dark:border-white/10'}`}>Trực Quan</button>
                 <button type="button" onClick={() => setReviewEditorMode('code')} className={`px-3 py-1 text-[9px] uppercase font-bold tracking-widest transition-colors ${reviewEditorMode === 'code' ? 'bg-primary text-black' : 'bg-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>Mã Hoá Raw</button>
             </div>
          </div>
          <button onClick={() => setStep('input')} className="text-gray-400 hover:text-primary transition-colors">← Trở lại Trích Xuất</button>
       </div>
       <div className="overflow-y-auto pr-2 space-y-6 flex-1 min-h-[300px]">
          {crawledItems.map((item, index) => (
             <div key={index} className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 p-6 relative group">
                <button 
                  onClick={() => handleRemoveItem(index)}
                  className="absolute top-4 right-4 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                  title="Xoá mục này"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="flex flex-col sm:flex-row gap-6 mr-8">
                   <div className="w-full sm:w-1/3 max-w-[150px]">
                      {item.image ? (
                        <div className="relative">
                          <label className="text-[10px] text-gray-400 uppercase font-bold absolute 0 top-0 bg-white/80 dark:bg-black/80 px-1 truncate w-full">Thẻ Feature (Ảnh Đại Diện)</label>
                          <img src={item.image} alt="preview" className="w-full h-auto object-cover border border-gray-100 dark:border-white/5 pt-4" />
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 uppercase">NO FEATURE IMAGE</div>
                      )}
                      
                      {targetType === 'product' && (
                        <div className="mt-4 relative pt-4 border-t border-gray-100 dark:border-white/5">
                          <label className="text-[10px] text-gray-400 uppercase font-bold absolute -top-2 bg-white dark:bg-[#0A0A0A] px-1">GIÁ BÁN</label>
                          <input 
                            type="text" 
                            className="w-full text-sm border-b border-gray-200 dark:border-white/10 bg-transparent text-primary font-bold focus:border-primary outline-none"
                            value={item.price || ''}
                            onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                            placeholder="Giá"
                          />
                        </div>
                      )}

                      {(item.contentImages && item.contentImages.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-[10px] text-primary uppercase font-bold">
                           Phát hiện {item.contentImages.length} Ảnh Nội Dung (Sẽ tự upload WP Media)
                        </div>
                      )}
                   </div>
                   <div className="w-full sm:w-2/3 flex flex-col space-y-4">
                      <div>
                        <input 
                           type="text"
                           className="w-full text-lg font-serif border-b border-gray-200 dark:border-white/10 text-gray-900 dark:text-white bg-transparent outline-none focus:border-primary transition-colors pb-1"
                           value={item.title}
                           onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                        />
                      </div>
                      
                      {/* SEO Fields Grid */}
                      <div className="grid grid-cols-2 gap-4 border border-dashed border-gray-200 dark:border-white/10 p-4">
                         <div className="col-span-2">
                           <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Hình ảnh các thẻ SEO (SEO Title)</label>
                           <input 
                             type="text" 
                             value={item.seoTitle || ''} 
                             onChange={(e) => handleUpdateItem(index, 'seoTitle', e.target.value)}
                             className="w-full text-xs border-b border-gray-200 dark:border-white/10 bg-transparent text-gray-800 dark:text-gray-200 focus:border-primary outline-none pb-1"
                             placeholder="Meta Title..."
                           />
                         </div>
                         <div className="col-span-2">
                           <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">SEO Description</label>
                           <textarea 
                             rows={2}
                             value={item.seoDescription || ''} 
                             onChange={(e) => handleUpdateItem(index, 'seoDescription', e.target.value)}
                             className="w-full text-xs border-b border-gray-200 dark:border-white/10 bg-transparent text-gray-800 dark:text-gray-200 focus:border-primary outline-none resize-none pb-1"
                             placeholder="Meta Description..."
                           />
                         </div>
                         <div className="col-span-2">
                           <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">SEO Focus Keyword</label>
                           <input 
                             type="text" 
                             value={item.seoKeywords || ''} 
                             onChange={(e) => handleUpdateItem(index, 'seoKeywords', e.target.value)}
                             className="w-full text-xs border-b border-gray-200 dark:border-white/10 bg-transparent text-gray-800 dark:text-gray-200 focus:border-primary outline-none pb-1"
                             placeholder="Keywords..."
                           />
                         </div>
                      </div>

                      <div className="bg-white dark:bg-[#050505] border border-gray-100 dark:border-white/5 rounded-none flex-1 mt-4 flex flex-col focus-within:border-primary transition-colors min-h-[250px]">
                        {reviewEditorMode === 'visual' ? (
                          <>
                            <style>{`
                              .ql-toolbar { border: none !important; border-bottom: 1px solid #e5e7eb !important; background: #faf9f6; }
                              .dark .ql-toolbar { border-bottom: 1px solid rgba(255,255,255,0.1) !important; background: #0a0a0a; color: white; }
                              .dark .ql-stroke { stroke: #999 !important; }
                              .dark .ql-fill { fill: #999 !important; }
                              .dark .ql-picker { color: #999 !important; }
                              .ql-container { border: none !important; color: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;}
                              .ql-editor img { max-width: 100% !important; height: auto !important; display: block; margin: 10px auto; border-radius: 8px; }
                            `}</style>
                            <ReactQuill 
                              theme="snow"
                              value={item.content || '<span class="text-gray-400">Không tìm thấy nội dung...</span>'}
                              onChange={(val) => handleUpdateItem(index, 'content', val)}
                              className="h-[250px] pb-12 text-sm text-gray-800 dark:text-gray-300 flex-1"
                              modules={{
                                toolbar: [
                                  [{ 'header': [1, 2, false] }],
                                  ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                  ['link', 'image', 'video'],
                                  ['clean']
                                ]
                              }}
                            />
                          </>
                        ) : (
                          <textarea 
                            value={item.content || ''}
                            onChange={(e) => handleUpdateItem(index, 'content', e.target.value)}
                            className="w-full flex-1 min-h-[250px] p-4 bg-[#FAF9F6] dark:bg-[#0A0A0A] text-xs font-mono text-gray-800 dark:text-gray-300 outline-none resize-none leading-relaxed"
                            placeholder="Nhập mã HTML..."
                          />
                        )}
                      </div>
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );

  const renderPushingStep = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] space-y-8 animate-fade-in">
       <Loader2 className="w-12 h-12 text-primary animate-spin" strokeWidth={1.5} />
       <div className="text-center">
         <h4 className="text-xl font-serif text-gray-900 dark:text-white uppercase tracking-widest mb-2">Đang Đồng Bộ Hoá</h4>
         <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Quá trình Deep Upload đang diễn ra (bao gồm Media cục bộ)...</p>
       </div>
       <div className="w-full max-w-md">
         <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            <span>Tiến độ bài viết</span>
            <span>{progress.current} / {progress.total}</span>
         </div>
         <div className="h-1 bg-gray-200 dark:bg-white/10 w-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(progress.total === 0 ? 0 : (progress.current / progress.total)) * 100}%` }}></div>
         </div>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-none w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl relative overflow-hidden transition-all">
        {/* Animated Top Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        <div className="flex justify-between items-center p-8 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-widest uppercase">Trình Thu Thập Dữ Liệu</h3>
            <p className="text-xs tracking-[0.1em] uppercase text-gray-400 mt-2">
              {step === 'input' ? 'Khởi Tạo Trích Xuất' : step === 'review' ? 'Kiểm Duyệt Mẫu' : 'Phân Phối Hệ Thống'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={step === 'pushing'} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-4 decoration-transparent hover:decoration-gray-500 disabled:opacity-50">
            Đóng Giao Diện
          </button>
        </div>

        <div className="p-8 overflow-hidden flex-1 flex flex-col">
          {step === 'input' && renderInputStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'pushing' && renderPushingStep()}
        </div>

        {step !== 'pushing' && (
          <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-[#FAF9F6] dark:bg-transparent flex flex-col sm:flex-row justify-between items-center gap-6 flex-shrink-0">
             <div className="w-full sm:w-1/2">
               {isProcessing && step === 'input' && (
                 <div className="flex flex-col w-full">
                   <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      <span>Đang Bóc Tách...</span>
                      <span>{progress.current} / {progress.total}</span>
                   </div>
                   <div className="h-1 bg-gray-200 dark:bg-white/10 w-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(progress.total === 0 ? 0 : (progress.current / progress.total)) * 100}%` }}></div>
                   </div>
                 </div>
               )}
             </div>
             
             {step === 'input' && (
               <button 
                 onClick={startExtraction} 
                 disabled={isProcessing || (crawlMode === 'sitemap' && sitemapUrls.length === 0)}
                 className="w-full sm:w-auto flex justify-center items-center px-10 py-4 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold uppercase tracking-widest text-xs rounded-none border border-primary transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isProcessing ? <Loader2 className="w-5 h-5 mr-3 animate-spin" strokeWidth={1.5} /> : <Play className="w-5 h-5 mr-3" strokeWidth={1.5} />}
                 {isProcessing ? 'Đang Khởi Chạy...' : 'Thu Thập Nội Dung'}
               </button>
             )}

             {step === 'review' && (
               <button 
                 onClick={processPushToWP} 
                 disabled={isProcessing || targetSiteIds.length === 0}
                 className="w-full sm:w-auto flex justify-center items-center px-10 py-4 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold uppercase tracking-widest text-xs rounded-none border border-primary transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isProcessing ? <Loader2 className="w-5 h-5 mr-3 animate-spin" strokeWidth={1.5} /> : <CheckCircle2 className="w-5 h-5 mr-3" strokeWidth={1.5} />}
                 {isProcessing ? 'Đang Đồng Bộ...' : 'Xuất Bản Lên Hệ Thống'}
               </button>
             )}
          </div>
        )}

      </div>
    </div>
  );
};
