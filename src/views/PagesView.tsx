import React, { useEffect, useState } from 'react';
import { WPPage, SiteCredential } from '../types/wordpress';
import { getPages, createPage, updatePage, deletePage } from '../services/pages';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, ExternalLink, Globe } from 'lucide-react';

export const PagesView: React.FC = () => {
  const { activeSiteId, sites } = useAuth();
  const [pages, setPages] = useState<WPPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newStatus, setNewStatus] = useState<'publish' | 'draft'>('publish');
  
  // Multi-site target state
  const [targetSiteIds, setTargetSiteIds] = useState<string[]>([]);
  
  // Quick Push (No Login) state
  const [pushMode, setPushMode] = useState<'saved' | 'quick'>('saved');
  const [quickSitesRaw, setQuickSitesRaw] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeSiteId) {
      loadPages();
      closeForm();
    }
  }, [activeSiteId]);

  const loadPages = async () => {
    setIsLoading(true);
    try {
      const data = await getPages();
      setPages(data);
    } catch (err: any) {
      toast.error('Failed to load pages: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setNewTitle('');
    setNewContent('');
    setNewStatus('publish');
  };

  const openCreateForm = () => {
    closeForm();
    setTargetSiteIds(activeSiteId ? [activeSiteId] : []);
    setShowForm(true);
  };

  const openEditForm = (page: WPPage) => {
    setEditingId(page.id);
    setNewTitle(page.title.rendered);
    setNewContent(page.content.rendered);
    setNewStatus(page.status === 'publish' ? 'publish' : 'draft');
    setTargetSiteIds(activeSiteId ? [activeSiteId] : []);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return toast.error("Title is required");

    let targetsToPush: (string | SiteCredential)[] = [];

    if (pushMode === 'saved') {
      if (targetSiteIds.length === 0) return toast.error("Please select at least one saved site");
      targetsToPush = targetSiteIds;
    } else {
      // Parse Quick Push targets
      const lines = quickSitesRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return toast.error("Please provide at least one quick site credential");
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 3) return toast.error(`Invalid format: ${line}. Expected URL|Username|Password`);
        
        let url = parts[0];
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        
        targetsToPush.push({
          id: btoa(url + parts[1]),
          url: url.replace(/\/$/, ''),
          username: parts[1],
          password: parts[2]
        });
      }
    }

    try {
      setIsSubmitting(true);
      
      let successCount = 0;
      let activeSitePage: WPPage | null = null;

      // Publish/Update all selected/parsed sites concurrently
      await Promise.allSettled(
        targetsToPush.map(async (target) => {
          try {
            let page;
            if (editingId) {
              page = await updatePage(editingId, newTitle, newContent, newStatus, target);
            } else {
              page = await createPage(newTitle, newContent, newStatus, target);
            }
            
            successCount++;
            
            // If the page was published/updated on our currently viewed site, reflect it in UI
            if (typeof target === 'string' && target === activeSiteId) {
              activeSitePage = page;
            }
          } catch (err: any) {
            let errorContext = '';
            if (typeof target === 'string') {
              const site = sites.find(s => s.id === target);
              errorContext = site?.siteName || site?.url || target;
            } else {
              errorContext = (target as SiteCredential).url;
            }
            toast.error(`Failed on ${errorContext}: ${err.message}`);
          }
        })
      );

      if (successCount > 0) {
        toast.success(`Cập nhật thành công trang lên ${successCount} website!`);
        
        if (activeSitePage) {
          if (editingId) {
            setPages(pages.map(p => p.id === editingId ? activeSitePage! : p));
          } else {
            setPages([activeSitePage, ...pages]);
          }
        }
        
        closeForm();
        if(pushMode === 'quick') setQuickSitesRaw('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá vĩnh viễn trang này không?")) return;
    try {
      setPages(pages.filter(p => p.id !== id));
      await deletePage(id);
      toast.success("Trang đã được xoá thành công.");
    } catch (err: any) {
      toast.error("Gặp lỗi khi xoá trang.");
      loadPages(); // reload on error
    }
  };

  const toggleSiteTarget = (siteId: string) => {
    if (targetSiteIds.includes(siteId)) {
      setTargetSiteIds(targetSiteIds.filter(id => id !== siteId));
    } else {
      setTargetSiteIds([...targetSiteIds, siteId]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-12 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-4xl font-serif text-gray-900 dark:text-white tracking-[0.05em] uppercase">Quản lý Trang</h2>
          <p className="text-xs tracking-wider uppercase text-gray-500 dark:text-gray-400 mt-3 inline-block">Thiết lập nội dung tĩnh</p>
        </div>
        {!showForm && (
          <button 
            onClick={openCreateForm}
            className="flex items-center px-6 py-3 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-500 font-bold uppercase tracking-wider text-xs rounded-none border border-primary"
          >
            <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} /> Thêm Trang Mới
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-none shadow-2xl border border-gray-200 dark:border-white/5 p-10 mb-12 transition-all relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100 dark:border-white/5">
            <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-wider uppercase">
              {editingId ? 'Chỉnh sửa Trang' : 'Tạo Trang Mới'}
            </h3>
            <button type="button" onClick={closeForm} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-4 decoration-transparent hover:decoration-gray-500">Huỷ bỏ</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="relative group">
               <input 
                type="text" 
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-0 pt-6 pb-2 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white text-lg focus:border-primary outline-none transition-colors peer" 
                placeholder=" " 
              />
              <label className="absolute left-0 top-6 text-gray-400 dark:text-gray-500 text-sm peer-focus:text-xs peer-focus:-translate-y-7 peer-focus:text-primary peer-valid:text-xs peer-valid:-translate-y-7 transition-all duration-300 pointer-events-none uppercase tracking-wider">Tiêu đề Trang</label>
              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-500 group-focus-within:w-full"></div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Nội dung Trang</label>
              <textarea 
                rows={12}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full p-6 border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#050505] text-gray-900 dark:text-white rounded-none focus:border-primary outline-none resize-none font-mono text-sm transition-colors leading-relaxed" 
                placeholder="Ví dụ: <h2>Về chúng tôi</h2><p>Công ty ABC...</p>" 
              />
            </div>

            {/* Multi-Publish Feature Toggle */}
            <div className="pt-8 pb-4 border-t border-gray-100 dark:border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center">
                  <Globe className="w-4 h-4 mr-3" strokeWidth={1.5} /> Đăng Đa Nền Tảng
                </label>
                <div className="flex items-center space-x-6">
                  <button 
                    type="button"
                    onClick={() => setPushMode('saved')}
                    className={`text-xs uppercase tracking-wider font-bold pb-2 border-b-2 transition-colors ${pushMode === 'saved' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-300'}`}
                  >
                    Site Đã Lưu
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPushMode('quick')}
                    className={`text-xs uppercase tracking-wider font-bold pb-2 border-b-2 transition-colors ${pushMode === 'quick' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-300'}`}
                  >
                    Đăng Nhanh
                  </button>
                </div>
              </div>

              {pushMode === 'saved' ? (
                sites.length > 0 ? (
                  <div className="bg-[#FAF9F6] dark:bg-transparent p-6 rounded-none border border-gray-200 dark:border-white/10">
                    <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6 font-bold">Chọn hệ thống phân phối:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sites.map(site => (
                        <label key={site.id} className={`flex items-center space-x-4 p-4 rounded-none border cursor-pointer transition-all duration-300 ${
                          targetSiteIds.includes(site.id) ? 'border-primary bg-primary/5 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/5 text-gray-500 hover:border-gray-400'
                        }`}>
                          <input 
                            type="checkbox" 
                            className="rounded-none w-4 h-4 text-primary focus:ring-primary border-gray-300 dark:bg-transparent"
                            checked={targetSiteIds.includes(site.id)}
                            onChange={() => toggleSiteTarget(site.id)}
                          />
                          <span className="text-xs font-bold tracking-wide truncate" title={site.url}>{site.siteName && site.siteName !== site.username && site.siteName !== 'New Site' ? site.siteName : site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs uppercase tracking-wider text-gray-400 p-6 border border-dashed border-gray-300 dark:border-white/10 text-center">Chưa có site nào được lưu trong hệ thống.</div>
                )
              ) : (
                <div className="bg-[#FAF9F6] dark:bg-transparent p-6 rounded-none border border-gray-200 dark:border-white/10">
                   <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Nhập Thông Tin Hệ Thống</label>
                   <p className="text-xs text-gray-400 mb-6 tracking-wide">Cú pháp: <code>URL|Tài_khoản|App_Password</code> (Mỗi website một dòng)</p>
                   <textarea 
                     rows={4}
                     value={quickSitesRaw}
                     onChange={e => setQuickSitesRaw(e.target.value)}
                     className="w-full p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white rounded-none focus:border-primary outline-none font-mono text-sm resize-y transition-colors" 
                     placeholder="https://site1.com|admin|xxxx xxxx xxxx xxxx&#10;https://site2.com|user|yyyy yyyy yyyy yyyy" 
                   />
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-8 mt-8 border-t border-gray-100 dark:border-white/5 gap-6">
              <div className="flex items-center space-x-8">
                <label className="flex items-center space-x-3 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input type="radio" className="w-4 h-4 text-primary focus:ring-primary bg-transparent border-gray-300" name="status" checked={newStatus === 'publish'} onChange={() => setNewStatus('publish')} />
                  <span>Cập nhật Public</span>
                </label>
                <label className="flex items-center space-x-3 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input type="radio" className="w-4 h-4 text-primary focus:ring-primary bg-transparent border-gray-300" name="status" checked={newStatus === 'draft'} onChange={() => setNewStatus('draft')} />
                  <span>Lưu Nháp</span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || (pushMode === 'saved' && targetSiteIds.length === 0) || (pushMode === 'quick' && quickSitesRaw.trim() === '')}
                className="flex justify-center items-center px-8 py-4 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold uppercase tracking-wider text-xs rounded-none border border-primary transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                {editingId ? 'Đồng bộ Chỉnh Sửa' : (newStatus === 'publish' ? 'Đăng lên các Web đã chọn' : 'Lưu Nháp lên các Web')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-32 bg-transparent border border-gray-200 dark:border-white/10 rounded-none">
          <h3 className="text-2xl font-serif text-gray-900 dark:text-white mb-4 tracking-wider uppercase">Chưa Có Dữ Liệu</h3>
          <p className="text-gray-500 text-sm mb-8 tracking-wide font-semibold">Không tìm thấy bản ghi nội dung tĩnh nào. Vui lòng thiết lập để tiếp tục.</p>
          <button onClick={openCreateForm} className="px-8 py-4 border border-primary text-primary hover:bg-primary hover:text-black dark:hover:text-black transition-colors font-bold uppercase tracking-wider text-xs">Khởi tạo Dữ liệu Tĩnh</button>
        </div>
      ) : (
        <div className="bg-transparent border border-gray-200 dark:border-white/10 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-[#FAF9F6] dark:bg-[#050505] text-xs uppercase tracking-wider font-bold text-gray-500 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-8 py-6">Tiêu đề Trang</th>
                  <th className="px-8 py-6 w-32">Trạng thái</th>
                  <th className="px-8 py-6 w-40">Ngày tạo</th>
                  <th className="px-8 py-6 text-right w-40">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {pages.map(page => (
                  <tr key={page.id} className="hover:bg-[#FAF9F6] dark:hover:bg-[#0A0A0A] transition-colors duration-300 group">
                    <td className="px-8 py-5 font-serif text-gray-900 dark:text-white truncate max-w-xs tracking-wide" dangerouslySetInnerHTML={{ __html: page.title.rendered }}></td>
                    <td className="px-8 py-5 uppercase text-xs tracking-widest font-bold flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        page.status === 'publish' ? 'bg-green-500' :
                        page.status === 'draft' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}></span>
                      {page.status}
                    </td>
                    <td className="px-8 py-5 text-gray-500 text-xs tracking-wider">
                      {new Date(page.date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-4 opacity-70 group-hover:opacity-100 transition-opacity">
                        <a href={page.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary transition-colors" title="View">
                          <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                        </a>
                        <button onClick={() => openEditForm(page)} className="text-gray-400 hover:text-primary transition-colors" title="Edit">
                          <Edit className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button onClick={() => handleDelete(page.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
