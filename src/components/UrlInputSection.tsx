import React, { useState } from 'react';
import { Search, Link as LinkIcon, Sparkles, ChevronDown, ChevronUp, Code2, AlertCircle } from 'lucide-react';

interface UrlInputSectionProps {
  onExtract: (url: string, manualHtml?: string) => void;
  isLoading: boolean;
  onLoadSample: (sampleId: 'AMZ-DEMO-1' | 'MLM-DEMO-2') => void;
}

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  onExtract,
  isLoading,
  onLoadSample,
}) => {
  const [url, setUrl] = useState('');
  const [showHtmlInput, setShowHtmlInput] = useState(false);
  const [manualHtml, setManualHtml] = useState('');

  const detectedSource = url.includes('amazon') || url.includes('amzn.to')
    ? 'amazon'
    : url.includes('mercadolibre') || url.includes('meli.plus')
    ? 'mercadolibre'
    : url.trim().length > 0
    ? 'other'
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onExtract(url.trim(), showHtmlInput && manualHtml.trim() ? manualHtml.trim() : undefined);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <LinkIcon className="w-5 h-5" />
            </div>

            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega la URL de Amazon México (amazon.com.mx) o Mercado Libre México..."
              className="w-full pl-11 pr-28 sm:pr-32 py-3.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition shadow-inner"
              disabled={isLoading}
              required
            />

            {/* Detected store indicator badge inside the input */}
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              {detectedSource === 'amazon' && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-in fade-in">
                  Amazon MX
                </span>
              )}
              {detectedSource === 'mercadolibre' && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-in fade-in">
                  Mercado Libre
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-98 text-slate-950 font-bold rounded-xl text-sm sm:text-base transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Extrayendo Ficha...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 stroke-[2.5]" />
                <span>Extraer Producto</span>
              </>
            )}
          </button>
        </div>

        {/* Demo / Sample links and Advanced HTML toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Probar enlaces demo:
            </span>
            <button
              type="button"
              onClick={() => onLoadSample('AMZ-DEMO-1')}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-orange-500/50 text-slate-200 transition text-xs font-medium cursor-pointer"
            >
              💻 MacBook Air M3 (Amazon MX)
            </button>
            <button
              type="button"
              onClick={() => onLoadSample('MLM-DEMO-2')}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-400/50 text-slate-200 transition text-xs font-medium cursor-pointer"
            >
              🎮 PlayStation 5 Slim (Mercado Libre)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowHtmlInput(!showHtmlInput)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition underline underline-offset-2"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showHtmlInput ? 'Ocultar HTML manual' : '¿Página con captcha? Pegar código HTML'}</span>
            {showHtmlInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible raw HTML textarea for anti-bot fallback */}
        {showHtmlInput && (
          <div className="pt-2 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Si Amazon o Mercado Libre solicita resolución de verificación humana en tu navegador, abre la página, presiona Ctrl+U (Ver código fuente), cópialo y pégalo aquí.
                </span>
              </div>
              <textarea
                value={manualHtml}
                onChange={(e) => setManualHtml(e.target.value)}
                placeholder="Pega el código HTML completo aquí (opcional)..."
                rows={3}
                className="w-full p-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
