import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, createCategory } from '../services/woocommerce';
import { api } from '../services/api';
import { WCProduct, WCCategory } from '../types/wordpress';
import { Loader2, Plus, Edit, Trash2, ExternalLink, Globe, DownloadCloud } from 'lucide-react';
import { CrawlerModal } from '../components/CrawlerModal';
import { FacebookSettingsModal, FacebookIcon } from '../components/FacebookSettingsModal';
import { FacebookPosterModal } from '../components/FacebookPosterModal';
import { GoogleSettingsModal, GoogleIcon } from '../components/GoogleSettingsModal';
import { ShopeeSettingsModal, ShopeeIcon } from '../components/ShopeeSettingsModal';
import { LazadaSettingsModal, LazadaIcon } from '../components/LazadaSettingsModal';
import { googleIndexingApi } from '../services/google-indexing';
import { shopeeApi } from '../services/shopee';
import { lazadaApi } from '../services/lazada';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export const ProductsView: React.FC = () => {
  const { sites, activeSiteId, autoIndexOnPublish, googleServiceAccount, shopeeConfig, lazadaConfig } = useAuth();
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [availableCategories, setAvailableCategories] = useState<WCCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCrawler, setShowCrawler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [sku, setSku] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('');
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  
  const [newStatus, setNewStatus] = useState<'publish' | 'draft'>('publish');
  const [pushMode, setPushMode] = useState<'saved' | 'quick'>('saved');
  const [targetSiteIds, setTargetSiteIds] = useState<string[]>([]);
  const [quickSitesRaw, setQuickSitesRaw] = useState('');

  const [showFbSettings, setShowFbSettings] = useState(false);
  const [showFbPoster, setShowFbPoster] = useState(false);
  const [fbPostTitle, setFbPostTitle] = useState('');
  const [fbPostUrl, setFbPostUrl] = useState('');
  const [fbPostImage, setFbPostImage] = useState('');

  const [showGoogleSettings, setShowGoogleSettings] = useState(false);
  
  const [showShopeeSettings, setShowShopeeSettings] = useState(false);
  const [isPushingShopeeId, setIsPushingShopeeId] = useState<number | null>(null);

  const [showLazadaSettings, setShowLazadaSettings] = useState(false);
  const [isPushingLazadaId, setIsPushingLazadaId] = useState<number | null>(null);

  const quillRef = useRef<ReactQuill>(null);

  const activeSite = useMemo(() => sites.find(s => s.id === activeSiteId), [sites, activeSiteId]);

  useEffect(() => {
    if (activeSiteId) {
      const site = sites.find(s => s.id === activeSiteId);
      if (site) {
        loadData(site);
        setTargetSiteIds([site.id]);
      }
    }
  }, [activeSiteId]);

  const loadData = async (site: any) => {
    setIsLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        getProducts(site),
        getCategories(site)
      ]);
      setProducts(prods);
      setAvailableCategories(cats);
    } catch (error: any) {
      const msg = error.message?.includes('Plugin_WooCommerce_Not_Found') 
        ? error.message.replace('Plugin_WooCommerce_Not_Found: ', '') 
        : 'Lỗi tải dữ liệu eCommerce: ' + error.message;
      toast.error(msg, { id: 'wc-load-error', duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !activeSite) return;
    setIsCreatingCategory(true);
    try {
      const newCat = await createCategory(activeSite, newCategoryName.trim());
      setAvailableCategories(prev => [...prev, newCat]);
      setSelectedCategories(prev => [...prev, newCat.id]);
      setNewCategoryName('');
      toast.success(`Đã tạo phân khúc "${newCat.name}"`);
    } catch (err: any) {
      toast.error('Lỗi tạo phân khúc: ' + err.message);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file || !activeSite) return;

      const loadingToastId = toast.loading('Đang tải ảnh biên tập...');
      try {
        const media = await api.uploadMedia(file, activeSite);
        const editor = quillRef.current?.getEditor();
        if (editor && media.source_url) {
          const range = editor.getSelection();
          const position = range ? range.index : 0;
          editor.insertEmbed(position, 'image', media.source_url);
        }
        toast.success('Tải ảnh thành công!', { id: loadingToastId });
      } catch (error: any) {
        toast.error('Lỗi tải ảnh: ' + error.message, { id: loadingToastId });
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [activeSite]);

  const toggleSiteTarget = (id: string) => {
    setTargetSiteIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
  };

  const handleEditClick = (product: WCProduct) => {
    setEditingProductId(product.id);
    setNewName(product.name);
    setNewDescription(product.description || '');
    setRegularPrice(product.regular_price || '');
    setSalePrice(product.sale_price || '');
    setStockQuantity(product.stock_quantity !== null ? String(product.stock_quantity) : '');
    setSku(product.sku || '');
    setNewStatus(product.status === 'publish' ? 'publish' : 'draft');
    setSelectedCategories(product.categories.map(c => c.id));
    
    if (product.images && product.images.length > 0) {
      setFeaturedImagePreview(product.images[0].src);
    } else {
      setFeaturedImagePreview('');
    }
    
    setFeaturedImage(null);
    setShowForm(true);
    setTargetSiteIds(activeSiteId ? [activeSiteId] : []);
  };

  const handleDelete = async (id: number) => {
    if (!activeSite || !window.confirm('Vĩnh viễn xoá Sản phẩm này? Hành động này không thể hoàn tác.')) return;
    try {
      await deleteProduct(activeSite, id);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Đã xoá Sản phẩm thành công.');
    } catch (e: any) {
      toast.error('Lỗi xoá Sản phẩm: ' + e.message);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    setIsSubmitting(true);

    try {
      const payload: Partial<WCProduct> = {
        name: newName,
        description: newDescription,
        status: newStatus,
        regular_price: regularPrice,
        sale_price: salePrice,
        sku: sku,
        manage_stock: stockQuantity !== '',
        stock_quantity: stockQuantity !== '' ? parseInt(stockQuantity, 10) : null,
        categories: selectedCategories.map(id => ({ id } as any)),
      };

      if (editingProductId) {
        if (featuredImage) {
          const media = await api.uploadMedia(featuredImage, activeSite);
          payload.images = [{ src: media.source_url } as any];
        }
        await updateProduct(activeSite, editingProductId, payload);
        toast.success('Cập nhật Sản phẩm thành công!');
      } else {
        const targetSites = pushMode === 'saved' ? sites.filter(s => targetSiteIds.includes(s.id)) : [];
        let successCount = 0;

        for (const site of targetSites) {
          const sitePayload = { ...payload };
          
          let targetCategoryIds: number[] = [];
          if (selectedCategories.length > 0) {
            if (site.id === activeSite.id) {
              targetCategoryIds = [...selectedCategories];
            } else {
              const selectedNames = availableCategories
                .filter(c => selectedCategories.includes(c.id))
                .map(c => c.name);
                
              try {
                const targetCats = await getCategories(site);
                for (const name of selectedNames) {
                  const existing = targetCats.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
                  if (existing) {
                    targetCategoryIds.push(existing.id);
                  } else {
                    const newCat = await createCategory(site, name);
                    targetCategoryIds.push(newCat.id);
                  }
                }
              } catch (catErr: any) {
                console.warn("Category mapping failed on WooCommerce target site", catErr);
              }
            }
          }
          
          if (targetCategoryIds.length > 0) {
             sitePayload.categories = targetCategoryIds.map(id => ({ id } as any));
          } else {
             delete sitePayload.categories;
          }

          if (featuredImage) {
            try {
              const media = await api.uploadMedia(featuredImage, site);
              sitePayload.images = [{ src: media.source_url } as any];
            } catch(e) {
              toast.error(`Lỗi tải ảnh lên site ${site.siteName}: ` + e);
            }
          }
          const newProd = await createProduct(site, sitePayload);
          successCount++;

          if (autoIndexOnPublish && googleServiceAccount && newProd.permalink) {
            googleIndexingApi.publishUrl(newProd.permalink, googleServiceAccount)
              .then(() => toast.success(`Đã ép Google Index cho sản phẩm trên ${site.siteName || site.url}`))
              .catch(e => toast.error(`Lỗi Index: ${e.message}`));
          }
        }
        toast.success(`Đã xuất bản hệ thống thành công lên ${successCount} cửa hàng.`);
      }
      
      setShowForm(false);
      setEditingProductId(null);
      setNewName('');
      setNewDescription('');
      setRegularPrice('');
      setSalePrice('');
      setStockQuantity('');
      setSku('');
      setFeaturedImage(null);
      setFeaturedImagePreview('');
      setSelectedCategories([]);
      if (activeSite) loadData(activeSite);
      
    } catch (err: any) {
      toast.error('Lỗi lưu Sản phẩm: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePushToShopee = async (product: WCProduct) => {
    if (!shopeeConfig) {
      toast.error('Vui lòng cấu hình Shopee trước khi đồng bộ.');
      setShowShopeeSettings(true);
      return;
    }
    
    setIsPushingShopeeId(product.id);
    const toastId = toast.loading(`Đang đồng bộ ${product.name} lên Shopee...`);
    try {
       await shopeeApi.pushItem(shopeeConfig, product);
       toast.success(`Đã đồng bộ sản phẩm lên Shopee thành công!`, { id: toastId });
    } catch (e: any) {
       toast.error(`Lỗi đồng bộ Shopee: ${e.message}`, { id: toastId });
    } finally {
       setIsPushingShopeeId(null);
    }
  };

  const handlePushToLazada = async (product: WCProduct) => {
    if (!lazadaConfig) {
      toast.error('Vui lòng cấu hình Lazada trước khi đồng bộ.');
      setShowLazadaSettings(true);
      return;
    }
    
    setIsPushingLazadaId(product.id);
    const toastId = toast.loading(`Đang đồng bộ ${product.name} lên Lazada...`);
    try {
       await lazadaApi.pushItem(lazadaConfig, product);
       toast.success(`Đã đồng bộ sản phẩm lên Lazada thành công!`, { id: toastId });
    } catch (e: any) {
       toast.error(`Lỗi đồng bộ Lazada: ${e.message}`, { id: toastId });
    } finally {
       setIsPushingLazadaId(null);
    }
  };

  if (!activeSite) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-12 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-4xl font-serif text-gray-900 dark:text-white tracking-[0.05em] uppercase">Quản lý Sản phẩm</h2>
          <p className="text-xs tracking-[0.1em] uppercase text-gray-500 dark:text-gray-400 mt-3 inline-block">Hệ thống Cửa Hàng Giới Hạn</p>
        </div>
        {!showForm && (
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowGoogleSettings(true)}
              className="flex items-center justify-center p-3 bg-white dark:bg-transparent text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-all duration-500 rounded-none border border-gray-200 dark:border-white/10 hover:border-[#4285F4]"
              title="Cấu hình Google Indexing"
            >
              <GoogleIcon className="w-[18px] h-[18px]" />
            </button>
            <button 
              onClick={() => setShowShopeeSettings(true)}
              className="flex items-center justify-center p-3 bg-white dark:bg-transparent text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white transition-all duration-500 rounded-none border border-gray-200 dark:border-white/10 hover:border-[#EE4D2D]"
              title="Cấu hình Kết nối Shopee"
            >
              <ShopeeIcon className="w-[18px] h-[18px]" />
            </button>
            <button 
              onClick={() => setShowLazadaSettings(true)}
              className="flex items-center justify-center p-3 bg-white dark:bg-transparent text-[#0F146D] hover:bg-[#0F146D] hover:text-white transition-all duration-500 rounded-none border border-gray-200 dark:border-white/10 hover:border-[#0F146D]"
              title="Cấu hình Kết nối Lazada"
            >
              <LazadaIcon className="w-[18px] h-[18px]" />
            </button>
            <button 
              onClick={() => setShowFbSettings(true)}
              className="flex items-center justify-center p-3 bg-white dark:bg-transparent text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all duration-500 rounded-none border border-gray-200 dark:border-white/10 hover:border-[#1877F2]"
              title="Cấu hình Facebook Autopost"
            >
              <FacebookIcon className="w-[18px] h-[18px]" />
            </button>
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
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} /> Thêm Sản phẩm
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-none shadow-2xl border border-gray-200 dark:border-white/5 p-12 mb-12 transition-all relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100 dark:border-white/5">
            <h3 className="text-2xl font-serif text-gray-900 dark:text-white tracking-widest uppercase">{editingProductId ? 'Hiệu chỉnh Thương phẩm' : 'Đăng Sản phẩm Mới'}</h3>
            <button type="button" onClick={() => {
              setEditingProductId(null);
              setNewName('');
              setNewDescription('');
              setRegularPrice('');
              setSalePrice('');
              setStockQuantity('');
              setSku('');
              setFeaturedImage(null);
              setFeaturedImagePreview('');
              setSelectedCategories([]);
              setShowForm(false);
            }} className="text-xs uppercase tracking-wider font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-4 decoration-transparent hover:decoration-gray-500">Huỷ bỏ</button>
          </div>
          <form onSubmit={handleCreateNew} className="space-y-12">
            
            <div className="relative group">
              <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-0 pt-6 pb-2 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white text-xl focus:border-primary outline-none transition-colors peer" placeholder=" " />
              <label className="absolute left-0 top-6 text-gray-400 dark:text-gray-500 text-sm peer-focus:text-xs peer-focus:-translate-y-7 peer-focus:text-primary peer-valid:text-xs peer-valid:-translate-y-7 transition-all duration-300 pointer-events-none uppercase tracking-wider font-bold">Tên Sản phẩm (Product Name)</label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mô tả Chi tiết (Description)</label>
                <div className="flex border border-gray-200 dark:border-white/10 rounded-none overflow-hidden">
                  <button type="button" onClick={() => setEditorMode('visual')} className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-colors ${editorMode === 'visual' ? 'bg-primary text-black' : 'bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white border-r border-gray-200 dark:border-white/10'}`}>Trực Quan</button>
                  <button type="button" onClick={() => setEditorMode('code')} className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-colors ${editorMode === 'code' ? 'bg-primary text-black' : 'bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Mã Hoá Hoá / Raw</button>
                </div>
              </div>
              <div className="bg-white dark:bg-[#050505] text-gray-900 dark:text-white rounded-none border border-gray-200 dark:border-white/10 overflow-hidden min-h-[300px] flex flex-col focus-within:border-primary transition-colors">
                {editorMode === 'visual' ? (
                  <div className="flex-1 [&_.ql-container]:min-h-[300px] [&_.ql-container]:text-base [&_.ql-editor]:min-h-[300px] [&_.ql-toolbar]:bg-[#FAF9F6] dark:[&_.ql-toolbar]:bg-[#080808] [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 dark:[&_.ql-toolbar]:border-white/10 dark:[&_.ql-container]:border-transparent dark:[&_.ql-editor]:text-gray-200">
                    <ReactQuill ref={quillRef} modules={modules} theme="snow" value={newDescription} onChange={setNewDescription} className="h-full" />
                  </div>
                ) : (
                  <textarea 
                    value={newDescription} 
                    onChange={e => setNewDescription(e.target.value)} 
                    className="w-full flex-1 min-h-[300px] p-6 bg-[#FAF9F6] dark:bg-[#0A0A0A] text-sm font-mono text-gray-800 dark:text-gray-300 outline-none resize-none leading-relaxed"
                    placeholder="Nhập mã HTML, CSS hoặc Script thuần vào đây..."
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-white/10">
              <div className="bg-[#FAF9F6] dark:bg-transparent p-8 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary/50 transition-colors">
                <label className="block text-sm font-serif uppercase tracking-widest text-gray-900 dark:text-white mb-6">Chỉ số Bán hàng</label>
                <div className="space-y-6">
                  <div className="relative group">
                    <input type="text" value={regularPrice} onChange={e => setRegularPrice(e.target.value)} className="w-full px-0 pt-4 pb-1 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:border-primary transition-colors text-sm outline-none peer" placeholder=" " />
                    <label className="absolute left-0 top-4 text-gray-400 dark:text-gray-500 text-xs peer-focus:-translate-y-5 peer-focus:text-primary peer-valid:-translate-y-5 transition-all duration-300 pointer-events-none uppercase tracking-wider font-bold">Giá Gốc (Regular Price)</label>
                  </div>
                  <div className="relative group">
                    <input type="text" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="w-full px-0 pt-4 pb-1 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:border-primary transition-colors text-sm outline-none peer" placeholder=" " />
                    <label className="absolute left-0 top-4 text-gray-400 dark:text-gray-500 text-xs peer-focus:-translate-y-5 peer-focus:text-primary peer-valid:-translate-y-5 transition-all duration-300 pointer-events-none uppercase tracking-wider font-bold">Giá Khuyến Mãi (Sale Price)</label>
                  </div>
                  <div className="relative group">
                    <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full px-0 pt-4 pb-1 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:border-primary transition-colors text-sm outline-none peer" placeholder=" " />
                    <label className="absolute left-0 top-4 text-gray-400 dark:text-gray-500 text-xs peer-focus:-translate-y-5 peer-focus:text-primary peer-valid:-translate-y-5 transition-all duration-300 pointer-events-none uppercase tracking-wider font-bold">Mã Tham Chiếu SKU</label>
                  </div>
                  <div className="relative group">
                    <input type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="w-full px-0 pt-4 pb-1 border-b border-gray-300 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:border-primary transition-colors text-sm outline-none peer" placeholder=" " />
                    <label className="absolute left-0 top-4 text-gray-400 dark:text-gray-500 text-xs peer-focus:-translate-y-5 peer-focus:text-primary peer-valid:-translate-y-5 transition-all duration-300 pointer-events-none uppercase tracking-wider font-bold">Số lượng Tồn Kho</label>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#FAF9F6] dark:bg-transparent p-8 rounded-none border border-gray-200 dark:border-white/10 hover:border-primary/50 transition-colors">
                <label className="block text-sm font-serif uppercase tracking-widest text-gray-900 dark:text-white mb-6">Trưng Bày Hình Ảnh</label>
                <div className="flex flex-col items-start gap-4">
                  <input 
                    type="file" accept="image/*" 
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

            <div className="pt-8 border-t border-gray-100 dark:border-white/10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Phân khúc Hàng Hoá (Categories)</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                    placeholder="Tên phân khúc mới..." 
                    className="text-xs px-3 py-2 border border-gray-200 dark:border-white/10 border-r-0 bg-transparent text-gray-900 dark:text-white outline-none focus:border-primary w-40 sm:w-48"
                  />
                  <button 
                    type="button" 
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="px-4 py-2 bg-primary text-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-50 border border-primary"
                  >
                    {isCreatingCategory ? 'Đợi' : '+ Thêm'}
                  </button>
                </div>
              </div>
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
                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Danh mục trống.</div>
              )}
            </div>

            {!editingProductId && (
            <div className="pt-8 pb-4 border-t border-gray-100 dark:border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center">
                  <Globe className="w-4 h-4 mr-3" strokeWidth={1.5} /> Đồng Bộ Toàn Cầu
                </label>
                <div className="flex items-center space-x-6">
                  <button type="button" onClick={() => setPushMode('saved')} className={`text-xs uppercase tracking-wider font-bold pb-2 border-b-2 transition-colors ${pushMode === 'saved' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-300'}`}>Site Đã Lưu</button>
                  <button type="button" onClick={() => setPushMode('quick')} className={`text-xs uppercase tracking-wider font-bold pb-2 border-b-2 transition-colors ${pushMode === 'quick' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-300'}`}>Đăng Khẩn (Raw)</button>
                </div>
              </div>
              {pushMode === 'saved' ? (
                  <div className="bg-[#FAF9F6] dark:bg-transparent p-6 rounded-none border border-gray-200 dark:border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sites.map(site => (
                        <label key={site.id} className={`flex items-center space-x-4 p-4 rounded-none border cursor-pointer transition-all duration-300 ${targetSiteIds.includes(site.id) ? 'border-primary bg-primary/5 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/5 text-gray-500 hover:border-gray-400'}`}>
                          <input type="checkbox" className="rounded-none w-4 h-4 text-primary focus:ring-primary border-gray-300 dark:bg-transparent" checked={targetSiteIds.includes(site.id)} onChange={() => toggleSiteTarget(site.id)} />
                          <span className="text-xs font-bold tracking-wide truncate">{site.siteName && site.siteName !== site.username && site.siteName !== 'New Site' ? site.siteName : site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
              ) : (
                <div className="bg-[#FAF9F6] dark:bg-transparent p-6 rounded-none border border-gray-200 dark:border-white/10">
                   <p className="text-xs text-gray-400 mb-6 tracking-wide font-bold uppercase">Cú pháp: <code>URL|Tài_khoản|App_Password</code></p>
                   <textarea rows={4} value={quickSitesRaw} onChange={e => setQuickSitesRaw(e.target.value)} className="w-full p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white rounded-none focus:border-primary outline-none font-mono text-sm resize-y transition-colors" placeholder="https://site1.com|admin|xxxx xxxx xxxx xxxx" />
                </div>
              )}
            </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-8 mt-8 border-t border-gray-100 dark:border-white/5 gap-6">
              <div className="flex items-center space-x-8">
                <label className="flex items-center space-x-3 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input type="radio" className="w-4 h-4 text-primary focus:ring-primary bg-transparent border-gray-300" name="status" checked={newStatus === 'publish'} onChange={() => setNewStatus('publish')} />
                  <span>Public Ngay</span>
                </label>
                <label className="flex items-center space-x-3 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input type="radio" className="w-4 h-4 text-primary focus:ring-primary bg-transparent border-gray-300" name="status" checked={newStatus === 'draft'} onChange={() => setNewStatus('draft')} />
                  <span>Chỉ Lưu Nháp</span>
                </label>
              </div>

              <button type="submit" disabled={isSubmitting || (pushMode === 'saved' && targetSiteIds.length === 0)} className="flex justify-center items-center px-8 py-4 bg-primary text-black hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold uppercase tracking-widest text-xs rounded-none border border-primary transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting && <Loader2 className="w-5 h-5 mr-3 animate-spin" strokeWidth={1.5} />}
                {editingProductId ? 'Xác Nhận Thay Đổi' : (newStatus === 'publish' ? 'Xuất Bản Thương Phẩm' : 'Lưu Vào Kho Nháp')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-32 flex justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" strokeWidth={1.5} />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-32 bg-transparent border border-gray-200 dark:border-white/10 rounded-none">
          <h3 className="text-2xl font-serif text-gray-900 dark:text-white mb-4 tracking-widest uppercase">Kho Trống</h3>
          <p className="text-gray-500 text-sm mb-8 tracking-wide font-medium">Chưa có sản phẩm nào được thiết lập. Bạn có thể xây dựng không gian thương mại ngay bây giờ.</p>
          <button onClick={() => setShowForm(true)} className="px-8 py-4 border border-primary text-primary hover:bg-primary hover:text-black dark:hover:text-black transition-colors font-bold uppercase tracking-widest text-xs">Vận Hành Thương Mại</button>
        </div>
      ) : (
        <div className="bg-transparent border border-gray-200 dark:border-white/10 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-[#FAF9F6] dark:bg-[#050505] text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-8 py-6 w-24">Ảnh</th>
                  <th className="px-8 py-6">Mặt Hàng (SKU)</th>
                  <th className="px-8 py-6 w-32">Báo Giá</th>
                  <th className="px-8 py-6 w-32">Kho Hàng</th>
                  <th className="px-8 py-6 text-right w-40">Tương Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {products.map(prod => (
                  <tr key={prod.id} className="hover:bg-[#FAF9F6] dark:hover:bg-[#0A0A0A] transition-colors duration-300 group">
                    <td className="px-8 py-5">
                      {prod.images && prod.images.length > 0 ? (
                         <img src={prod.images[0].src} alt="" className="w-12 h-12 object-cover border border-gray-200 dark:border-white/10" />
                      ) : (
                         <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase tracking-widest">N/A</div>
                      )}
                    </td>
                    <td className="px-8 py-5 flex flex-col">
                      <span className="font-serif text-gray-900 dark:text-white truncate max-w-xs tracking-wide text-base">{prod.name}</span>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{prod.sku ? `SKU: ${prod.sku}` : 'Chưa định danh mã'}</span>
                    </td>
                    <td className="px-8 py-5">
                       {prod.sale_price ? (
                         <div className="flex flex-col">
                           <span className="text-primary font-bold">{Number(prod.sale_price).toLocaleString()}đ</span>
                           <span className="text-[10px] line-through text-gray-400 font-bold">{Number(prod.regular_price).toLocaleString()}đ</span>
                         </div>
                       ) : (
                         <span className="text-gray-700 dark:text-gray-300 font-bold">{prod.regular_price ? `${Number(prod.regular_price).toLocaleString()}đ` : '----'}</span>
                       )}
                    </td>
                    <td className="px-8 py-5 uppercase text-[10px] tracking-widest font-bold flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${prod.stock_status === 'instock' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {prod.stock_status === 'instock' ? 'Có Sẵn' : 'Hết Hàng'}
                    </td>
                    <td className="px-8 py-5 text-right align-middle">
                      <div className="flex items-center justify-end space-x-4 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                           setFbPostTitle(`${prod.name}\nGiá: ${prod.sale_price || prod.regular_price}đ\n\n${prod.permalink}`);
                           setFbPostUrl(prod.permalink);
                           setFbPostImage(prod.images?.[0]?.src || '');
                           setShowFbPoster(true);
                        }} className="text-[#1877F2]/70 hover:text-[#1877F2] transition-colors" title="Đăng lên Facebook">
                          <FacebookIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handlePushToShopee(prod)} disabled={isPushingShopeeId === prod.id} className="text-[#EE4D2D]/70 hover:text-[#EE4D2D] transition-colors disabled:opacity-50" title="Đồng bộ lên Shopee">
                          {isPushingShopeeId === prod.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShopeeIcon className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handlePushToLazada(prod)} disabled={isPushingLazadaId === prod.id} className="text-[#0F146D]/70 hover:text-[#0F146D] transition-colors disabled:opacity-50" title="Đồng bộ lên Lazada">
                          {isPushingLazadaId === prod.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LazadaIcon className="w-4 h-4" />}
                        </button>
                        <a href={prod.permalink} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary transition-colors" title="View"><ExternalLink className="w-4 h-4" strokeWidth={1.5} /></a>
                        <button onClick={() => handleEditClick(prod)} className="text-gray-400 hover:text-primary transition-colors" title="Edit"><Edit className="w-4 h-4" strokeWidth={1.5} /></button>
                        <button onClick={() => handleDelete(prod.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" strokeWidth={1.5} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CrawlerModal isOpen={showCrawler} onClose={() => setShowCrawler(false)} defaultType="product" />
      <FacebookSettingsModal isOpen={showFbSettings} onClose={() => setShowFbSettings(false)} />
      <FacebookPosterModal isOpen={showFbPoster} onClose={() => setShowFbPoster(false)} defaultMessage={fbPostTitle} defaultLink={fbPostUrl} defaultImage={fbPostImage} />
      <GoogleSettingsModal isOpen={showGoogleSettings} onClose={() => setShowGoogleSettings(false)} />
      <ShopeeSettingsModal isOpen={showShopeeSettings} onClose={() => setShowShopeeSettings(false)} />
      <LazadaSettingsModal isOpen={showLazadaSettings} onClose={() => setShowLazadaSettings(false)} />
    </div>
  );
};
