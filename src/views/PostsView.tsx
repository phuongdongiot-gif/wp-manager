import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { WPPost, SiteCredential } from '../types/wordpress';
import { getPosts, createPost, updatePost, deletePost } from '../services/posts';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, ExternalLink, Globe, DownloadCloud } from 'lucide-react';
import { CrawlerModal } from '../components/CrawlerModal';
import { api } from '../services/api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const BaseImageFormat = ReactQuill.Quill.import('formats/image') as any;
class ImageFormat extends BaseImageFormat {
  static create(value: any) {
    const node = super.create(value);
    if (typeof value === 'string') {
      node.setAttribute('src', value);
    } else {
      node.setAttribute('src', value.url || value.src);
      if (value.alt) {
        node.setAttribute('alt', value.alt);
      }
      if (value.class) {
        node.setAttribute('class', value.class);
      }
    }
    return node;
  }
  
  static value(domNode: HTMLElement) {
    return {
      src: domNode.getAttribute('src'),
      alt: domNode.getAttribute('alt'),
      class: domNode.getAttribute('class')
    };
  }
}
ImageFormat.blotName = 'image';
ImageFormat.tagName = 'img';
ReactQuill.Quill.register(ImageFormat as any, true);

export const PostsView: React.FC = () => {
  const { activeSiteId, sites } = useAuth();
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [showCrawler, setShowCrawler] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newStatus, setNewStatus] = useState<'publish' | 'draft'>('publish');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('');
  
  const quillRef = useRef<ReactQuill>(null);

  // Category & Edit State
  const [availableCategories, setAvailableCategories] = useState<{id: number, name: string}[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  // Multi-site target state
  const [targetSiteIds, setTargetSiteIds] = useState<string[]>([]);
  
  // Quick Push (No Login) state
  const [pushMode, setPushMode] = useState<'saved' | 'quick'>('saved');
  const [quickSitesRaw, setQuickSitesRaw] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeSiteId) {
      loadPosts();
      loadCategories();
      setShowForm(false);
      setEditingPostId(null);
      setTargetSiteIds([activeSiteId]);
    }
  }, [activeSiteId]);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const targetSiteId = activeSiteId || targetSiteIds[0];
        if (!targetSiteId) {
          toast.error("Vui lòng chọn hệ thống đích trước khi chèn ảnh!");
          return;
        }
        
        const loadId = toast.loading("Đang tải ảnh lên hệ thống WordPress...");
        try {
          const media = await api.uploadMedia(file, targetSiteId);
          const imageUrl = media.source_url || (media.guid && media.guid.rendered);
          
          if (imageUrl) {
            const editor = quillRef.current?.getEditor();
            if (editor) {
              const range = editor.getSelection();
              const cursorPosition = range ? range.index : editor.getLength();
              // Force clear content separation
              editor.insertText(cursorPosition, '\n');
              editor.insertEmbed(cursorPosition + 1, 'image', {
                url: imageUrl,
                alt: file.name.split('.')[0] || 'Embedded image',
                class: 'wp-block-image size-large'
              });
              editor.insertText(cursorPosition + 2, '\n');
              editor.setSelection(cursorPosition + 3, 0); 
            }
            toast.dismiss(loadId);
            toast.success("Đã chèn ảnh vào trình soạn thảo");
          } else {
             throw new Error("Dữ liệu phản hồi hình ảnh không hợp lệ");
          }
        } catch (err: any) {
          toast.dismiss(loadId);
          toast.error("Lỗi tải ảnh: " + err.message);
        }
      }
    };
  }, [activeSiteId, targetSiteIds]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler]);

  const loadCategories = async () => {
    if (!activeSiteId) return;
    try {
      const data = await api.request<any[]>('/wp-json/wp/v2/categories?hide_empty=0&per_page=100', {}, activeSiteId);
      setAvailableCategories(data.map(c => ({id: c.id, name: c.name})));
    } catch(err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (err: any) {
      toast.error('Failed to load posts: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return toast.error("Vui lòng nhập Tiêu đề bài viết");

    let targetsToPush: (string | SiteCredential)[] = [];

    if (editingPostId) {
      targetsToPush = [activeSiteId!];
    } else if (pushMode === 'saved') {
      if (targetSiteIds.length === 0) return toast.error("Vui lòng chọn ít nhất một website đích");
      targetsToPush = targetSiteIds;
    } else {
      // Parse Quick Push targets
      const lines = quickSitesRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return toast.error("Vui lòng cung cấp ít nhất một hệ thống để đăng");
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 3) return toast.error(`Sai cú pháp: ${line}. Bắt buộc: URL|Tài khoản|Mật khẩu`);
        
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
      let activeSitePost: WPPost | null = null;

      // Publish to all selected/parsed sites concurrently
      await Promise.allSettled(
        targetsToPush.map(async (target) => {
          try {
            let mediaId: number | undefined;
            if (featuredImage) {
              const mediaRes = await api.uploadMedia(featuredImage, target);
              mediaId = mediaRes.id;
            }
            const meta = {
              ...(focusKeyword ? { rank_math_focus_keyword: focusKeyword } : {}),
              ...(seoTitle ? { rank_math_title: seoTitle } : {}),
              ...(seoDescription ? { rank_math_description: seoDescription } : {})
            };
            let post;
            if (editingPostId) {
              post = await updatePost(
                editingPostId,
                newTitle,
                newContent,
                newStatus,
                mediaId,
                Object.keys(meta).length > 0 ? meta : undefined,
                selectedCategories,
                target
              );
            } else {
              post = await createPost(
                newTitle, 
                newContent, 
                newStatus, 
                mediaId,
                Object.keys(meta).length > 0 ? meta : undefined,
                selectedCategories,
                target
              );
            }
            successCount++;
            // If the post was published to our currently viewed site, add it to the UI
            if (typeof target === 'string' && target === activeSiteId) {
              activeSitePost = post;
            }
          } catch (err: any) {
            let errorContext = '';
            if (typeof target === 'string') {
              const site = sites.find(s => s.id === target);
              errorContext = site?.siteName || site?.url || target;
            } else {
              errorContext = (target as SiteCredential).url;
            }
            toast.error(`Lỗi đăng trên ${errorContext}: ${err.message}`);
          }
        })
      );

      if (successCount > 0) {
        toast.success(`Đẩy bài viết thành công lên ${successCount} website!`);
        if (activeSitePost) {
          setPosts([activeSitePost, ...posts]);
        }
        setNewTitle('');
        setNewContent('');
        setFocusKeyword('');
        setSeoTitle('');
        setSeoDescription('');
        setFeaturedImage(null);
        setFeaturedImagePreview('');
        setSelectedCategories([]);
        setEditingPostId(null);
        if(pushMode === 'quick') setQuickSitesRaw('');
        setShowForm(false);
        loadPosts();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (post: WPPost) => {
    setEditingPostId(post.id);
    setNewTitle(post.title.rendered);
    setNewContent(post.content.rendered);
    setNewStatus((post.status === 'publish' || post.status === 'draft') ? post.status : 'draft');
    setSelectedCategories(post.categories || []);
    
    // RankMath Meta if available
    if (post.meta && !Array.isArray(post.meta)) {
      const pm = post.meta as Record<string, any>;
      setFocusKeyword(pm.rank_math_focus_keyword || '');
      setSeoTitle(pm.rank_math_title || '');
      setSeoDescription(pm.rank_math_description || '');
    } else {
      setFocusKeyword('');
      setSeoTitle('');
      setSeoDescription('');
    }
    
    setFeaturedImage(null);
    setFeaturedImagePreview('');
    setTargetSiteIds([activeSiteId!]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá vĩnh viễn bài viết này không?")) return;
    try {
      setPosts(posts.filter(p => p.id !== id));
      await deletePost(id);
      toast.success("Đã xoá bài viết thành công");
    } catch (err: any) {
      toast.error("Gặp lỗi khi xoá bài viết.");
      loadPosts(); // reload on error
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
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-12 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-4xl font-serif text-gray-900 dark:text-white tracking-[0.05em] uppercase">Quản lý Bài viết</h2>
          <p className="text-xs tracking-wider uppercase text-gray-500 dark:text-gray-400 mt-3 inline-block">Nội dung tin tức và kiến thức</p>
        </div>
        {!showForm && (
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowCrawler(true)}
              className="flex items-center px-6 py-3 bg-white dark:bg-transparent text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-500 font-bold uppercase tracking-wider text-xs rounded-none border border-gray-900 dark:border-white"
            >
              <DownloadCloud className="w-4 h-4 mr-2" strokeWidth={1.5} /> Thu Thập
            </button>
            <button 
              onClick={() => {
                setTargetSiteIds(activeSiteId ? [activeSiteId] : []);
                setShowForm(true);
              }}
              className="flex items-center px-6 py-3 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-500 font-bold uppercase tracking-wider text-xs rounded-none border border-primary"
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} /> Thêm Bài viết
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-none shadow-2xl border border-gray-200 dark:border-white/5 p-12 mb-12 transition-all relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100 dark:border-white/5">
            <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-wider uppercase">{editingPostId ? 'Chỉnh sửa Bài viết' : 'Viết Bài Mới'}</h3>
            <button type="button" onClick={() => {
              setEditingPostId(null);
              setNewTitle('');
              setNewContent('');
              setFocusKeyword('');
              setSeoTitle('');
              setSeoDescription('');
              setSelectedCategories([]);
              setFeaturedImage(null);
              setFeaturedImagePreview('');
              setShowForm(false);
            }} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-4 decoration-transparent hover:decoration-gray-500">Huỷ bỏ</button>
          </div>
          <form onSubmit={handleCreateNew} className="space-y-12">
            <div className="relative group">
              <input 
                type="text" 
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-0 pt-6 pb-2 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white text-xl focus:border-primary outline-none transition-colors peer" 
                placeholder=" " 
              />
              <label className="absolute left-0 top-6 text-gray-400 dark:text-gray-500 text-sm peer-focus:text-xs peer-focus:-translate-y-7 peer-focus:text-primary peer-valid:text-xs peer-valid:-translate-y-7 transition-all duration-300 pointer-events-none uppercase tracking-wider">Tiêu đề Bài viết</label>
              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-500 group-focus-within:w-full"></div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Nội dung Bài viết</label>
              <div className="bg-white dark:bg-[#050505] text-gray-900 dark:text-white rounded-none border border-gray-200 dark:border-white/10 overflow-hidden [&_.ql-container]:min-h-[400px] [&_.ql-container]:text-base [&_.ql-editor]:min-h-[400px] [&_.ql-toolbar]:bg-[#FAF9F6] dark:[&_.ql-toolbar]:bg-[#080808] [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 dark:[&_.ql-toolbar]:border-white/10 dark:[&_.ql-container]:border-transparent dark:[&_.ql-editor]:text-gray-200 focus-within:border-primary transition-colors">
                <ReactQuill ref={quillRef} modules={modules} theme="snow" value={newContent} onChange={setNewContent} className="h-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-white/10">
              <div className="bg-[#FAF9F6] dark:bg-transparent p-8 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary/50 transition-colors">
                <label className="block text-sm font-serif uppercase tracking-wider text-gray-900 dark:text-white mb-6">Cấu hình SEO</label>
                <div className="space-y-6">
                  <div className="relative group">
                    <input type="text" value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} className="w-full px-0 pt-4 pb-1 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:border-primary transition-colors text-sm outline-none peer" placeholder=" " />
                    <label className="absolute left-0 top-4 text-gray-400 dark:text-gray-500 text-xs peer-focus:-translate-y-5 peer-focus:text-primary peer-valid:-translate-y-5 transition-all duration-300 pointer-events-none uppercase tracking-wider font-bold">Từ khoá chính (Focus Keyword)</label>
                  </div>
                  <div className="relative group">
                    <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} className="w-full px-0 pt-4 pb-1 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:border-primary transition-colors text-sm outline-none peer" placeholder=" " />
                    <label className="absolute left-0 top-4 text-gray-400 dark:text-gray-500 text-xs peer-focus:-translate-y-5 peer-focus:text-primary peer-valid:-translate-y-5 transition-all duration-300 pointer-events-none uppercase tracking-wider font-bold">Tiêu đề hiển thị SEO</label>
                  </div>
                  <div className="relative group pt-2">
                    <label className="block text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold mb-2">Thẻ mô tả (Meta Description)</label>
                    <textarea rows={3} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white rounded-none focus:border-primary transition-colors text-sm outline-none resize-none" placeholder="Nhập thẻ mô tả SEO..." />
                  </div>
                </div>
              </div>
              
              <div className="bg-[#FAF9F6] dark:bg-transparent p-8 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary/50 transition-colors">
                <label className="block text-sm font-serif uppercase tracking-wider text-gray-900 dark:text-white mb-6">Ảnh đại diện</label>
                <div className="flex flex-col items-start gap-4">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setFeaturedImage(file);
                        setFeaturedImagePreview(URL.createObjectURL(file));
                      }
                    }} 
                    className="text-xs text-gray-500 uppercase tracking-wider font-bold file:cursor-pointer file:mr-4 file:py-3 file:px-6 file:rounded-none file:border-0 file:border-r file:border-gray-200 dark:file:border-white/10 file:text-xs file:font-bold file:bg-white dark:file:bg-[#050505] file:text-primary hover:file:bg-primary/5 file:transition-colors"
                  />
                  {featuredImagePreview && (
                    <div className="relative inline-block mt-4 group">
                      <img src={featuredImagePreview} alt="Preview" className="h-48 object-cover rounded-none border border-gray-200 dark:border-white/10 shadow-lg transition-transform duration-500" />
                      <button type="button" onClick={() => { setFeaturedImage(null); setFeaturedImagePreview(''); }} className="absolute -top-3 -right-3 bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/10 text-red-500 hover:text-white hover:bg-red-500 rounded-none p-2 shadow-sm transition-colors" title="Gỡ bỏ ảnh">
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Categories Selection */}
            <div className="pt-8 border-t border-gray-100 dark:border-white/10">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Danh mục Phân loại</label>
              {availableCategories.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {availableCategories.map(cat => (
                    <label key={cat.id} className={`flex items-center px-4 py-2 rounded-none border cursor-pointer transition-colors duration-300 text-xs uppercase tracking-wider font-bold ${
                      selectedCategories.includes(cat.id) ? 'bg-primary border-primary text-black' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCategories([...selectedCategories, cat.id]);
                          else setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                        }}
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 uppercase tracking-wider">Danh mục đang trống.</div>
              )}
            </div>

            {/* Multi-Publish Feature Toggle */}
            {!editingPostId && (
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
            )}
            
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
                {isSubmitting ? <Loader2 className="w-5 h-5 mr-3 animate-spin" strokeWidth={1.5} /> : null}
                {editingPostId ? 'Đồng bộ Chỉnh Sửa' : (newStatus === 'publish' ? 'Xuất Bản Hàng Loạt' : 'Lưu Nháp Hàng Loạt')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-32 bg-transparent border border-gray-200 dark:border-white/10 rounded-none">
          <h3 className="text-2xl font-serif text-gray-900 dark:text-white mb-4 tracking-wider uppercase">Chưa Có Dữ Liệu</h3>
          <p className="text-gray-500 text-sm mb-8 tracking-wide font-semibold">Không tìm thấy bản ghi bài viết nào. Vui lòng thiết lập để tiếp tục.</p>
          <button onClick={() => setShowForm(true)} className="px-8 py-4 border border-primary text-primary hover:bg-primary hover:text-black dark:hover:text-black transition-colors font-bold uppercase tracking-wider text-xs">Khởi tạo Dữ liệu</button>
        </div>
      ) : (
        <div className="bg-transparent border border-gray-200 dark:border-white/10 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-[#FAF9F6] dark:bg-[#050505] text-xs uppercase tracking-wider font-bold text-gray-500 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-8 py-6">Tiêu đề Bài viết</th>
                  <th className="px-8 py-6 w-32">Trạng thái</th>
                  <th className="px-8 py-6 w-40">Ngày tạo</th>
                  <th className="px-8 py-6 text-right w-40">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {posts.map(post => (
                  <tr key={post.id} className="hover:bg-[#FAF9F6] dark:hover:bg-[#0A0A0A] transition-colors duration-300 group">
                    <td className="px-8 py-5 font-serif text-gray-900 dark:text-white truncate max-w-xs tracking-wide" dangerouslySetInnerHTML={{ __html: post.title.rendered }}></td>
                    <td className="px-8 py-5 uppercase text-xs tracking-widest font-bold flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        post.status === 'publish' ? 'bg-green-500' :
                        post.status === 'draft' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}></span>
                      {post.status}
                    </td>
                    <td className="px-8 py-5 text-gray-500 text-xs tracking-wider">
                      {new Date(post.date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-4 opacity-70 group-hover:opacity-100 transition-opacity">
                        <a href={post.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary transition-colors" title="View">
                          <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                        </a>
                        <button onClick={() => handleEditClick(post)} className="text-gray-400 hover:text-primary transition-colors" title="Edit">
                          <Edit className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
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
      <CrawlerModal isOpen={showCrawler} onClose={() => { setShowCrawler(false); loadPosts(); }} defaultType="post" />
    </div>
  );
};
