
import React, { useState, useEffect } from 'react';
import { searchCharityLocations } from '../services/geminiService';

const MapSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ text: string, sources: any[] } | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  const quickSearchTags = [
    { label: '🍚 Cơm 2.000đ', query: 'Quán cơm thiện nguyện 2000đ gần đây' },
    { label: '🥖 Bánh mì 0đ', query: 'Thùng bánh mì từ thiện miễn phí gần đây' },
    { label: '🏠 Mái ấm / Chùa', query: 'Mái ấm tình thương hoặc chùa nhận đồ từ thiện' },
    { label: '🧊 Trạm nước miễn phí', query: 'Thùng nước uống miễn phí ven đường' },
    { label: '🏥 Phòng khám 0đ', query: 'Phòng khám chữa bệnh miễn phí cho người nghèo' }
  ];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => console.log("Geolocation error:", err));
    }
  }, []);

  const handleSearch = async (customQuery?: string) => {
    const searchQuery = customQuery || query;
    if (!searchQuery.trim()) return;
    
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }

    setLoading(true);
    setQuery(searchQuery);
    const data = await searchCharityLocations(searchQuery, location?.lat, location?.lng);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto min-h-screen font-['Inter']">
      {/* Header Section */}
      <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-5xl font-black text-emerald-950 italic uppercase tracking-tighter mb-3 leading-none">GIVEBACK MAPS</h1>
        <p className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.4em] italic">Tìm kiếm địa điểm thiện nguyện thông minh bằng AI</p>
      </div>

      {/* Search Section */}
      <div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-2xl border border-emerald-50 mb-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-1000"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Bạn muốn tìm gì? (Vd: Quán cơm 2k gần đây...)" 
                className="w-full pl-16 pr-8 py-5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-[2rem] outline-none font-bold text-gray-700 text-lg transition-all shadow-inner"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button 
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-emerald-900 text-white px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 text-xs"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  AI ĐANG QUÉT...
                </div>
              ) : 'TÌM ĐỊA ĐIỂM'}
            </button>
          </div>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            {quickSearchTags.map((tag, i) => (
              <button 
                key={i}
                onClick={() => handleSearch(tag.query)}
                className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-100 shadow-sm"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Display */}
      {results && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Narration Card */}
          <div className="lg:col-span-2">
            <div className="bg-white p-10 rounded-[3.5rem] border border-emerald-50 shadow-xl relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
              <h3 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.4em] mb-6 italic flex items-center gap-3">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-ping"></span> Phân tích từ GIVEBACK AI
              </h3>
              <div className="text-gray-800 leading-relaxed italic text-lg font-medium whitespace-pre-wrap">
                "{results.text}"
              </div>
              <div className="mt-10 p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest italic">💡 Lời khuyên của mình:</p>
                <p className="text-[11px] text-emerald-700 mt-2 font-medium">Bạn nên gọi điện trước cho các địa điểm này để xác nhận thông tin nhé, vì các hoạt động thiện nguyện đôi khi có thay đổi theo ngày.</p>
              </div>
            </div>
          </div>

          {/* Location Links Card */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] ml-6 italic">Bản đồ chi tiết</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {results.sources.map((chunk: any, i: number) => (
                <a 
                  key={i} 
                  href={chunk.maps?.uri} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-emerald-500 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-center space-x-5">
                    <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 uppercase italic tracking-tighter truncate text-sm">{chunk.maps?.title || "Địa điểm thiện nguyện"}</p>
                      <p className="text-[9px] text-emerald-600 font-black mt-1 uppercase tracking-widest">Mở trên Google Maps &rarr;</p>
                    </div>
                  </div>
                </a>
              ))}
              
              {results.sources.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest italic">AI chưa tìm thấy Link bản đồ<br/>của địa điểm này...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <div className="py-24 text-center opacity-40 animate-pulse">
          <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-emerald-900/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="font-black uppercase tracking-[0.6em] text-xs italic text-emerald-900">GIVEBACK MAPS ĐANG SẴN SÀNG HỖ TRỢ ĐỆ</p>
        </div>
      )}
    </div>
  );
};

export default MapSearch;
