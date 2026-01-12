
import React from 'react';
import { DonationItem, User } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ItemCardProps {
  item: DonationItem;
  user?: User | null;
  onSelect?: (item: DonationItem) => void;
  onNotify?: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, user, onSelect, onNotify }) => {
  const isOutOfStock = item.quantity <= 0;
  const isAdmin = user?.role === 'admin';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc muốn gỡ bài "${item.title}" không?`)) {
      try {
        await deleteDoc(doc(db, "items", item.id));
        if (onNotify) onNotify('success', `Đã gỡ món đồ "${item.title}" khỏi hệ thống.`, 'Quản trị');
      } catch (err) {
        console.error("Lỗi khi gỡ bài:", err);
        if (onNotify) onNotify('error', "Có lỗi xảy ra khi gỡ bài viết.", 'Hệ thống');
      }
    }
  };

  return (
    <div 
      onClick={() => onSelect?.(item)}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative ${isOutOfStock ? 'opacity-75' : ''}`}
    >
      {isAdmin && (
        <button 
          onClick={handleDelete}
          className="absolute top-2 left-2 z-20 bg-red-500 text-white p-2 rounded-xl shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
          title="Gỡ bài này"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 bg-black/40 flex items-center justify-center">
            <div className="bg-red-600 text-white font-black text-xs px-4 py-2 rounded-lg rotate-[-10deg] shadow-2xl border-2 border-white uppercase tracking-[0.2em] animate-pulse">
              HẾT HÀNG
            </div>
          </div>
        )}

        {item.video ? (
          <video 
            src={item.video} 
            className="w-full h-full object-cover" 
            muted 
            loop 
            onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
            onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
          />
        ) : (
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          />
        )}
        
        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full z-10 tracking-widest">
          {item.category}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isOutOfStock ? 'text-gray-400' : 'text-emerald-600'}`}>
            {isOutOfStock ? 'Đã được nhận hết' : (item.condition === 'new' ? 'Mới 100%' : item.condition === 'good' ? 'Còn tốt' : 'Đã dùng')}
          </span>
          <span className="text-[10px] text-gray-400 font-bold">
            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <h3 className={`text-lg font-bold mb-2 truncate group-hover:text-emerald-700 transition-colors ${isOutOfStock ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10 italic leading-relaxed">"{item.description}"</p>
        
        <div className="border-t pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border shadow-sm ${isOutOfStock ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
              {item.author.charAt(0).toUpperCase()}
            </div>
            <div className="text-[10px]">
              <p className="font-bold text-gray-800 uppercase tracking-tighter">{item.author}</p>
              <p className="text-gray-400 italic truncate max-w-[80px]">{item.location}</p>
            </div>
          </div>
          <button 
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(item);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
          >
            {isOutOfStock ? 'Đã hết' : 'Liên hệ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
