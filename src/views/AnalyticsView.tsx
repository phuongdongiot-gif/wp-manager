import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { googleAnalyticsApi } from '../services/google-analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Loader2, Users, MousePointerClick, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const AnalyticsView: React.FC = () => {
  const { sites, activeSiteId, googleServiceAccount } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);

  const activeSite = sites.find(s => s.id === activeSiteId);

  useEffect(() => {
    if (!activeSite || !activeSite.gaPropertyId || !googleServiceAccount) return;
    
    let isMounted = true;
    
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Fetch Top Level Metrics
        const metricsRes = await googleAnalyticsApi.runReport(
          activeSite.gaPropertyId!,
          googleServiceAccount,
          [ { name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' } ],
          [],
          [ { startDate: '30daysAgo', endDate: 'today' } ]
        );
        
        // Fetch Time Series (Timeline)
        const timelineRes = await googleAnalyticsApi.runReport(
          activeSite.gaPropertyId!,
          googleServiceAccount,
          [ { name: 'activeUsers' }, { name: 'screenPageViews' } ],
          [ { name: 'date' } ],
          [ { startDate: '30daysAgo', endDate: 'today' } ]
        );

        // Fetch Top Pages
        const topPagesRes = await googleAnalyticsApi.runReport(
          activeSite.gaPropertyId!,
          googleServiceAccount,
          [ { name: 'screenPageViews' } ],
          [ { name: 'pageTitle' }, { name: 'pagePath' } ],
          [ { startDate: '30daysAgo', endDate: 'today' } ]
        );

        if (!isMounted) return;

        if (metricsRes.rows && metricsRes.rows.length > 0) {
           setMetrics({
             users: metricsRes.rows[0].metricValues[0].value,
             views: metricsRes.rows[0].metricValues[1].value,
             duration: (parseFloat(metricsRes.rows[0].metricValues[2].value) / 60).toFixed(1)
           });
        }

        if (timelineRes.rows) {
           // Sort by date string
           const sorted = timelineRes.rows.sort((a: any, b: any) => a.dimensionValues[0].value.localeCompare(b.dimensionValues[0].value));
           const parsedChart = sorted.map((row: any) => {
             const ds = row.dimensionValues[0].value;
             const label = `${ds.substring(6,8)}/${ds.substring(4,6)}`;
             return {
               name: label,
               Users: parseInt(row.metricValues[0].value, 10),
               Views: parseInt(row.metricValues[1].value, 10)
             };
           });
           setChartData(parsedChart);
        }

        if (topPagesRes.rows) {
           // Sort by views desc, take top 10
           const pages = topPagesRes.rows.map((row: any) => ({
             title: row.dimensionValues[0].value,
             path: row.dimensionValues[1].value,
             views: parseInt(row.metricValues[0].value, 10)
           })).sort((a: any, b: any) => b.views - a.views).slice(0, 10);
           
           setTopPages(pages);
        }

      } catch (e: any) {
        if(isMounted) toast.error(`Lỗi GA4: ${e.message}`);
      } finally {
        if(isMounted) setIsLoading(false);
      }
    };

    fetchAnalytics();
    
    return () => { isMounted = false; };
  }, [activeSite?.id, activeSite?.gaPropertyId, googleServiceAccount]);

  if (!activeSite) return null;

  if (!googleServiceAccount) {
    return (
      <div className="max-w-4xl mx-auto py-32 text-center border border-gray-200 dark:border-white/10 rounded-none bg-[#FAF9F6] dark:bg-[#0A0A0A]">
         <BarChart3 className="w-16 h-16 mx-auto mb-6 text-gray-300 dark:text-gray-700" strokeWidth={1} />
         <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4 tracking-widest uppercase">Thiếu Khoá Service Account</h2>
         <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">Bạn cần cung cấp JSON Google Service Account ở tính năng Tự động Ép Index để có thể đọc được dữ liệu Google Analytics 4.</p>
      </div>
    );
  }

  if (!activeSite.gaPropertyId) {
    return (
      <div className="max-w-4xl mx-auto py-32 text-center border border-gray-200 dark:border-white/10 rounded-none bg-[#FAF9F6] dark:bg-[#0A0A0A]">
         <BarChart3 className="w-16 h-16 mx-auto mb-6 text-gray-300 dark:text-gray-700" strokeWidth={1} />
         <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-4 tracking-widest uppercase">Chưa Cập Nhật Property ID</h2>
         <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">Vui lòng quay lại Bảng thống kê (Dashboard) và cung cấp GA4 Property ID cho website của bạn để bắt đầu kéo dữ liệu.</p>
         <Link to="/" className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors inline-block">Về Bảng Thống Kê</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-12 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-4xl font-serif text-gray-900 dark:text-white tracking-[0.05em] uppercase">Báo Cáo Lưu Lượng</h2>
          <p className="text-xs tracking-[0.1em] uppercase text-gray-500 dark:text-gray-400 mt-3 flex items-center inline-block">
             Chỉ số tương tác: <span className="font-bold text-gray-900 dark:text-gray-200 ml-2">{activeSite.siteName || activeSite.url.replace(/^https?:\/\//, '')}</span>
          </p>
        </div>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" strokeWidth={1.5} />}
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <div className="bg-[#FAF9F6] dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 p-8 flex flex-col hover:border-primary/50 transition-colors">
              <div className="flex items-center text-gray-400 mb-4 uppercase tracking-widest text-xs font-bold">
                 <Users className="w-4 h-4 mr-3" strokeWidth={2} /> N.Dùng Hoạt Động
              </div>
              <div className="text-4xl font-serif text-gray-900 dark:text-white">{parseInt(metrics.users).toLocaleString()}</div>
           </div>
           <div className="bg-[#FAF9F6] dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 p-8 flex flex-col hover:border-primary/50 transition-colors">
              <div className="flex items-center text-gray-400 mb-4 uppercase tracking-widest text-xs font-bold">
                 <MousePointerClick className="w-4 h-4 mr-3" strokeWidth={2} /> Lượt Xem Trang
              </div>
              <div className="text-4xl font-serif text-gray-900 dark:text-white">{parseInt(metrics.views).toLocaleString()}</div>
           </div>
           <div className="bg-[#FAF9F6] dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 p-8 flex flex-col hover:border-primary/50 transition-colors">
              <div className="flex items-center text-gray-400 mb-4 uppercase tracking-widest text-xs font-bold">
                 <Clock className="w-4 h-4 mr-3" strokeWidth={2} /> T.Gian Tương Tác
              </div>
              <div className="text-4xl font-serif text-gray-900 dark:text-white">{metrics.duration} <span className="text-lg text-gray-500 font-sans tracking-tight">phút</span></div>
           </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mb-12 bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/10 p-8 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>
           <h3 className="text-lg font-serif uppercase tracking-widest text-gray-900 dark:text-white mb-8 border-b border-gray-100 dark:border-white/5 pb-4">Xu Hướng Lưu Lượng (30 Ngày)</h3>
           <div className="h-80 w-full text-xs font-sans">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.3} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} dy={10} tick={{ fill: '#888' }} />
                    <YAxis tickLine={false} axisLine={false} dx={-10} tick={{ fill: '#888' }} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0', color: '#fff' }}
                       itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="Views" stroke="#C5A059" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Lượt Xem" />
                    <Line type="monotone" dataKey="Users" stroke="#4285F4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="N.Dùng" />
                 </LineChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}

      {topPages.length > 0 && (
        <div className="bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/10 overflow-hidden">
           <h3 className="text-lg font-serif uppercase tracking-widest text-gray-900 dark:text-white p-8 border-b border-gray-100 dark:border-white/5">Nội Dung Hàng Đầu</h3>
           <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
             <thead className="bg-[#FAF9F6] dark:bg-[#0A0A0A] text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-200 dark:border-white/10">
                <tr>
                   <th className="px-8 py-5">Tiêu đề Trang</th>
                   <th className="px-8 py-5 w-32 text-right">Lượt Xem</th>
                   <th className="px-8 py-5 w-24"></th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {topPages.map((page, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF9F6] dark:hover:bg-[#0A0A0A] transition-colors duration-300 group">
                     <td className="px-8 py-5 flex flex-col">
                        <span className="font-serif text-gray-900 dark:text-white max-w-2xl truncate text-base tracking-wide">{page.title}</span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider truncate mt-1">{page.path}</span>
                     </td>
                     <td className="px-8 py-5 text-right font-bold text-gray-900 dark:text-white">
                        {page.views.toLocaleString()}
                     </td>
                     <td className="px-8 py-5 text-right">
                        <a href={`${activeSite.url}${page.path}`} target="_blank" rel="noreferrer" className="inline-flex text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                           <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                        </a>
                     </td>
                  </tr>
                ))}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
};
