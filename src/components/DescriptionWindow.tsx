import React, { useState } from 'react';
import { FileText, Copy, Check, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { ExtractedProduct } from '../types/product.ts';

interface DescriptionWindowProps {
  product: ExtractedProduct;
  onCopySuccess: (text: string) => void;
}

export const DescriptionWindow: React.FC<DescriptionWindowProps> = ({
  product,
  onCopySuccess,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let content = `📄 DESCRIPCIÓN Y PUNTOS CLAVE - ${product.title}\n`;
    content += `Marca: ${product.brand} | Identificador: ${product.skuOrAsin}\n\n`;

    if (product.bulletPoints && product.bulletPoints.length > 0) {
      content += `⭐ CARACTERÍSTICAS DESTACADAS:\n`;
      content += product.bulletPoints.map((bp) => `• ${bp}`).join('\n') + '\n\n';
    }

    if (product.description) {
      content += `📝 DESCRIPCIÓN COMPLETA:\n${product.description}\n\n`;
    }

    if (product.warranty) {
      content += `🛡️ GARANTÍA:\n${product.warranty}\n`;
    }

    navigator.clipboard.writeText(content);
    setCopied(true);
    onCopySuccess('¡Descripción y puntos clave copiados al portapapeles!');
    setTimeout(() => setCopied(false), 2500);
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
            <FileText className="w-4 h-4 text-emerald-400" />
            Ventana: Descripción y Características
          </span>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xs font-semibold transition cursor-pointer border border-slate-600 shadow-sm"
          title="Copiar texto de descripción y puntos clave"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Descripción</span>
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-7 space-y-6">
        {/* Bullet Points Highlights */}
        {product.bulletPoints && product.bulletPoints.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Puntos Clave y Beneficios
            </h3>
            <div className="space-y-2.5">
              {product.bulletPoints.map((bp, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-sm text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{bp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Description */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            Descripción Completa del Producto
          </h3>
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
            {product.description || 'No hay descripción adicional disponible para esta publicación.'}
          </div>
        </div>

        {/* Warranty and Seller Guarantees */}
        {product.warranty && (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Garantía y Protección al Comprador
              </h4>
              <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                {product.warranty}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
