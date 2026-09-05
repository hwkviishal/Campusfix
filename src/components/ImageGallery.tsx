import React, { useState, useEffect } from 'react';
import { ComplaintImage } from '../types';
import {
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  ImageIcon,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

interface ImageGalleryProps {
  images: (string | ComplaintImage)[];
  title?: string;
  type?: 'evidence' | 'resolution';
  emptyMessage?: string;
  canRemove?: boolean;
  onRemoveImage?: (publicId: string) => Promise<void>;
  isRemoving?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title,
  type = 'evidence',
  emptyMessage = 'No photos attached.',
  canRemove = false,
  onRemoveImage,
  isRemoving = false,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Normalize image data
  const normalizedImages: { url: string; publicId: string; id: string }[] = (images || []).map(
    (img, idx) => {
      if (typeof img === 'string') {
        return {
          url: img,
          publicId: '',
          id: `legacy-${idx}`,
        };
      }
      return {
        url: img.url,
        publicId: img.publicId,
        id: img.id || img._id || img.publicId || `img-${idx}`,
      };
    }
  );

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;

      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight' && normalizedImages.length > 1) {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % normalizedImages.length : null
        );
      } else if (e.key === 'ArrowLeft' && normalizedImages.length > 1) {
        setLightboxIndex((prev) =>
          prev !== null
            ? (prev - 1 + normalizedImages.length) % normalizedImages.length
            : null
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, normalizedImages.length]);

  if (normalizedImages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
          <ImageIcon className="w-5 h-5" />
        </div>
        <p className="text-xs text-slate-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  const activeImage = lightboxIndex !== null ? normalizedImages[lightboxIndex] : null;

  return (
    <div className="space-y-3" id={`gallery-${type}`}>
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            {type === 'evidence' ? (
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            ) : (
              <Wrench className="w-4 h-4 text-emerald-600" />
            )}
            {title}
            <span className="text-xs font-normal text-slate-500">
              ({normalizedImages.length} photo{normalizedImages.length === 1 ? '' : 's'})
            </span>
          </h4>
        </div>
      )}

      {/* Grid of Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {normalizedImages.map((img, idx) => (
          <div
            key={img.id}
            className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-950 aspect-square shadow-sm cursor-pointer"
            onClick={() => setLightboxIndex(idx)}
          >
            <img
              src={img.url}
              alt={`${title || 'Photo'} ${idx + 1}`}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

            {/* Hover Actions */}
            <div className="absolute inset-0 p-2 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex justify-end gap-1.5">
                {canRemove && img.publicId && onRemoveImage && (
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to permanently delete this evidence photo?')) {
                        onRemoveImage(img.publicId);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white shadow-md transition-colors"
                  title="View full image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-[10px] truncate">
                Photo #{idx + 1}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Screen Lightbox Modal */}
      {lightboxIndex !== null && activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between text-white z-10 max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm sm:text-base">
                {title || 'Image Preview'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {lightboxIndex + 1} of {normalizedImages.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeImage.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Open original in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close preview (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Image Stage */}
          <div
            className="relative flex-1 flex items-center justify-center max-w-6xl w-full mx-auto my-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.url}
              alt={`Full size ${lightboxIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {/* Previous Button */}
            {normalizedImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex - 1 + normalizedImages.length) % normalizedImages.length
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 transition-all shadow-lg"
                title="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Button */}
            {normalizedImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((lightboxIndex + 1) % normalizedImages.length)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 transition-all shadow-lg"
                title="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {normalizedImages.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 max-w-4xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {normalizedImages.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    lightboxIndex === idx
                      ? 'border-indigo-500 scale-105 ring-2 ring-indigo-400'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
