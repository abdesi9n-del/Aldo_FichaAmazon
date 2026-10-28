import React, { useState } from 'react';
import {
  Image as ImageIcon,
  CheckSquare,
  Square,
  Download,
  FolderArchive,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { ExtractedProduct } from '../types/product.ts';
import { downloadImagesZip, downloadSingleImage } from '../utils/imageDownloader.ts';

interface ImageGalleryWindowProps {
  product: ExtractedProduct;
  onCopySuccess: (text: string) => void;
  onOpenLightbox: (index: number) => void;
}

export const ImageGalleryWindow: React.FC<ImageGalleryWindowProps> = ({
  product,
  onCopySuccess,
  onOpenLightbox,
}) => {
  const images = product.images.length > 0 ? product.images : [product.mainImage].filter(Boolean);
  
  // Selection state: array of selected image indices
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    images.map((_, i) => i) // By default, all are selected for convenience
  );

  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedLinks, setCopiedLinks] = useState(false);

  const toggleSelectImage = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const selectAll = () => {
    setSelectedIndices(images.map((_, i) => i));
  };

  const deselectAll = () => {
    setSelectedIndices([]);
  };

  const handleDownloadSelected = async () => {
    if (selectedIndices.length === 0) return;

    const urlsToDownload = selectedIndices.map((i) => images[i]);
    setIsZipping(true);
    setZipProgress({ current: 0, total: urlsToDownload.length });

    try {
      const baseName = `${product.brand || 'producto'}_${product.model || product.skuOrAsin || 'fotos'}`;
      await downloadImagesZip(urlsToDownload, baseName, (curr, tot) => {
        setZipProgress({ current: curr, total: tot });
      });
      onCopySuccess(`¡${urlsToDownload.length} imágenes descargadas en archivo ZIP organizado!`);
    } catch (err: any) {
      alert('Error al descargar las imágenes: ' + err.message);
    } finally {
      setIsZipping(false);
      setZipProgress(null);
    }
  };

  const handleDownloadSingle = (e: React.MouseEvent, url: string, index: number) => {
    e.stopPropagation();
    const filename = `${(product.brand || 'producto').toLowerCase()}_${index + 1}.jpg`;
    downloadSingleImage(url, filename);
    onCopySuccess(`Descargando imagen #${index + 1}`);
  };

  const handleCopyLinks = () => {
    const urlsToCopy = selectedIndices.length > 0
      ? selectedIndices.map((i) => images[i])
      : images;

    const formatted = `🖼️ ENLACES DE IMÁGENES EN ALTA RESOLUCIÓN (${product.title})
${urlsToCopy.map((u, i) => `${i + 1}. ${u}`).join('\n')}`;

    navigator.clipboard.writeText(formatted);
    setCopiedLinks(true);
    onCopySuccess(`¡${urlsToCopy.length} enlaces de imágenes copiados al portapapeles!`);
    setTimeout(() => setCopiedLinks(false), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Window Header */}
      <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-semibold text-sm text-slate-200 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            Ventana: Galería de Imágenes ({images.length} fotos disponibles)
          </span>
        </div>

        {/* Action: Copy Image URLs */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLinks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xs font-semibold transition cursor-pointer border border-slate-600 shadow-sm"
            title="Copiar lista de URLs de las imágenes"
          >
            {copiedLinks ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">¡Enlaces Copiados!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Enlaces de Imágenes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Control Bar: Select all, Deselect, Counter, Download ZIP */}
      <div className="px-5 py-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <button
            onClick={selectAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-orange-400" />
            <span>Seleccionar todas</span>
          </button>

          <button
            onClick={deselectAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 text-slate-400" />
            <span>Deseleccionar</span>
          </button>

          <span className="text-xs text-slate-400 font-medium pl-1">
            <b className="text-white font-bold">{selectedIndices.length}</b> de {images.length} seleccionadas
          </span>
        </div>

        {/* Primary Download Button for Selected Images */}
        <button
          onClick={handleDownloadSelected}
          disabled={selectedIndices.length === 0 || isZipping}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isZipping ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>
                Empaquetando ZIP {zipProgress ? `(${zipProgress.current}/${zipProgress.total})` : ''}...
              </span>
            </>
          ) : (
            <>
              <FolderArchive className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>
                Descargar {selectedIndices.length} {selectedIndices.length === 1 ? 'Seleccionada' : 'Seleccionadas'} (ZIP)
              </span>
            </>
          )}
        </button>
      </div>

      {/* Grid of Images with Multi-Select Checkboxes */}
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((imgUrl, index) => {
            const isSelected = selectedIndices.includes(index);
            return (
              <div
                key={index}
                onClick={() => toggleSelectImage(index)}
                className={`group relative aspect-square bg-slate-950/80 rounded-xl border-2 p-3 flex items-center justify-center cursor-pointer transition-all duration-200 select-none overflow-hidden ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Product Image */}
                <img
                  src={imgUrl}
                  alt={`Foto ${index + 1}`}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Selection Checkbox Top-Left */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition shadow-md ${
                      isSelected
                        ? 'bg-orange-500 text-slate-950 font-bold'
                        : 'bg-slate-900/90 border border-slate-600 text-transparent hover:border-white'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>

                {/* Index Number Badge */}
                <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono">
                  #{index + 1}
                </div>

                {/* Hover Action Overlay: Zoom & Single Download */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(index);
                    }}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/25 text-white transition backdrop-blur-sm"
                    title="Ver en pantalla completa"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDownloadSingle(e, imgUrl, index)}
                    className="p-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 transition backdrop-blur-sm"
                    title="Descargar solo esta imagen individual"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {images.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            No se encontraron imágenes en este producto.
          </div>
        )}
      </div>
    </div>
  );
};
