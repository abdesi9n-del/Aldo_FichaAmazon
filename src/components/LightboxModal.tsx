import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { downloadSingleImage } from '../utils/imageDownloader.ts';

interface LightboxModalProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  productTitle: string;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  productTitle,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate((currentIndex - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') onNavigate((currentIndex + 1) % images.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleDownload = () => {
    const filename = `${productTitle.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_')}_foto_${currentIndex + 1}.jpg`;
    downloadSingleImage(currentImage, filename);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium tracking-wide">
            {currentIndex + 1} de {images.length}
          </span>
          <span className="text-sm text-slate-300 font-medium truncate max-w-md hidden sm:inline">
            {productTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg text-xs font-semibold transition"
            title="Descargar esta imagen"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar Foto</span>
          </button>
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-rose-600/80 text-white rounded-lg transition"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition transform hover:scale-105"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => onNavigate((currentIndex + 1) % images.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition transform hover:scale-105"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image Container */}
      <div className="relative max-w-5xl max-h-[82vh] flex items-center justify-center p-2">
        <img
          src={currentImage}
          alt={`Vista previa ${currentIndex + 1}`}
          className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl transition duration-300 select-none"
        />
      </div>

      {/* Bottom Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[90vw] overflow-x-auto py-2 px-3 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 scrollbar-thin">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(idx)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                idx === currentIndex ? 'border-sky-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
