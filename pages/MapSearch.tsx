
import React, { useState, useEffect } from 'react';
import { searchCharityLocations } from '../services/geminiService';

const MapSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ text: string | undefined, sources: any[] } | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    // Check key before searching
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }

    setLoading(true);
    const data = await searchCharityLocations(query, location?.lat, location?.lng);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-emerald-900 italic uppercase tracking-tighter mb-2">GIVEBACK Maps</h1>
        <p className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.4em]">Tìm kiếm địa điểm thiện nguyện thông minh</p>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-emerald-50 mb-10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Vd: Mái ấm gần đây, điểm nhận đồ cũ tại TP.HCM..." 
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold text-gray-700 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Đang tìm...' : 'Tìm địa điểm'}
          </button>
        </div>
      </div>

      {results && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-50 shadow-lg prose prose-emerald max-w-none">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4">Gợi ý từ AI</h3>
              <div className="text-gray-700 leading-relaxed italic whitespace-pre-wrap">
                {results.text}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase text-emerald-900 tracking-[0.3em] ml-2">Kết quả tìm được</h3>
            {results.sources.map((chunk: any, i: number) => (
              <a 
                key={i} 
                href={chunk.maps?.uri} 
                target="_blank" 
                rel="noreferrer"
                className="block bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all group"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 uppercase tracking-tighter truncate">{chunk.maps?.title || "Địa điểm từ thiện"}</p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">Xem trên Google Maps &rarr;</p>
                  </div>
                </div>
              </a>
            ))}
            {results.sources.length === 0 && !loading && (
              <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Không có link địa điểm cụ thể</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!results && !loading && (
        <div className="py-20 text-center opacity-30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-4 text-emerald-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="font-black uppercase tracking-[0.5em] text-sm italic">Sẵn sàng hỗ trợ bạn</p>
        </div>
      )}
    </div>
  );
};

export default MapSearch;
