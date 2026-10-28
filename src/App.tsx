/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Image as ImageIcon,
  Sliders,
  FileText,
  FileDown,
  Sparkles,
  Layers,
  LayoutGrid,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { ExtractedProduct, ActiveWindowTab } from './types/product.ts';
import { Header } from './components/Header.tsx';
import { UrlInputSection } from './components/UrlInputSection.tsx';
import { GeneralInfoCard } from './components/GeneralInfoCard.tsx';
import { ImageGalleryWindow } from './components/ImageGalleryWindow.tsx';
import { TechnicalSpecsWindow } from './components/TechnicalSpecsWindow.tsx';
import { DescriptionWindow } from './components/DescriptionWindow.tsx';
import { LightboxModal } from './components/LightboxModal.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { generateProductPDF } from './utils/pdfGenerator.ts';

export default function App() {
  const [product, setProduct] = useState<ExtractedProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveWindowTab>('general');
  const [viewMode, setViewMode] = useState<'tabs' | 'grid'>('tabs');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Lightbox modal state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load sample products for instant 1-click preview
  const handleLoadSample = async (sampleId: 'AMZ-DEMO-1' | 'MLM-DEMO-2') => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep('Cargando ficha demostrativa...');

    try {
      const res = await fetch('/api/sample-products');
      const data = await res.json();
      const sample = data.samples?.find((s: ExtractedProduct) => s.id === sampleId);
      if (sample) {
        setProduct(sample);
        addToast(`Ficha demostrativa cargada (${sample.source === 'amazon' ? 'Amazon MX' : 'Mercado Libre'})`);
      }
    } catch (err: any) {
      setErrorMessage('Error al cargar la muestra: ' + err.message);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Extract from real URL via server API
  const handleExtract = async (url: string, manualHtml?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep('Conectando con el comercio...');

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev.includes('Conectando')) return 'Extrayendo especificaciones y atributos técnicos...';
        if (prev.includes('Extrayendo')) return 'Procesando imágenes en alta resolución...';
        if (prev.includes('Procesando')) return 'Construyendo ventanas de contenido...';
        return prev;
      });
    }, 1400);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, manualHtml }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo extraer la información del producto.');
      }

      setProduct(data.product);
      addToast('¡Ficha del producto extraída con éxito!');
      setActiveTab('general');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error desconocido al extraer el producto.');
      addToast(err.message || 'Error en la extracción', 'error');
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Generate and download organized PDF
  const handleGeneratePDF = async () => {
    if (!product) return;
    setIsGeneratingPDF(true);
    addToast('Generando Ficha Técnica en PDF organizado...', 'info');

    try {
      await generateProductPDF(product);
      addToast('¡Archivo PDF descargado exitosamente!', 'success');
    } catch (err: any) {
      console.error('PDF error:', err);
      addToast('Error al generar el PDF: ' + err.message, 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Auto-load demo on initial mount if empty so user immediately sees rich UI
  useEffect(() => {
    if (!product) {
      handleLoadSample('AMZ-DEMO-1');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-slate-950">
      {/* Toast notifications container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header */}
      <Header
        product={product}
        onGeneratePDF={handleGeneratePDF}
        isGeneratingPDF={isGeneratingPDF}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* URL Input Section */}
        <UrlInputSection
          onExtract={handleExtract}
          isLoading={isLoading}
          onLoadSample={handleLoadSample}
        />

        {/* Loading Progress State */}
        {isLoading && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center space-y-4 animate-in fade-in">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 border-4 border-slate-800 border-t-orange-500 rounded-full animate-spin" />
              <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Analizando publicación y extrayendo datos
              </h3>
              <p className="text-sm text-slate-400 mt-1">{loadingStep}</p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && !isLoading && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-start gap-3 text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-bold text-rose-300">No se pudo completar la extracción</div>
              <div className="mt-0.5">{errorMessage}</div>
              <div className="mt-2 text-xs text-rose-400">
                Sugerencia: Puedes usar una URL directa de Amazon México o Mercado Libre, o probar con los botones de ejemplo arriba. Si el sitio bloqueó la consulta temporalmente, puedes desplegar la opción "¿Página con captcha? Pegar código HTML" y copiar el código fuente de la página.
              </div>
            </div>
          </div>
        )}

        {/* Extracted Product Views */}
        {product && !isLoading && (
          <div className="space-y-6">
            {/* Window Tabs Bar (Matches: "la información en general y especificaciones técnicas en distintas ventanas según el contenido") */}
            {viewMode === 'tabs' && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'general'
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>1. Ficha General</span>
                </button>

                <button
                  onClick={() => setActiveTab('images')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'images'
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>2. Galería de Imágenes</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'images'
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {product.images.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('specs')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'specs'
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>3. Especificaciones Técnicas</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'specs'
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {product.specifications.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('description')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'description'
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>4. Descripción & Puntos Clave</span>
                </button>
              </div>
            )}

            {/* TAB MODE CONTENT */}
            {viewMode === 'tabs' && (
              <div className="transition-all duration-300">
                {activeTab === 'general' && (
                  <GeneralInfoCard
                    product={product}
                    onCopySuccess={addToast}
                    onOpenImageLightbox={handleOpenLightbox}
                  />
                )}

                {activeTab === 'images' && (
                  <ImageGalleryWindow
                    product={product}
                    onCopySuccess={addToast}
                    onOpenLightbox={handleOpenLightbox}
                  />
                )}

                {activeTab === 'specs' && (
                  <TechnicalSpecsWindow
                    product={product}
                    onCopySuccess={addToast}
                  />
                )}

                {activeTab === 'description' && (
                  <DescriptionWindow
                    product={product}
                    onCopySuccess={addToast}
                  />
                )}
              </div>
            )}

            {/* MULTI-WINDOW / GRID MODE CONTENT */}
            {viewMode === 'grid' && (
              <div className="space-y-6">
                <GeneralInfoCard
                  product={product}
                  onCopySuccess={addToast}
                  onOpenImageLightbox={handleOpenLightbox}
                />
                <ImageGalleryWindow
                  product={product}
                  onCopySuccess={addToast}
                  onOpenLightbox={handleOpenLightbox}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TechnicalSpecsWindow
                    product={product}
                    onCopySuccess={addToast}
                  />
                  <DescriptionWindow
                    product={product}
                    onCopySuccess={addToast}
                  />
                </div>
              </div>
            )}

            {/* Persistent Bottom Action Card for PDF Download & Source Link */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base text-white">
                    Exportar Catálogo / Ficha Técnica Completa
                  </div>
                  <div className="text-xs text-slate-400">
                    Incluye imagen principal, precio, tabla de especificaciones técnicas y resumen comercial organizado.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700"
                >
                  <span>Abrir en Tienda</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 stroke-[2.5]" />
                      <span>Descargar PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {product && (
        <LightboxModal
          images={product.images.length > 0 ? product.images : [product.mainImage].filter(Boolean)}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(idx) => setLightboxIndex(idx)}
          productTitle={product.title}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>Extractor de Fichas de Producto para Amazon México y Mercado Libre México • Descargas selectivas y Fichas PDF</p>
      </footer>
    </div>
  );
}
