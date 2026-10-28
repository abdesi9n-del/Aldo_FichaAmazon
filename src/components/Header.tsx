import React from 'react';
import { FileDown, Layers, LayoutGrid, Sparkles } from 'lucide-react';
import { ExtractedProduct } from '../types/product.ts';

interface HeaderProps {
  product: ExtractedProduct | null;
  onGeneratePDF: () => void;
  isGeneratingPDF: boolean;
  viewMode: 'tabs' | 'grid';
  onToggleViewMode: (mode: 'tabs' | 'grid') => void;
}

export const Header: React.FC<HeaderProps> = ({
  product,
  onGeneratePDF,
  isGeneratingPDF,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 flex items-center justify-center shadow-lg shadow-orange-500/20 text-slate-950 font-black text-xl tracking-tight">
            F
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                FichaPro
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                México 🇲🇽
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Extractor para Amazon MX & Mercado Libre
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {product && (
            <>
              {/* View layout toggle: Tabs vs Multiventana */}
              <div className="hidden md:flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
                <button
                  onClick={() => onToggleViewMode('tabs')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition font-medium ${
                    viewMode === 'tabs'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista en pestañas / ventanas independientes"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pestañas</span>
                </button>
                <button
                  onClick={() => onToggleViewMode('grid')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition font-medium ${
                    viewMode === 'grid'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista multitarea en mosaico"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Multiventana</span>
                </button>
              </div>

              {/* PDF Download Button */}
              <button
                onClick={onGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                title="Descargar Ficha Técnica Organizada en PDF"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>Descargar PDF</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Supported platform badges */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-800 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-amber-300 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Mercado Libre
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-orange-300 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              Amazon MX
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
