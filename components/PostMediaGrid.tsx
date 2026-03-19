
import React from 'react';
import { PostMedia } from '../types';

interface PostMediaGridProps {
  media: PostMedia[];
  onSelect?: (index: number) => void;
}

const PostMediaGrid: React.FC<PostMediaGridProps> = ({ media, onSelect }) => {
  if (!media || media.length === 0) return null;

  const count = media.length;

  const renderMediaItem = (item: PostMedia, className: string, index: number, showOverlay: boolean = false) => {
    const isVideo = item.type === 'video';
    
    return (
      <div 
        onClick={() => onSelect?.(index)}
        className={`relative overflow-hidden ${className} group cursor-pointer`}
      >
        {isVideo ? (
          <video 
            src={item.url} 
            className="w-full h-full object-cover bg-black" 
            muted 
            playsInline
          />
        ) : (
          <img 
            src={item.url} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            alt="" 
            referrerPolicy="no-referrer"
          />
        )}
        
        {showOverlay && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-white text-4xl font-black tracking-tighter">
              +{count - 3}
            </span>
          </div>
        )}
        
        {isVideo && !showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
              <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (count === 1) {
    return (
      <div className="rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
        {renderMediaItem(media[0], "aspect-auto max-h-[600px]", 0)}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
        {renderMediaItem(media[0], "aspect-[4/5]", 0)}
        {renderMediaItem(media[1], "aspect-[4/5]", 1)}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
        {renderMediaItem(media[0], "row-span-2 aspect-[4/10]", 0)}
        <div className="grid grid-rows-2 gap-2">
          {renderMediaItem(media[1], "aspect-square", 1)}
          {renderMediaItem(media[2], "aspect-square", 2)}
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
        {renderMediaItem(media[0], "aspect-square", 0)}
        {renderMediaItem(media[1], "aspect-square", 1)}
        {renderMediaItem(media[2], "aspect-square", 2)}
        {renderMediaItem(media[3], "aspect-square", 3)}
      </div>
    );
  }

  // 5 or more
  return (
    <div className="grid grid-cols-2 gap-2 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
      {renderMediaItem(media[0], "aspect-square", 0)}
      {renderMediaItem(media[1], "aspect-square", 1)}
      {renderMediaItem(media[2], "aspect-square", 2)}
      {renderMediaItem(media[3], "aspect-square", 3, true)}
    </div>
  );
};

export default PostMediaGrid;
